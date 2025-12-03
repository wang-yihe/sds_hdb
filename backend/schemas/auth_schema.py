from pydantic import BaseModel, EmailStr
#update to using beanie model IF accessing the DB
class LoginRequest(BaseModel):
    """Login request body"""
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    """User response model"""
    id: str
    name: str
    email: str
    is_active: bool

class LoginResponse(BaseModel):
    """Login response with token"""
    access_token: str
    token_type: str
    user: UserResponse

class TokenValidationResponse(BaseModel):
    """Token validation response"""
    valid: bool
    user: UserResponse | None = None