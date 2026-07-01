import React, { useState, useEffect, useRef } from "react";
import {
  Users, User, Send, Search, Sparkles, Copy, Check, LogOut,
  Trash2, Heart, Plus, Film as FilmIcon, RefreshCw, MonitorPlay, Tv
} from "lucide-react";
import { User as UserType, Room, Film as FilmType, ChatMessage } from "../types";
import { roomsApi, filmsApi } from "../api/api";
import { VideoPlayer } from "../components/VideoPlayer";
import { Recommendations } from "../components/Recommendations";
import { FilmCard } from "../components/FilmCard";
import { motion, AnimatePresence } from "motion/react";

interface RoomPageProps {
  currentUser: UserType;
  activeRoom: Room;
  setActiveRoom: (room: Room | null) => void;
}

function getYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
  return match ? match[1] : "";
}

export const RoomPage: React.FC<RoomPageProps> = ({
  currentUser,
  activeRoom,
  setActiveRoom,
}) => {
  const token = localStorage.getItem("kino_token");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FilmType[]>([]);
  const [searchType, setSearchType] = useState<"title">("title");
  const [isSearching, setIsSearching] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const [recsLoading, setRecsLoading] = useState(false);
  const [discRecs, setDiscRecs] = useState<any[]>([]);
  const [smartRecs, setSmartRecs] = useState<any[]>([]);
  const [allRoomGenres, setAllRoomGenres] = useState<string[]>([]);

  const [copiedCode, setCopiedCode] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeRoom?.code || !token) return;

    const wsUrl = `ws://localhost:8000/ws/${activeRoom.code}?token=${token}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("WebSocket подключен к комнате", activeRoom.code);
    };

    websocket.onerror = (error) => {
      console.error("WebSocket ошибка:", error);
    };

    websocket.onclose = () => {
      console.log("WebSocket отключен");
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [activeRoom?.code, token]);

  useEffect(() => {
    if (!ws) return;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'new_message') {
          setActiveRoom(prev => {
            if (!prev) return prev;
            const newMessage = {
              id: data.messageId || Date.now().toString(),
              senderId: data.senderId,
              senderName: data.senderName,
              text: data.text,
              timestamp: data.timestamp || Date.now(),
            };
            return {
              ...prev,
              chat: [...(prev.chat || []), newMessage]
            };
          });

          loadRecommendations();
        }

        if (data.type === 'video_update') {
          setActiveRoom(prev => prev ? { ...prev, current_video_url: data.url } : prev);
        }

        if (data.type === 'members_update') {
          setActiveRoom(prev => prev ? { ...prev, members: data.members } : prev);
        }
      } catch (e) {
        console.error("Ошибка парсинга WebSocket сообщения:", e);
      }
    };
  }, [ws]);

  useEffect(() => {
    if (!activeRoom?.code) return;

    const interval = setInterval(async () => {
      try {
        const updatedRoom = await roomsApi.get(activeRoom.code);
        if (JSON.stringify(updatedRoom) !== JSON.stringify(activeRoom)) {
          setActiveRoom(updatedRoom);
        }
      } catch (e) {
        console.error("Ошибка синхронизации комнаты:", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeRoom, setActiveRoom]);

  useEffect(() => {
    if (!activeRoom?.code) return;
    loadRecommendations();
  }, [activeRoom.films, activeRoom.members]);

  useEffect(() => {
    if (!activeRoom?.code) return;
    if (activeRoom.chat && activeRoom.chat.length > 0) {
      loadRecommendations();
    }
  }, [activeRoom.chat?.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeRoom.chat]);

  const loadRecommendations = async () => {
    if (!activeRoom?.code) return;
    setRecsLoading(true);
    try {
      const res = await roomsApi.getRecommendations(activeRoom.code);
      setDiscRecs(res.discussionRecommendations);
      setSmartRecs(res.smartRecommendations);
      setAllRoomGenres(res.allFavoriteGenres);
    } catch (e) {
      console.error("Не удалось рассчитать ИИ-рекомендации:", e);
    } finally {
      setRecsLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await roomsApi.leave(activeRoom.code);
      setActiveRoom(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await filmsApi.search(searchQuery.trim(), "title");
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFilm = async (filmId: string) => {
    try {
      const updatedRoom = await roomsApi.addFilm(activeRoom.code, filmId);
      setActiveRoom(updatedRoom);
    } catch (err: any) {
      alert(err.message || "Не удалось добавить фильм");
    }
  };

  const handleRemoveFilm = async (filmId: string) => {
    try {
      const updatedRoom = await roomsApi.removeFilm(activeRoom.code, filmId);
      setActiveRoom(updatedRoom);
    } catch (err: any) {
      alert(err.message || "Не удалось убрать фильм");
    }
  };

  const handleUpdateVideo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = document.getElementById('videoUrlInput') as HTMLInputElement;
    const url = input?.value || '';

    if (!url.trim()) {
      alert("Пожалуйста, введите ссылку на видео");
      return;
    }

    try {
      const updatedRoom = await roomsApi.updateVideoUrl(activeRoom.code, url);
      setActiveRoom(updatedRoom);
    } catch (err: any) {
      alert(err.message || "Не удалось обновить трансляцию видео");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setIsSendingMessage(true);
    const messageText = chatInput.trim();
    setChatInput("");

    try {
      await roomsApi.postMessage(activeRoom.code, messageText);
    } catch (e) {
      console.error("Ошибка:", e);
      setChatInput(messageText);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(activeRoom.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const members = activeRoom.members || [];
  const roomFilmsIds = activeRoom.films || [];
  const isAdmin = activeRoom.creatorId === currentUser.id;

  if (!activeRoom?.code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
        <div className="text-center">
          <FilmIcon size={48} className="mx-auto text-white/30 mb-4" />
          <h2 className="text-xl font-bold text-white/60">Загрузка комнаты...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] font-sans text-white flex flex-col">
      <header className="bg-white/5 backdrop-blur-md border-b border-white/10 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05, rotate: -5 }}
            className="bg-gradient-to-r from-rose-500 to-pink-600 p-2.5 rounded-xl text-white shadow-lg shadow-rose-500/30 shrink-0 w-fit"
          >
            <FilmIcon size={20} />
          </motion.div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-black text-xl text-white leading-none">
                {activeRoom.name}
              </h1>
              <span className="bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-md shadow-rose-500/30">
                Код: {activeRoom.code}
              </span>
            </div>
            <p className="text-xs text-white/40 mt-1 font-semibold flex items-center gap-1">
              <Users size={12} className="text-rose-400" />
              <span>Друзей онлайн в комнате: <b className="text-white">{members.length}</b></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={copyRoomCode}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/80 text-xs font-bold px-3.5 py-2 rounded-xl border border-white/10 transition"
          >
            {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedCode ? "Скопировано!" : "Копировать код"}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLeaveRoom}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 rounded-xl border border-rose-500/20 transition"
          >
            <LogOut size={14} />
            Выйти из комнаты
          </motion.button>
        </div>
      </header>

      <div className="flex-grow max-w-7xl mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 p-5 rounded-3xl space-y-4"
          >
            <h3 className="font-display font-black text-white text-base flex items-center gap-2">
              <Users size={16} className="text-rose-400" />
              Участники киноклуба
            </h3>
            <div className="space-y-3">
              {members.map((member, index) => (
                <motion.div
                  key={member.userId || index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start justify-between gap-3 text-xs border-b border-white/5 pb-2.5 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="bg-gradient-to-br from-rose-500/20 to-pink-500/20 p-1.5 rounded-lg text-rose-400 shrink-0">
                      <User size={14} />
                    </div>
                    <div>
                      <span className="font-bold text-white block">
                        {member.name}
                        {member.userId === activeRoom.creatorId && (
                          <span className="text-[10px] text-rose-400 font-extrabold ml-1">(админ)</span>
                        )}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(member.favoriteGenres || []).slice(0, 3).map((g) => (
                          <span key={g} className="bg-rose-500/10 text-rose-400 text-[9px] px-1.5 py-0.5 rounded border border-rose-500/20">
                            {g}
                          </span>
                        ))}
                        {member.favoriteGenres && member.favoriteGenres.length > 3 && (
                          <span className="text-[9px] text-white/40 font-bold">+{member.favoriteGenres.length - 3}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl flex flex-col h-[520px]"
          >
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-rose-500/10 to-pink-500/10 rounded-t-3xl">
              <div>
                <h3 className="font-display font-black text-white text-sm">Общий чат пожеланий</h3>
                <p className="text-[10px] text-white/40 font-semibold leading-relaxed mt-0.5">Пишите сюда жанры, настроение или сюжет, а ИИ найдет фильм!</p>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-5 space-y-3.5">
              {activeRoom.chat && activeRoom.chat.length === 0 ? (
                <div className="text-center text-white/40 text-xs py-8">
                  <FilmIcon size={24} className="mx-auto text-white/20 mb-2" />
                  Пока нет сообщений в чате. Напишите своё пожелание!
                </div>
              ) : (
                activeRoom.chat && activeRoom.chat.map((msg) => {
                  const isSystem = msg.senderId === "system";
                  const isMe = msg.senderId === currentUser.id;

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="text-center">
                        <span className="inline-block bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 px-3 py-1 rounded-full leading-normal">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[10px] text-white/40 font-bold mb-1 px-1">
                        {msg.senderName}
                      </span>
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed font-semibold ${
                          isMe
                            ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-tr-none shadow-lg shadow-rose-500/30"
                            : "bg-white/10 text-white rounded-tl-none border border-white/10"
                        }`}
                      >
                        <p className="break-words">{msg.text}</p>
                      </div>
                      <span className="text-[9px] text-white/30 mt-1 px-1 font-mono font-medium">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </motion.div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {activeRoom.aiAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-4 mb-2 p-3 bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-500/20 rounded-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-rose-400/10 to-pink-500/10 blur-xl pointer-events-none" />
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                  ИИ-Коллаборатор
                </div>
                <p className="text-[11px] text-white/80 leading-relaxed font-medium">
                  {activeRoom.aiAnalysis.explanation}
                </p>
                {activeRoom.aiAnalysis.combinedKeywords && activeRoom.aiAnalysis.combinedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {activeRoom.aiAnalysis.combinedKeywords.map((tag: string) => (
                      <span key={tag} className="text-[9px] font-bold text-rose-400/90 bg-rose-400/10 border border-rose-400/20 px-1.5 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-white/5 rounded-b-3xl">
              <div className="flex gap-2.5">
                <input
                  type="text"
                  required
                  disabled={isSendingMessage}
                  className="flex-grow bg-white/10 border border-white/20 rounded-xl py-2 px-3 text-xs font-semibold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all text-white placeholder-white/40"
                  placeholder="В чат: хочу фильм про пиратов, приключения..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isSendingMessage || !chatInput.trim()}
                  className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition shadow-lg shadow-rose-500/30"
                >
                  <Send size={14} />
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-black text-white text-lg flex items-center gap-2">
                    <Tv size={18} className="text-rose-400" />
                    Синхронный плеер
                  </h3>
                  <p className="text-xs text-white/40 font-medium mt-0.5">
                    {activeRoom.current_video_url
                      ? "Все участники смотрят это видео прямо сейчас!"
                      : "Ожидание трансляции от администратора комнаты..."}
                  </p>
                </div>
              </div>

              {activeRoom.current_video_url ? (
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10">
                  {activeRoom.current_video_url.includes("youtube.com") || activeRoom.current_video_url.includes("youtu.be") ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeId(activeRoom.current_video_url)}?autoplay=1`}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="YouTube video player"
                    />
                  ) : (
                    <video
                      src={activeRoom.current_video_url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 border-dashed rounded-2xl text-center">
                  <Tv size={28} className="text-white/20 mb-2" />
                  <p className="text-xs text-white/40 font-semibold">Экран свободен</p>
                  <p className="text-[11px] text-white/30 max-w-xs mt-1">
                    {isAdmin
                      ? "Вставьте ссылку на видео ниже, чтобы запустить совместный просмотр"
                      : "Попросите администратора комнаты вставить ссылку на фильм."}
                  </p>
                </div>
              )}

              <form onSubmit={handleUpdateVideo} className="mt-4 flex gap-2.5">
                <input
                  type="text"
                  id="videoUrlInput"
                  defaultValue={activeRoom.current_video_url || ""}
                  placeholder="Вставьте ссылку на YouTube"
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold rounded-xl hover:scale-105 transition"
                >
                  Запустить
                </button>
              </form>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-3xl space-y-4"
          >
            <h3 className="font-display font-black text-white text-base flex items-center gap-2">
              <Search size={16} className="text-rose-400" />
              Поиск и добавление в каталог
            </h3>

            <form onSubmit={handleSearch} className="flex gap-2.5">
              <input
                type="text"
                required
                className="flex-grow bg-white/10 border border-white/20 rounded-xl py-2.5 px-4 text-xs font-semibold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all text-white placeholder-white/40"
                placeholder="Например: 'Пираты', 'Рапунцель'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSearching}
                className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition disabled:opacity-50 border border-white/10"
              >
                {isSearching ? "Поиск..." : "Найти"}
              </motion.button>
            </form>

            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-4 border-t border-white/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold text-white/40 uppercase tracking-wider">Результаты поиска ({searchResults.length}):</span>
                    <button
                      onClick={() => setSearchResults([])}
                      className="text-xs text-white/40 hover:text-white/80 font-bold transition"
                    >
                      Скрыть
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {searchResults.map((film) => (
                      <FilmCard
                        key={film.id}
                        film={film}
                        isAddedInRoom={roomFilmsIds.includes(film.id)}
                        onAdd={handleAddFilm}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Recommendations
              roomCode={activeRoom.code}
              roomFilmsIds={roomFilmsIds}
              allFavoriteGenres={allRoomGenres}
              discussionRecommendations={discRecs}
              smartRecommendations={smartRecs}
              aiAnalysis={activeRoom.aiAnalysis}
              isLoading={recsLoading}
              onRefresh={loadRecommendations}
              onAddFilm={handleAddFilm}
              onRemoveFilm={handleRemoveFilm}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};