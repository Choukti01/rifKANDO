import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth';
import CartContext from './cartStore';

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  // Loading cart from localStorage (fallback)
  const loadCartFromLocal = useCallback((isMounted) => {
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
  }, []);

  // Loading cart from backend API
  const loadCartFromBackend = useCallback(async (isMounted) => {
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
        stock: Number.isFinite(Number(item.stock)) ? Number(item.stock) : null,
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
  }, [loadCartFromLocal]);

  // Load the authenticated cart when possible and fall back to the local basket.
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
  }, [isAuthenticated, loadCartFromBackend, loadCartFromLocal]);

  const addToCart = async (item, quantity = 1, type = 'product') => {
    const requestedQuantity = Number(quantity);
    const existingItem = cart.find((cartItem) => cartItem.id === item.id && cartItem.type === type);
    const availableStock = Number.isFinite(Number(item.stock)) ? Number(item.stock) : null;
    const nextQuantity = (existingItem?.quantity || 0) + requestedQuantity;

    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) return false;
    if (availableStock !== null && availableStock < 1) {
      toast.error('This item is out of stock');
      return false;
    }
    if (availableStock !== null && nextQuantity > availableStock) {
      toast.error(`Only ${availableStock} item(s) are available`);
      return false;
    }

    const previousCart = cart;
    const newCart = existingItem
      ? cart.map((cartItem) => cartItem.id === item.id && cartItem.type === type
        ? { ...cartItem, quantity: nextQuantity, stock: availableStock ?? cartItem.stock }
        : cartItem)
      : [...cart, { ...item, quantity: requestedQuantity, type, stock: availableStock, addedAt: new Date().toISOString() }];

    setCart(newCart);
    localStorage.setItem('rifkandi_cart', JSON.stringify(newCart));

    if (isAuthenticated) {
      try {
        await api.post('/cart', { product_id: item.id, quantity: requestedQuantity });
      } catch (error) {
        console.error('Failed to add to backend cart:', error);
        setCart(previousCart);
        localStorage.setItem('rifkandi_cart', JSON.stringify(previousCart));
        toast.error(error.response?.data?.error || 'Could not update your cart');
        return false;
      }
    }
    toast.success(existingItem ? `Updated ${item.title} quantity` : `${item.title} is in your cart`);
    return true;
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
      return removeFromCart(itemId, type);
    }
    const currentItem = cart.find((item) => item.id === itemId && item.type === type);
    if (!currentItem) return false;
    if (Number.isFinite(Number(currentItem.stock)) && quantity > Number(currentItem.stock)) {
      toast.error(`Only ${currentItem.stock} item(s) are available`);
      return false;
    }

    const previousCart = cart;
    const newCart = cart.map(item =>
      item.id === itemId && item.type === type 
        ? { ...item, quantity } 
        : item
    );
    
    setCart(newCart);
    localStorage.setItem('rifkandi_cart', JSON.stringify(newCart));
    if (isAuthenticated) {
      try {
        await api.put(`/cart/${itemId}`, { quantity });
      } catch (error) {
        console.error('Failed to update backend cart:', error);
        setCart(previousCart);
        localStorage.setItem('rifkandi_cart', JSON.stringify(previousCart));
        toast.error(error.response?.data?.error || 'Could not update your cart');
        return false;
      }
    }
    return true;
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
