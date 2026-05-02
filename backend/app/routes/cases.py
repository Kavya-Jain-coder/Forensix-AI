from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Case, CaseStatus, UserRole, AuditAction, User
from app.auth import get_current_user, require_roles, log_action, get_client_ip
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

router = APIRouter(prefix="/cases", tags=["cases"])


def gen_case_number():
    return f"CASE-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"


class CaseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_officer_id: Optional[str] = None


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CaseStatus] = None
    assigned_officer_id: Optional[str] = None


class CaseOut(BaseModel):
    id: str
    case_number: str
    title: str
    description: Optional[str]
    status: CaseStatus
    assigned_officer_id: Optional[str]
    created_by_id: str
    created_at: datetime
    updated_at: Optional[datetime]
    evidence_count: int = 0
    report_count: int = 0

    class Config:
        from_attributes = True


@router.post("", response_model=CaseOut)
async def create_case(
    data: CaseCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.FORENSIC_OFFICER, UserRole.INVESTIGATOR)),
):
    case = Case(
        case_number=gen_case_number(),
        title=data.title,
        description=data.description,
        assigned_officer_id=data.assigned_officer_id,
        created_by_id=current_user.id,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    log_action(db, AuditAction.CASE_CREATED, user_id=current_user.id, case_id=case.id,
               details={"title": case.title, "case_number": case.case_number}, ip=get_client_ip(request))
    result = CaseOut.model_validate(case)
    result.evidence_count = len(case.evidence)
    result.report_count = len(case.reports)
    return result


@router.get("", response_model=List[CaseOut])
async def list_cases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.ADMIN:
        cases = db.query(Case).order_by(Case.created_at.desc()).all()
    else:
        cases = db.query(Case).filter(
            (Case.created_by_id == current_user.id) |
            (Case.assigned_officer_id == current_user.id)
        ).order_by(Case.created_at.desc()).all()

    result = []
    for c in cases:
        out = CaseOut.model_validate(c)
        out.evidence_count = len(c.evidence)
        out.report_count = len(c.reports)
        result.append(out)
    return result


@router.get("/{case_id}", response_model=CaseOut)
async def get_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    out = CaseOut.model_validate(case)
    out.evidence_count = len(case.evidence)
    out.report_count = len(case.reports)
    return out


@router.patch("/{case_id}", response_model=CaseOut)
async def update_case(
    case_id: str,
    data: CaseUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.FORENSIC_OFFICER)),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(case, field, value)
    db.commit()
    db.refresh(case)
    log_action(db, AuditAction.CASE_UPDATED, user_id=current_user.id, case_id=case.id,
               details=data.model_dump(exclude_none=True), ip=get_client_ip(request))
    out = CaseOut.model_validate(case)
    out.evidence_count = len(case.evidence)
    out.report_count = len(case.reports)
    return out
