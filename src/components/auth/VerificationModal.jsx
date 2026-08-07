import React, { useState, useEffect } from 'react';
import { EnvelopeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const VerificationModal = ({ email, onVerify, onClose, onResend }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (timer > 0 && !canResend) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setCanResend(true);
    }
  }, [timer]);

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = async () => {
    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    
    setLoading(true);
    await onVerify(verificationCode);
    setLoading(false);
  };

  const handleResend = async () => {
    if (!canResend) return;
    setLoading(true);
    await onResend();
    setTimer(60);
    setCanResend(false);
    setCode(['', '', '', '', '', '']);
    setLoading(false);
  };

  return (
    <div className="verification-modal-overlay">
      <div className="verification-modal">
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-icon">
          <EnvelopeIcon className="w-12 h-12 text-primary" />
        </div>
        
        <h2>Verify Your Email</h2>
        <p>
          We've sent a verification code to<br />
          <strong>{email}</strong>
        </p>
        
        <div className="code-inputs">
          {code.map((digit, index) => (
            <input
              key={index}
              id={`code-input-${index}`}
              type="text"
              maxLength="1"
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              className="code-input"
            />
          ))}
        </div>
        
        <button 
          className="verify-btn" 
          onClick={handleVerify}
          disabled={loading}
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
        
        <div className="resend-section">
          {canResend ? (
            <button onClick={handleResend} className="resend-btn">
              <ArrowPathIcon className="w-4 h-4" />
              Resend Code
            </button>
          ) : (
            <p className="resend-timer">Resend code in {timer}s</p>
          )}
        </div>
      </div>

      <style>{`
        .verification-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .verification-modal {
          background: white;
          border-radius: 1.5rem;
          padding: 2rem;
          width: 450px;
          max-width: 90%;
          text-align: center;
          position: relative;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
        }
        .modal-icon {
          margin-bottom: 1rem;
        }
        .verification-modal h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .verification-modal p {
          color: #6b7280;
          margin-bottom: 1.5rem;
        }
        .code-inputs {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        .code-input {
          width: 50px;
          height: 60px;
          text-align: center;
          font-size: 1.5rem;
          font-weight: 600;
          border: 2px solid #e5e7eb;
          border-radius: 0.75rem;
          background: white;
        }
        .code-input:focus {
          outline: none;
          border-color: #87CEEB;
        }
        .verify-btn {
          width: 100%;
          padding: 0.875rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 2rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 1rem;
        }
        .verify-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .resend-section {
          text-align: center;
        }
        .resend-btn {
          background: none;
          border: none;
          color: #87CEEB;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }
        .resend-timer {
          color: #9ca3af;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default VerificationModal;
