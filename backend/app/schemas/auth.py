from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    role: str = "researcher"  # researcher|management|admin


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
