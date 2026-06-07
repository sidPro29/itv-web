import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  const location = useLocation();

  // Do not render footer on player screen
  if (location.pathname.startsWith('/play/')) {
    return null;
  }

  return (
    <footer className="footer-glass">
      <div className="footer-container">
        
        <div className="footer-brand-section">
          <Link to="/" className="footer-brand">
            <img src="/ITV-Logo-copy.gif" alt="Interplanetary TV" className="footer-logo" />
          </Link>
          <p className="footer-description">
            Interplanetary Television (iTV) is your premier portal for streaming TV shows, movies, news, and documentaries about space exploration, science, technology, and science fiction.
          </p>
          <div className="footer-social-links">
            <a href="https://www.instagram.com/interplanetarytv/" target="_blank" rel="noopener noreferrer" title="Instagram">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="https://x.com/interplanetTV" target="_blank" rel="noopener noreferrer" title="Twitter/X">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
            </a>
            <a href="https://www.linkedin.com/company/interplanetarytv" target="_blank" rel="noopener noreferrer" title="LinkedIn">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </a>
            <a href="https://www.youtube.com/@interplanetarytv" target="_blank" rel="noopener noreferrer" title="YouTube">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
            </a>
          </div>
        </div>

        <div className="footer-links-grid">
          <div className="footer-column">
            <h4>Explore</h4>
            <Link to="/">Home</Link>
            <Link to="/news">News</Link>
            <Link to="/search">Search</Link>
            <Link to="/plans">Subscription Plans</Link>
          </div>

          <div className="footer-column">
            <h4>Categories</h4>
            <Link to="/all-videos/tvshows">TV Shows</Link>
            <Link to="/all-videos/movies">Movies</Link>
            <Link to="/all-videos/videos">Videos</Link>
            <Link to="/all-videos/documentary-films">Documentary Films</Link>
          </div>

          <div className="footer-column">
            <h4>Legal & Support</h4>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-use">Terms of Use</Link>
            <button 
              className="footer-cookie-btn" 
              onClick={() => window.dispatchEvent(new Event('openCookiePreferences'))}
              style={{ background: 'none', border: 'none', color: '#8c8f9c', padding: 0, font: 'inherit', cursor: 'pointer', textAlign: 'left', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.target.style.color = '#fff'}
              onMouseLeave={(e) => e.target.style.color = '#8c8f9c'}
            >
              Cookie Preferences
            </button>
            <Link to="/faq">FAQ</Link>
            <Link to="/profile">My Profile</Link>
          </div>
        </div>

      </div>

      <div className="footer-bottom">
        <p>© 2026 Interplanetary.tv | All Rights Reserved. Owned and operated by Frederic Eger, CEO.</p>
      </div>
    </footer>
  );
}
