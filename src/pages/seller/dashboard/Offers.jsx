import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Offers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [expandedChat, setExpandedChat] = useState(null); // offerId -> true/false
  const [messages, setMessages] = useState({}); // offerId -> array of messages
  const [newMessage, setNewMessage] = useState({}); // offerId -> text
  const [sending, setSending] = useState({});
  const messagesEndRef = useRef({});

  const { user } = useAuth();

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/seller/offers');
      setOffers(response.data.offers || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (offerId, action) => {
    setResponding(offerId);
    try {
      await api.patch(`/seller/offers/${offerId}/respond`, { action });
      toast.success(`Offer ${action}ed successfully`);
      fetchOffers(); // refresh list
    } catch (error) {
      console.error('Error responding to offer:', error);
      toast.error(error.response?.data?.error || 'Failed to respond');
    } finally {
      setResponding(null);
    }
  };


  // Load chat messages for an offer
  const loadChat = async (offer) => {
    const offerId = offer.id;
    if (messages[offerId]) return; // already loaded

    try {
      const response = await api.get('/messages/conversation', {
        params: {
          other_user_id: offer.buyer_id,
          product_id: offer.product_id
        }
      });
      setMessages(prev => ({
        ...prev,
        [offerId]: response.data.messages || []
      }));
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load chat');
    }
  };

  const toggleChat = (offer) => {
    const offerId = offer.id;
    if (expandedChat === offerId) {
      setExpandedChat(null);
    } else {
      setExpandedChat(offerId);
      loadChat(offer);
    }
  };

  const sendMessage = async (offer) => {
    const offerId = offer.id;
    const messageText = newMessage[offerId]?.trim();
    if (!messageText) return;

    setSending(prev => ({ ...prev, [offerId]: true }));
    try {
      await api.post('/messages', {
        receiver_id: offer.buyer_id,
        product_id: offer.product_id,
        message: messageText
      });
      // reload conversation
      const response = await api.get('/messages/conversation', {
        params: {
          other_user_id: offer.buyer_id,
          product_id: offer.product_id
        }
      });
      setMessages(prev => ({
        ...prev,
        [offerId]: response.data.messages || []
      }));
      setNewMessage(prev => ({ ...prev, [offerId]: '' }));
      // scroll to bottom
      setTimeout(() => {
        if (messagesEndRef.current[offerId]) {
          messagesEndRef.current[offerId].scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(prev => ({ ...prev, [offerId]: false }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MA', { style: 'currency', currency: 'MAD' }).format(amount);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-MA', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge pending">Pending</span>;
      case 'accepted':
        return <span className="badge accepted">Accepted</span>;
      case 'rejected':
        return <span className="badge rejected">Rejected</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  if (loading) {
    return <div className="text-center py-16"><div className="spinner"></div><p>Loading offers...</p></div>;
  }

  return (
    <div className="offers-dashboard">
      <div className="offers-header">
        <h2>Received Offers</h2>
        <p>Manage offers on your Joutiya products</p>
      </div>

      {offers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💰</div>
          <p>No offers received yet</p>
          <small>When buyers make offers on your Joutiya items, they'll appear here</small>
        </div>
      ) : (
        <div className="offers-table-container">
          <table className="offers-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Buyer</th>
                <th>Offer Amount</th>
                <th>Message</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(offer => (
                <React.Fragment key={offer.id}>
                  <tr className={expandedChat === offer.id ? 'expanded-row' : ''}>
                    <td>
                      <div className="product-info">
                        <strong>{offer.product_title}</strong>
                        <small>Original: {formatCurrency(offer.product_price)}</small>
                      </div>
                    </td>
                    <td>
                      <div className="buyer-info">
                        <span>{offer.buyer_name}</span>
                        <small>{offer.buyer_email}</small>
                      </div>
                    </td>
                    <td className="offer-amount">{formatCurrency(offer.amount)}</td>
                    <td className="offer-message">{offer.message || <em>No message</em>}</td>
                    <td>{formatDate(offer.created_at)}</td>
                    <td>{getStatusBadge(offer.status)}</td>
                    <td>
                      {offer.status === 'pending' && (
                        <div className="action-buttons">
                          <button
                            onClick={() => handleRespond(offer.id, 'accept')}
                            disabled={responding === offer.id}
                            className="btn-accept"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespond(offer.id, 'reject')}
                            disabled={responding === offer.id}
                            className="btn-reject"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {offer.status === 'accepted' && (
                        <button
                          onClick={() => toggleChat(offer)}
                          className="btn-chat"
                        >
                          {expandedChat === offer.id ? 'Close Chat' : 'Message Buyer'}
                        </button>
                      )}
                      {offer.status === 'rejected' && (
                        <span className="rejected-label">No action</span>
                      )}
                    </td>
                  </tr>
                  {expandedChat === offer.id && (
                    <tr className="chat-row">
                      <td colSpan="7">
                        <div className="inline-chat">
                          <div className="chat-header">
                            <strong>💬 Chat with {offer.buyer_name}</strong>
                            <small>About: {offer.product_title}</small>
                          </div>
                          <div className="chat-messages">
                            {messages[offer.id]?.length === 0 && (
                              <div className="no-messages">No messages yet. Send a message below.</div>
                            )}
                            {messages[offer.id]?.map((msg, idx) => (
                              <div
                                key={idx}
                                className={`message-bubble ${msg.sender_id === user?.id ? 'sent' : 'received'}`}
                              >
                                <div className="message-sender">
                                  {msg.sender_id === user?.id ? 'You' : offer.buyer_name}
                                </div>
                                <div className="message-text">{msg.message}</div>
                                <div className="message-time">{formatDate(msg.created_at)}</div>
                              </div>
                            ))}
                            <div ref={el => messagesEndRef.current[offer.id] = el} />
                          </div>
                          <div className="chat-input">
                            <textarea
                              value={newMessage[offer.id] || ''}
                              onChange={(e) => setNewMessage(prev => ({ ...prev, [offer.id]: e.target.value }))}
                              placeholder="Type your message..."
                              rows="2"
                            />
                            <button
                              onClick={() => sendMessage(offer)}
                              disabled={sending[offer.id]}
                              className="send-btn"
                            >
                              {sending[offer.id] ? 'Sending...' : 'Send'}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .offers-dashboard {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .offers-header {
          margin-bottom: 1.5rem;
        }
        .offers-header h2 {
          font-size: 1.25rem;
          margin-bottom: 0.25rem;
        }
        .offers-header p {
          color: #6b7280;
          font-size: 0.875rem;
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
        }
        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        .offers-table-container {
          overflow-x: auto;
        }
        .offers-table {
          width: 100%;
          border-collapse: collapse;
        }
        .offers-table th,
        .offers-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
          vertical-align: top;
        }
        .offers-table th {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
        }
        .product-info {
          display: flex;
          flex-direction: column;
        }
        .product-info strong {
          font-size: 0.875rem;
        }
        .product-info small {
          font-size: 0.7rem;
          color: #6b7280;
        }
        .buyer-info {
          display: flex;
          flex-direction: column;
        }
        .buyer-info span {
          font-size: 0.875rem;
        }
        .buyer-info small {
          font-size: 0.7rem;
          color: #6b7280;
        }
        .offer-amount {
          font-weight: 600;
          color: #10b981;
        }
        .offer-message {
          max-width: 200px;
          font-size: 0.8rem;
          color: #4b5563;
          word-break: break-word;
        }
        .badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 500;
        }
        .badge.pending {
          background: #fef3c7;
          color: #92400e;
        }
        .badge.accepted {
          background: #d1fae5;
          color: #065f46;
        }
        .badge.rejected {
          background: #fee2e2;
          color: #991b1b;
        }
        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }
        .btn-accept, .btn-reject, .btn-chat {
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          border-radius: 0.5rem;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-accept {
          background: #10b981;
          color: white;
        }
        .btn-accept:hover {
          background: #059669;
        }
        .btn-reject {
          background: #ef4444;
          color: white;
        }
        .btn-reject:hover {
          background: #dc2626;
        }
        .btn-chat {
          background: #87CEEB;
          color: #1a1a1a;
        }
        .btn-chat:hover {
          background: #5F9EA0;
        }
        .rejected-label {
          font-size: 0.7rem;
          color: #9ca3af;
        }
        .expanded-row {
          background: #f9fafb;
        }
        .chat-row td {
          padding: 0;
          background: #f9fafb;
        }
        .inline-chat {
          background: white;
          border-radius: 0.75rem;
          margin: 0 1rem 1rem 1rem;
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }
        .chat-header {
          padding: 0.75rem 1rem;
          background: #f3f4f6;
          border-bottom: 1px solid #e5e7eb;
        }
        .chat-header strong {
          font-size: 0.875rem;
        }
        .chat-header small {
          display: block;
          font-size: 0.7rem;
          color: #6b7280;
        }
        .chat-messages {
          max-height: 300px;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .no-messages {
          text-align: center;
          color: #9ca3af;
          font-size: 0.8rem;
          padding: 1rem;
        }
        .message-bubble {
          max-width: 70%;
          padding: 0.5rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.8rem;
          position: relative;
        }
        .message-bubble.sent {
          align-self: flex-end;
          background: #87CEEB;
          color: #1a1a1a;
          border-bottom-right-radius: 0.25rem;
        }
        .message-bubble.received {
          align-self: flex-start;
          background: #f3f4f6;
          color: #1f2937;
          border-bottom-left-radius: 0.25rem;
        }
        .message-sender {
          font-size: 0.6rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .message-time {
          font-size: 0.6rem;
          color: #6b7280;
          margin-top: 0.25rem;
          text-align: right;
        }
        .chat-input {
          padding: 0.75rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 0.5rem;
        }
        .chat-input textarea {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.8rem;
          resize: vertical;
        }
        .send-btn {
          padding: 0.5rem 1rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .offers-table th, .offers-table td {
            padding: 0.5rem;
          }
          .offer-message {
            max-width: 120px;
          }
        }
      `}</style>
    </div>
  );
};

export default Offers;
