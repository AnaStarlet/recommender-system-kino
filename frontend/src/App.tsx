import React, { useState, useEffect } from "react";
import { Login } from "./pages/Login";
import { RoomPage } from "./pages/Room";
import { User, Room } from "./types";
import { authApi, roomsApi, filmsApi } from "./api/api";
import { FilmIcon, LogOut, Plus, Search } from "lucide-react";
import { motion } from "motion/react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [films, setFilms] = useState<any[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("kino_token");
    const savedUser = localStorage.getItem("kino_user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));

      authApi.getMe()
        .then(() => {
          setIsLoading(false);
          fetchCatalog(savedToken);
        })
        .catch(() => {
          localStorage.removeItem("kino_token");
          localStorage.removeItem("kino_user");
          setUser(null);
          setToken(null);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchCatalog = async (tkn?: string) => {
    const authToken = tkn || token;
    if (!authToken) return;
    try {
      const data = await filmsApi.getAll();
      const parsed = data.map((f: any) => ({
        ...f,
        genres: f.genres ? f.genres.split(',').map((g: string) => g.trim()).filter(Boolean) : [],
        tags: f.tags ? f.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        releaseYear: f.year,
        posterUrl: f.poster_url,
      }));
      setFilms(parsed);
    } catch (err) {
      console.error("Ошибка загрузки каталога:", err);
    }
  };

  const handleLoginSuccess = (user: User, token: string) => {
    localStorage.setItem("kino_token", token);
    localStorage.setItem("kino_user", JSON.stringify(user));
    setUser(user);
    setToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem("kino_token");
    localStorage.removeItem("kino_user");
    setUser(null);
    setToken(null);
    setActiveRoom(null);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !token) return;
    try {
      const data = await roomsApi.create(newRoomName);
      const room = {
        ...data,
        members: data.members || [],
        chat: [],
        films: [],
      };
      setActiveRoom(room);
      setNewRoomName("");
      setSuccessMsg(`Комната "${data.name}" создана! Код: ${data.code}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Не удалось создать комнату");
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim() || !token) return;
    try {
      const data = await roomsApi.join(roomCodeInput.toUpperCase());
      const room = {
        ...data,
        members: data.members || [],
        chat: [],
        films: [],
      };
      setActiveRoom(room);
      setRoomCodeInput("");
      setSuccessMsg(`Вы присоединились к "${data.name}"!`);
    } catch (err: any) {
      setErrorMsg(err.message || "Комната не найдена");
    }
  };

  const handleSearchFilms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !token) {
      fetchCatalog();
      return;
    }
    setIsSearching(true);
    try {
      const data = await filmsApi.search(searchQuery, "title");
      const parsed = data.map((f: any) => ({
        ...f,
        genres: f.genres ? f.genres.split(',').map((g: string) => g.trim()).filter(Boolean) : [],
        tags: f.tags ? f.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        releaseYear: f.year,
        posterUrl: f.poster_url,
      }));
      setFilms(parsed);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ошибка при поиске");
    } finally {
      setIsSearching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-white/60 text-sm font-semibold">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (activeRoom) {
    return (
      <RoomPage
        currentUser={user}
        activeRoom={activeRoom}
        setActiveRoom={setActiveRoom}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] p-6 font-sans">
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/90 text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border border-red-400/20 max-w-sm">
          {errorMsg}
          <button onClick={() => setErrorMsg(null)} className="ml-4 text-white/70 hover:text-white">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500/90 text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border border-emerald-400/20 max-w-sm">
          {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="ml-4 text-white/70 hover:text-white">✕</button>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-2.5 rounded-xl">
              <FilmIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Привет, <span className="text-rose-400">{user.name}</span>!
              </h1>
              <p className="text-sm text-white/40">Выберите или создайте кинозал</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-sm font-bold rounded-xl transition border border-rose-500/20"
          >
            <LogOut className="w-4 h-4 inline mr-1" /> Выйти
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h2 className="font-bold text-white text-lg mb-1">Создать кинозал</h2>
            <p className="text-xs text-white/40 mb-4">Организуйте просмотр с друзьями</p>
            <form onSubmit={handleCreateRoom} className="flex gap-2">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Название комнаты..."
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm font-bold rounded-xl hover:scale-105 transition"
              >
                <Plus className="w-4 h-4 inline" /> Создать
              </button>
            </form>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h2 className="font-bold text-white text-lg mb-1">Войти в кинозал</h2>
            <p className="text-xs text-white/40 mb-4">Введите код комнаты</p>
            <form onSubmit={handleJoinRoom} className="flex gap-2">
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                placeholder="Введите код"
                maxLength={5}
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-rose-500 uppercase tracking-widest text-center"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl border border-white/20 transition"
              >
                Войти
              </button>
            </form>
          </div>
        </div>

        <form onSubmit={handleSearchFilms} className="flex gap-2 mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск фильмов по названию..."
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-rose-500"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-sm font-bold rounded-xl border border-rose-500/20 transition"
          >
            <Search className="w-4 h-4 inline" /> {isSearching ? "Поиск..." : "Найти"}
          </button>
        </form>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {films.map((film) => (
            <motion.div
              key={film.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-rose-500/30 transition"
            >
              <div className="aspect-[16/9] bg-white/5 flex items-center justify-center">
                {film.posterUrl ? (
                  <img src={film.posterUrl} alt={film.title} className="w-full h-full object-cover" />
                ) : (
                  <FilmIcon className="w-12 h-12 text-white/20" />
                )}
              </div>
              <div className="p-4">
                <h4 className="font-bold text-white text-sm">{film.title}</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {film.genres?.slice(0, 3).map((g: string) => (
                    <span key={g} className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      {g}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-white/40 mt-2 line-clamp-2">{film.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {films.length === 0 && (
          <div className="text-center py-12 text-white/30 text-sm">
            Фильмы не найдены. Попробуйте другой запрос.
          </div>
        )}
      </div>
    </div>
  );
}
