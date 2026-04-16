import re
import uuid

from pydantic import BaseModel, EmailStr, field_validator, model_validator


class RegisterRequest(BaseModel):
    tenant_name: str
    full_name: str
    email: EmailStr
    phone_number: str
    password: str
    confirm_password: str

    @field_validator("email")
    @classmethod
    def validate_corporate_email(cls, v: str) -> str:
        FREE_DOMAINS = {
            "gmail.com", "yahoo.com", "yahoo.co.in", "hotmail.com", "outlook.com",
            "aol.com", "icloud.com", "mail.com", "protonmail.com", "zoho.com",
            "yandex.com", "gmx.com", "live.com", "me.com", "msn.com",
            "rediffmail.com",
        }
        domain = v.rsplit("@", 1)[-1].lower()
        if domain in FREE_DOMAINS:
            raise ValueError("Please use a corporate email address")
        return v

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"[\s\-\(\)]", "", v)
        if not re.match(r"^\+\d{1,3}\d{6,14}$", cleaned):
            raise ValueError("Phone number must include country code (e.g. +911234567890)")
        return cleaned

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[^A-Za-z0-9]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: uuid.UUID
    tenant_id: uuid.UUID
    role: str
    full_name: str


class UserOut(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    full_name: str
    phone_number: str | None = None
    role: str
    user_type: str | None = None

    model_config = {"from_attributes": True}


class UpdateUserTypeRequest(BaseModel):
    user_type: str

    @field_validator("user_type")
    @classmethod
    def validate_user_type(cls, v: str) -> str:
        allowed = {"service_provider", "service_consumer"}
        if v not in allowed:
            raise ValueError(f"user_type must be one of: {', '.join(sorted(allowed))}")
        return v
