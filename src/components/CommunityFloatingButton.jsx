import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, Lock, Sparkles, ArrowRight, X } from 'lucide-react';
import './CommunityFloatingButton.css';

export default function CommunityFloatingButton() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const hasActiveSubscription = () => {
    if (!currentUser || !currentUser.activePlans || !Array.isArray(currentUser.activePlans)) return false;
    const now = new Date();
    return currentUser.activePlans.some(plan => !plan.expiryDate || new Date(plan.expiryDate) > now);
  };

  const handleClick = () => {
    if (hasActiveSubscription()) {
      // Redirect to Community Platform in a new tab
      const communityUrl = import.meta.env.VITE_COMMUNITY_URL || 'https://community.interplanetary.tv';
      window.open(communityUrl, '_blank', 'noopener,noreferrer');
    } else {
      setShowModal(true);
    }
  };

  const handleGoToPlans = () => {
    setShowModal(false);
    navigate('/plans');
  };

  return (
    <>
      <div className="community-float-container">
        <button className="community-float-btn" onClick={handleClick} title="Explore ITV Space Community">
          <span className="community-float-icon">
            <Users size={18} />
          </span>
          <span>Space Community</span>
          <Sparkles size={14} style={{ color: '#ffd700' }} />
        </button>
      </div>

      {showModal && (
        <div className="community-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="community-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="community-modal-badge">
              <Lock size={32} />
            </div>
            <h3 className="community-modal-title">Subscription Required</h3>
            <p className="community-modal-desc">
              Exclusive access to the <strong>ITV Space Community</strong> platform is reserved for active Interplanetary subscribers. Connect with top space enthusiasts, professionals, and entrepreneurs.
            </p>

            <div className="community-modal-actions">
              <button className="btn-modal-plans" onClick={handleGoToPlans}>
                View Subscription Plans <ArrowRight size={16} style={{ display: 'inline', marginLeft: 4 }} />
              </button>
              <button className="btn-modal-cancel" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
