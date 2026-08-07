import React, { createContext, useContext, useState, useEffect } from 'react';
import { getFavorites, addToFavorites, removeFromFavorites } from '../services/api';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const FavoritesContext = createContext();

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
};

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadFavorites();
    } else {
      setFavorites([]);
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const response = await getFavorites();
      setFavorites(response.data.favorites || []);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToFavoritesHandler = async (item, type) => {
    if (!isAuthenticated) {
      toast.error('Please login to add to favorites');
      return false;
    }

    try {
      await addToFavorites(item.id, type);
      await loadFavorites();
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
  };

  const removeFromFavoritesHandler = async (itemId, type) => {
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
  };

  const isFavorite = (itemId, type) => {
    return favorites.some(fav => fav.item_id === itemId && fav.type === type);
  };

  const value = {
    favorites,
    loading,
    addToFavorites: addToFavoritesHandler,
    removeFromFavorites: removeFromFavoritesHandler,
    isFavorite,
    favoritesCount: favorites.length,
    isEmpty: favorites.length === 0
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};
