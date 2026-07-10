import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

/**
 * Holds the current user's favorited repos so the sidebar dropdown and the
 * repo list page stay in sync without either one re-fetching on the other's
 * toggle — the source of truth is json-server's `favorite` field per repo.
 */
export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);

  const refresh = useCallback(() => {
    if (!user) {
      setFavorites([]);
      return;
    }
    api
      .get(`/repos?favorite=true&userId=${user.id}&_sort=updatedAt&_order=desc`)
      .then(setFavorites)
      .catch(() => setFavorites([]));
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleFavorite = useCallback(async (repo) => {
    const updated = await api.patch(`/repos/${repo.id}`, { favorite: !repo.favorite });
    setFavorites((prev) =>
      updated.favorite ? [updated, ...prev.filter((r) => r.id !== updated.id)] : prev.filter((r) => r.id !== updated.id),
    );
    return updated;
  }, []);

  const isFavorite = useCallback((repoId) => favorites.some((r) => r.id === repoId), [favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, refresh }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
