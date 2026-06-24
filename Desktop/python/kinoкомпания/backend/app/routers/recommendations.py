from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Set

from app.core.database import get_db
from app.models.models import Room, Film, User
from app.schemas.schemas import RecommendationResponse, RecommendationItem, MemberMatch, FilmOut
from app.core.auth import get_current_user

router = APIRouter(prefix="/api/rooms", tags=["Recommendations"])

def calculate_least_misery(film: Film, members: List[User]) -> float:
    min_match = float('inf')
    for member in members:
        fav = set(member.favorite_genres)
        matching = [g for g in film.genres if g in fav]
        match_ratio = len(matching) / max(1, len(film.genres))
        if match_ratio < min_match:
            min_match = match_ratio
    return min_match

@router.get("/{code}/recommendations", response_model=RecommendationResponse)
async def get_recommendations(
        code: str,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Room)
        .options(
            selectinload(Room.members),
            selectinload(Room.films)
        )
        .where(Room.code == code.upper())
    )
    room = result.scalar_one_or_none()

    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

    if current_user not in room.members:
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    members = room.members
    members_count = len(members)

    if members_count == 0:
        return RecommendationResponse(
            discussionRecommendations=[],
            smartRecommendations=[],
            explanation="В комнате нет участников",
            allFavoriteGenres=[]
        )

    all_genres: Set[str] = set()
    for member in members:
        all_genres.update(member.favorite_genres)

    discussion_recs = []
    for film in room.films:
        breakdown = []
        multipliers_sum = 0.0

        for member in members:
            fav = set(member.favorite_genres)
            matching = [g for g in film.genres if g in fav]
            match_ratio = len(matching) / max(1, len(film.genres))
            multiplier = 0.7 + 0.6 * match_ratio
            multipliers_sum += multiplier

            breakdown.append(MemberMatch(
                userName=member.name,
                matchPercent=int(match_ratio * 100),
                matchingGenres=matching
            ))

        avg_multiplier = multipliers_sum / members_count
        group_score = round(film.rating * avg_multiplier, 2)

        discussion_recs.append(RecommendationItem(
            film=FilmOut.model_validate(film),
            groupScore=group_score,
            baseScore=film.rating,
            memberBreakdown=breakdown
        ))

    discussion_recs.sort(key=lambda x: x.groupScore, reverse=True)

    all_films_result = await db.execute(select(Film))
    all_films = all_films_result.scalars().all()

    discussion_ids = {f.id for f in room.films}
    candidates = [f for f in all_films if f.id not in discussion_ids]

    smart_recs = []
    for film in candidates:
        if not set(film.genres) & all_genres:
            continue

        breakdown = []
        multipliers_sum = 0.0

        for member in members:
            fav = set(member.favorite_genres)
            matching = [g for g in film.genres if g in fav]
            match_ratio = len(matching) / max(1, len(film.genres))
            multiplier = 0.7 + 0.6 * match_ratio
            multipliers_sum += multiplier

            breakdown.append(MemberMatch(
                userName=member.name,
                matchPercent=int(match_ratio * 100),
                matchingGenres=matching
            ))

        avg_multiplier = multipliers_sum / members_count
        group_score = round(film.rating * avg_multiplier, 2)

        smart_recs.append(RecommendationItem(
            film=FilmOut.model_validate(film),
            groupScore=group_score,
            baseScore=film.rating,
            memberBreakdown=breakdown
        ))

    smart_recs.sort(key=lambda x: x.groupScore, reverse=True)
    smart_recs = smart_recs[:5]

    members_names = ", ".join([m.name for m in members])
    genres_text = ", ".join(list(all_genres)) if all_genres else "разные жанры"

    explanation = (
        f"Привет, {members_names}! 🎬\n"
        f"Ваша компания интересуется: {genres_text}.\n"
    )

    if discussion_recs:
        top = discussion_recs[0]
        explanation += (
            f"Лучший выбор из обсуждения — '{top.film.title}' "
            f"с групповым баллом {top.groupScore}!"
        )
    elif smart_recs:
        top = smart_recs[0]
        explanation += (
            f"Рекомендуем '{top.film.title}' "
            f"(групповой балл: {top.groupScore})"
        )
    else:
        explanation += "Добавьте фильмы в обсуждение!"

    return RecommendationResponse(
        discussionRecommendations=discussion_recs,
        smartRecommendations=smart_recs,
        explanation=explanation,
        allFavoriteGenres=list(all_genres)
    )