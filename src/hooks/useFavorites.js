import { useContext } from 'react';
import FavoritesContext from '../contexts/favoritesStore';

const useFavorites = () => {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }

  return context;
};

export default useFavorites;
