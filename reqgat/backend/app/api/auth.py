from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UpdateUserTypeRequest, UserOut
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED
)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user and create their tenant if it doesn't exist."""
    existing_email = await db.execute(select(User).where(User.email == body.email))
    if existing_email.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists. Please sign in or use a different email.",
        )

    existing_phone = await db.execute(
        select(User).where(User.phone_number == body.phone_number)
    )
    if existing_phone.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="An account with this phone number already exists. Please sign in or use a different number.",
        )

    tenant_result = await db.execute(
        select(Tenant).where(Tenant.name == body.tenant_name)
    )
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        tenant = Tenant(name=body.tenant_name)
        db.add(tenant)
        await db.flush()

    users_in_tenant = await db.execute(select(User).where(User.tenant_id == tenant.id))
    is_first = users_in_tenant.scalar_one_or_none() is None
    role = "admin" if is_first else "consultant"

    password_hash = hash_password(body.password)

    user = User(
        tenant_id=tenant.id,
        email=body.email,
        password_hash=password_hash,
        full_name=body.full_name,
        phone_number=body.phone_number,
        role=role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=user.role,
        full_name=user.full_name,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate a user and return a JWT token."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    try:
        is_valid = user is not None and verify_password(
            body.password, user.password_hash
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    expires = (
        settings.REMEMBER_ME_EXPIRE_MINUTES if body.remember_me else None
    )
    token = create_access_token({"sub": str(user.id)}, expires_minutes=expires)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=user.role,
        full_name=user.full_name,
    )


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user


@router.patch("/me/user-type", response_model=UserOut)
async def update_user_type(
    body: UpdateUserTypeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set the current user's user type (service_provider or service_consumer)."""
    current_user.user_type = body.user_type
    await db.commit()
    await db.refresh(current_user)
    return current_user
