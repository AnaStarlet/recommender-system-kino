import React from "react";
import { Sparkles, RefreshCw, Bookmark, Star } from "lucide-react";
import { Film } from "../types";
import { FilmCard } from "./FilmCard";
import { motion, AnimatePresence } from "motion/react";

interface RecommendationsProps {
  roomCode: string;
  roomFilmsIds: string[];
  allFavoriteGenres: string[];
  discussionRecommendations: any[];
  smartRecommendations: any[];
  aiAnalysis?: {
    explanation: string;
    matchedFilmIds: string[];
    combinedKeywords: string[];
  };
  isLoading: boolean;
  onRefresh: () => void;
  onAddFilm: (id: string) => void;
  onRemoveFilm: (id: string) => void;
}

export const Recommendations: React.FC<RecommendationsProps> = ({
  roomCode,
  roomFilmsIds,
  allFavoriteGenres,
  discussionRecommendations,
  smartRecommendations,
  aiAnalysis,
  isLoading,
  onRefresh,
  onAddFilm,
  onRemoveFilm,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-100 rounded-3xl min-h-[300px]">
        <RefreshCw size={36} className="text-rose-500 animate-spin mb-4" />
        <h3 className="font-display font-bold text-slate-800 text-lg">Вычисляем групповые совпадения...</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-sm text-center font-medium leading-relaxed">
          Наш алгоритм сопоставляет любимые жанры всех участников комнаты, анализирует пожелания из чата и вычисляет идеальный компромисс...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Групповой ИИ-Вердикт */}
      {aiAnalysis && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-gradient-to-r from-rose-500/10 via-rose-50/10 to-slate-50/20 border border-rose-500/20 p-6 rounded-3xl overflow-hidden shadow-sm"
        >
          <div className="absolute top-0 right-0 -translate-y-6 translate-x-6 w-32 h-32 bg-rose-500/5 blur-2xl rounded-full" />
          
          <div className="flex items-start gap-4">
            <div className="bg-rose-500 p-3 rounded-2xl shadow-md border border-rose-400 shrink-0">
              <Sparkles size={20} className="text-white animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-xs font-black text-rose-600 tracking-wider uppercase">
                  ИИ-Анализ ваших предпочтений в чате
                </h3>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed font-semibold">
                "{aiAnalysis.explanation}"
              </p>
              {aiAnalysis.combinedKeywords && aiAnalysis.combinedKeywords.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Объединенные интересы:
                  </span>
                  {aiAnalysis.combinedKeywords.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. Текущий список обсуждения */}
      <div className="space-y-4">
        <div className="flex items-end justify-between border-b border-slate-100 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bookmark size={18} className="text-rose-500" />
              <h2 className="font-display font-black text-xl text-slate-800">
                Фильмы в обсуждении ({roomFilmsIds.length})
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Фильмы, добавленные друзьями или предложенные ИИ под ваши пожелания
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold px-3.5 py-1.5 rounded-xl border border-slate-200 transition shadow-sm cursor-pointer"
          >
            <RefreshCw size={12} className="text-rose-500" />
            Пересчитать баллы
          </button>
        </div>

        {discussionRecommendations.length === 0 ? (
          <div className="p-10 bg-slate-50 border-2 border-dashed border-slate-100 rounded-3xl text-center text-slate-400 text-xs font-medium leading-relaxed">
            В обсуждении комнаты пока нет фильмов. Напишите пожелание в чат слева или воспользуйтесь поиском фильмов, чтобы ИИ нашел для вас компромисс!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {discussionRecommendations.map((item, index) => (
                <div key={item.film.id} className="relative">
                  <div className="absolute -top-3 -left-3 z-10 w-8 h-8 rounded-full bg-slate-800 border-2 border-white flex items-center justify-center font-display font-black text-xs text-rose-400 shadow-md">
                    #{index + 1}
                  </div>
                  <FilmCard
                    film={item.film}
                    groupScore={item.groupScore}
                    isAddedInRoom={true}
                    onRemove={onRemoveFilm}
                    memberBreakdown={item.memberBreakdown}
                  />
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 3. Умные автоматические ИИ-рекомендации */}
      <div className="space-y-4">
        <div className="space-y-1 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-rose-500" />
            <h2 className="font-display font-black text-xl text-slate-800">
              Умный ИИ-автоподбор
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Фильмы из общего каталога, которые лучше всего соответствуют общим интересам вашей компании
          </p>
        </div>

        {smartRecommendations.length === 0 ? (
          <div className="p-8 bg-slate-50 border border-slate-100 rounded-3xl text-center text-slate-400 text-xs font-medium">
            По вашим любимым жанрам не найдено других рекомендаций. Попробуйте обновить любимые жанры в профиле!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {smartRecommendations.map((item) => {
              const isAdded = roomFilmsIds.includes(item.film.id);
              return (
                <FilmCard
                  key={item.film.id}
                  film={item.film}
                  groupScore={item.groupScore}
                  isAddedInRoom={isAdded}
                  onAdd={onAddFilm}
                  memberBreakdown={item.memberBreakdown}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
