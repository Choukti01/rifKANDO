import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { PaperAirplaneIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ChatPage = () => {
  const { userId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const productId = new URLSearchParams(location.search).get('product');

  // Track if user has manually scrolled up
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const lastMessageCountRef = useRef(0);

  useEffect(() => {
    fetchOtherUser();
    fetchMessages();

    // Poll every 5 seconds, but only fetch if still in chat and no ongoing scroll
    const interval = setInterval(() => {
      fetchMessages(true); // silent fetch – do NOT trigger loading spinner
    }, 5000);
    return () => clearInterval(interval);
  }, [userId, productId]);

  // Detect scroll to decide whether auto‑scroll should happen
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50; // within 50px
      setUserScrolledUp(!isAtBottom);
    }
  };

  // Auto‑scroll only if user is NOT scrolled up
  const scrollToBottom = (behavior = 'smooth') => {
    if (!userScrolledUp && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  // Fetch messages (silent mode = no loading spinner, and no forced scroll if messages unchanged)
  const fetchMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get(`/messages/conversation?other_user_id=${userId}&product_id=${productId || ''}`);
      const newMessages = response.data.messages || [];
      
      // If message count changed, we may need to auto‑scroll (if user was at bottom)
      const countChanged = newMessages.length !== lastMessageCountRef.current;
      setMessages(newMessages);
      lastMessageCountRef.current = newMessages.length;
      
      if (countChanged && !userScrolledUp) {
        // Only scroll when new messages arrive and user hasn't scrolled up
        setTimeout(() => scrollToBottom(), 100);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (!silent) setLoading(false);
    }
  };

  const fetchOtherUser = async () => {
    try {
      const response = await api.get(`/users/${userId}`);
      setOtherUser(response.data.user);
    } catch (error) {
      toast.error('User not found');
      navigate(-1);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await api.post('/messages', {
        receiver_id: parseInt(userId),
        product_id: productId || null,
        message: newMessage.trim()
      });
      setNewMessage('');
      await fetchMessages(); // refresh
      // After sending, we assume user wants to see the new message – scroll if not scrolled up
      if (!userScrolledUp) {
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Scroll to bottom only on initial load (once)
  useEffect(() => {
    if (messages.length > 0 && lastMessageCountRef.current === 0) {
      scrollToBottom('auto');
    }
  }, [messages]);

  if (loading && messages.length === 0) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading conversation...</p>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-header">
          <button onClick={() => navigate(-1)} className="back-btn">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="chat-user-info">
            <div className="chat-avatar">
              {otherUser?.profilePicture ? (
                <img src={`http://localhost:5000${otherUser.profilePicture}`} alt="" />
              ) : (
                <span>{otherUser?.name?.charAt(0)}</span>
              )}
            </div>
            <div>
              <h3>{otherUser?.name}</h3>
              <p>{otherUser?.seller_type ? 'Seller' : 'Buyer'}</p>
            </div>
          </div>
        </div>

        <div 
          className="messages-area" 
          ref={messagesContainerRef}
          onScroll={handleScroll}
        >
          {messages.length === 0 ? (
            <div className="no-messages">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`message ${msg.sender_id === user?.id ? 'sent' : 'received'}`}
              >
                <div className="message-bubble">
                  <p>{msg.message}</p>
                  <span className="message-time">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="message-input-area">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="message-input"
          />
          <button type="submit" disabled={sending} className="send-btn">
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </form>
      </div>

      <style>{`
        .chat-page {
          min-height: calc(100vh - 80px);
          background: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        .chat-container {
          max-width: 800px;
          width: 100%;
          height: 70vh;
          background: white;
          border-radius: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .chat-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          background: white;
        }
        .back-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          padding: 0.25rem;
          border-radius: 0.5rem;
        }
        .back-btn:hover {
          background: #0f2e3a;
        }
        .chat-user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .chat-avatar {
          width: 40px;
          height: 40px;
          background: #87CEEB;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1rem;
          overflow: hidden;
        }
        .chat-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .chat-user-info h3 {
          font-size: 1rem;
          font-weight: 600;
        }
        .chat-user-info p {
          font-size: 0.7rem;
          color: #6b7280;
        }
        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .message {
          display: flex;
        }
        .message.sent {
          justify-content: flex-end;
        }
        .message.received {
          justify-content: flex-start;
        }
        .message-bubble {
          max-width: 70%;
          padding: 0.75rem 1rem;
          border-radius: 1rem;
          position: relative;
        }
        .message.sent .message-bubble {
          background: #87CEEB;
          color: #1a1a1a;
          border-bottom-right-radius: 0.25rem;
        }
        .message.received .message-bubble {
          background: #f3f4f6;
          color: #1a1a1a;
          border-bottom-left-radius: 0.25rem;
        }
        .message-time {
          font-size: 0.6rem;
          opacity: 0.7;
          display: block;
          margin-top: 0.25rem;
        }
        .no-messages {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }
        .message-input-area {
          display: flex;
          gap: 0.5rem;
          padding: 1rem;
          border-top: 1px solid #e5e7eb;
          background: white;
        }
        .message-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 2rem;
          font-size: 0.875rem;
        }
        .message-input:focus {
          outline: none;
          border-color: #87CEEB;
        }
        /* MODERN SEND BUTTON – brand color, no black */
        .send-btn {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #87CEEB, #5F9EA0);
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }
        .send-btn:hover {
          transform: scale(1.05);
          background: linear-gradient(135deg, #7bc4de, #4f8e90);
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }
        .send-btn:disabled {
          opacity: 0.5;
          transform: none;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default ChatPage;