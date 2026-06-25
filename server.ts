import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { initialFilms, Film } from "./src/data/films.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3001;
const DB_FILE = path.join(process.cwd(), "database.json");
const JWT_SECRET = process.env.JWT_SECRET || "kino-secret-key-1337-company";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("ВНИМАНИЕ: Переменная GEMINI_API_KEY не задана. Семантический поиск будет работать в упрощенном режиме текстового сопоставления.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  favoriteGenres: string[];
}

interface RoomMember {
  userId: string;
  name: string;
  favoriteGenres: string[];
  joinedAt: string;
}

interface DiscussionFilm {
  filmId: string;
  addedBy: string;
  addedByName: string;
  addedAt: string;
}

interface Room {
  id: string;
  code: string;
  name: string;
  creatorId: string;
  createdAt: string;
  members: RoomMember[];
  films: DiscussionFilm[];
}

interface AppDatabase {
  users: User[];
  rooms: Room[];
  films: Film[];
}

function loadDb(): AppDatabase {
  const dbDir = path.dirname(DB_FILE);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      return {
        users: parsed.users || [],
        rooms: parsed.rooms || [],
        films: parsed.films?.length ? parsed.films : initialFilms,
      };
    } catch (e) {
      console.error("Ошибка чтения БД, инициализация новой:", e);
    }
  }

  const defaultDb: AppDatabase = {
    users: [],
    rooms: [],
    films: initialFilms,
  };
  saveDb(defaultDb);
  return defaultDb;
}

function saveDb(db: AppDatabase) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Ошибка сохранения БД:", e);
  }
}

function hashPassword(password: string): string {
  return crypto.createHmac("sha256", JWT_SECRET).update(password).digest("hex");
}

function generateToken(userId: string): string {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
  const payload = JSON.stringify({ userId, expiresAt });
  const base64Payload = Buffer.from(payload).toString("base64");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(base64Payload).digest("hex");
  return `${base64Payload}.${signature}`;
}

function verifyToken(token: string): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [base64Payload, signature] = parts;

  const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(base64Payload).digest("hex");
  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(Buffer.from(base64Payload, "base64").toString("utf-8"));
    if (Date.now() > payload.expiresAt) {
      return null;
    }
    return payload.userId;
  } catch (e) {
    return null;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Логирование запросов
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  const authMiddleware = (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Требуется авторизация (Bearer Token)" });
      }
      const token = authHeader.split(" ")[1];
      const userId = verifyToken(token);
      if (!userId) {
        return res.status(401).json({ error: "Неверный или просроченный токен" });
      }

      const db = loadDb();
      const user = db.users.find((u) => u.id === userId);
      if (!user) {
        return res.status(401).json({ error: "Пользователь не найден" });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("[AUTH] Ошибка авторизации:", error);
      return res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  };

  // === API ЭНДПОИНТЫ ===

  // Регистрация
  app.post("/api/auth/register", (req, res) => {
    try {
      const { name, email, password, favoriteGenres } = req.body;

      if (!name || !email || !password || !favoriteGenres) {
        return res.status(400).json({ error: "Все поля (имя, email, пароль, жанры) обязательны к заполнению" });
      }

      const db = loadDb();
      if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ error: "Пользователь с таким email уже зарегистрирован" });
      }

      const newUser: User = {
        id: crypto.randomUUID(),
        name,
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
        favoriteGenres: Array.isArray(favoriteGenres) ? favoriteGenres : [],
      };

      db.users.push(newUser);
      saveDb(db);

      const token = generateToken(newUser.id);
      console.log(`[AUTH] Зарегистрирован новый пользователь: ${newUser.name} (${newUser.email})`);

      res.status(201).json({
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          favoriteGenres: newUser.favoriteGenres,
        },
      });
    } catch (error) {
      console.error("[AUTH] Ошибка регистрации:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Логин
  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email и пароль обязательны" });
      }

      const db = loadDb();
      const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user || user.passwordHash !== hashPassword(password)) {
        return res.status(401).json({ error: "Неверный email или пароль" });
      }

      const token = generateToken(user.id);
      console.log(`[AUTH] Вошел пользователь: ${user.name}`);

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          favoriteGenres: user.favoriteGenres,
        },
      });
    } catch (error) {
      console.error("[AUTH] Ошибка входа:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Получить текущего пользователя
  app.get("/api/auth/me", authMiddleware, (req: any, res) => {
    try {
      res.json({
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          favoriteGenres: req.user.favoriteGenres,
        },
      });
    } catch (error) {
      console.error("[AUTH] Ошибка получения пользователя:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Обновить жанры пользователя
  app.put("/api/auth/genres", authMiddleware, (req: any, res) => {
    try {
      const { favoriteGenres } = req.body;
      if (!Array.isArray(favoriteGenres)) {
        return res.status(400).json({ error: "Некорректный формат жанров" });
      }

      const db = loadDb();
      const userIndex = db.users.findIndex((u) => u.id === req.user.id);
      if (userIndex !== -1) {
        db.users[userIndex].favoriteGenres = favoriteGenres;

        db.rooms.forEach((room) => {
          const member = room.members.find((m) => m.userId === req.user.id);
          if (member) {
            member.favoriteGenres = favoriteGenres;
          }
        });

        saveDb(db);
        res.json({ success: true, favoriteGenres });
      } else {
        res.status(404).json({ error: "Пользователь не найден" });
      }
    } catch (error) {
      console.error("[AUTH] Ошибка обновления жанров:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Создать комнату
  app.post("/api/rooms/create", authMiddleware, async (req: any, res) => {
    try {
      const { name } = req.body;
      console.log("[ROOM] Попытка создать комнату:", name);

      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Название комнаты не может быть пустым" });
      }

      const db = loadDb();
      let code = "";
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let isUnique = false;
      while (!isUnique) {
        code = "";
        for (let i = 0; i < 5; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        isUnique = !db.rooms.some((r) => r.code === code);
      }

      const newRoom: Room = {
        id: crypto.randomUUID(),
        code,
        name: name.trim(),
        creatorId: req.user.id,
        createdAt: new Date().toISOString(),
        members: [
          {
            userId: req.user.id,
            name: req.user.name,
            favoriteGenres: req.user.favoriteGenres,
            joinedAt: new Date().toISOString(),
          },
        ],
        films: [],
      };

      db.rooms.push(newRoom);
      saveDb(db);

      console.log(`[ROOM] ✅ Комната создана: "${newRoom.name}" (Код: ${code})`);
      res.status(201).json(newRoom);
    } catch (error) {
      console.error("[ROOM] Ошибка создания комнаты:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера при создании комнаты" });
    }
  });

  // Присоединиться к комнате
  app.post("/api/rooms/join", authMiddleware, (req: any, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Код комнаты обязателен" });
      }

      const uppercaseCode = code.toUpperCase().trim();
      const db = loadDb();
      const roomIndex = db.rooms.findIndex((r) => r.code === uppercaseCode);

      if (roomIndex === -1) {
        return res.status(404).json({ error: `Комната с кодом "${uppercaseCode}" не найдена` });
      }

      const room = db.rooms[roomIndex];
      const isAlreadyMember = room.members.some((m) => m.userId === req.user.id);

      if (!isAlreadyMember) {
        room.members.push({
          userId: req.user.id,
          name: req.user.name,
          favoriteGenres: req.user.favoriteGenres,
          joinedAt: new Date().toISOString(),
        });
        saveDb(db);
        console.log(`[ROOM] Пользователь ${req.user.name} вошел в комнату "${room.name}" (Код: ${room.code})`);
      }

      res.json(room);
    } catch (error) {
      console.error("[ROOM] Ошибка присоединения к комнате:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Получить сведения о комнате по коду
  app.get("/api/rooms/:code", authMiddleware, (req: any, res) => {
    try {
      const { code } = req.params;
      const db = loadDb();
      const room = db.rooms.find((r) => r.code === code.toUpperCase().trim());

      if (!room) {
        return res.status(404).json({ error: "Комната не найдена" });
      }

      const isMember = room.members.some((m) => m.userId === req.user.id);
      if (!isMember) {
        return res.status(403).json({ error: "Вы не являетесь участником этой комнаты. Сначала присоединитесь по коду." });
      }

      res.json(room);
    } catch (error) {
      console.error("[ROOM] Ошибка получения комнаты:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Добавить фильм в обсуждение комнаты
  app.post("/api/rooms/:code/films", authMiddleware, (req: any, res) => {
    try {
      const { code } = req.params;
      const { filmId } = req.body;

      if (!filmId) {
        return res.status(400).json({ error: "ID фильма обязателен" });
      }

      const db = loadDb();
      const roomIndex = db.rooms.findIndex((r) => r.code === code.toUpperCase().trim());
      if (roomIndex === -1) {
        return res.status(404).json({ error: "Комната не найдена" });
      }

      const room = db.rooms[roomIndex];
      if (!room.members.some((m) => m.userId === req.user.id)) {
        return res.status(403).json({ error: "Нет доступа к комнате" });
      }

      const filmExists = db.films.some((f) => f.id === filmId);
      if (!filmExists) {
        return res.status(404).json({ error: "Фильм не найден в общем каталоге" });
      }

      if (room.films.some((f) => f.filmId === filmId)) {
        return res.status(400).json({ error: "Фильм уже добавлен в эту комнату" });
      }

      room.films.push({
        filmId,
        addedBy: req.user.id,
        addedByName: req.user.name,
        addedAt: new Date().toISOString()
      });

      saveDb(db);
      console.log(`[ROOM] В комнату "${room.name}" добавлен фильм ${filmId} пользователем ${req.user.name}`);
      res.json(room);
    } catch (error) {
      console.error("[ROOM] Ошибка добавления фильма:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Удалить фильм из обсуждения
  app.delete("/api/rooms/:code/films/:filmId", authMiddleware, (req: any, res) => {
    try {
      const { code, filmId } = req.params;
      const db = loadDb();
      const roomIndex = db.rooms.findIndex((r) => r.code === code.toUpperCase().trim());

      if (roomIndex === -1) {
        return res.status(404).json({ error: "Комната не найдена" });
      }

      const room = db.rooms[roomIndex];
      if (!room.members.some((m) => m.userId === req.user.id)) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      room.films = room.films.filter((f) => f.filmId !== filmId);
      saveDb(db);
      res.json(room);
    } catch (error) {
      console.error("[ROOM] Ошибка удаления фильма:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Выйти из комнаты
  app.post("/api/rooms/:code/leave", authMiddleware, (req: any, res) => {
    try {
      const { code } = req.params;
      const db = loadDb();
      const roomIndex = db.rooms.findIndex((r) => r.code === code.toUpperCase().trim());

      if (roomIndex === -1) {
        return res.status(404).json({ error: "Комната не найдена" });
      }

      const room = db.rooms[roomIndex];
      room.members = room.members.filter((m) => m.userId !== req.user.id);

      if (room.members.length === 0) {
        db.rooms.splice(roomIndex, 1);
        console.log(`[ROOM] Комната "${room.name}" удалена, так как в ней не осталось участников.`);
      } else {
        console.log(`[ROOM] Пользователь ${req.user.name} покинул комнату "${room.name}"`);
      }

      saveDb(db);
      res.json({ success: true });
    } catch (error) {
      console.error("[ROOM] Ошибка выхода из комнаты:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Поиск фильмов
  app.post("/api/search", authMiddleware, async (req: any, res) => {
    try {
      const { query, type } = req.body;
      if (!query || query.trim() === "") {
        return res.json([]);
      }

      const db = loadDb();
      const normalizedQuery = query.toLowerCase().trim();

      if (type === "title") {
        const results = db.films.filter((f) =>
          f.title.toLowerCase().includes(normalizedQuery) ||
          f.originalTitle.toLowerCase().includes(normalizedQuery) ||
          f.genres.some((g) => g.toLowerCase().includes(normalizedQuery)) ||
          f.tags.some((t) => t.toLowerCase().includes(normalizedQuery))
        );
        return res.json(results);
      }

      // Семантический поиск
      console.log(`[AI SEARCH] Полнотекстовый семантический запрос: "${query}"`);
      try {
        const ai = getAiClient();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
          const results = db.films.map((film) => {
            let score = 0;
            const words = normalizedQuery.split(/\s+/);
            words.forEach((word) => {
              if (word.length < 3) return;
              if (film.title.toLowerCase().includes(word)) score += 5;
              if (film.description.toLowerCase().includes(word)) score += 2;
              film.tags.forEach((tag) => {
                if (tag.toLowerCase().includes(word) || word.includes(tag.toLowerCase())) {
                  score += 3;
                }
              });
              film.genres.forEach((genre) => {
                if (genre.toLowerCase().includes(word)) score += 4;
              });
            });
            return { film, score };
          })
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((item) => item.film);

          return res.json(results.slice(0, 8));
        }

        const filmsBrief = db.films.map((f) => ({
          id: f.id,
          title: f.title,
          genres: f.genres.join(", "),
          description: f.description,
          tags: f.tags.join(", ")
        }));

        const prompt = `Пользователь ищет фильм по следующему текстовому описанию / фразе: "${query}".
Проведи семантический анализ и ранжируй список фильмов из нашей базы данных по степени соответствия этому запросу.
Верни результат СТРОГО в формате JSON-массива объектов, содержащих "id" фильма и "score" (число от 0.0 до 1.0).

Список фильмов для оценки:
${JSON.stringify(filmsBrief, null, 2)}

Верни СТРОГО валидный JSON в формате:
[
  {"id": "1", "score": 0.95},
  {"id": "3", "score": 0.4}
]`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  score: { type: Type.NUMBER }
                },
                required: ["id", "score"]
              }
            }
          }
        });

        const jsonText = response.text || "[]";
        const scores: { id: string; score: number }[] = JSON.parse(jsonText);

        const matchedFilms = db.films.map((f) => {
          const item = scores.find((s) => s.id === f.id);
          return { film: f, score: item ? item.score : 0 };
        })
        .filter((item) => item.score > 0.1)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.film);

        res.json(matchedFilms.slice(0, 8));
      } catch (error) {
        console.error("Ошибка ИИ-семантического поиска:", error);
        const fallbackResults = db.films.filter((f) =>
          f.description.toLowerCase().includes(normalizedQuery) ||
          f.tags.some((t) => t.toLowerCase().includes(normalizedQuery))
        );
        res.json(fallbackResults.slice(0, 8));
      }
    } catch (error) {
      console.error("[SEARCH] Ошибка поиска:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Рекомендации
  app.get("/api/rooms/:code/recommendations", authMiddleware, async (req: any, res) => {
    try {
      const { code } = req.params;
      const db = loadDb();
      const room = db.rooms.find((r) => r.code === code.toUpperCase().trim());

      if (!room) {
        return res.status(404).json({ error: "Комната не найдена" });
      }

      if (!room.members.some((m) => m.userId === req.user.id)) {
        return res.status(403).json({ error: "Нет доступа" });
      }

      const membersCount = room.members.length;
      if (membersCount === 0) {
        return res.json({ discussionFilms: [], smartAiRecommendations: [], explanation: "В комнате пока нет участников." });
      }

      const discussionRecommendations = room.films.map((roomFilm) => {
        const film = db.films.find((f) => f.id === roomFilm.filmId);
        if (!film) return null;

        const memberRatings = room.members.map((member) => {
          const favoriteGenres = member.favoriteGenres || [];
          const matchingGenres = film.genres.filter((rg) => favoriteGenres.includes(rg));
          const matchedRatio = film.genres.length > 0 ? matchingGenres.length / film.genres.length : 0;
          const userMultiplier = 0.7 + 0.6 * matchedRatio;

          return {
            userId: member.userId,
            userName: member.name,
            userMultiplier,
            matchPercent: Math.round(matchedRatio * 100),
            matchingGenres
          };
        });

        const averageMultiplier = memberRatings.reduce((sum, item) => sum + item.userMultiplier, 0) / membersCount;
        const groupScore = Number((film.rating * averageMultiplier).toFixed(2));

        return {
          film,
          groupScore,
          baseScore: film.rating,
          addedBy: roomFilm.addedByName,
          memberBreakdown: memberRatings,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.groupScore - a.groupScore);

      const allFavGenres = Array.from(new Set(room.members.flatMap((m) => m.favoriteGenres || [])));

      const smartRecommendations = db.films
        .map((film) => {
          const isAlreadyInDiscussion = room.films.some((rf) => rf.filmId === film.id);
          const matches = film.genres.filter((g) => allFavGenres.includes(g));
          let sumWeights = 0;
          room.members.forEach((member) => {
            const mMatches = film.genres.filter((g) => member.favoriteGenres.includes(g));
            sumWeights += mMatches.length;
          });
          const preferenceMultiplier = 0.8 + 0.2 * sumWeights;
          const totalRating = Number((film.rating * preferenceMultiplier).toFixed(2));

          return {
            film,
            groupScore: totalRating,
            baseScore: film.rating,
            isAlreadyInDiscussion,
            matchGenresCount: matches.length
          };
        })
        .filter((r) => !r.isAlreadyInDiscussion && r.matchGenresCount > 0)
        .sort((a, b) => b.groupScore - a.groupScore)
        .slice(0, 5);

      let aiExplanation = "Система проанализировала жанры всех участников комнаты: " +
        (allFavGenres.length ? allFavGenres.join(", ") : "не выбраны") +
        ". Добавьте фильмы в обсуждение и выбирайте идеальные варианты!";

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && (discussionRecommendations.length > 0 || smartRecommendations.length > 0)) {
        try {
          const ai = getAiClient();
          const membersList = room.members.map((m) => `${m.name} (Любит: ${m.favoriteGenres.join(",")})`).join("; ");
          const topDiscussion = discussionRecommendations.slice(0, 3).map((d: any) => `${d.film.title} (${d.groupScore} баллов)`).join(", ");
          const topSmart = smartRecommendations.slice(0, 3).map((s) => `${s.film.title} (${s.groupScore} баллов)`).join(", ");

          const prompt = `Ты — профессиональный ИИ-кинокритик и душа компании по подбору кино "KinoКомпания".
Дана компания друзей: ${membersList}.
Они собрались посмотреть кино вместе.
Нами рассчитаны топ фильмов в обсуждении: [${topDiscussion}] и умные автоматические рекомендации: [${topSmart}].

Составь короткий, веселый, душевный и воодушевляющий вердикт (3-4 предложения, максимум 400 символов) на РУССКОМ языке.
Оцени их общие интересы, тепло пошути или намекни, почему именно эти фильмы (из обсуждения или автоматических) станут бомбой для их сегодняшнего совместного вечера. Обратись к ним дружелюбно по именам!
Не используй markdown-заголовки. Напиши просто сплошной текст.`;

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt
          });

          if (response.text) {
            aiExplanation = response.text.trim();
          }
        } catch (err) {
          console.error("Ошибка при генерации ИИ-вердикта:", err);
        }
      }

      res.json({
        discussionRecommendations,
        smartRecommendations,
        explanation: aiExplanation,
        allFavoriteGenres: allFavGenres
      });
    } catch (error) {
      console.error("[RECOMMENDATIONS] Ошибка:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] ✅ Сервер успешно запущен на порту http://localhost:${PORT}`);
  });
}

startServer().catch((e) => {
  console.error("Критический сбой запуска сервера:", e);
});