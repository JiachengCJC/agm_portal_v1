from typing import Literal

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    role: Literal["researcher", "management", "admin"] = "researcher"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None
    role: Literal["researcher", "management", "admin"]


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
