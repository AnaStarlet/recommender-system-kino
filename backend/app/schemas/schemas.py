from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any
from datetime import datetime

class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    favoriteGenres: List[str]

    class Config:
        from_attributes = True

class FilmOut(BaseModel):
    id: str
    title: str
    description: str
    rating: float
    year: int
    genres: str
    tags: str

    class Config:
        from_attributes = True

class MemberOut(BaseModel):
    user_id: str
    name: str
    favorite_genres: Optional[List[str]] = []
    joined_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class RoomOut(BaseModel):
    id: str
    code: str
    name: str
    creator_id: str
    current_video_url: Optional[str] = None
    members: List[MemberOut]
    created_at: datetime
    chat: Optional[List[Any]] = []
    ai_analysis: Optional[Any] = None

    class Config:
        from_attributes = True