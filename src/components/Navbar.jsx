import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, Play, Menu, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [allVideosOpen, setAllVideosOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Listen to window scroll to change header opacity
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.profile-container') && !e.target.closest('.all-videos-dropdown-container')) {
        setDropdownOpen(false);
        setAllVideosOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoutRequest = () => {
    setShowLogoutConfirm(true);
    setDropdownOpen(false);
  };

  const handleLogoutConfirmed = () => {
    logout();
    localStorage.removeItem('watchlist');
    localStorage.removeItem('continueWatching');
    window.dispatchEvent(new Event('watchlistUpdated'));
    window.dispatchEvent(new Event('continueWatchingUpdated'));
    setShowLogoutConfirm(false);
    navigate('/');
  };

  // Do not render navigation header on the player screen
  if (location.pathname.startsWith('/play/')) {
    return null;
  }

  return (
    <>
      <header className={`navbar-glass ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          <div className="navbar-brand-wrapper">
            <Link to="/" className="navbar-brand">
              <img src="/ITV-Logo-copy.gif" alt="Interplanetary TV" className="navbar-logo" />
            </Link>
            
            {!(currentUser && currentUser.activePlans && currentUser.activePlans.some(ap => new Date(ap.expiryDate) > new Date())) && (
              <button className="btn-subscribe" onClick={() => navigate('/plans')}>
                Subscribe
              </button>
            )}
          </div>
          
          <nav className="navbar-links">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
            <Link to="/news" className={`nav-link ${location.pathname.startsWith('/news') ? 'active' : ''}`}>News</Link>
            
            <div 
              className="all-videos-dropdown-container"
              onMouseEnter={() => setAllVideosOpen(true)}
              onMouseLeave={() => setAllVideosOpen(false)}
            >
              <button className={`nav-link dropdown-toggle-btn ${location.pathname.startsWith('/all-videos/') ? 'active' : ''}`}>
                All Videos <ChevronDown size={14} className={`dropdown-chevron ${allVideosOpen ? 'open' : ''}`} />
              </button>
              
              {allVideosOpen && (
                <div className="all-videos-dropdown glass-panel animate-slide-down">
                  <Link to="/all-videos/tvshows" className="dropdown-item" onClick={() => setAllVideosOpen(false)}>TV Shows</Link>
                  <Link to="/all-videos/movies" className="dropdown-item" onClick={() => setAllVideosOpen(false)}>Movies</Link>
                  <Link to="/all-videos/videos" className="dropdown-item" onClick={() => setAllVideosOpen(false)}>Videos</Link>
                  <Link to="/all-videos/news-videos" className="dropdown-item" onClick={() => setAllVideosOpen(false)}>News Videos</Link>
                  <Link to="/all-videos/documentary-films" className="dropdown-item" onClick={() => setAllVideosOpen(false)}>Documentary Films</Link>
                  <Link to="/all-videos/documentary-series" className="dropdown-item" onClick={() => setAllVideosOpen(false)}>Documentary Series</Link>
                  <Link to="/all-videos/science-fiction" className="dropdown-item" onClick={() => setAllVideosOpen(false)}>Science-Fiction</Link>
                </div>
              )}
            </div>

            <Link to="/plans" className={`nav-link ${location.pathname === '/plans' ? 'active' : ''}`}>Plans & Advertise</Link>
          </nav>

          <div className="navbar-actions">
            <button className="action-btn" onClick={() => navigate('/search')}>
              <Search size={20} />
            </button>
            
            {currentUser ? (
              <div className="profile-container">
                <button
                  className="login-link"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                >
                  <User size={16} />
                  <span>Profile</span>
                  <ChevronDown size={14} className={`dropdown-chevron ${dropdownOpen ? 'open' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="profile-dropdown animate-slide-down">
                    <div className="dropdown-header">
                      <span className="dropdown-welcome">Signed in as</span>
                      <span className="dropdown-username">{currentUser.username || 'User'}</span>
                      <span className="dropdown-email">{currentUser.email}</span>
                    </div>
                    <div className="dropdown-divider"></div>
                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <User size={16} />
                      My Profile
                    </Link>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item logout-btn" onClick={handleLogoutRequest}>
                      <LogOut size={16} />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="login-link">
                <User size={16} />
                <span>Login</span>
              </Link>
            )}

            <button className="menu-btn">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="logout-confirm-backdrop" onClick={() => setShowLogoutConfirm(false)}>
          <div className="logout-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="logout-confirm-icon">
              <LogOut size={28} color="#ff453a" />
            </div>
            <h3 className="logout-confirm-title">Log Out?</h3>
            <p className="logout-confirm-msg">
              Are you sure you want to log out of your account?
            </p>
            <div className="logout-confirm-actions">
              <button
                className="logout-cancel-btn"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button className="logout-confirm-btn" onClick={handleLogoutConfirmed}>
                <LogOut size={16} />
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
