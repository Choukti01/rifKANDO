import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('rifkandi_token'))

  useEffect(() => {
    const loadUser = () => {
      if (token) {
        // Mock user data - will be replaced with real API call
        const mockUser = {
          id: '1',
          name: 'Ahmed Benjelloun',
          email: 'ahmed@example.com',
          phone: '0612345678',
          roles: ['buyer'],
          avatar: null,
          createdAt: new Date().toISOString()
        }
        setUser(mockUser)
      }
      setLoading(false)
    }
    loadUser()
  }, [token])

  const login = async (email, password) => {
    try {
      setLoading(true)
      // Mock login - will be replaced with API call
      const mockToken = 'mock-jwt-token-' + Date.now()
      const mockUser = {
        id: '1',
        name: email.split('@')[0],
        email: email,
        phone: '0612345678',
        roles: ['buyer'],
        createdAt: new Date().toISOString()
      }
      
      localStorage.setItem('rifkandi_token', mockToken)
      setToken(mockToken)
      setUser(mockUser)
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData) => {
    try {
      setLoading(true)
      // Mock registration - will be replaced with API call
      const mockToken = 'mock-jwt-token-' + Date.now()
      const mockUser = {
        id: '2',
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        roles: ['buyer'],
        createdAt: new Date().toISOString()
      }
      
      localStorage.setItem('rifkandi_token', mockToken)
      setToken(mockToken)
      setUser(mockUser)
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('rifkandi_token')
    setToken(null)
    setUser(null)
  }

  const updateUser = (updatedUser) => {
    setUser(updatedUser)
  }

  const hasRole = (role) => {
    if (!user || !user.roles) return false
    return user.roles.includes(role)
  }

  const updateSellerType = (sellerType) => {
    if (user) {
      const updatedUser = {
        ...user,
        sellerType: sellerType,
        roles: [...user.roles, 'seller']
      }
      setUser(updatedUser)
    }
  }

  const value = {
    user,
    loading,
    token,
    isAuthenticated: user !== null,
    login,
    register,
    logout,
    updateUser,
    updateSellerType,
    hasRole
  }

  return React.createElement(AuthContext.Provider, { value: value }, children)
}