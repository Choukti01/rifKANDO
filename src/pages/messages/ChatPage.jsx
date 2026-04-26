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
  const productId = new URLSearchParams(location.search).get('product');

  useEffect(() => {
    fetchOtherUser();
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [userId, productId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchOtherUser = async () => {
    try {
      const response = await api.get(`/users/${userId}`);
      setOtherUser(response.data.user);
    } catch (error) {
      toast.error('User not found');
      navigate(-1);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/messages/conversation?other_user_id=${userId}&product_id=${productId || ''}`);
      setMessages(response.data.messages || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
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
      fetchMessages();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
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

        <div className="messages-area">
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
          background: #f3f4f6;
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
        .send-btn {
          padding: 0.75rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .send-btn:hover {
          background: #2c2c2c;
          transform: scale(1.05);
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default ChatPage;