from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Optional
import json

from app.core.database import get_db
from app.models.models import Room, Film, Message, User
from app.core.auth import get_current_user
from app.ml.ml_service import ml_service

router = APIRouter()

class MemberScore(BaseModel):
    name: str
    matchScore: int

class RecFilmOut(BaseModel):
    film: dict
    groupScore: int
    memberBreakdown: List[MemberScore]

class RecommendationsResponse(BaseModel):
    discussionRecommendations: List[RecFilmOut]
    smartRecommendations: List[RecFilmOut]
    allFavoriteGenres: List[str]

@router.post("/rooms/{code}/recommendations/refresh", response_model=RecommendationsResponse)
@router.get("/rooms/{code}/recommendations", response_model=RecommendationsResponse)
async def get_room_recommendations(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    room_result = await db.execute(select(Room).where(Room.code == code.upper()))
    room = room_result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

    members = room.members
    if not members:
        return RecommendationsResponse(
            discussionRecommendations=[],
            smartRecommendations=[],
            allFavoriteGenres=[]
        )

    all_favorite_genres = []
    genre_weights = {}
    for member in members:
        for g in member.favorite_genres:
            if g not in all_favorite_genres:
                all_favorite_genres.append(g)
            genre_weights[g] = genre_weights.get(g, 0) + 1

    messages_result = await db.execute(
        select(Message)
        .where(Message.room_id == room.id)
        .order_by(Message.created_at.desc())
        .limit(30)
    )
    chat_messages = messages_result.scalars().all()

    chat_text = " ".join([msg.content.lower() for msg in chat_messages])

    chat_keywords = []
    keyword_genres = {
        "пират": ["Приключения", "Боевик"],
        "приключени": ["Приключения", "Фэнтези"],
        "любов": ["Мелодрама", "Драма"],
        "романтик": ["Мелодрама", "Комедия"],
        "смех": ["Комедия"],
        "юмор": ["Комедия"],
        "комеди": ["Комедия"],
        "страх": ["Ужасы", "Триллер"],
        "ужас": ["Ужасы", "Триллер"],
        "детектив": ["Детектив", "Триллер"],
        "фантастик": ["Фантастика"],
        "космос": ["Фантастика"],
        "боевик": ["Боевик"],
        "экшн": ["Боевик"],
        "драма": ["Драма"],
        "мульт": ["Мультфильм", "Семейный"],
        "семья": ["Семейный"],
        "принцесс": ["Мультфильм", "Семейный", "Приключения"],
        "роман": ["Мелодрама", "Драма"],
        "свадьб": ["Мелодрама", "Семейный"],
        "войн": ["Военный", "Боевик"],
        "истори": ["Исторический", "Драма"],
        "ужастик": ["Ужасы", "Триллер"],
        "монстр": ["Ужасы", "Фэнтези"],
        "маги": ["Фэнтези", "Приключения"],
        "волшеб": ["Фэнтези", "Семейный"],
        "будущ": ["Фантастика"],
        "инопланет": ["Фантастика", "Приключения"],
        "преступ": ["Криминал", "Детектив"],
        "расследова": ["Детектив", "Триллер"],
        "стрельб": ["Боевик"],
        "погон": ["Боевик", "Приключения"],
        "дружб": ["Драма", "Семейный", "Комедия"],
        "смешн": ["Комедия"],
        "прикол": ["Комедия"],
    }

    chat_genres = []
    for keyword, genres in keyword_genres.items():
        if keyword in chat_text:
            chat_genres.extend(genres)
            chat_keywords.append(keyword)

    chat_genres = list(set(chat_genres))

    films_result = await db.execute(select(Film))
    all_films = films_result.scalars().all()

    room_films_ids = set(room.films)

    def calculate_film_group_score(film: Film, members_list: List[User]):
        total_score = 0
        breakdown = []

        film_genres = [g.strip() for g in film.genres.split(",") if g.strip()]

        for m in members_list:
            m_genres = set(m.favorite_genres)
            matched = m_genres.intersection(film_genres)

            genre_score = min(len(matched) * 20, 60)
            rating_score = int(film.rating * 4)

            user_score = genre_score + rating_score
            user_score = min(max(user_score, 10), 100)

            breakdown.append(MemberScore(name=m.name, matchScore=user_score))
            total_score += user_score

        avg_score = int(total_score / len(members_list)) if members_list else 0
        return avg_score, breakdown

    scored_all_films = []
    for film in all_films:
        avg, breakdown = calculate_film_group_score(film, members)

        chat_score = 0
        film_genres_lower = [g.strip().lower() for g in film.genres.split(",") if g.strip()]
        film_title_lower = film.title.lower()

        for chat_genre in chat_genres:
            if chat_genre.lower() in film_genres_lower:
                chat_score += 25

        for keyword in chat_keywords:
            if keyword in film_title_lower:
                chat_score += 30

        if "пират" in chat_text and "пират" in film_title_lower:
            chat_score += 40
        if "принцесс" in chat_text and ("принцесс" in film_title_lower or "король" in film_title_lower):
            chat_score += 40
        if "любов" in chat_text and ("любов" in film_title_lower or "роман" in film_title_lower):
            chat_score += 30
        if "ужас" in chat_text and ("ужас" in film_title_lower or "страх" in film_title_lower or "монстр" in film_title_lower):
            chat_score += 30
        if "комеди" in chat_text and ("комеди" in film_title_lower or "смеш" in film_title_lower):
            chat_score += 30
        if "фантастик" in chat_text and ("фантастик" in film_title_lower or "космос" in film_title_lower):
            chat_score += 30
        if "боевик" in chat_text and ("боевик" in film_title_lower or "экшн" in film_title_lower):
            chat_score += 30

        chat_score = min(chat_score, 80)

        chat_weight = 0.8
        genre_weight = 0.2
        final_score = int((avg * genre_weight) + (chat_score * chat_weight))
        final_score = min(final_score, 100)

        scored_all_films.append({
            "film": {
                "id": film.id,
                "title": film.title,
                "description": film.description,
                "rating": film.rating,
                "year": film.year,
                "genres": film.genres,
                "tags": film.tags,
                "poster_url": film.poster_url,
            },
            "groupScore": final_score,
            "memberBreakdown": breakdown
        })

    scored_all_films.sort(key=lambda x: x["groupScore"], reverse=True)

    disc_recs = []
    for f in scored_all_films:
        if f["film"]["id"] in room_films_ids:
            disc_recs.append(RecFilmOut(**f))

    smart_recs = []
    count = 0
    for f in scored_all_films:
        if f["film"]["id"] not in room_films_ids:
            smart_recs.append(RecFilmOut(**f))
            count += 1
            if count >= 6:
                break

    try:
        if chat_text:
            explanation, matched_film_ids, keywords = await ml_service.generate_middle_ground(
                chat_text,
                [f.title for f in all_films]
            )
            room.ai_analysis = {
                "explanation": explanation,
                "matchedFilmIds": matched_film_ids,
                "combinedKeywords": keywords
            }
            db.add(room)
            await db.commit()
    except Exception:
        pass

    return RecommendationsResponse(
        discussionRecommendations=disc_recs,
        smartRecommendations=smart_recs,
        allFavoriteGenres=all_favorite_genres
    )