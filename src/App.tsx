import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./pages/Login";
import { Room } from "./pages/Room";
import { authApi } from "./api/api";
import { Film } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuthSession() {
      const token = localStorage.getItem("kino_token");
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await authApi.getMe();
        setCurrentUser(data.user);
      } catch {
        localStorage.removeItem("kino_token");
      } finally {
        setIsLoading(false);
      }
    }
    checkAuthSession();
  }, []);

  const handleLoginSuccess = (user: any, token: string) => {
  console.log("[LOGIN SUCCESS]", { user, token });
  localStorage.setItem("kino_token", token);
  setCurrentUser(user);
};

  const handleLogOut = () => {
    localStorage.removeItem("kino_token");
    setCurrentUser(null);
  };

  const handleUpdateUserGenres = (genres: string[]) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, favoriteGenres: genres });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#faf0f5]">
        <div className="bg-rose-400 p-4 rounded-2xl animate-spin">
          <Film size={28} className="text-white" />
        </div>
        <span className="text-rose-400 mt-4">Запуск...</span>
      </div>
    );
  }

  if (currentUser) {
    return (
      <Room
        currentUser={currentUser}
        onLogOut={handleLogOut}
        onUpdateUserGenres={handleUpdateUserGenres}
      />
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
