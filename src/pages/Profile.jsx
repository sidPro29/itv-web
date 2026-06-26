import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../api';
import { User, Mail, Phone, Calendar, CreditCard, Heart, Send, LogOut, Loader2, Sparkles, MessageSquare, Pencil, X, CheckCircle, Eye, Trash2, Download, Crown, Play } from 'lucide-react';
import ScrollableRow from '../components/ScrollableRow';
import './Profile.css';


export default function Profile() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [purchases, setPurchases] = useState([]);

  // Local storage lists
  const [watchlist, setWatchlist] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);

  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [contactInfo, setContactInfo] = useState({
    email: 'info@interplanetary.tv',
    phone: '+37123112488',
    subtitle: "We're here to help! Reach out via email or phone anytime."
  });

  // Tab control state (Default is Playlist/Continue Watching)
  const [activeTab, setActiveTab] = useState('Playlist');

  // Profile edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/login');
    }
  }, [currentUser, authLoading, navigate]);

  // Load profile data and resolves lists
  const loadProfileAndLists = async () => {
    if (!currentUser) return;
    try {
      setLoadingData(true);
      setError('');

      // 1. Fetch user profile
      const profile = await ApiService.getCurrentUserProfile();
      setProfileData(profile);

      // Initialize edit fields
      setEditUsername(profile.username || '');
      setEditEmail(profile.email || '');
      setEditMobile(profile.mobile || '');

      // 2. Fetch purchases
      try {
        const purchaseHistory = await ApiService.getUserPurchases();
        setPurchases(purchaseHistory || []);
      } catch (e) {
        console.warn('Could not fetch purchases:', e);
        setPurchases([]);
      }

      // 3. Fetch all media assets to resolve locally managed lists
      const vids = await ApiService.getVideos().catch(() => []);
      const movs = await ApiService.getMovies().catch(() => []);
      const shows = await ApiService.getTVShows().catch(() => []);
      const combined = [...vids, ...movs, ...shows];

      // Resolve Watchlist
      const watchlistIds = JSON.parse(localStorage.getItem('watchlist') || '[]');
      const matchingWatchlist = combined.filter(item => watchlistIds.includes(item._id));
      setWatchlist(matchingWatchlist);

      // Resolve Continue Watching — sort by most recent first
      const cwRecords = JSON.parse(localStorage.getItem('continueWatching') || '[]');
      const sortedCw = [...cwRecords].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      const matchingCw = sortedCw.map(rec => {
        const asset = combined.find(item => item._id === rec.id);
        if (asset) {
          return {
            ...asset,
            progressPercent: rec.percentage ?? 0,
            progressSeconds: rec.progress ?? 0
          };
        }
        return null;
      }).filter(Boolean);
      setContinueWatching(matchingCw);

      // Resolve Liked Videos
      const likedIds = JSON.parse(localStorage.getItem('likedVideos') || '[]');
      const matchingLiked = combined.filter(item => likedIds.includes(item._id));
      setLikedVideos(matchingLiked);

      // Fetch contact details
      try {
        const contactPage = await ApiService.getPage('contact');
        if (contactPage && contactPage.content) {
          setContactInfo({
            email: contactPage.content.email || 'info@interplanetary.tv',
            phone: contactPage.content.phone || '+37123112488',
            subtitle: contactPage.content.subtitle || "We're here to help! Reach out via email or phone anytime."
          });
        }
      } catch (e) {
        console.warn('Could not fetch contact info:', e);
      }

    } catch (err) {
      console.error('Failed to load profile details:', err);
      setError('Failed to retrieve profile data from servers.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadProfileAndLists();
  }, [currentUser]);

  // Handle saving profile changes
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!editEmail.trim()) return;

    setSavingProfile(true);
    try {
      const updatedUser = await ApiService.updateUserProfile(displayUser._id, {
        username: editUsername,
        email: editEmail,
        mobile: editMobile
      });

      // Update local storage user information
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Update states
      setProfileData(updatedUser);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditModalOpen(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to save profile changes:', err);
      alert(err.message || 'Failed to update profile details.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRemoveFromWatchlist = (itemId, e) => {
    e.stopPropagation();
    let current = JSON.parse(localStorage.getItem('watchlist') || '[]');
    current = current.filter(id => id !== itemId);
    localStorage.setItem('watchlist', JSON.stringify(current));
    setWatchlist(prev => prev.filter(item => item._id !== itemId));
    window.dispatchEvent(new Event('watchlistUpdated'));
  };

  const handleRemoveFromLiked = (itemId, e) => {
    e.stopPropagation();
    let current = JSON.parse(localStorage.getItem('likedVideos') || '[]');
    current = current.filter(id => id !== itemId);
    localStorage.setItem('likedVideos', JSON.stringify(current));
    setLikedVideos(prev => prev.filter(item => item._id !== itemId));
  };

  const handleRemoveFromPlaylist = (itemId, e) => {
    e.stopPropagation();
    let current = JSON.parse(localStorage.getItem('continueWatching') || '[]');
    current = current.filter(item => item && item.id !== itemId);
    localStorage.setItem('continueWatching', JSON.stringify(current));
    setContinueWatching(prev => prev.filter(item => item._id !== itemId));
    window.dispatchEvent(new Event('continueWatchingUpdated'));
  };

  if (authLoading || loadingData) {
    return (
      <div className="profile-loading-screen">
        <Loader2 className="animate-spin" size={48} color="#007aff" />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading cosmic identity...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-error-screen">
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', borderColor: 'rgba(255, 69, 58, 0.2)' }}>
          <h2 style={{ color: '#ff453a', marginBottom: '1rem' }}>Cosmic Sync Failed</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn-primary" onClick={loadProfileAndLists}>Retry Sync</button>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  const displayUser = profileData || currentUser;
  const activePlan = displayUser.activePlans?.[0];

  const isPurchaseActive = (p) => {
    if (!activePlan) return false;
    const activePlanIdStr = typeof activePlan.planId === 'object' ? activePlan.planId._id?.toString() : activePlan.planId?.toString();
    const pPlanIdStr = typeof p.planId === 'object' ? p.planId._id?.toString() : p.planId?.toString();
    return activePlanIdStr === pPlanIdStr && new Date(activePlan.expiryDate) > new Date();
  };

  const getPurchaseExpiryDate = (p) => {
    const billingCycle = p.planId?.billingCycle || 'Monthly';
    const purchaseDate = new Date(p.purchaseDate);
    const expiry = new Date(purchaseDate);
    if (billingCycle === 'Yearly') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }
    return expiry;
  };

  const downloadItinerary = (p) => {
    const expiryDate = getPurchaseExpiryDate(p);
    const amountStr = p.amount ? p.amount.toLocaleString(undefined, { style: 'currency', currency: p.currency || 'EUR' }) : '—';
    const purchaseDateStr = p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '—';
    const expiryDateStr = expiryDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    
    const textContent = `--------------------------------------------------
INTERPLANETARY.TV - CUSTOMER PURCHASE ITINERARY
--------------------------------------------------
Customer Email: ${displayUser.email}
Customer Name: ${displayUser.username || 'N/A'}
Plan Purchased: ${p.planId?.name || 'Standard Plan'}
Billing Cycle: ${p.planId?.billingCycle || 'N/A'}
Price: ${amountStr}
Transaction ID: ${p.stripePaymentIntentId || 'N/A'}
Purchase Date: ${purchaseDateStr}
Expiry Date: ${expiryDateStr}
Status: ${p.status || 'succeeded'}

PLAN BENEFITS:
- Access to premium TV shows, Movies, and Documentary content
- Ad-free streaming experience
- High Definition (HD) playback support
- Multi-device login access

Thank you for choosing Interplanetary TV!
--------------------------------------------------`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `purchase_itinerary_${p._id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="profile-page-container">
      <div className="profile-ambient-bg"></div>

      <div className="profile-content-wrapper">

        {/* TOP USER INFO BANNER CARD */}
        <div className="profile-info-banner glass-panel animate-fade-in">
          <div className="banner-avatar-section">
            <div className="banner-avatar">
              <User size={36} color="#fff" />
            </div>
            <div className="banner-user-details">
              <h2 className="banner-user-name">{displayUser.username || displayUser.email.split('@')[0]}</h2>
              <span className="banner-user-email">{displayUser.email}</span>

              {/* Active Plan badge */}
              <div className="banner-plan-status">
                <span className={`plan-indicator-dot ${activePlan ? 'active' : 'inactive'}`}>●</span>
                <span className="plan-text">
                  Plan: {activePlan ? `${activePlan.planName} (Active)` : 'Free Account (No active subscription)'}
                </span>
              </div>
            </div>
          </div>

          <button className="edit-profile-btn btn-secondary" onClick={() => setIsEditModalOpen(true)}>
            <Pencil size={15} />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* BOTTOM TABBED NAVIGATION & DYNAMIC CONTENT */}
        <div className="profile-bottom-layout">

          {/* Vertical Tab Navigation (Left Sidebar) */}
          <div className="profile-sidebar-tabs animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <button
              className={`sidebar-tab-btn ${activeTab === 'Watchlist' ? 'active' : ''}`}
              onClick={() => setActiveTab('Watchlist')}
            >
              Watchlist
            </button>
            <button
              className={`sidebar-tab-btn ${activeTab === 'Playlist' ? 'active' : ''}`}
              onClick={() => setActiveTab('Playlist')}
            >
              Playlist
            </button>
            <button
              className={`sidebar-tab-btn ${activeTab === 'Liked' ? 'active' : ''}`}
              onClick={() => setActiveTab('Liked')}
            >
              Liked
            </button>
            <button
              className={`sidebar-tab-btn ${activeTab === 'Purchases' ? 'active' : ''}`}
              onClick={() => setActiveTab('Purchases')}
            >
              Purchases
            </button>
            <button
              className={`sidebar-tab-btn ${activeTab === 'Contact Us' ? 'active' : ''}`}
              onClick={() => setActiveTab('Contact Us')}
            >
              Contact Us
            </button>
          </div>

          {/* Dynamic Content Pane (Right Area) */}
          <div className="profile-tab-content-area animate-fade-in" style={{ animationDelay: '0.15s' }}>

            {/* 1. WATCHLIST TAB */}
            {activeTab === 'Watchlist' && (
              <div className="tab-pane">
                <h3 className="tab-pane-title">My Watchlist</h3>
                {watchlist.length > 0 ? (
                  <ScrollableRow>
                    {watchlist.map((item) => (
                      <div key={item._id} className="profile-media-row-card video-card glass-panel" onClick={() => navigate(`/details/${item._id}`, { state: { post: item } })}>
                        <div className="card-image-wrapper">
                          {item.membership_level && item.membership_level.length > 0 && (
                            <div className="premium-badge">
                              <Crown size={16} />
                            </div>
                          )}
                          <img src={item.images && item.images[0] ? item.images[0] : ''} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div className="card-overlay" style={{ opacity: 1 }}>
                            <button className="card-remove-btn" onClick={(e) => handleRemoveFromWatchlist(item._id, e)} title="Remove">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="card-info">
                          <h3>{item.title}</h3>
                          <p>{item.type} • HD</p>
                        </div>
                      </div>
                    ))}
                  </ScrollableRow>
                ) : (
                  <div className="tab-empty-state glass-panel">
                    <p>You haven't added any videos to your watchlist yet.</p>
                    <Link to="/" className="btn-secondary explore-btn">Explore Catalog</Link>
                  </div>
                )}
              </div>
            )}

            {/* 2. PLAYLIST (CONTINUE WATCHING) TAB */}
            {activeTab === 'Playlist' && (
              <div className="tab-pane">
                <h3 className="tab-pane-title">Continue Watching</h3>
                {continueWatching.length > 0 ? (
                  <ScrollableRow>
                    {continueWatching.map((item) => (
                      <div key={item._id} className="profile-media-row-card video-card glass-panel" onClick={() => navigate(`/details/${item._id}`, { state: { post: item } })}>
                        <div className="card-image-wrapper">
                          {item.membership_level && item.membership_level.length > 0 && (
                            <div className="premium-badge">
                              <Crown size={16} />
                            </div>
                          )}
                          <img src={item.images && item.images[0] ? item.images[0] : ''} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div className="card-overlay" style={{ opacity: 1 }}>
                            <button className="card-remove-btn" onClick={(e) => handleRemoveFromPlaylist(item._id, e)} title="Remove">
                              <Trash2 size={16} />
                            </button>
                            <Play className="card-play-btn" size={32} />
                          </div>
                          {item.progressPercent > 0 && (
                            <div className="progress-bar-container" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', background: 'rgba(255,255,255,0.2)', zIndex: 10 }}>
                              <div style={{ width: `${item.progressPercent}%`, height: '100%', background: 'var(--primary-color, #007aff)' }}></div>
                            </div>
                          )}
                        </div>
                        <div className="card-info">
                          <h3>{item.title}</h3>
                          <p>{item.type} • {Math.round(item.progressPercent)}% watched</p>
                        </div>
                      </div>
                    ))}
                  </ScrollableRow>
                ) : (
                  <div className="tab-empty-state glass-panel">
                    <p>You don't have any items in your continue watching list.</p>
                    <Link to="/" className="btn-secondary explore-btn">Start Streaming</Link>
                  </div>
                )}
              </div>
            )}

            {/* 3. LIKED VIDEOS TAB */}
            {activeTab === 'Liked' && (
              <div className="tab-pane">
                <h3 className="tab-pane-title">Liked Videos</h3>
                {likedVideos.length > 0 ? (
                  <ScrollableRow>
                    {likedVideos.map((item) => (
                      <div key={item._id} className="profile-media-row-card video-card glass-panel" onClick={() => navigate(`/details/${item._id}`, { state: { post: item } })}>
                        <div className="card-image-wrapper">
                          {item.membership_level && item.membership_level.length > 0 && (
                            <div className="premium-badge">
                              <Crown size={16} />
                            </div>
                          )}
                          <img src={item.images && item.images[0] ? item.images[0] : ''} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div className="card-overlay" style={{ opacity: 1 }}>
                            <button className="card-remove-btn" onClick={(e) => handleRemoveFromLiked(item._id, e)} title="Unlike">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="card-info">
                          <h3>{item.title}</h3>
                          <p>{item.type} • HD</p>
                        </div>
                      </div>
                    ))}
                  </ScrollableRow>
                ) : (
                  <div className="tab-empty-state glass-panel">
                    <p>You haven't liked any videos yet.</p>
                    <Link to="/" className="btn-secondary explore-btn">Find Videos</Link>
                  </div>
                )}
              </div>
            )}

            {/* 4. PURCHASES TAB — card row */}
            {activeTab === 'Purchases' && (
              <div className="tab-pane">
                <h3 className="tab-pane-title">Transaction History</h3>
                {purchases.length > 0 ? (
                  <ScrollableRow>
                    {purchases.map((p) => {
                      const statusClass = p.status || 'pending';
                      const amount = p.amount
                        ? p.amount.toLocaleString(undefined, { style: 'currency', currency: p.currency || 'EUR' })
                        : '—';
                      const date = p.purchaseDate
                        ? new Date(p.purchaseDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—';
                      const expiryDate = getPurchaseExpiryDate(p);
                      const expiryDateStr = expiryDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                      const active = isPurchaseActive(p);
                      
                      return (
                        <div key={p._id} className={`purchase-card ${active ? 'active-purchase' : ''}`}>
                          <div className={`purchase-card-accent ${active ? 'active' : statusClass}`}></div>
                          <div className="purchase-card-body">
                            <div className="purchase-card-header-top">
                              <span className="purchase-card-plan">{p.planId?.name || 'Standard Plan'}</span>
                              {active && (
                                <span className="active-badge">
                                  <CheckCircle size={14} color="#30d158" />
                                  <span className="active-text">Active</span>
                                </span>
                              )}
                            </div>
                            <div className="purchase-card-row">
                              <span className="purchase-card-amount">{amount}</span>
                              <span className={`purchase-card-status ${active ? 'active' : statusClass}`}>
                                {active ? 'active' : statusClass}
                              </span>
                            </div>
                            <div className="purchase-card-divider"></div>
                            <div className="purchase-card-row">
                              <span className="purchase-card-label">Purchased</span>
                              <span className="purchase-card-value">{date}</span>
                            </div>
                            <div className="purchase-card-row">
                              <span className="purchase-card-label">Expires</span>
                              <span className="purchase-card-value">{expiryDateStr}</span>
                            </div>
                            <div className="purchase-card-row">
                              <span className="purchase-card-label">Txn ID</span>
                            </div>
                            <div className="purchase-card-tx">{p.stripePaymentIntentId || '—'}</div>
                            
                            <div className="purchase-card-actions">
                              <button 
                                className="download-itinerary-btn"
                                onClick={() => downloadItinerary(p)}
                                title="Download Purchase Itinerary"
                              >
                                <Download size={14} />
                                <span>Download Itinerary</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </ScrollableRow>
                ) : (
                  <div className="tab-empty-state glass-panel">
                    <p>No transactions found on this account.</p>
                  </div>
                )}
              </div>
            )}

            {/* 5. CONTACT US TAB — asset-card-sized cards */}
            {activeTab === 'Contact Us' && (
              <div className="tab-pane">
                <h3 className="tab-pane-title contact-title">Contact Us</h3>
                <p className="contact-subtitle">
                  {contactInfo.subtitle}
                </p>
                <ScrollableRow>
                  <div className="contact-method-card">
                    <div className="contact-card-banner email-banner">
                      <div className="contact-icon-circle email-circle">
                        <Mail size={32} color="#a07aff" />
                      </div>
                    </div>
                    <div className="contact-card-info">
                      <h4>Email Us</h4>
                      <a href={`mailto:${contactInfo.email}`} className="contact-link email-link">
                        {contactInfo.email}
                      </a>
                    </div>
                  </div>

                  <div className="contact-method-card">
                    <div className="contact-card-banner phone-banner">
                      <div className="contact-icon-circle phone-circle">
                        <Phone size={32} color="#ff3b30" />
                      </div>
                    </div>
                    <div className="contact-card-info">
                      <h4>Call Us</h4>
                      <a href={`tel:${contactInfo.phone}`} className="contact-link phone-link">
                        {contactInfo.phone}
                      </a>
                    </div>
                  </div>
                </ScrollableRow>
              </div>
            )}


          </div>

        </div>

      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="edit-modal-backdrop">
          <div className="edit-modal-card glass-panel animate-fade-in">
            <div className="modal-header">
              <h3>Edit Profile Details</h3>
              <button className="close-modal-btn" onClick={() => setIsEditModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProfileSave} className="modal-form">
              <div className="form-group">
                <label htmlFor="edit-username">Full Name</label>
                <input
                  type="text"
                  id="edit-username"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Enter name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-email">Email Address</label>
                <input
                  type="email"
                  id="edit-email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Enter email"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-mobile">Mobile Number</label>
                <input
                  type="text"
                  id="edit-mobile"
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                  placeholder="Enter mobile number"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingProfile}>
                  {savingProfile ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>

            {saveSuccess && (
              <div className="save-success-toast animate-slide-down">
                <CheckCircle size={18} />
                <span>Profile updated successfully!</span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
