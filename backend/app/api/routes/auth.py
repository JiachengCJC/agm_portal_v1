from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.core.security import hash_password, verify_password, create_access_token
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.auth import UserCreate, UserOut, Token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut)
def register(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_role("admin", "management")),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    # if the email already exists
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    db.add(
        AuditLog(
            actor_user_id=_user.id,
            action="CREATE_USER",
            entity_type="User",
            entity_id=user.id,
            diff_json=AuditLog.dumps({"email": user.email, "role": user.role}),
        )
    )
    db.commit()
    return user


@router.get("/users", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _user=Depends(require_role("admin", "management")),
):
    return db.query(User).order_by(User.created_at.desc()).all()

# You won’t type form fields manually; frontend handles it for you.
# But this endpoint is still called during login.

# OAuth2PasswordRequestForm: This is a standard FastAPI tool that 
# extracts the username (email) and password from the login request.
@router.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        if user:
            db.add(
                AuditLog(
                    actor_user_id=user.id,
                    action="LOGIN_FAILED",
                    entity_type="User",
                    entity_id=user.id,
                    diff_json=AuditLog.dumps({"email": user.email}),
                )
            )
            db.commit()
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    db.add(
        AuditLog(
            actor_user_id=user.id,
            action="LOGIN",
            entity_type="User",
            entity_id=user.id,
            diff_json=AuditLog.dumps({"email": user.email}),
        )
    )
    db.commit()

    token = create_access_token(subject=user.email, role=user.role)
    return Token(access_token=token)
    
"""
SessionLocal is the automatic machine that stays in the background, 
while a Session is the active connection that comes out of that machine whenever 
you need to save or read data.
"""
