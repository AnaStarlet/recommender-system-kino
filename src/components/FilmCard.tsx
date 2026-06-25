import React from "react";
import { Star, Plus, Minus, User, Calendar, Tag } from "lucide-react";
import { Film } from "../api/api";
import { motion } from "motion/react";

interface FilmCardProps {
  film: Film;
  onAdd?: (id: string) => void;
  onRemove?: (id: string) => void;
  isAddedInRoom?: boolean;
  addedBy?: string;
  matchScore?: number; 
  hasDetails?: boolean;
  memberMatches?: Array<{
    userName: string;
    matchPercent: number;
    matchingGenres: string[];
  }>;
}

export const FilmCard: React.FC<FilmCardProps> = ({
  film,
  onAdd,
  onRemove,
  isAddedInRoom,
  addedBy,
  matchScore,
  hasDetails = false,
  memberMatches = []
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className="relative flex flex-col h-full bg-[#0f1115]/90 border border-white/10 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md transition-all duration-300 hover:border-amber-500/50"
    >
      {/* Иконка /  */}
      <div className="relative h-60 w-full overflow-hidden bg-[#0a0b0d]">
        <img
          src={film.posterUrl || "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&q=80"}
          alt={film.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-85 transition-transform duration-500 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0d] via-transparent to-transparent" />
        
        {/* Базовый Рейтинг Фильма */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-amber-400 border border-amber-500/20">
          <Star size={13} className="fill-amber-400" />
          <span>{film.rating.toFixed(1)}</span>
        </div>

        {/* Умный групповой балл, если рассчитан */}
        {matchScore !== undefined && (
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
            <div className="bg-amber-500 px-3 py-1.5 rounded-full text-xs font-bold text-black border border-white/20 shadow-lg shadow-amber-950/30">
              Групповой: {matchScore.toFixed(1)}
            </div>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex gap-1.5 flex-wrap">
            {film.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="bg-black/60 backdrop-blur-md text-slate-300 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md border border-white/5"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Описание фильма */}
      <div className="flex flex-col flex-grow p-4">
        <div className="mb-2">
          <h3 className="font-display font-bold text-lg text-white leading-tight mb-0.5 line-clamp-1">
            {film.title}
          </h3>
          <p className="text-xs text-slate-400 font-mono truncate">
            {film.originalTitle} • {film.releaseYear}
          </p>
        </div>

        <p className="text-xs text-slate-300 line-clamp-3 mb-4 leading-relaxed flex-grow">
          {film.description}
        </p>

        {/* Теги фильма */}
        {film.tags && film.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            <Tag size={10} className="text-amber-400" />
            {film.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[10px] text-amber-200 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Кем добавлен в чат комнаты */}
        {addedBy && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-black/40 p-2 rounded-xl border border-white/5 mb-4 font-mono">
            <User size={12} className="text-amber-400" />
            <span>Добавил: <b className="text-amber-200">{addedBy}</b></span>
          </div>
        )}

        {/* Детальный разбор вкусов каждого друга */}
        {hasDetails && memberMatches.length > 0 && (
          <div className="border-t border-white/10 pt-3 mt-1 mb-4 space-y-1.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Совпадение вкусов друзей:
            </span>
            <div className="space-y-1">
              {memberMatches.map((m) => {
                let badgeColor = "bg-rose-950/20 text-rose-300 border-rose-900/20";
                if (m.matchPercent >= 60) badgeColor = "bg-emerald-950/20 text-emerald-300 border-emerald-900/20";
                else if (m.matchPercent >= 30) badgeColor = "bg-amber-950/20 text-amber-300 border-amber-900/20";

                return (
                  <div key={m.userName} className="flex items-center justify-between text-xs font-mono py-0.5">
                    <span className="text-slate-300 truncate max-w-[120px]">{m.userName}</span>
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${badgeColor}`}>
                      {m.matchPercent}% {m.matchingGenres.length > 0 && `(${m.matchingGenres.slice(0,1)})`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Кнопки управления */}
        <div className="mt-auto">
          {onAdd && !isAddedInRoom && (
            <button
              onClick={() => onAdd(film.id)}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold py-2 px-4 rounded-xl transition duration-200 shadow-md shadow-amber-950/20 font-display text-sm cursor-pointer"
            >
              <Plus size={16} />
              В обсуждение комнаты
            </button>
          )}

          {onRemove && isAddedInRoom && (
            <button
              onClick={() => onRemove(film.id)}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-200 font-medium py-2 px-4 rounded-xl border border-white/5 hover:border-rose-900/50 transition duration-200 font-display text-sm cursor-pointer"
            >
              <Minus size={16} />
              Убрать из комнаты
            </button>
          )}

          {isAddedInRoom && !onRemove && (
            <div className="text-center text-xs font-mono text-emerald-400 bg-emerald-950/30 p-2 border border-emerald-900/20 rounded-xl">
              ✓ Добавлено в обсуждение
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
