import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  // Loading cart from backend when user is authenticated
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isAuthenticated) {
        await loadCartFromBackend(isMounted);
      } else {
        loadCartFromLocal(isMounted);
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Loading cart from backend API
  const loadCartFromBackend = async (isMounted) => {
    try {
      setLoading(true);
      const response = await api.get('/cart');
      const cartItems = response.data.cart || [];
      
      const formattedCart = cartItems.map(item => ({
        id: item.product_id,
        title: item.title,
        price: item.price,
        image: item.image,
        quantity: item.quantity,
        type: 'product',
        seller: item.seller_name || 'Seller',
        addedAt: item.created_at
      }));
      
      if (isMounted) {
        setCart(formattedCart);
        localStorage.setItem('rifkandi_cart', JSON.stringify(formattedCart));
      }
    } catch (error) {
      console.error('Failed to load cart from backend:', error);
      loadCartFromLocal(isMounted);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  // Loading cart from localStorage (fallback)
  const loadCartFromLocal = (isMounted) => {
    try {
      const savedCart = localStorage.getItem('rifkandi_cart');
      if (savedCart && isMounted) {
        setCart(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  const addToCart = async (item, quantity = 1, type = 'product') => {
    const newCart = [...cart];
    const existingIndex = newCart.findIndex(i => i.id === item.id && i.type === type);
    
    if (existingIndex !== -1) {
      newCart[existingIndex].quantity += quantity;
      toast.success(`Updated ${item.title} quantity`);
    } else {
      newCart.push({ 
        ...item, 
        quantity, 
        type,
        addedAt: new Date().toISOString()
      });
      toast.success(`${item.title} is in your cart`);
    }
    
    setCart(newCart);
    localStorage.setItem('rifkandi_cart', JSON.stringify(newCart));
    
    // Sync to backend if authenticated (don't await to avoid blocking)
    if (isAuthenticated) {
      api.post('/cart', {
        product_id: item.id,
        quantity: quantity
      }).catch(error => {
        console.error('Failed to add to backend cart:', error);
      });
    }
  };

  const removeFromCart = async (itemId, type) => {
    const newCart = cart.filter(item => !(item.id === itemId && item.type === type));
    setCart(newCart);
    localStorage.setItem('rifkandi_cart', JSON.stringify(newCart));
    
    if (isAuthenticated) {
      api.delete(`/cart/${itemId}`).catch(error => {
        console.error('Failed to remove from backend cart:', error);
      });
    }
    
    toast.success('Item removed from cart');
  };

  const updateQuantity = async (itemId, type, quantity) => {
    if (quantity < 1) {
      removeFromCart(itemId, type);
      return;
    }
    
    const newCart = cart.map(item =>
      item.id === itemId && item.type === type 
        ? { ...item, quantity } 
        : item
    );
    
    setCart(newCart);
    localStorage.setItem('rifkandi_cart', JSON.stringify(newCart));
    
    if (isAuthenticated) {
      api.put(`/cart/${itemId}`, { quantity }).catch(error => {
        console.error('Failed to update backend cart:', error);
      });
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      for (const item of cart) {
        await api.delete(`/cart/${item.id}`).catch(error => {
          console.error('Failed to clear cart item:', error);
        });
      }
    }
    
    setCart([]);
    localStorage.removeItem('rifkandi_cart');
    toast.success('Cart cleared');
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const getItemsByType = (type) => {
    return cart.filter(item => item.type === type);
  };

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
    cartCount: getCartCount(),
    cartTotal: getCartTotal(),
    isEmpty: cart.length === 0
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
