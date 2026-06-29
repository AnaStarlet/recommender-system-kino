import React, { useState } from "react";
import { Film, Sparkles, LogIn, Check, Mail, Lock, User as UserIcon } from "lucide-react";
import { authApi } from "../api/api";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface LoginProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const GENRES = [
    "Комедия", "Драма", "Фантастика", "Семейный", "Ужасы", "Триллер", "Мультфильм", "Мелодрама", "Боевик", "Фэнтези", "Мюзикл"
  ];

  const handleGenreToggle = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isRegister) {
        if (selectedGenres.length === 0) {
          setError("Пожалуйста, выберите хотя бы один любимый жанр для ИИ-рекомендаций.");
          setIsLoading(false);
          return;
        }
        const res = await authApi.register({
          name,
          email,
          password,
          favoriteGenres: selectedGenres,
        });
        onLoginSuccess(res.user, res.access_token);
      } else {
        const res = await authApi.login({ email, password });
        onLoginSuccess(res.user, res.access_token);
      }
    } catch (err: any) {
      setError(err.message || "Произошла непредвиденная ошибка");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] font-sans">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 max-w-lg w-full shadow-2xl shadow-purple-500/10"
      >
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <motion.div
            whileHover={{ scale: 1.05, rotate: -5 }}
            className="bg-gradient-to-r from-rose-500 to-pink-600 text-white p-4 rounded-3xl shadow-xl shadow-rose-500/30"
          >
            <Film size={32} />
          </motion.div>
          <h1 className="font-display font-black text-3xl text-white tracking-tight leading-none mt-2">
            Kino<span className="text-rose-400">Компания</span>
          </h1>
          <p className="text-xs text-white/60 font-semibold max-w-sm">
            Интеллектуальная система совместного выбора фильмов и синхронного онлайн-просмотра в кругу друзей
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-500/20 border border-rose-500/30 text-rose-200 rounded-2xl p-3 text-xs font-semibold mb-5 text-center backdrop-blur-sm"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {isRegister && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block">Ваше Имя</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                    <input
                      type="text"
                      required
                      className="w-full bg-white/10 border border-white/20 rounded-xl py-2.5 pl-11 pr-4 text-xs font-semibold outline-none focus:border-rose-500 focus:bg-white/20 transition-all text-white placeholder-white/40"
                      placeholder="Например, Анастасия"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block">Любимые Жанры</label>
                    <span className="text-[9px] font-bold text-rose-400">Выбрано: {selectedGenres.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {GENRES.map((genre) => {
                      const isSelected = selectedGenres.includes(genre);
                      return (
                        <motion.button
                          type="button"
                          key={genre}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleGenreToggle(genre)}
                          className={`py-1.5 px-3 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-gradient-to-r from-rose-500 to-pink-600 border-rose-500 text-white shadow-lg shadow-rose-500/30"
                              : "bg-white/10 border-white/20 text-white/70 hover:border-white/40"
                          }`}
                        >
                          {isSelected && <Check size={10} className="inline mr-1" />}
                          {genre}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block">Email адрес</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input
                type="email"
                required
                className="w-full bg-white/10 border border-white/20 rounded-xl py-2.5 pl-11 pr-4 text-xs font-semibold outline-none focus:border-rose-500 focus:bg-white/20 transition-all text-white placeholder-white/40"
                placeholder="example@mail.ru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block">Пароль</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input
                type="password"
                required
                className="w-full bg-white/10 border border-white/20 rounded-xl py-2.5 pl-11 pr-4 text-xs font-semibold outline-none focus:border-rose-500 focus:bg-white/20 transition-all text-white placeholder-white/40"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 disabled:from-slate-500 disabled:to-slate-600 text-white font-bold py-3 rounded-2xl transition shadow-lg shadow-rose-500/30 text-xs tracking-wider uppercase cursor-pointer"
          >
            {isLoading ? "Загрузка..." : isRegister ? "Создать аккаунт" : "Войти"}
          </motion.button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center gap-2">
          <span className="text-xs text-white/40 font-semibold">
            {isRegister ? "Уже зарегистрированы?" : "У вас еще нет аккаунта?"}
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs font-bold text-rose-400 hover:text-rose-300 transition cursor-pointer"
          >
            {isRegister ? "Войти в систему" : "Зарегистрироваться"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};