export interface Film {
  id: string;
  title: string;
  originalTitle?: string;
  genres: string[];
  description: string;
  releaseYear: number;
  rating: number;
  posterUrl?: string;
  tags: string[];
}

export interface RoomMember {
  userId: string;
  name: string;
  favoriteGenres: string[];
  joinedAt: string;
  isOnline?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface AIAnalysisResult {
  explanation: string;
  matchedFilmIds: string[];
  combinedKeywords: string[];
}

export interface Room {
  id: string;
  code: string;
  name: string;
  creatorId: string;
  createdAt: string;
  members: RoomMember[];
  films: string[];
  chat: ChatMessage[];
  current_video_url?: string;
  videoState?: VideoState;
  aiAnalysis?: AIAnalysisResult;
}

export interface User {
  id: string;
  name: string;
  email: string;
  favoriteGenres: string[];
}