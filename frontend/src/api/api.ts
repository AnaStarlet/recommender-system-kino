const API_BASE = 'http://localhost:8000/api';
const getHeaders = () => {
  const token = localStorage.getItem("kino_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const authApi = {
  async register(data: any) {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Ошибка регистрации");
    }
    return res.json();
  },

  async login(data: any) {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Неверный логин или пароль");
    }
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/me`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Не авторизован");
    return res.json();
  },

  async updateGenres(genres: string[]) {
    const res = await fetch(`${API_BASE}/genres`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ favoriteGenres: genres }),
    });
    if (!res.ok) throw new Error("Не удалось обновить жанры");
    return res.json();
  },
};

export const roomsApi = {
  async create(name: string) {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Не удалось создать комнату");
    return res.json();
  },

  async join(code: string) {
    const res = await fetch(`${API_BASE}/rooms/join`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Не удалось войти в комнату");
    }
    return res.json();
  },

  async get(code: string) {
    if (!code) throw new Error("Код комнаты не указан");
    const res = await fetch(`${API_BASE}/rooms/${code}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Комната не найдена");
    return res.json();
  },

  async leave(code: string) {
    const res = await fetch(`${API_BASE}/rooms/${code}/leave`, {
      method: "POST",
      headers: getHeaders(),
    });
    return res.json();
  },

  async addFilm(code: string, filmId: string) {
    const res = await fetch(`${API_BASE}/rooms/${code}/films/${filmId}`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Не удалось добавить фильм");
    return res.json();
  },

  async removeFilm(code: string, filmId: string) {
    const res = await fetch(`${API_BASE}/rooms/${code}/films/${filmId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Не удалось удалить фильм");
    return res.json();
  },

  async updateVideoUrl(code: string, videoUrl: string) {
    const res = await fetch(`${API_BASE}/rooms/${code}/video`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ videoUrl }),
    });
    if (!res.ok) throw new Error("Не удалось обновить трансляцию");
    return res.json();
  },

  async postMessage(code: string, text: string) {
    const res = await fetch(`${API_BASE}/rooms/${code}/messages`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error("Ошибка отправки сообщения");
    return res.json();
  },

  async getRecommendations(code: string) {
    const res = await fetch(`${API_BASE}/rooms/${code}/recommendations`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Ошибка получения рекомендаций");
    return res.json();
  },
};

export const filmsApi = {
  async search(query: string, type: "phrase" | "title") {
    const res = await fetch(`${API_BASE}/search?query=${encodeURIComponent(query)}&type=${type}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Ошибка поиска");
    return res.json();
  },
};