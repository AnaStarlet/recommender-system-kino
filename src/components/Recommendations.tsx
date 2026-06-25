import React from "react";
import { Sparkles, MessageCircle, RefreshCw, AlertCircle, Bookmark } from "lucide-react";
import { RecommendationResponse, Film } from "../api/api";
import { FilmCard } from "./FilmCard";
import { motion, AnimatePresence } from "motion/react";

interface RecommendationsProps {
  data: RecommendationResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
  onAddFilmToDiscussion?: (filmId: string) => void;
  roomFilmsIds: string[];
}

export const Recommendations: React.FC<RecommendationsProps> = ({
  data,
  isLoading,
  onRefresh,
  onAddFilmToDiscussion,
  roomFilmsIds
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-[#0f1115]/40 border border-white/10 rounded-2xl min-h-[300px]">
        <RefreshCw size={36} className="text-amber-500 animate-spin mb-4" />
        <h3 className="font-display font-semibold text-white">Вычисляем групповые совпадения...</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
          Нейросеть сопоставляет любимые жанры всех участников с каталогом фильмов и считает оптимальный рейтинг...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#0f1115]/40 border border-white/10 rounded-2xl text-center min-h-[250px]">
        <AlertCircle size={32} className="text-slate-500 mb-3" />
        <h3 className="font-display font-medium text-slate-300">Рекомендации еще не сформированы</h3>
        <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
          Добавьте хотя бы одного участника в комнату и заполните предпочтения, чтобы начать.
        </p>
        <button
          onClick={onRefresh}
          className="mt-4 bg-[#0a0b0d] hover:bg-[#0f1115] text-slate-200 text-xs font-semibold py-2 px-4 rounded-xl border border-white/10 transition cursor-pointer"
        >
          Рассчитать сейчас
        </button>
      </div>
    );
  }

  const { discussionRecommendations, smartRecommendations, explanation, allFavoriteGenres } = data;

  return (
    <div className="space-y-8">
      {/* ИИ ВЕРДИКТ И СОВЕТЫ НА ВЕЧЕР */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-gradient-to-r from-amber-500/10 via-amber-950/5 to-[#0f1115] border border-amber-500/20 p-6 rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 -translate-y-6 translate-x-6 w-32 h-32 bg-amber-500/5 blur-2xl rounded-full" />
        <div className="absolute bottom-0 left-0 translate-y-6 -translate-x-6 w-32 h-32 bg-amber-600/5 blur-2xl rounded-full" />

        <div className="flex items-start gap-4">
          <div className="bg-amber-500 p-3 rounded-2xl shadow-lg border border-white/10 shrink-0">
            <Sparkles size={20} className="text-black animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-bold text-amber-400 tracking-wide uppercase">
                Групповой ИИ-Вердикт для вашей компании
              </h3>
            </div>
            <p className="text-sm text-slate-100 leading-relaxed font-sans font-medium">
              "{explanation}"
            </p>
            <div className="flex items-center gap-2 flex-wrap pt-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">
                Основные общие жанры:
              </span>
              {allFavoriteGenres.length > 0 ? (
                allFavoriteGenres.map((g) => (
                  <span
                    key={g}
                    className="text-[10px] font-mono text-emerald-300 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/30"
                  >
                    {g}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-slate-500 font-mono">пока не заполнены у друзей</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ТОП-5 ИЗ ОБСУЖДЕНИЯ */}
      <div className="space-y-4">
        <div className="flex items-end justify-between border-b border-white/10 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bookmark size={18} className="text-amber-500" />
              <h2 className="font-display font-bold text-xl text-white">
                Рейтинг добавленных к обсуждению
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Фильмы, предложенные вашими друзьями, взвешенные по предпочтениям группы
            </p>
          </div>
          
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 bg-[#0f1115] hover:bg-[#0a0b0d] text-slate-300 text-xs px-3.5 py-1.5 rounded-xl border border-white/10 transition shadow cursor-pointer"
          >
            <RefreshCw size={12} className="text-amber-500" />
            Обновить
          </button>
        </div>

        {discussionRecommendations.length === 0 ? (
          <div className="p-8 bg-black/20 border border-dashed border-white/5 rounded-2xl text-center text-slate-500 text-xs leading-relaxed font-mono">
            В обсуждении комнаты пока нет фильмов. Найдите фильмы выше по названию или по смыслу и добавьте их, чтобы рассчитать групповые баллы!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {discussionRecommendations.map((item, index) => (
                <div key={item.film.id} className="relative">
                  {/* Позиция фильма */}
                  <div className="absolute -top-3 -left-3 z-10 w-8 h-8 rounded-full bg-[#0a0b0d] border border-white/10 flex items-center justify-center font-display font-black text-xs text-amber-500 shadow-xl">
                    #{index + 1}
                  </div>
                  <FilmCard
                    film={item.film}
                    matchScore={item.groupScore}
                    isAddedInRoom={true}
                    addedBy={item.addedBy || "Другом"}
                    hasDetails={true}
                    memberMatches={item.memberBreakdown}
                  />
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* УМНЫЙ АВТОПОДБОР ИЗ КАТАЛОГА */}
      <div className="space-y-4">
        <div className="space-y-1 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            <h2 className="font-display font-bold text-xl text-white">
              Нейросетевые рекомендации (Автоподбор)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Идеально подходящие под совокупные вкусы вашей компании фильмы из всего нашего каталога
          </p>
        </div>

        {smartRecommendations.length === 0 ? (
          <div className="p-8 bg-black/20 border border-white/5 rounded-2xl text-center text-slate-500 text-xs font-mono">
            По вашим жанрам не удалось сделать интеллектуальный подбор. Смените интересы.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {smartRecommendations.map((item) => {
              const isAdded = roomFilmsIds.includes(item.film.id);
              return (
                <FilmCard
                  key={item.film.id}
                  film={item.film}
                  matchScore={item.groupScore}
                  isAddedInRoom={isAdded}
                  onAdd={onAddFilmToDiscussion}
                  hasDetails={true}
                  memberMatches={item.memberBreakdown}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
