import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);

  const loadFavorites = useCallback(async () => {
    try {
      const data = await api.get('/api/favorites');
      setFavorites(data ?? []);
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    if (!user) { setFavorites([]); return; }
    loadFavorites();
  }, [user?.id, loadFavorites]);

  const isFavorite = useCallback(
    (repoId) => favorites.some((r) => r.id === repoId),
    [favorites]
  );

  const toggleFavorite = useCallback(async (repo) => {
    const exists = favorites.some((r) => r.id === repo.id);
    if (exists) {
      await api.del(`/api/favorites/${repo.id}`);
      setFavorites((prev) => prev.filter((r) => r.id !== repo.id));
    } else {
      await api.post(`/api/favorites/${repo.id}`);
      setFavorites((prev) => [repo, ...prev]);
    }
  }, [favorites]);

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