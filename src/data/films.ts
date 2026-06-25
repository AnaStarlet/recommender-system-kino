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

export const initialFilms: Film[] = [
  {
    id: "1",
    title: "Интерстеллар",
    originalTitle: "Interstellar",
    genres: ["Фантастика", "Драма", "Приключения"],
    description: "Группа исследователей отправляется через недавно обнаруженную черную дыру, чтобы спасти человечество от экологического кризиса на Земле и найти новый дом среди звезд.",
    releaseYear: 2014,
    rating: 8.6,
    posterUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&q=80",
    tags: ["космос", "черная дыра", "любовь", "семья", "время"]
  },
  {
    id: "2",
    title: "Начало",
    originalTitle: "Inception",
    genres: ["Фантастика", "Триллер", "Боевик"],
    description: "Дом Кобб — профессиональный вор разума, крадущий секреты из глубин подсознания во время сна.",
    releaseYear: 2010,
    rating: 8.8,
    posterUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&q=80",
    tags: ["сон", "подсознание", "реальность", "иллюзия"]
  },
  {
    id: "3",
    title: "Матрица",
    originalTitle: "The Matrix",
    genres: ["Фантастика", "Боевик"],
    description: "Хакер Нео узнает от загадочного Морфеуса, что весь привычный мир — лишь компьютерная симуляция.",
    releaseYear: 1999,
    rating: 8.7,
    posterUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&q=80",
    tags: ["киберпанк", "симуляция", "виртуальная реальность"]
  },
  {
    id: "4",
    title: "1+1",
    originalTitle: "Intouchables",
    genres: ["Комедия", "Драма"],
    description: "Парализованный богатый аристократ Филипп нанимает в качестве помощника молодого Дрисса, только что освободившегося из тюрьмы.",
    releaseYear: 2011,
    rating: 8.8,
    posterUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&q=80",
    tags: ["дружба", "искренность", "юмор"]
  },
  {
    id: "5",
    title: "Один дома",
    originalTitle: "Home Alone",
    genres: ["Комедия"],
    description: "Семья Маккалистеров в спешке улетает на Рождество в Париж и случайно забывает 8-летнего Кевина дома.",
    releaseYear: 1990,
    rating: 8.3,
    posterUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&q=80",
    tags: ["рождество", "семья", "детство"]
  },
  {
    id: "6",
    title: "Побег из Шоушенка",
    originalTitle: "The Shawshank Redemption",
    genres: ["Драма"],
    description: "Успешный банкир Энди Дюфрейн несправедливо осужден за убийство жены и пожизненно отправлен в суровую тюрьму Шоушенк.",
    releaseYear: 1994,
    rating: 9.3,
    posterUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&q=80",
    tags: ["тюрьма", "побег", "надежда"]
  },
  {
    id: "7",
    title: "Форрест Гамп",
    originalTitle: "Forrest Gump",
    genres: ["Драма", "Мелодрама"],
    description: "Парень с задержкой развития и невероятно чистым сердцем Форрест Гамп становится свидетелем важнейших исторических событий США.",
    releaseYear: 1994,
    rating: 8.9,
    posterUrl: "https://images.unsplash.com/photo-1478720143033-6a972678aa30?w=500&q=80",
    tags: ["любовь", "доброта", "история"]
  },
  {
    id: "8",
    title: "Бойцовский клуб",
    originalTitle: "Fight Club",
    genres: ["Триллер", "Драма"],
    description: "Страдающий бессонницей корпоративный безликий клерк знакомится с безумным продавцом мыла Тайлером Дерденом.",
    releaseYear: 1999,
    rating: 8.6,
    posterUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&q=80",
    tags: ["анархия", "философия", "бунт"]
  },
  {
    id: "9",
    title: "Сияние",
    originalTitle: "The Shining",
    genres: ["Ужасы", "Триллер"],
    description: "Писатель Джек Торренс устраивается зимним смотрителем в отдаленный горный отель Оверлук.",
    releaseYear: 1980,
    rating: 8.4,
    posterUrl: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=500&q=80",
    tags: ["отель", "безумие", "призраки"]
  },
  {
    id: "10",
    title: "Ла-Ла Ленд",
    originalTitle: "La La Land",
    genres: ["Мелодрама", "Комедия"],
    description: "Начинающая актриса Миа и фанатичный джазовый музыкант Себастьян ищут признание в ослепительном Лос-Анджелесе.",
    releaseYear: 2016,
    rating: 7.9,
    posterUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&q=80",
    tags: ["музыка", "любовь", "мечта"]
  }
];