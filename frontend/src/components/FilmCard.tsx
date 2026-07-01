import React from "react";
import { Star, Plus, Check, Trash2, Film as FilmIcon } from "lucide-react";
import { Film } from "../types";
import { motion } from "motion/react";

interface FilmCardProps {
  film: Film;
  groupScore?: number;
  isAddedInRoom?: boolean;
  onAdd?: (id: string) => void;
  onRemove?: (id: string) => void;
  memberBreakdown?: { name: string; matchScore: number }[];
}

export const FilmCard: React.FC<FilmCardProps> = ({
  film,
  groupScore,
  isAddedInRoom = false,
  onAdd,
  onRemove,
  memberBreakdown,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full relative group overflow-hidden"
    >
      <div className="space-y-3">
        {/* Header styling without raw images */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {film.year} год
            </span>
            <h4 className="font-display font-black text-slate-800 text-base leading-snug group-hover:text-rose-500 transition-colors">
              {film.title}
            </h4>
          </div>

          <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg shrink-0">
            <Star size={11} className="text-amber-500 fill-amber-500" />
            <span className="text-[11px] font-bold text-amber-700">{film.rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Instead of poster image: A highly sleek, typographic info tag block with a nice mini icon */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="bg-rose-500 text-white p-2 rounded-xl">
            <FilmIcon size={16} />
          </div>
          <div className="text-[11px] text-slate-500 font-medium leading-relaxed truncate">
            {film.genres}
          </div>
        </div>

        <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-3">
          {film.description}
        </p>

        {/* Group Score indicator */}
        {groupScore !== undefined && (
          <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-bold">Групповой компромисс:</span>
              <span className="text-rose-500 font-black font-mono">{groupScore}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${groupScore}%` }}
              />
            </div>

            {/* Individual member breakdowns on hover/tap */}
            {memberBreakdown && memberBreakdown.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {memberBreakdown.map((item) => (
                  <span
                    key={item.name}
                    className="text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150"
                  >
                    {item.name}: {item.matchScore}%
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer controls */}
      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end">
        {isAddedInRoom ? (
          onRemove ? (
            <button
              onClick={() => onRemove(film.id)}
              className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100/70 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <Trash2 size={12} />
              Убрать из обсуждения
            </button>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
              <Check size={12} />
              Добавлен в комнату
            </span>
          )
        ) : (
          onAdd && (
            <button
              onClick={() => onAdd(film.id)}
              className="flex items-center gap-1 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 px-4 py-1.5 rounded-xl transition shadow-sm cursor-pointer"
            >
              <Plus size={12} />
              Добавить в обсуждение
            </button>
          )
        )}
      </div>
    </motion.div>
  );
};
