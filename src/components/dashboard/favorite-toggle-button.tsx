"use client";

import { useState } from "react";
import { useFavoritesStore } from "@/store/useFavoritesStore";

export default function FavoriteToggleButton({ scholarshipId }: { scholarshipId: string }) {
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const isFavorite = favorites.includes(scholarshipId);
  const [justPopped, setJustPopped] = useState(false);

  function handleToggleFavorite() {
    toggleFavorite(scholarshipId);
    setJustPopped(true);
  }

  return (
    <button
      type="button"
      onClick={handleToggleFavorite}
      onAnimationEnd={() => setJustPopped(false)}
      className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150 hover:scale-105 active:scale-90 ${
        isFavorite ? "bg-rose-500 text-white" : "border border-slate-300 text-slate-700"
      } ${justPopped ? "animate-heart-pop" : ""}`}
      aria-label="찜 토글"
    >
      <span>{isFavorite ? "♥" : "♡"}</span>
      <span>{isFavorite ? "찜한 장학금" : "찜하기"}</span>
    </button>
  );
}
