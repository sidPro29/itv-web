import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../api';
import { ShieldCheck, Info, Loader2, CreditCard, X, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import './Plans.css';

const STRIPE_KEYS = {
  TEST_KEY: 'pk_test_51QXMnwGoExYliEVvZWtX57kEp0pympGoygrsomujWz3e0QQspmRqO0cEzdejsGX4iGTlNbcRc6NFmvv60sIII6wh00pDj3Tvms',
  LIVE_KEY: 'pk_live_51QXMnwGoExYliEVvUJ0Bej64womLcFqX4wS2abP0YHHCQwAdMAgFEAv1Tvxlk9Jrzx3kJ1gtNnS4BEjwb19Zo2oS00j60jbUuj'
};

export default function Plans() {
  const { currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('Monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedPlans, setExpandedPlans] = useState({});

  const toggleExpand = (planId) => {
    setExpandedPlans(prev => ({
      ...prev,
      [planId]: !prev[planId]
    }));
  };

  const getPlanBenefits = (plan) => {
    if (!plan) return [];
    if (plan.benefits && plan.benefits.length > 0) {
      return plan.benefits;
    }
    const name = (plan.name || '').toLowerCase();
    if (name.includes('4k')) {
      return [
        'Ultra HD 4K streaming resolution on all supported devices',
        'Watch full catalogue of shows, films, and space documentaries with no ad interruptions',
        'Multi-screen streaming access (TV, mobile, tablet, and desktop)',
        'Full access to the ITV Space Community Platform'
      ];
    }
    if (name.includes('premium')) {
      return [
        'Full HD (1080p) streaming resolution',
        'Stream all premium series, films, and news ad-free',
        'Multi-device streaming support',
        'Full access to the ITV Space Community Platform'
      ];
    }
    if (name.includes('standard')) {
      return [
        'Full HD (1080p) streaming access',
        'Watch trailers and selected shows with no ad interruptions',
        'Full catalogue browsing and instant news alerts'
      ];
    }
    if (name.includes('basic') || name.includes('avod')) {
      return [
        'Standard Definition (SD 576p) streaming',
        'Watch on 1 device',
        'Access to trailers and selected catalogue shows',
        'Customer support via email'
      ];
    }
    if (plan.type === 'adsPlan') {
      return [
        'Video commercial runs during daily broadcasts',
        'Press release published on ITV news page and all social media channels',
        'Media coordination and digital marketing campaigns',
        'Customer support via email'
      ];
    }
    return [
      'Unlimited streaming access to ITV catalogue',
      'High quality video playback',
      'Customer support'
    ];
  };

  // Payment Modal States
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [processing, setProcessing] = useState(false);

  const cardElementRef = useRef(null);
  const [stripeInstance, setStripeInstance] = useState(null);
  const [cardInstance, setCardInstance] = useState(null);

  useEffect(() => {
    async function loadPlans() {
      try {
        setLoading(true);
        const data = await ApiService.getPlans();
        // Remove admin/test plans
        const filtered = (data || []).filter(p => !p.name.toLowerCase().includes('admin'));
        setPlans(filtered);
      } catch (err) {
        console.error("Failed to load plans:", err);
        setError("Failed to load plans. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);

  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const publishableKey = isProduction ? STRIPE_KEYS.LIVE_KEY : STRIPE_KEYS.TEST_KEY;

  // Mount Stripe Card Element
  useEffect(() => {
    if (!isModalOpen || !selectedPlan) return;

    let stripe = null;
    let elements = null;
    let card = null;

    const timer = setTimeout(() => {
      if (window.Stripe) {
        try {
          stripe = window.Stripe(publishableKey);
          setStripeInstance(stripe);

          elements = stripe.elements();
          card = elements.create('card', {
            style: {
              base: {
                color: '#32325d',
                fontFamily: '"Outfit", sans-serif',
                fontSize: '16px',
                '::placeholder': {
                  color: '#aab7c4'
                }
              },
              invalid: {
                color: '#fa755a',
                iconColor: '#fa755a'
              }
            }
          });
          setCardInstance(card);

          if (cardElementRef.current) {
            card.mount(cardElementRef.current);
          }
        } catch (e) {
          console.error("Stripe initialization error", e);
          setPaymentError("Unable to load Stripe.");
        }
      } else {
        setPaymentError("Stripe JS library could not be loaded.");
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (card) {
        card.destroy();
      }
    };
  }, [isModalOpen, selectedPlan]);

  const handleSelectPlan = (plan) => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/plans' } });
      return;
    }

    const now = new Date();
    const activePlan = currentUser.activePlans?.find(ap => new Date(ap.expiryDate) > now);

    if (activePlan) {
      // 1. Can't buy already active plan
      if (activePlan.planId === plan._id) {
        alert("This plan is already active on your account.");
        return;
      }

      // 2. Can't buy plan with lower amount/month
      const activePlanDetails = plans.find(p => p._id === activePlan.planId);
      if (activePlanDetails) {
        const activeRate = activePlanDetails.billingCycle === 'Yearly' ? activePlanDetails.amount / 12 : activePlanDetails.amount;
        const targetRate = plan.billingCycle === 'Yearly' ? plan.amount / 12 : plan.amount;

        if (targetRate < activeRate) {
          alert(`You cannot downgrade to a plan with a lower price than your current active plan (${activePlanDetails.name}).`);
          return;
        }
      }
    }

    setSelectedPlan(plan);
    setIsModalOpen(true);
    setPaymentError('');
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!stripeInstance || !cardInstance || !selectedPlan) return;

    setProcessing(true);
    setPaymentError('');

    try {
      const { token, error } = await stripeInstance.createToken(cardInstance);

      if (error) {
        setPaymentError(error.message);
        setProcessing(false);
        return;
      }

      // Call Backend Purchase API
      await ApiService.purchasePlan(selectedPlan._id, token.id);
      
      // Sync User details
      await refreshUser();

      setIsModalOpen(false);
      setSelectedPlan(null);
      alert(`${selectedPlan.name} has been activated successfully!`);
      navigate('/profile');
    } catch (err) {
      console.error(err);
      setPaymentError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="plans-loading">
        <Loader2 className="animate-spin" size={48} color="#007aff" />
        <p>Loading plans...</p>
      </div>
    );
  }

  const activeUserPlan = currentUser?.activePlans?.find(ap => new Date(ap.expiryDate) > new Date());
  
  // Filter plans based strictly on the selected billing cycle
  const filteredPlans = plans.filter(p => p.billingCycle === selectedCycle);

  return (
    <div className="plans-page">
      <div className="plans-ambient-bg"></div>
      
      <div className="plans-header-container animate-fade-in">
        <h1 className="plans-title">Membership Levels</h1>
        <p className="plans-subtitle">Unlock exclusive content and premium features</p>

        {/* Toggle Switch */}
        <div className="toggle-switch-wrapper">
          <div className="toggle-switch">
            <div className={`toggle-slider ${selectedCycle === 'Yearly' ? 'yearly' : ''}`}></div>
            <button 
              className={`toggle-btn ${selectedCycle === 'Monthly' ? 'active' : ''}`}
              onClick={() => setSelectedCycle('Monthly')}
            >
              Monthly
            </button>
            <button 
              className={`toggle-btn ${selectedCycle === 'Yearly' ? 'active' : ''}`}
              onClick={() => setSelectedCycle('Yearly')}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>

      {error && <div className="plans-error">{error}</div>}

      <div className="plans-list-wrapper animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {filteredPlans.map((plan) => {
          const isActive = activeUserPlan?.planId === plan._id;
          const benefits = getPlanBenefits(plan);
          const isExpanded = !!expandedPlans[plan._id];
          const isAds = plan.type === 'adsPlan';
          const visibleBenefits = isExpanded ? benefits : benefits.slice(0, 3);
          
          return (
            <div key={plan._id} className={`plan-card-row ${isActive ? 'active-border' : ''}`}>
              <div className="plan-card-top">
                <div className="plan-card-info-side">
                  <div className="plan-badge-wrapper">
                    {isAds ? (
                      <span className="plan-type-badge ads-badge">Commercial Advertising</span>
                    ) : (
                      <span className="plan-type-badge regular-badge">Streaming Membership</span>
                    )}
                  </div>
                  <h3 className="plan-name">{plan.name}</h3>
                  <p className="plan-tax-note">Customers in IT will be charged 20% tax.</p>
                </div>

                <div className="plan-card-price-side">
                  <div className="plan-price-block">
                    <span className="price-symbol">€</span>
                    <span className="price-value">{plan.amount}</span>
                    <span className="price-cycle">/ {plan.billingCycle === 'Yearly' ? 'Year' : 'Month'}</span>
                  </div>
                  
                  <button 
                    className={`plan-buy-btn ${isActive ? 'btn-active' : 'btn-select'}`}
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isActive}
                  >
                    {isActive ? 'Active' : 'Select'}
                  </button>
                </div>
              </div>

              {/* Plan Benefits & Info */}
              {benefits && benefits.length > 0 && (
                <div className="plan-benefits-container">
                  <div className="plan-card-divider"></div>
                  
                  <div className="plan-benefits-header">
                    <Sparkles size={14} className="benefits-sparkle-icon" />
                    <span>Included in this plan:</span>
                  </div>

                  <ul className="plan-benefits-list">
                    {visibleBenefits.map((benefitText, idx) => (
                      <li key={idx} className="plan-benefit-item">
                        <span className="benefit-check-circle">
                          <Check size={11} strokeWidth={3} />
                        </span>
                        <span className="benefit-text">{benefitText}</span>
                      </li>
                    ))}
                  </ul>

                  {benefits.length > 3 && (
                    <button 
                      type="button"
                      className="btn-toggle-benefits"
                      onClick={() => toggleExpand(plan._id)}
                    >
                      {isExpanded ? (
                        <>Show fewer features <ChevronUp size={14} /></>
                      ) : (
                        <>View all {benefits.length} features & terms <ChevronDown size={14} /></>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* STRIPE POPUP MODAL OVERLAY */}
      {isModalOpen && selectedPlan && (
        <div className="payment-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="payment-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Subscribe to {selectedPlan.name}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <p className="modal-price-label">
              Price: €{selectedPlan.amount} / {selectedPlan.billingCycle}
            </p>

            {/* Modal Mini Benefits */}
            <div className="modal-benefits-preview">
              <span className="modal-preview-title">Highlights:</span>
              <ul className="modal-preview-list">
                {getPlanBenefits(selectedPlan).slice(0, 3).map((b, i) => (
                  <li key={i}>
                    <Check size={12} color="#00c6ff" style={{ display: 'inline', marginRight: 6 }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <form onSubmit={handlePaymentSubmit} className="payment-form">
              <div className="stripe-input-wrapper">
                <div id="stripe-card-element" ref={cardElementRef}></div>
              </div>

              {paymentError && <div className="stripe-error-message">{paymentError}</div>}

              <div className="modal-actions">
                <button 
                  type="submit" 
                  className="btn-pay" 
                  disabled={processing || !stripeInstance}
                >
                  {processing ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>{isProduction ? 'Pay Now' : 'Pay Now (Test Mode)'}</span>
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
