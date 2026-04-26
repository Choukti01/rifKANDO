import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';

const MessagesInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/messages/conversations');
      console.log('Conversations response:', response.data);
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="spinner"></div>
        <p>Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="messages-inbox">
      <h2>Messages</h2>
      {conversations.length === 0 ? (
        <div className="empty-state">
          <ChatBubbleLeftIcon className="empty-icon" />
          <p>No messages yet</p>
          <p className="empty-subtitle">When buyers message you, they'll appear here</p>
        </div>
      ) : (
        <div className="conversations-list">
          {conversations.map((conv) => (
            <Link to={`/messages/${conv.other_user_id}`} key={conv.other_user_id} className="conversation-item">
              <div className="conversation-avatar">
                {conv.other_user_avatar ? (
                  <img src={`http://localhost:5000${conv.other_user_avatar}`} alt="" />
                ) : (
                  <span>{conv.other_user_name?.charAt(0) || '?'}</span>
                )}
              </div>
              <div className="conversation-info">
                <div className="conversation-header">
                  <h4>{conv.other_user_name || 'User'}</h4>
                  <span className="conversation-time">
                    {conv.last_message_time ? new Date(conv.last_message_time).toLocaleDateString() : ''}
                  </span>
                </div>
                <p className="conversation-last-message">{conv.last_message?.substring(0, 60) || 'No messages yet'}...</p>
              </div>
              {conv.unread_count > 0 && (
                <div className="unread-badge">{conv.unread_count}</div>
              )}
            </Link>
          ))}
        </div>
      )}
      <style>{`
        .messages-inbox { max-width: 800px; margin: 0 auto; }
        .messages-inbox h2 { font-size: 1.25rem; margin-bottom: 1.5rem; }
        .empty-state { text-align: center; padding: 3rem; background: white; border-radius: 1rem; }
        .empty-icon { width: 3rem; height: 3rem; color: #9ca3af; margin: 0 auto 1rem; }
        .empty-subtitle { font-size: 0.75rem; color: #9ca3af; }
        .conversations-list { background: white; border-radius: 1rem; overflow: hidden; }
        .conversation-item { display: flex; align-items: center; gap: 1rem; padding: 1rem; border-bottom: 1px solid #e5e7eb; text-decoration: none; color: inherit; transition: background 0.2s; }
        .conversation-item:hover { background: #f9fafb; }
        .conversation-avatar { width: 48px; height: 48px; background: #87CEEB; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.125rem; overflow: hidden; flex-shrink: 0; }
        .conversation-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .conversation-info { flex: 1; }
        .conversation-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.25rem; }
        .conversation-header h4 { font-size: 0.875rem; font-weight: 600; margin: 0; }
        .conversation-time { font-size: 0.7rem; color: #9ca3af; }
        .conversation-last-message { font-size: 0.75rem; color: #6b7280; margin: 0; }
        .unread-badge { background: #ef4444; color: white; font-size: 0.7rem; font-weight: 600; padding: 0.125rem 0.5rem; border-radius: 1rem; min-width: 22px; text-align: center; }
      `}</style>
    </div>
  );
};

export default MessagesInbox;