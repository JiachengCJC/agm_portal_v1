from collections import Counter
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


def _format_counter(counter: Counter[str]) -> str:
    if not counter:
        return "None"
    return ", ".join(f"{key}: {value}" for key, value in counter.most_common())


def _build_portfolio_context(db: Session, user: User) -> dict[str, Any]:
    query = db.query(Project)
    if user.role == "researcher":
        query = query.filter(Project.owner_id == user.id)

    projects = query.order_by(Project.updated_at.desc()).limit(200).all()
    total = len(projects)
    active = sum(1 for p in projects if (p.status or "").lower() == "active")

    by_risk = Counter((p.risk_level or "Unknown") for p in projects)
    by_stage = Counter((p.maturity_stage or "Unknown") for p in projects)
    by_compliance = Counter((p.compliance_status or "Unknown") for p in projects)

    latest_titles = [p.title for p in projects[:5]]

    return {
        "total": total,
        "active": active,
        "risk": _format_counter(by_risk),
        "stage": _format_counter(by_stage),
        "compliance": _format_counter(by_compliance),
        "latest_titles": latest_titles,
    }


def _fallback_reply(message: str, context: dict[str, Any]) -> str:
    lower = message.lower()
    total = context["total"]
    active = context["active"]
    risk = context["risk"]
    stage = context["stage"]
    compliance = context["compliance"]
    latest_titles = context["latest_titles"]

    if any(k in lower for k in ("risk", "risky", "high risk")):
        return (
            f"Risk overview: {risk}. "
            "If you want, I can suggest which projects should be reviewed first."
        )

    if any(k in lower for k in ("compliance", "approval", "approved")):
        return (
            f"Compliance overview: {compliance}. "
            "Projects marked 'Not Started' or 'Needs Review' should be prioritized."
        )

    if any(k in lower for k in ("stage", "maturity", "progress")):
        return (
            f"Maturity-stage distribution: {stage}. "
            "I can help draft next actions for each stage."
        )

    if any(k in lower for k in ("summary", "overview", "portfolio", "status")):
        return (
            f"You have {total} total projects, with {active} currently active. "
            f"Risk levels: {risk}. Compliance: {compliance}."
        )

    latest = ", ".join(latest_titles) if latest_titles else "no recent projects yet"
    return (
        f"I can help with portfolio insights, risk, compliance, and project planning. "
        f"Current snapshot: {total} projects ({active} active). "
        f"Recent projects: {latest}."
    )


async def _call_openai(message: str, history: list[dict[str, str]], context: dict[str, Any]) -> str | None:
    if not settings.OPENAI_API_KEY:
        return None

    system_prompt = (
        "You are an AI assistant for an AI project management portal.\n"
        "Be concise and practical.\n"
        f"Portfolio context: total={context['total']}, active={context['active']}, "
        f"risk=({context['risk']}), maturity=({context['stage']}), compliance=({context['compliance']})."
    )

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history[-8:])
    messages.append({"role": "user", "content": message})

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
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
            data = resp.json()
            content = ((data.get("choices") or [{}])[0].get("message") or {}).get("content")
            if isinstance(content, str) and content.strip():
                return content.strip()
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

    llm_reply = await _call_openai(payload.message, history, context)
    if llm_reply:
        return ChatResponse(reply=llm_reply, provider="openai")

    return ChatResponse(reply=_fallback_reply(payload.message, context), provider="fallback")
