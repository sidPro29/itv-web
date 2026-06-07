import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import './CookieConsent.css';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  // Cookie states
  const [preferences, setPreferences] = useState({
    necessary: true,
    functional: false,
    analytics: false,
    performance: false,
    advertisement: false
  });

  useEffect(() => {
    // Check if user already set consent
    const consent = localStorage.getItem('itv_cookie_consent');
    if (!consent) {
      setShowBanner(true);
    } else {
      try {
        setPreferences(JSON.parse(consent));
      } catch (e) {
        console.error("Failed to parse cookie preferences", e);
      }
    }

    // Listen to open event from footer
    const handleOpen = () => {
      setShowModal(true);
    };
    window.addEventListener('openCookiePreferences', handleOpen);
    return () => window.removeEventListener('openCookiePreferences', handleOpen);
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      performance: true,
      advertisement: true
    };
    setPreferences(allAccepted);
    localStorage.setItem('itv_cookie_consent', JSON.stringify(allAccepted));
    setShowBanner(false);
    setShowModal(false);
  };

  const handleRejectAll = () => {
    const allRejected = {
      necessary: true,
      functional: false,
      analytics: false,
      performance: false,
      advertisement: false
    };
    setPreferences(allRejected);
    localStorage.setItem('itv_cookie_consent', JSON.stringify(allRejected));
    setShowBanner(false);
    setShowModal(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('itv_cookie_consent', JSON.stringify(preferences));
    setShowBanner(false);
    setShowModal(false);
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const togglePreference = (key) => {
    if (key === 'necessary') return; // Cannot toggle necessary
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!showBanner && !showModal) return null;

  return (
    <>
      {/* 1. COOKIE BANNER (BOTTOM FLOATER) */}
      {showBanner && !showModal && (
        <div className="cookie-banner glass-panel animate-slide-down">
          <div className="cookie-banner-content">
            <p>
              We use cookies to help you navigate efficiently and perform certain functions. You will find detailed information about all cookies under each consent category below. By clicking "Accept All", you agree to store cookies on your device.
            </p>
            <div className="cookie-banner-actions">
              <button className="cookie-btn btn-text" onClick={() => setShowModal(true)}>
                Customise
              </button>
              <button className="cookie-btn btn-reject" onClick={handleRejectAll}>
                Reject All
              </button>
              <button className="cookie-btn btn-accept" onClick={handleAcceptAll}>
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CUSTOMISE CONSENT MODAL */}
      {showModal && (
        <div className="cookie-modal-overlay">
          <div className="cookie-modal glass-panel animate-fade-in">
            <div className="cookie-modal-header">
              <h2>Customise Consent Preferences</h2>
              <button className="cookie-modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="cookie-modal-body">
              <p className="cookie-modal-desc">
                We use cookies to help you navigate efficiently and perform certain functions. You will find detailed information about all cookies under each consent category below.
              </p>
              <p className="cookie-modal-subdesc">
                The cookies that are categorised as "Necessary" are stored on your browser as they are essential for enabling the basic functionalities of the site.
              </p>

              <div className="cookie-categories">
                
                {/* CATEGORY: NECESSARY */}
                <div className={`cookie-cat-item ${expandedSection === 'necessary' ? 'expanded' : ''}`}>
                  <div className="cookie-cat-header" onClick={() => toggleSection('necessary')}>
                    <div className="cookie-cat-title">
                      {expandedSection === 'necessary' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span>Necessary</span>
                    </div>
                    <span className="cookie-status-always">Always Active</span>
                  </div>
                  {expandedSection === 'necessary' && (
                    <div className="cookie-cat-content">
                      <p>Necessary cookies are required to enable the basic features of this site, such as providing secure log-in or adjusting your consent preferences. These cookies do not store any personally identifiable data.</p>
                    </div>
                  )}
                </div>

                {/* CATEGORY: FUNCTIONAL */}
                <div className={`cookie-cat-item ${expandedSection === 'functional' ? 'expanded' : ''}`}>
                  <div className="cookie-cat-header" onClick={() => toggleSection('functional')}>
                    <div className="cookie-cat-title">
                      {expandedSection === 'functional' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span>Functional</span>
                    </div>
                    <label className="cookie-switch" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={preferences.functional}
                        onChange={() => togglePreference('functional')} 
                      />
                      <span className="cookie-slider"></span>
                    </label>
                  </div>
                  {expandedSection === 'functional' && (
                    <div className="cookie-cat-content">
                      <p>Functional cookies help perform certain functionalities like sharing the content of the website on social media platforms, collecting feedback, and other third-party features.</p>
                    </div>
                  )}
                </div>

                {/* CATEGORY: ANALYTICS */}
                <div className={`cookie-cat-item ${expandedSection === 'analytics' ? 'expanded' : ''}`}>
                  <div className="cookie-cat-header" onClick={() => toggleSection('analytics')}>
                    <div className="cookie-cat-title">
                      {expandedSection === 'analytics' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span>Analytics</span>
                    </div>
                    <label className="cookie-switch" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={preferences.analytics}
                        onChange={() => togglePreference('analytics')} 
                      />
                      <span className="cookie-slider"></span>
                    </label>
                  </div>
                  {expandedSection === 'analytics' && (
                    <div className="cookie-cat-content">
                      <p>Analytical cookies are used to understand how visitors interact with the website. These cookies help provide information on metrics such as the number of visitors, bounce rate, traffic source, etc.</p>
                    </div>
                  )}
                </div>

                {/* CATEGORY: PERFORMANCE */}
                <div className={`cookie-cat-item ${expandedSection === 'performance' ? 'expanded' : ''}`}>
                  <div className="cookie-cat-header" onClick={() => toggleSection('performance')}>
                    <div className="cookie-cat-title">
                      {expandedSection === 'performance' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span>Performance</span>
                    </div>
                    <label className="cookie-switch" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={preferences.performance}
                        onChange={() => togglePreference('performance')} 
                      />
                      <span className="cookie-slider"></span>
                    </label>
                  </div>
                  {expandedSection === 'performance' && (
                    <div className="cookie-cat-content">
                      <p>Performance cookies are used to understand and analyse the key performance indexes of the website which helps in delivering a better user experience for the visitors.</p>
                    </div>
                  )}
                </div>

                {/* CATEGORY: ADVERTISEMENT */}
                <div className={`cookie-cat-item ${expandedSection === 'advertisement' ? 'expanded' : ''}`}>
                  <div className="cookie-cat-header" onClick={() => toggleSection('advertisement')}>
                    <div className="cookie-cat-title">
                      {expandedSection === 'advertisement' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span>Advertisement</span>
                    </div>
                    <label className="cookie-switch" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={preferences.advertisement}
                        onChange={() => togglePreference('advertisement')} 
                      />
                      <span className="cookie-slider"></span>
                    </label>
                  </div>
                  {expandedSection === 'advertisement' && (
                    <div className="cookie-cat-content">
                      <p>Advertisement cookies are used to provide visitors with customised advertisements based on the pages you visited.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>

            <div className="cookie-modal-footer">
              <button className="cookie-btn btn-modal-reject" onClick={handleRejectAll}>
                Reject All
              </button>
              <button className="cookie-btn btn-modal-save" onClick={handleSavePreferences}>
                Save My Preferences
              </button>
              <button className="cookie-btn btn-modal-accept" onClick={handleAcceptAll}>
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
