import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getFavorites, addToFavorites, removeFromFavorites } from '../services/api';
import useAuth from '../hooks/useAuth';
import toast from 'react-hot-toast';
import FavoritesContext from './favoritesStore';

const FavoritesState = ({ children, isAuthenticated }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(isAuthenticated);

  const refreshFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getFavorites();
      setFavorites(response.data.favorites || []);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let isCurrent = true;

    const loadInitialFavorites = async () => {
      try {
        const response = await getFavorites();
        if (isCurrent) setFavorites(response.data.favorites || []);
      } catch (error) {
        if (isCurrent) console.error('Failed to load favorites:', error);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadInitialFavorites();

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated]);

  const addToFavoritesHandler = useCallback(async (item, type) => {
    if (!isAuthenticated) {
      toast.error('Please login to add to favorites');
      return false;
    }

    try {
      await addToFavorites(item.id, type);
      await refreshFavorites();
      toast.success(`${item.title} saved to favorites`);
      return true;
    } catch (error) {
      if (error.response?.data?.error === 'Item already in favorites') {
        toast.error('Item already in favorites');
      } else {
        toast.error('Failed to add to favorites');
      }
      return false;
    }
  }, [isAuthenticated, refreshFavorites]);

  const removeFromFavoritesHandler = useCallback(async (itemId, type) => {
    if (!isAuthenticated) {
      return false;
    }

    try {
      await removeFromFavorites(itemId, type);
      setFavorites(prev => prev.filter(fav => !(fav.item_id === itemId && fav.type === type)));
      toast.success('Removed from favorites');
      return true;
    } catch {
      toast.error('Failed to remove from favorites');
      return false;
    }
  }, [isAuthenticated]);

  const isFavorite = useCallback((itemId, type) => (
    favorites.some((favorite) => favorite.item_id === itemId && favorite.type === type)
  ), [favorites]);

  const value = useMemo(() => ({
    favorites,
    loading,
    addToFavorites: addToFavoritesHandler,
    removeFromFavorites: removeFromFavoritesHandler,
    isFavorite,
    favoritesCount: favorites.length,
    isEmpty: favorites.length === 0
  }), [favorites, loading, addToFavoritesHandler, removeFromFavoritesHandler, isFavorite]);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const FavoritesProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();

  return (
    <FavoritesState key={isAuthenticated ? 'authenticated' : 'anonymous'} isAuthenticated={isAuthenticated}>
      {children}
    </FavoritesState>
  );
};
