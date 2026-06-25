import React, { useState } from "react";
import { Search, Sparkles, HelpCircle } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string, type: "title" | "phrase") => void;
  isLoading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"title" | "phrase">("phrase");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim(), searchType);
  };

  return (
    <div className="bg-[#0f1115]/80 border border-white/10 p-5 rounded-2xl shadow-lg backdrop-blur-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Выбор режима поиска */}
        <div className="flex bg-[#0a0b0d] p-1 rounded-xl border border-white/10 w-full md:w-fit font-display">
          <button
            type="button"
            onClick={() => setSearchType("phrase")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition duration-200 w-1/2 md:w-auto justify-center ${
              searchType === "phrase"
                ? "bg-amber-500 text-black shadow-md shadow-amber-950/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles size={14} className={searchType === "phrase" ? "text-black" : ""} />
            Интеллектуальный ИИ-поиск
          </button>
          
          <button
            type="button"
            onClick={() => setSearchType("title")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition duration-200 w-1/2 md:w-auto justify-center ${
              searchType === "title"
                ? "bg-stone-800 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Search size={14} />
            По названию / тегам
          </button>
        </div>

        {/* Ввод запроса */}
        <div className="relative">
          <input
            type="text"
            className="w-full bg-[#0a0b0d] border border-white/10 text-white rounded-xl py-3 px-11 text-sm outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 font-sans tracking-wide transition duration-250 placeholder-slate-500"
            placeholder={
              searchType === "phrase"
                ? "Например: 'хочу грустный фильм про космос и любовь' или 'захватывающий детектив с неожиданным концом'..."
                : "Введите название, режиссера или жанр фильма (например: 'Интерстеллар', 'Комедия')..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
            {searchType === "phrase" ? (
              <Sparkles size={16} className="text-amber-500" />
            ) : (
              <Search size={16} />
            )}
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-black font-semibold text-xs py-1.5 px-4 rounded-lg font-display transition duration-200"
          >
            {isLoading ? "Поиск..." : "Найти"}
          </button>
        </div>
      </form>

      {/* Полезная подсказка под строкой */}
      {searchType === "phrase" && (
        <div className="flex items-start gap-2 mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <HelpCircle size={15} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
            <b>Семантический поиск:</b> наша нейросеть анализирует смысл вашего запроса, эмоции и ключевые сущности, чтобы найти фильм по вашему словесному настроению, даже если вы не помните его названия!
          </p>
        </div>
      )}
    </div>
  );
};
