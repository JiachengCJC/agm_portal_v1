import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.project import Project
from app.models.audit import AuditLog

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.post("/amgrant/ingest")
async def ingest_amgrant_csv(
    file: UploadFile = File(..., description="Mock AMGrant export as CSV"),
    db: Session = Depends(get_db),
    user=Depends(require_role("management", "admin")),
):
    """Read-only integration MVP.

    Expected columns (mocked):
    - title,institution,domain,ai_type,maturity_stage,status,risk_level,compliance_status,funding_amount_sgd

    For conflicts: we create a new Project if exact title+institution does not exist; otherwise update fields.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    content = (await file.read()).decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(content))

    created = 0
    updated = 0

    for row in reader:
        title = (row.get("title") or "").strip()
        institution = (row.get("institution") or "").strip()

        # If the row is missing a title or institution (maybe 
        # it's a blank row at the end of the file), it skips it and moves to the next one.
        if not title or not institution:
            continue

        project = (
            db.query(Project)
            .filter(Project.title == title)
            .filter(Project.institution == institution)
            .first()
        )

        # The or "Default Value" logic ensures that if the CSV leaves a cell blank, 
        # your database won't complain about missing data; 
        # it will just slot in a safe default (like "General" or "Medium").
        fields = {
            "domain": (row.get("domain") or "General").strip(),
            "ai_type": (row.get("ai_type") or "Unknown").strip(),
            "maturity_stage": (row.get("maturity_stage") or "Discovery").strip(),
            "status": (row.get("status") or "Active").strip(),
            "risk_level": (row.get("risk_level") or "Medium").strip(),
            "compliance_status": (row.get("compliance_status") or "Not Started").strip(),
        }

        funding_raw = (row.get("funding_amount_sgd") or "").strip()
        if funding_raw:
            try:
                fields["funding_amount_sgd"] = float(funding_raw)
            except ValueError:
                pass

        # If the database lookup earlier found nothing, we create a new Project
        if project is None:
            # For MVP: ingested projects owned by management user to keep simple.
            project = Project(title=title, institution=institution, owner_id=user.id, **fields)
            db.add(project)
            db.flush()
            db.add(
                AuditLog(
                    actor_user_id=user.id,
                    action="INGEST",
                    entity_type="Project",
                    entity_id=project.id,
                    diff_json=AuditLog.dumps({"source": file.filename, "row": row}),
                )
            )
            created += 1
        else:
            for k, v in fields.items():
                setattr(project, k, v)
            db.add(
                AuditLog(
                    actor_user_id=user.id,
                    action="INGEST",
                    entity_type="Project",
                    entity_id=project.id,
                    diff_json=AuditLog.dumps({"source": file.filename, "row": row}),
                )
            )
            updated += 1

    db.commit()
    return {"created": created, "updated": updated}
