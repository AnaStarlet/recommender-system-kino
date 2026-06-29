import React, { useState } from "react";
import { Play, X, Link, HelpCircle } from "lucide-react";

interface VideoPlayerProps {
  currentVideoUrl?: string;
  isAdmin: boolean;
  onUpdateVideo: (url: string) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  currentVideoUrl,
  isAdmin,
  onUpdateVideo,
}) => {
  const [inputUrl, setInputUrl] = useState(currentVideoUrl || "");
  const [error, setError] = useState("");

  const getEmbedUrl = (url: string): string => {
    if (!url) return "";
    let finalUrl = url.trim();

    // YouTube watch?v= format
    if (finalUrl.includes("youtube.com/watch?v=")) {
      const videoId = finalUrl.split("v=")[1]?.split("&")[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      }
    }

    // YouTube youtu.be/ format
    if (finalUrl.includes("youtu.be/")) {
      const videoId = finalUrl.split("youtu.be/")[1]?.split("?")[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      }
    }

    // Vimeo format
    if (finalUrl.includes("vimeo.com/")) {
      const videoId = finalUrl.split("vimeo.com/")[1]?.split("/")[0];
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
      }
    }

    return finalUrl;
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) {
      setError("Пожалуйста, введите корректный адрес видео.");
      return;
    }
    setError("");
    onUpdateVideo(inputUrl.trim());
  };

  const handleClear = () => {
    setInputUrl("");
    onUpdateVideo("");
  };

  const embedUrl = getEmbedUrl(currentVideoUrl || "");

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-black text-slate-800 text-lg flex items-center gap-2">
            <Play size={18} className="text-rose-500 fill-rose-500" />
            Синхронный плеер
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {currentVideoUrl 
              ? "Все участники смотрят это видео прямо сейчас одновременно!" 
              : "Ожидание трансляции от администратора комнаты..."}
          </p>
        </div>
        {currentVideoUrl && isAdmin && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            <X size={12} />
            Остановить показ
          </button>
        )}
      </div>

      {embedUrl ? (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner">
          <iframe
            src={embedUrl}
            className="absolute top-0 left-0 w-full h-full"
            allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="KinoCompany Joint Viewer"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-10 bg-slate-50 border border-slate-100 border-dashed rounded-2xl text-center">
          <Play size={28} className="text-slate-300 mb-2" />
          <p className="text-xs text-slate-500 font-semibold">Экран свободен</p>
          <p className="text-[11px] text-slate-400 max-w-xs mt-1">
            {isAdmin 
              ? "Вставьте ссылку на YouTube ниже, чтобы запустить совместный сеанс просмотра." 
              : "Попросите администратора комнаты вставить ссылку на фильм."}
          </p>
        </div>
      )}

      {/* Admin link controls */}
      {isAdmin && (
        <div className="mt-5 pt-4 border-t border-slate-150">
          <form onSubmit={handleApply} className="flex gap-2.5">
            <div className="relative flex-grow">
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-xs outline-none focus:border-rose-500 focus:bg-white transition-all font-semibold text-slate-700"
                placeholder="Вставьте ссылку на YouTube (например: https://www.youtube.com/watch?v=...)"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Link size={14} />
              </div>
            </div>
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition shrink-0 cursor-pointer"
            >
              Запустить
            </button>
          </form>
          {error && <p className="text-[11px] text-rose-500 font-semibold mt-2">{error}</p>}
          <div className="flex items-start gap-1.5 mt-3 text-[10px] text-slate-400 leading-relaxed font-semibold">
            <HelpCircle size={12} className="shrink-0 text-slate-400 mt-0.5" />
            <span>
              Вставьте стандартную ссылку на любое видео YouTube, и плеер автоматически преобразует её в синхронный видеопоток для всех ваших друзей на экране.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
