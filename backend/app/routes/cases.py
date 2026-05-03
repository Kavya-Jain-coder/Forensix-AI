from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models import Case, CaseStatus, CaseType, CasePriority, UserRole, AuditAction, User
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
    case_type: Optional[CaseType] = CaseType.OTHER
    priority: Optional[CasePriority] = CasePriority.MEDIUM
    fir_number: Optional[str] = None
    investigating_agency: Optional[str] = None
    court_deadline: Optional[datetime] = None
    assigned_officer_id: Optional[str] = None


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CaseStatus] = None
    case_type: Optional[CaseType] = None
    priority: Optional[CasePriority] = None
    fir_number: Optional[str] = None
    investigating_agency: Optional[str] = None
    court_deadline: Optional[datetime] = None
    assigned_officer_id: Optional[str] = None


class CaseOut(BaseModel):
    id: str
    case_number: str
    title: str
    description: Optional[str]
    status: CaseStatus
    case_type: Optional[CaseType]
    priority: Optional[CasePriority]
    fir_number: Optional[str]
    investigating_agency: Optional[str]
    court_deadline: Optional[datetime]
    assigned_officer_id: Optional[str]
    created_by_id: str
    created_at: datetime
    updated_at: Optional[datetime]
    evidence_count: int = 0
    report_count: int = 0
    report_status_summary: Optional[str] = None  # ai_draft / under_review / approved / exported / none
    created_by_name: Optional[str] = None

    class Config:
        from_attributes = True


def build_case_out(case: Case, db=None) -> CaseOut:
    out = CaseOut.model_validate(case)
    out.evidence_count = len(case.evidence)
    out.report_count = len(case.reports)
    if case.reports:
        # Show the most advanced report status
        priority_order = ['exported', 'approved', 'under_review', 'needs_correction', 'ai_draft']
        statuses = [r.status.value for r in case.reports]
        for s in priority_order:
            if s in statuses:
                out.report_status_summary = s
                break
    else:
        out.report_status_summary = 'none'
    if db and case.created_by_id:
        creator = db.query(User).filter(User.id == case.created_by_id).first()
        out.created_by_name = creator.full_name if creator else None
    return out


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
        case_type=data.case_type,
        priority=data.priority,
        fir_number=data.fir_number,
        investigating_agency=data.investigating_agency,
        court_deadline=data.court_deadline,
        assigned_officer_id=data.assigned_officer_id,
        created_by_id=current_user.id,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    log_action(db, AuditAction.CASE_CREATED, user_id=current_user.id, case_id=case.id,
               details={"title": case.title, "case_number": case.case_number}, ip=get_client_ip(request))
    return build_case_out(case, db)


@router.get("", response_model=List[CaseOut])
async def list_cases(
    search: Optional[str] = Query(None),
    status: Optional[CaseStatus] = Query(None),
    case_type: Optional[CaseType] = Query(None),
    priority: Optional[CasePriority] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Case)
    if current_user.role != UserRole.ADMIN:
        q = q.filter(
            (Case.created_by_id == current_user.id) |
            (Case.assigned_officer_id == current_user.id)
        )
    if search:
        q = q.filter(or_(
            Case.title.ilike(f"%{search}%"),
            Case.case_number.ilike(f"%{search}%"),
            Case.fir_number.ilike(f"%{search}%"),
            Case.investigating_agency.ilike(f"%{search}%"),
        ))
    if status:
        q = q.filter(Case.status == status)
    if case_type:
        q = q.filter(Case.case_type == case_type)
    if priority:
        q = q.filter(Case.priority == priority)

    cases = q.order_by(Case.created_at.desc()).all()
    return [build_case_out(c, db) for c in cases]


@router.get("/{case_id}", response_model=CaseOut)
async def get_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return build_case_out(case, db)


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
    return build_case_out(case, db)


@router.get("/{case_id}/timeline")
async def get_case_timeline(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models import AuditLog, Evidence, Report
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    logs = db.query(AuditLog).filter(AuditLog.case_id == case_id).order_by(AuditLog.timestamp).all()
    timeline = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        timeline.append({
            "timestamp": log.timestamp.isoformat(),
            "action": log.action.value,
            "user": user.full_name if user else "System",
            "role": user.role.value if user else "",
            "details": log.details,
            "ip": log.ip_address,
        })
    return timeline
