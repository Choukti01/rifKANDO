import React, { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const CartContext = createContext()

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCart = () => {
      try {
        const savedCart = localStorage.getItem('rifkandi_cart')
        if (savedCart) {
          setCart(JSON.parse(savedCart))
        }
      } catch (error) {
        console.error('Failed to load cart:', error)
      } finally {
        setLoading(false)
      }
    }
    loadCart()
  }, [])

  const saveCart = (newCart) => {
    localStorage.setItem('rifkandi_cart', JSON.stringify(newCart))
    setCart(newCart)
  }

  const addToCart = (item, quantity = 1, type = 'product') => {
    setCart(prevCart => {
      const existingItem = prevCart.find(i => i.id === item.id && i.type === type)
      
      let newCart
      if (existingItem) {
        newCart = prevCart.map(i =>
          i.id === item.id && i.type === type
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
        toast.success(`Updated ${item.title} quantity`)
      } else {
        newCart = [...prevCart, { 
          ...item, 
          quantity: quantity, 
          type: type,
          addedAt: new Date().toISOString()
        }]
        toast.success(`${item.title} added to cart`)
      }
      
      saveCart(newCart)
      return newCart
    })
  }

  const removeFromCart = (itemId, type) => {
    setCart(prevCart => {
      const newCart = prevCart.filter(item => !(item.id === itemId && item.type === type))
      saveCart(newCart)
      toast.success('Item removed from cart')
      return newCart
    })
  }

  const updateQuantity = (itemId, type, quantity) => {
    if (quantity < 1) {
      removeFromCart(itemId, type)
      return
    }
    
    setCart(prevCart => {
      const newCart = prevCart.map(item =>
        item.id === itemId && item.type === type 
          ? { ...item, quantity: quantity } 
          : item
      )
      saveCart(newCart)
      return newCart
    })
  }

  const clearCart = () => {
    setCart([])
    localStorage.removeItem('rifkandi_cart')
    toast.success('Cart cleared')
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0)
  }

  const getItemsByType = (type) => {
    return cart.filter(item => item.type === type)
  }

  const cartCount = getCartCount()
  const cartTotal = getCartTotal()
  const isEmpty = cart.length === 0

  const value = {
    cart,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    getItemsByType,
    cartCount,
    cartTotal,
    isEmpty
  }

  return React.createElement(CartContext.Provider, { value: value }, children)
}