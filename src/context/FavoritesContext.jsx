import { createContext, useCallback, useContext, useState } from 'react';

const STORAGE_KEY = 'bigp-favorites';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function save(repos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(repos));
}

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(load);

  const isFavorite = useCallback((repoId) => favorites.some((r) => r.id === repoId), [favorites]);

  const toggleFavorite = useCallback((repo) => {
    setFavorites((prev) => {
      const exists = prev.some((r) => r.id === repo.id);
      const next = exists ? prev.filter((r) => r.id !== repo.id) : [repo, ...prev];
      save(next);
      return next;
    });
  }, []);

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
