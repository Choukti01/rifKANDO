import React, { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const FavoritesContext = createContext()

export const useFavorites = () => {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider')
  }
  return context
}

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFavorites = () => {
      try {
        const savedFavorites = localStorage.getItem('rifkandi_favorites')
        if (savedFavorites) {
          setFavorites(JSON.parse(savedFavorites))
        }
      } catch (error) {
        console.error('Failed to load favorites:', error)
      } finally {
        setLoading(false)
      }
    }
    loadFavorites()
  }, [])

  const saveFavorites = (newFavorites) => {
    localStorage.setItem('rifkandi_favorites', JSON.stringify(newFavorites))
    setFavorites(newFavorites)
  }

  const addToFavorites = (item, type = 'product') => {
    setFavorites(prev => {
      const existing = prev.find(f => f.id === item.id && f.type === type)
      if (existing) {
        toast.error(`${item.title} is already in favorites`)
        return prev
      }
      
      const newFavorites = [...prev, { ...item, type: type, addedAt: new Date().toISOString() }]
      saveFavorites(newFavorites)
      toast.success(`${item.title} added to favorites`)
      return newFavorites
    })
  }

  const removeFromFavorites = (itemId, type) => {
    setFavorites(prev => {
      const newFavorites = prev.filter(item => !(item.id === itemId && item.type === type))
      saveFavorites(newFavorites)
      toast.success('Removed from favorites')
      return newFavorites
    })
  }

  const isFavorite = (itemId, type) => {
    return favorites.some(item => item.id === itemId && item.type === type)
  }

  const getFavoritesByType = (type) => {
    return favorites.filter(item => item.type === type)
  }

  const favoritesCount = favorites.length
  const isEmpty = favorites.length === 0

  const value = {
    favorites,
    loading,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    getFavoritesByType,
    favoritesCount,
    isEmpty
  }

  return React.createElement(FavoritesContext.Provider, { value: value }, children)
}