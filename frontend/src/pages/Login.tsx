import React, { useState } from "react";
import { LogIn, UserPlus, Mail, Lock, User, Check, FilmIcon } from "lucide-react";
import { authApi } from "../api/api";

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

const AVAILABLE_GENRES = [
  "Комедия", "Драма", "Фантастика", "Ужасы", "Триллер", "Мелодрама", "Приключения", "Боевик"
];

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const toggleGenre = (genre: string) => {
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
        if (!name.trim()) {
          throw new Error("Введите имя (минимум 2 символа)");
        }
        if (name.trim().length < 2) {
          throw new Error("Имя должно содержать минимум 2 символа");
        }
        if (!email.trim()) {
          throw new Error("Введите email");
        }
        if (!email.includes("@")) {
          throw new Error("Введите корректный email (должен содержать @)");
        }
        if (!password.trim()) {
          throw new Error("Введите пароль (минимум 6 символов)");
        }
        if (password.length < 6) {
          throw new Error("Пароль должен содержать минимум 6 символов");
        }
        if (selectedGenres.length === 0) {
          throw new Error("Выберите хотя бы 1 жанр");
        }

        const data = await authApi.register({
          name: name.trim(),
          email: email.trim(),
          password,
          favoriteGenres: selectedGenres,
        });
        onLoginSuccess(data.user, data.token);
      } else {
        if (!email.trim()) {
          throw new Error("Введите email");
        }
        if (!password.trim()) {
          throw new Error("Введите пароль");
        }
        const data = await authApi.login({
          email: email.trim(),
          password,
        });
        const user = {
          id: email.trim(),
          name: email.trim().split("@")[0],
          email: email.trim(),
          favoriteGenres: []
        };
        onLoginSuccess(user, data.token);
      }
    } catch (err: any) {
      console.error("[LOGIN ERROR]", err);

      let errorMessage = "Произошла неизвестная ошибка";

      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === "string") {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map(d => d.msg || JSON.stringify(d)).join(", ");
        } else {
          errorMessage = JSON.stringify(detail);
        }
      } else if (err.message) {
        if (err.message.includes("Network Error") || err.message.includes("ERR_CONNECTION_REFUSED")) {
          errorMessage = "Не удалось подключиться к серверу. Убедитесь, что бекенд запущен на порту 8000.";
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#faf0f5]">
      <div className="w-full max-w-lg bg-white/80 p-8 rounded-3xl shadow-xl border border-rose-100/50">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-rose-400 p-3.5 rounded-2xl mb-3">
            <FilmIcon size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-rose-600">KinoКомпания</h1>
          <p className="text-xs text-gray-500 mt-1">Выбор фильмов с друзьями</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-xs mb-6">
              {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="text-xs font-bold text-gray-600">Имя</label>
              <input
                type="text"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-rose-400"
                placeholder="Ваше имя (минимум 2 символа)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-600">Email</label>
            <input
              type="email"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-rose-400"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600">Пароль</label>
            <input
              type="password"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-rose-400"
              placeholder="минимум 6 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isRegister && (
            <div>
              <label className="text-xs font-bold text-gray-600">Любимые жанры</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {AVAILABLE_GENRES.map((genre) => (
                  <button
                    type="button"
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`p-2 rounded-xl text-xs border ${
                      selectedGenres.includes(genre)
                        ? "bg-rose-100 border-rose-400 text-rose-700"
                        : "bg-gray-50 border-gray-200 text-gray-600"
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
              {selectedGenres.length === 0 && (
                <p className="text-xs text-rose-500 mt-1">Выберите хотя бы 1 жанр</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-rose-400 hover:bg-rose-300 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
          >
            {isLoading ? "Загрузка..." : isRegister ? "Создать аккаунт" : "Войти"}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={() => {
              setError("");
              setIsRegister(!isRegister);
            }}
            className="text-xs text-rose-400 hover:text-rose-600"
          >
            {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Создать"}
          </button>
        </div>
      </div>
    </div>
  );
};
