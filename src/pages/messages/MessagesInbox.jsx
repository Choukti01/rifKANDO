import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

const MessagesInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    const loadConversations = async () => {
      try {
        const response = await api.get('/messages/conversations');
        if (isCurrent) setConversations(response.data.conversations || []);
      } catch (error) {
        if (isCurrent) {
          console.error('Error fetching conversations:', error);
          toast.error('Failed to load messages');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadConversations();
    const interval = setInterval(() => {
      void loadConversations();
    }, 5000);

    return () => {
      isCurrent = false;
      clearInterval(interval);
    };
  }, []);

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div className="py-16"><LoadingSkeleton variant="list" count={4} label="Loading messages" /></div>;
  }

  return (
    <div className="messages-inbox">
      <h2>Messages</h2>
      {conversations.length === 0 ? (
        <EmptyState
          title="No messages yet"
          description="Customer conversations will appear here when someone gets in touch."
        />
      ) : (
        <div className="conversations-list">
          {conversations.map(conv => (
            <Link
              key={conv.other_user_id}
              to={`${conv.other_user_id}`}
              state={{ product_id: conv.product_id }}
              className="conversation-item"
            >
              <div className="conversation-avatar">
                {conv.other_user_avatar ? (
                  <img src={`http://localhost:5000${conv.other_user_avatar}`} alt="" />
                ) : (
                  <span>{conv.other_user_name?.charAt(0)}</span>
                )}
              </div>
              <div className="conversation-info">
                <div className="conversation-name">
                  {conv.other_user_name}
                </div>
                <div className="conversation-last-message">{conv.last_message}</div>
              </div>
              <div className="conversation-meta">
                <div className="conversation-time">{formatTime(conv.last_message_time)}</div>
                {conv.unread_count > 0 && (
                  <div className="unread-badge">{conv.unread_count}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
      <style>{`
        .messages-inbox { max-width: 800px; margin: 0 auto; padding: 1rem; }
        .messages-inbox h2 { font-size: 1.5rem; margin-bottom: 1.5rem; }
        .conversations-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .conversation-item { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: white; border-radius: 1rem; text-decoration: none; color: inherit; transition: all 0.2s; border: 1px solid #e5e7eb; }
        .conversation-item:hover { background: #f9fafb; transform: translateX(4px); }
        .conversation-avatar { width: 50px; height: 50px; background: #87CEEB; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; overflow: hidden; }
        .conversation-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .conversation-info { flex: 1; }
        .conversation-name { font-weight: 600; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.25rem; }
        .conversation-last-message { font-size: 0.8rem; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px; }
        .conversation-meta { text-align: right; }
        .conversation-time { font-size: 0.7rem; color: #9ca3af; margin-bottom: 0.25rem; }
        .unread-badge { background: #ef4444; color: white; border-radius: 9999px; padding: 0.25rem 0.5rem; font-size: 0.7rem; font-weight: bold; }
      `}</style>
    </div>
  );
};

export default MessagesInbox;
