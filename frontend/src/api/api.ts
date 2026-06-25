import axios from "axios";

const API_URL = "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kino_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: string;
  name: string;
  email: string;
  favoriteGenres: string[];
}

export interface Film {
  id: string;
  title: string;
  originalTitle: string;
  genres: string[];
  description: string;
  releaseYear: number;
  rating: number;
  posterUrl: string;
  tags: string[];
}

export interface RoomMember {
  userId: string;
  name: string;
  favoriteGenres: string[];
  joinedAt: string;
}

export interface DiscussionFilm {
  filmId: string;
  addedBy: string;
  addedByName: string;
  addedAt: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  creatorId: string;
  createdAt: string;
  members: RoomMember[];
  films: DiscussionFilm[];
}

export const authApi = {
  register: async (payload: any) => {
    const res = await api.post("/register", payload);
    return res.data;
  },
  login: async (payload: any) => {
    const res = await api.post("/login", payload);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get("/me");
    return res.data;
  },
  updateGenres: async (genres: string[]) => {
    const res = await api.put("/auth/genres", { favoriteGenres: genres });
    return res.data;
  }
};

export const roomsApi = {
  create: async (name: string) => {
    const res = await api.post("/rooms/create", { name });
    return res.data;
  },
  join: async (code: string) => {
    const res = await api.post("/rooms/join", { code });
    return res.data;
  },
  get: async (code: string) => {
    const res = await api.get(`/rooms/${code}`);
    return res.data;
  },
  addFilm: async (code: string, filmId: string) => {
    const res = await api.post(`/rooms/${code}/films`, { film_id: filmId });
    return res.data;
  },
  removeFilm: async (code: string, filmId: string) => {
    const res = await api.delete(`/rooms/${code}/films/${filmId}`);
    return res.data;
  },
  leave: async (code: string) => {
    const res = await api.post(`/rooms/${code}/leave`);
    return res.data;
  },
  getRecommendations: async (code: string) => {
    const res = await api.get(`/rooms/${code}/recommendations`);
    return res.data;
  },

  getAllFilms: async (): Promise<Film[]> => {
    const res = await api.get("/films");
    return res.data;
  }
};

export const searchApi = {
  search: async (query: string, type: "title" | "phrase"): Promise<Film[]> => {
    const res = await api.post("/search", { query, type });
    return res.data;
  }
};