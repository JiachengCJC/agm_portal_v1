import json
from collections import Counter
from datetime import date, datetime
from decimal import Decimal
from typing import Any

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.project import Project
from app.models.user import User
from app.schemas.assistant import ChatRequest, ChatResponse

router = APIRouter(prefix="/assistant", tags=["assistant"])

MODE_OPENAI = 1
MODE_OLLAMA = 2
MODE_LOCAL = 3


def _format_counter(counter: Counter[str]) -> str:
    if not counter:
        return "None"
    return ", ".join(f"{key}: {value}" for key, value in counter.most_common())


def _serialize_scalar(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def _project_to_dict(project: Project) -> dict[str, Any]:
    # Keep this aligned to the real projects table schema by reading SQLAlchemy columns.
    return {
        column.name: _serialize_scalar(getattr(project, column.name))
        for column in Project.__table__.columns
    }


def _build_portfolio_context(db: Session, user: User) -> dict[str, Any]:
    query = db.query(Project)
    if user.role == "researcher":
        query = query.filter(Project.owner_id == user.id)

    projects = query.order_by(Project.updated_at.desc()).all()
    total = len(projects)
    active = sum(1 for p in projects if (p.status or "").lower() == "active")

    by_domain = Counter((p.domain or "Unknown") for p in projects)
    by_stage = Counter((p.maturity_stage or "Unknown") for p in projects)
    total_spent = sum(float(p.funding_amount_sgd or 0) for p in projects)

    latest_titles = [p.title for p in projects[:5]]
    project_rows = [_project_to_dict(p) for p in projects]

    return {
        "user_role": user.role,
        "visible_scope": "own_projects_only" if user.role == "researcher" else "all_projects",
        "total": total,
        "active": active,
        "domain": _format_counter(by_domain),
        "stage": _format_counter(by_stage),
        "total_spent": total_spent,
        "latest_titles": latest_titles,
        "projects": project_rows,
    }


def _fallback_reply(message: str, context: dict[str, Any]) -> str:
    lower = message.lower()
    total = context["total"]
    active = context["active"]
    domain = context["domain"]
    stage = context["stage"]
    total_spent = context["total_spent"]
    latest_titles = context["latest_titles"]

    if any(k in lower for k in ("domain", "specialty", "type")):
        return (
            f"Domain distribution: {domain}. "
            "If you want, I can suggest where to rebalance resources."
        )

    if any(k in lower for k in ("fund", "funding", "spend", "budget")):
        return (
            f"Current total spent amount is SGD {total_spent:,.2f}. "
            "I can break this down by domain or project."
        )

    if any(k in lower for k in ("stage", "maturity", "progress")):
        return (
            f"Maturity-stage distribution: {stage}. "
            "I can help draft next actions for each stage."
        )

    if any(k in lower for k in ("summary", "overview", "portfolio", "status")):
        return (
            f"You have {total} total projects, with {active} currently active. "
            f"Domain distribution: {domain}. Total spent: SGD {total_spent:,.2f}."
        )

    latest = ", ".join(latest_titles) if latest_titles else "no recent projects yet"
    return (
        f"I can help with portfolio insights, domain mix, funding usage, and project planning. "
        f"Current snapshot: {total} projects ({active} active). "
        f"Recent projects: {latest}."
    )


def _build_system_prompt(context: dict[str, Any]) -> str:
    projects_json = json.dumps(context["projects"], ensure_ascii=True)
    return (
        "You are an AI assistant for an AI project management portal.\n"
        "Be concise and practical.\n"
        f"User role: {context['user_role']}. Visible scope: {context['visible_scope']}.\n"
        f"Portfolio context: total={context['total']}, active={context['active']}, "
        f"domain=({context['domain']}), maturity=({context['stage']}), "
        f"total_spent_sgd={context['total_spent']:.2f}.\n"
        "The following JSON contains all visible rows from the projects table. "
        "Use it as source of truth when answering project-specific questions.\n"
        f"projects_table_rows={projects_json}"
    )


def _build_messages(message: str, history: list[dict[str, str]], context: dict[str, Any]) -> list[dict[str, str]]:
    messages = [{"role": "system", "content": _build_system_prompt(context)}]
    messages.extend(history[-8:])
    messages.append({"role": "user", "content": message})
    return messages


def _normalize_mode(mode: int) -> int:
    if mode in (MODE_OPENAI, MODE_OLLAMA, MODE_LOCAL):
        return mode
    return MODE_OPENAI


def _extract_openai_content(data: dict[str, Any]) -> str | None:
    content = ((data.get("choices") or [{}])[0].get("message") or {}).get("content")
    if isinstance(content, str) and content.strip():
        return content.strip()
    return None


async def _call_openai(messages: list[dict[str, str]]) -> str | None:
    if not settings.OPENAI_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.OPENAI_MODEL,
                    "messages": messages,
                    "temperature": 0.2,
                },
            )
            resp.raise_for_status()
            return _extract_openai_content(resp.json())
    except Exception:
        return None

    return None


async def _call_ollama(messages: list[dict[str, str]]) -> str | None:
    base_url = settings.OLLAMA_BASE_URL.rstrip("/")
    endpoint = base_url if base_url.endswith("/api/chat") else f"{base_url}/api/chat"

    try:
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                endpoint,
                json={
                    "model": settings.OLLAMA_MODEL,
                    "messages": messages,
                    "stream": False,
                    "options": {"temperature": 0.2},
                },
            )
            resp.raise_for_status()
            data = resp.json()
            content = (data.get("message") or {}).get("content")
            if isinstance(content, str) and content.strip():
                return content.strip()
    except Exception:
        return None

    return None


async def _call_local(messages: list[dict[str, str]]) -> str | None:
    base_url = settings.LOCAL_LLM_BASE_URL.rstrip("/")
    endpoint = base_url if base_url.endswith("/chat/completions") else f"{base_url}/chat/completions"

    headers = {"Content-Type": "application/json"}
    if settings.LOCAL_LLM_API_KEY:
        headers["Authorization"] = f"Bearer {settings.LOCAL_LLM_API_KEY}"

    try:
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                endpoint,
                headers=headers,
                json={
                    "model": settings.LOCAL_LLM_MODEL,
                    "messages": messages,
                    "temperature": 0.2,
                },
            )
            resp.raise_for_status()
            return _extract_openai_content(resp.json())
    except Exception:
        return None

    return None


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    context = _build_portfolio_context(db, user)
    history = [{"role": msg.role, "content": msg.content} for msg in payload.history]
    messages = _build_messages(payload.message, history, context)
    mode = _normalize_mode(payload.mode if payload.mode is not None else settings.LLM_MODE)

    llm_reply: str | None = None
    provider = "fallback"

    if mode == MODE_OPENAI:
        llm_reply = await _call_openai(messages)
        provider = "openai"
    elif mode == MODE_OLLAMA:
        llm_reply = await _call_ollama(messages)
        provider = "ollama"
    elif mode == MODE_LOCAL:
        llm_reply = await _call_local(messages)
        provider = "local"

    if llm_reply:
        return ChatResponse(reply=llm_reply, provider=provider)

    return ChatResponse(reply=_fallback_reply(payload.message, context), provider="fallback")
