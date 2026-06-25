import React, { useState, useEffect } from "react";
import { roomsApi, searchApi } from "../api/api";
import { LogOut, Copy, Check, Play, X, Search, Sparkles, Users, Film, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";

interface RoomProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    favoriteGenres: string[];
  };
  onLogOut: () => void;
  onUpdateUserGenres: (genres: string[]) => void;
}

export const Room: React.FC<RoomProps> = ({ currentUser, onLogOut }) => {
  const [activeRoom, setActiveRoom] = useState<any | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<"title" | "phrase">("phrase");
  const [expandedFilm, setExpandedFilm] = useState<string | null>(null);

  // 🔥 КЭШ ВСЕХ ФИЛЬМОВ ИЗ КАТАЛОГА
  const [catalogFilms, setCatalogFilms] = useState<any[]>([]);

  const [showWatchModal, setShowWatchModal] = useState(false);
  const [watchUrl, setWatchUrl] = useState("");
  const [isWatching, setIsWatching] = useState(false);
  const [currentWatchUrl, setCurrentWatchUrl] = useState("");

  // 🔥 ЗАГРУЖАЕМ КАТАЛОГ ФИЛЬМОВ ПРИ ВХОДЕ В КОМНАТУ
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const films = await roomsApi.getAllFilms();
        setCatalogFilms(films);
      } catch (err) {
        console.error("[LOAD CATALOG]", err);
      }
    };
    if (activeRoom) {
      loadCatalog();
    }
  }, [activeRoom]);

  const copyRoomCode = () => {
    if (!activeRoom) return;
    navigator.clipboard.writeText(activeRoom.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) {
      setError("Введите название комнаты");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const room = await roomsApi.create(newRoomName.trim());
      setActiveRoom(room);
      setNewRoomName("");
      setSuccess(`Комната "${room.name}" создана! Код: ${room.code}`);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      console.error("[CREATE ROOM]", err);
      let errorMsg = "Ошибка создания комнаты";
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
        } else {
          errorMsg = JSON.stringify(err.response.data.detail);
        }
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) {
      setError("Введите код комнаты");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const room = await roomsApi.join(roomCodeInput.trim().toUpperCase());
      setActiveRoom(room);
      setRoomCodeInput("");
      setSuccess(`Вы вошли в комнату "${room.name}"!`);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      console.error("[JOIN ROOM]", err);
      let errorMsg = "Не удалось войти в комнату";
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
        } else {
          errorMsg = JSON.stringify(err.response.data.detail);
        }
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!activeRoom) return;
    if (!confirm("Выйти из комнаты?")) return;
    try {
      await roomsApi.leave(activeRoom.code);
      setActiveRoom(null);
      setIsWatching(false);
      setCurrentWatchUrl("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Введите запрос для поиска");
      return;
    }
    setIsSearching(true);
    setError("");
    try {
      const films = await searchApi.search(searchQuery.trim(), searchType);
      setSearchResults(films);
      if (films.length === 0) {
        setError("Фильмы не найдены. Попробуйте изменить запрос.");
      }
    } catch (err: any) {
      console.error("[SEARCH]", err);
      let errorMsg = "Не удалось выполнить поиск";
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
        } else {
          errorMsg = JSON.stringify(err.response.data.detail);
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartWatching = () => {
    if (!watchUrl.trim()) {
      setError("Введите ссылку на фильм");
      return;
    }

    let finalUrl = watchUrl.trim();

    if (finalUrl.includes("youtube.com/watch?v=")) {
      const videoId = finalUrl.split("v=")[1]?.split("&")[0];
      if (videoId) {
        finalUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    }

    if (finalUrl.includes("youtu.be/")) {
      const videoId = finalUrl.split("youtu.be/")[1]?.split("?")[0];
      if (videoId) {
        finalUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    }

    if (finalUrl.includes("vimeo.com/")) {
      const videoId = finalUrl.split("vimeo.com/")[1]?.split("/")[0];
      if (videoId) {
        finalUrl = `https://player.vimeo.com/video/${videoId}`;
      }
    }

    setCurrentWatchUrl(finalUrl);
    setIsWatching(true);
    setShowWatchModal(false);
    setWatchUrl("");
    setSuccess("Фильм запущен для всех!");
    setTimeout(() => setSuccess(""), 4000);
  };

  const handleStopWatching = () => {
    setIsWatching(false);
    setCurrentWatchUrl("");
  };

  const handleAddFilmToRoom = async (filmId: string) => {
    if (!activeRoom) {
      setError("Вы не в комнате");
      return;
    }
    try {
      await roomsApi.addFilm(activeRoom.code, filmId);
      const updated = await roomsApi.get(activeRoom.code);
      setActiveRoom(updated);
      setSuccess("Фильм добавлен в обсуждение!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("[ADD FILM]", err);
      let errorMsg = "Не удалось добавить фильм";
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
        } else {
          errorMsg = JSON.stringify(err.response.data.detail);
        }
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    }
  };

  const toggleExpand = (filmId: string) => {
    setExpandedFilm(expandedFilm === filmId ? null : filmId);
  };

  // Проверяем, добавлен ли фильм в комнату
  const isFilmInRoom = (filmId: string) => {
    return activeRoom?.films?.some((rf: any) => rf.filmId === filmId) || false;
  };

  // Получаем информацию о том, кто добавил фильм
  const getFilmAddedBy = (filmId: string) => {
    const roomFilm = activeRoom?.films?.find((rf: any) => rf.filmId === filmId);
    return roomFilm?.addedByName || null;
  };

  // Находим фильм в каталоге по ID
  const findFilmInCatalog = (filmId: string) => {
    return catalogFilms.find(f => f.id === filmId) || searchResults.find(f => f.id === filmId);
  };

  if (!activeRoom) {
    return (
      <div className="min-h-screen bg-[#faf0f5] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-rose-600">🎬 KinoКомпания</h1>
            <button onClick={onLogOut} className="bg-rose-100 text-rose-600 px-4 py-2 rounded-xl">
              <LogOut size={16} className="inline mr-2" /> Выйти
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Создать комнату</h2>
              <form onSubmit={handleCreateRoom} className="flex gap-3">
                <input
                  type="text"
                  className="flex-grow bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-rose-400"
                  placeholder="Название"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                />
                <button type="submit" disabled={isLoading} className="bg-rose-400 hover:bg-rose-300 text-white font-bold py-2.5 px-6 rounded-xl disabled:opacity-50">
                  {isLoading ? "..." : "Создать"}
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Войти по коду</h2>
              <form onSubmit={handleJoinRoom} className="flex gap-3">
                <input
                  type="text"
                  className="flex-grow bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm uppercase font-mono outline-none focus:border-rose-400"
                  placeholder="КОД"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  maxLength={5}
                />
                <button type="submit" disabled={isLoading} className="bg-rose-400 hover:bg-rose-300 text-white font-bold py-2.5 px-6 rounded-xl disabled:opacity-50">
                  {isLoading ? "..." : "Войти"}
                </button>
              </form>
            </div>
          </div>

          {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl mt-4">❌ {typeof error === 'string' ? error : JSON.stringify(error)}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-xl mt-4">✅ {success}</div>}
        </div>
      </div>
    );
  }

  const members = activeRoom.members || [];
  const roomFilms = activeRoom.films || [];

  return (
    <div className="min-h-screen bg-[#faf0f5] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white p-6 rounded-2xl shadow-md flex flex-wrap justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-rose-600">{activeRoom.name}</h1>
            <p className="text-sm text-gray-500">
              Код: <span className="font-mono font-bold text-rose-500">{activeRoom.code}</span>
            </p>
            <p className="text-sm text-gray-500">Участников: {members.length}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={copyRoomCode} className="bg-gray-100 px-4 py-2 rounded-xl">
              {copiedCode ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
            <button onClick={() => setShowWatchModal(true)} className="bg-rose-400 text-white px-4 py-2 rounded-xl flex items-center gap-2">
              <Play size={16} /> Смотреть
            </button>
            <button onClick={handleLeaveRoom} className="bg-rose-100 text-rose-600 px-4 py-2 rounded-xl">
              Выйти
            </button>
          </div>
        </div>

        {isWatching && currentWatchUrl && (
          <div className="bg-black rounded-2xl overflow-hidden mb-6 relative">
            <iframe
              src={currentWatchUrl}
              className="w-full aspect-video"
              allowFullScreen
              allow="autoplay; fullscreen"
              frameBorder="0"
              title="Фильм"
            />
            <button onClick={handleStopWatching} className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full">
              <X size={20} />
            </button>
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl shadow-md mb-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={18} /> Участники
          </h3>
          {members.length > 0 ? (
            members.map((member: any) => (
              <div key={member.userId || member.id} className="flex items-center gap-2 py-2 border-b border-gray-100">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                <span>{member.name} {member.userId === currentUser.id && "(вы)"}</span>
                {member.favoriteGenres?.length > 0 && (
                  <span className="text-xs text-gray-400 ml-2">
                    ❤️ {member.favoriteGenres.join(", ")}
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500">Нет участников</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md mb-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Search size={18} /> Поиск фильмов
          </h3>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSearchType("phrase")}
              className={`px-3 py-1 rounded-lg text-xs flex items-center gap-1 ${searchType === "phrase" ? "bg-rose-400 text-white" : "bg-gray-100"}`}
            >
              <Sparkles size={12} /> Семантический
            </button>
            <button
              onClick={() => setSearchType("title")}
              className={`px-3 py-1 rounded-lg text-xs ${searchType === "title" ? "bg-rose-400 text-white" : "bg-gray-100"}`}
            >
              По названию
            </button>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              className="flex-grow bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-rose-400"
              placeholder={searchType === "phrase" ? "Например: грустный фильм про космос" : "Введите название фильма"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button onClick={handleSearch} className="bg-rose-400 hover:bg-rose-300 text-white font-bold py-2.5 px-6 rounded-xl">
              Найти
            </button>
          </div>

          {isSearching && <p className="text-center text-gray-500 mt-4">🔍 Поиск...</p>}

          {searchResults.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((film) => {
                const isExpanded = expandedFilm === film.id;
                const added = isFilmInRoom(film.id);
                const addedBy = getFilmAddedBy(film.id);

                return (
                  <div
                    key={film.id}
                    className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer ${
                      added ? 'border-green-400' : 'border-gray-200'
                    }`}
                    onClick={() => toggleExpand(film.id)}
                  >
                    {film.posterUrl && (
                      <div className="relative h-56 w-full bg-gray-100 overflow-hidden">
                        <img
                          src={film.posterUrl}
                          alt={film.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80';
                          }}
                        />
                        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-amber-400 border border-amber-500/30">
                          ⭐ {film.rating?.toFixed(1) || 'N/A'}
                        </div>
                        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-white">
                          📅 {film.releaseYear || 'N/A'}
                        </div>
                        {added && (
                          <div className="absolute top-2 left-2 bg-green-500/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-white font-bold flex items-center gap-1">
                            <CheckCircle size={12} /> В комнате
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 text-base truncate">{film.title}</h4>
                          <p className="text-xs text-gray-500 italic truncate">{film.originalTitle}</p>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600 ml-2 mt-1 flex-shrink-0">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {film.genres?.slice(0, 4).map((g: string) => (
                          <span key={g} className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">
                            {g}
                          </span>
                        ))}
                        {film.genres && film.genres.length > 4 && (
                          <span className="text-[10px] text-gray-400">+{film.genres.length - 4}</span>
                        )}
                      </div>

                      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-60' : 'max-h-12'}`}>
                        <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                          {film.description || 'Описание отсутствует'}
                        </p>
                      </div>

                      {film.tags && film.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {film.tags.slice(0, 4).map((tag: string) => (
                            <span key={tag} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                              #{tag}
                            </span>
                          ))}
                          {film.tags.length > 4 && (
                            <span className="text-[10px] text-gray-400">+{film.tags.length - 4}</span>
                          )}
                        </div>
                      )}

                      {added && addedBy && (
                        <div className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle size={14} /> Добавил: {addedBy}
                        </div>
                      )}

                      {added ? (
                        <div className="mt-3 w-full bg-green-100 text-green-700 font-semibold text-sm py-2 rounded-xl border border-green-300 flex items-center justify-center gap-2">
                          <CheckCircle size={16} /> Уже в обсуждении
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddFilmToRoom(film.id);
                          }}
                          className="mt-3 w-full bg-rose-400 hover:bg-rose-300 text-white font-semibold text-sm py-2 rounded-xl transition-colors"
                        >
                          + Добавить в комнату
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {roomFilms.length > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-md mb-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Film size={18} /> Обсуждаемые фильмы ({roomFilms.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {roomFilms.map((rf: any) => {
                const film = findFilmInCatalog(rf.filmId);
                return (
                  <div key={rf.filmId} className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <p className="font-medium text-sm text-gray-800">{film?.title || rf.filmId}</p>
                    <p className="text-xs text-gray-500">Добавил: <span className="font-medium text-rose-600">{rf.addedByName}</span></p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl mt-4">❌ {typeof error === 'string' ? error : JSON.stringify(error)}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-xl mt-4">✅ {success}</div>}
      </div>

      {showWatchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-rose-600 mb-4">🎬 Вставить ссылку на фильм</h3>
            <p className="text-xs text-gray-500 mb-4">Вставьте ссылку на видео. Все участники комнаты увидят его одновременно.</p>
            <input
              type="text"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm outline-none focus:border-rose-400 mb-4"
              placeholder="https://www.youtube.com/embed/..."
              value={watchUrl}
              onChange={(e) => setWatchUrl(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowWatchModal(false)} className="flex-grow bg-gray-100 text-gray-600 py-2.5 rounded-xl">
                Отмена
              </button>
              <button onClick={handleStartWatching} className="flex-grow bg-rose-400 hover:bg-rose-300 text-white py-2.5 rounded-xl">
                <Play size={16} className="inline mr-2" /> Смотреть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};