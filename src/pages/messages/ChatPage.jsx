import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import VerifiedBadge from '../../components/common/VerifiedBadge';

const ChatPage = () => {
  const { userId } = useParams();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();
  const productId = location.state?.product_id || null;

  useEffect(() => {
    fetchUser();
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [userId, productId]);

  const fetchUser = async () => {
    try {
      const response = await api.get(`/users/${userId}`);
      setOtherUser(response.data.user);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const params = { other_user_id: userId };
      if (productId) params.product_id = productId;
      const response = await api.get('/messages/conversation', { params });
      setMessages(response.data.messages || []);
      scrollToBottom();
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await api.post('/messages', {
        receiver_id: userId,
        product_id: productId,
        message: newMessage.trim()
      });
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="text-center py-16"><div className="spinner"></div><p>Loading chat...</p></div>;
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <h2>
          Chat with {otherUser?.name || 'User'}
          {otherUser?.is_verified_seller === 1 && <VerifiedBadge size="small" />}
        </h2>
        {productId && <small>Regarding product ID: {productId}</small>}
      </div>
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages">No messages yet. Start the conversation.</div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message ${msg.sender_id === user?.id ? 'sent' : 'received'}`}
            >
              <div className="message-text">{msg.message}</div>
              <div className="message-time">{formatTime(msg.created_at)}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          rows="2"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button onClick={sendMessage} disabled={sending}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>

      <style>{`
        .chat-page { max-width: 800px; margin: 0 auto; background: white; border-radius: 1rem; overflow: hidden; display: flex; flex-direction: column; height: calc(100vh - 160px); }
        .chat-header { padding: 1rem; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
        .chat-header h2 { font-size: 1.25rem; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
        .chat-header small { font-size: 0.7rem; color: #6b7280; }
        .chat-messages { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .message { max-width: 70%; padding: 0.5rem 0.75rem; border-radius: 1rem; font-size: 0.875rem; position: relative; }
        .message.sent { align-self: flex-end; background: #87CEEB; color: #1a1a1a; border-bottom-right-radius: 0.25rem; }
        .message.received { align-self: flex-start; background: #f3f4f6; color: #1f2937; border-bottom-left-radius: 0.25rem; }
        .message-time { font-size: 0.6rem; color: #6b7280; margin-top: 0.25rem; text-align: right; }
        .no-messages { text-align: center; color: #9ca3af; padding: 2rem; }
        .chat-input-area { padding: 1rem; border-top: 1px solid #e5e7eb; display: flex; gap: 0.5rem; }
        .chat-input-area textarea { flex: 1; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; resize: none; }
        .chat-input-area button { padding: 0.5rem 1rem; background: #1a1a1a; color: white; border: none; border-radius: 0.5rem; cursor: pointer; }
        .chat-input-area button:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
};

export default ChatPage;