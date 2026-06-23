from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    favorite_genres: List[str] = []

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    favorite_genres: List[str]
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: UserOut

class RoomCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class RoomJoin(BaseModel):
    code: str = Field(..., min_length=5, max_length=5)

class FilmAddRequest(BaseModel):
    film_id: str

class RatingCreate(BaseModel):
    film_id: str
    score: float = Field(..., ge=0, le=10)

class FilmOut(BaseModel):
    id: str
    title: str
    original_title: Optional[str]
    genres: List[str]
    description: Optional[str]
    release_year: int
    rating: float
    poster_url: Optional[str]
    tags: List[str]
    class Config:
        from_attributes = True

class RoomOut(BaseModel):
    id: str
    code: str
    name: str
    creator_id: str
    created_at: datetime
    members: List[UserOut]
    films: List[FilmOut]
    class Config:
        from_attributes = True

class SearchQuery(BaseModel):
    query: str
    type: str = "phrase"

class MemberMatch(BaseModel):
    userName: str
    matchPercent: int
    matchingGenres: List[str]

class RecommendationItem(BaseModel):
    film: FilmOut
    groupScore: float
    baseScore: float
    addedBy: Optional[str] = None
    memberBreakdown: List[MemberMatch] = []

class RecommendationResponse(BaseModel):
    discussionRecommendations: List[RecommendationItem]
    smartRecommendations: List[RecommendationItem]
    explanation: str
    allFavoriteGenres: List[str]