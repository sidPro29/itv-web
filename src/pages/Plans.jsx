import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../api';
import { ShieldCheck, Info, Loader2, CreditCard, X } from 'lucide-react';
import './Plans.css';

const STRIPE_KEYS = {
  TEST_KEY: 'pk_test_51T6DloKIOfsbn4UWmZy7H5PjxqgVtuyAerT2s84NupJ02BkhJP9AQjZeV1jOVmFdz3nAix97p5K51eDqU8C5x8YK00g2YxYqbs',
  LIVE_KEY: 'pk_live_51QX8CgG2MEip9MtAIotH2lmhenLiLRrBS9dHOq3rHbHdPJJRp7QREodH3zoO0h1EepziTDPspfzEWHfA1wB3YcXw00hAykOLik'
};

export default function Plans() {
  const { currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('Monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
          
          return (
            <div key={plan._id} className={`plan-card-row ${isActive ? 'active-border' : ''}`}>
              <div className="plan-card-info-side">
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
