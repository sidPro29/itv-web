import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, User, Search, Loader2, Newspaper } from 'lucide-react';
import { ApiService } from '../api';
import './News.css';

export default function News() {
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function loadArticles() {
      try {
        setLoading(true);
        const data = await ApiService.getNewsArticles();
        
        // Sort articles by publishedDate (fallback to createdAt) descending
        const sortedData = (data || []).sort((a, b) => {
          const dateA = new Date(a.publishedDate || a.createdAt || 0);
          const dateB = new Date(b.publishedDate || b.createdAt || 0);
          return dateB - dateA;
        });

        setArticles(sortedData);
        
        // Handle search query passed from other pages (e.g. NewsDetails sidebar)
        const passedQuery = location.state?.searchQuery || '';
        if (passedQuery) {
          setSearchQuery(passedQuery);
          const query = passedQuery.toLowerCase().trim();
          const filtered = sortedData.filter(
            (article) =>
              article.title.toLowerCase().includes(query) ||
              (article.description && article.description.toLowerCase().includes(query))
          );
          setFilteredArticles(filtered);
        } else {
          setFilteredArticles(sortedData);
        }
      } catch (err) {
        console.error('Failed to fetch articles:', err);
        setError('Failed to load news articles.');
      } finally {
        setLoading(false);
      }
    }
    loadArticles();
  }, [location.state]);

  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredArticles(articles);
    } else {
      const filtered = articles.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          (article.description && article.description.toLowerCase().includes(query))
      );
      setFilteredArticles(filtered);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '01.04.2026'; // fallback matching mock data
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const getAuthorName = (article) => {
    return article.author || 'Interplanetary Team';
  };

  // Get top 7 articles for recent posts sidebar
  const recentArticles = articles.slice(0, 7);

  if (loading) {
    return (
      <div className="news-loading-screen">
        <Loader2 className="animate-spin" size={48} color="#007aff" />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading latest updates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="news-error-screen">
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', borderColor: 'rgba(255, 69, 58, 0.2)' }}>
          <h2 style={{ color: '#ff453a', marginBottom: '1rem' }}>Sync Failed</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="news-page-container">
      <div className="news-ambient-bg"></div>

      <div className="news-content-wrapper">
        <div className="news-grid-layout">
          
          {/* LEFT COLUMN: News Articles */}
          <div className="news-left-column">
            <h1 className="news-page-title">News Articles</h1>
            
            <div className="news-articles-list">
              {filteredArticles.length > 0 ? (
                filteredArticles.map((article) => {
                  const imageSrc = article.imageUrl || (article.images && article.images[0]) || '';
                  return (
                    <div
                      key={article._id}
                      className="news-article-card glass-panel"
                      onClick={() => navigate(`/news/${article._id}`)}
                    >
                      <div className="article-card-image-wrapper">
                        {imageSrc ? (
                          <img src={imageSrc} alt={article.title} />
                        ) : (
                          <div className="article-card-placeholder">
                            <Newspaper size={36} color="#8c8f9c" />
                          </div>
                        )}
                      </div>

                      <div className="article-card-content">
                        <h2 className="article-card-title">{article.title}</h2>
                        <p className="article-card-description">
                          {article.description ? article.description.replace(/<[^>]*>/g, '') : ''}
                        </p>
                        
                        <div className="article-card-metadata">
                          <div className="metadata-item">
                            <Calendar size={14} className="meta-icon" />
                            <span>{formatDate(article.publishedDate || article.createdAt)}</span>
                          </div>
                          <div className="metadata-item">
                            <User size={14} className="meta-icon" />
                            <span>{getAuthorName(article)}</span>
                          </div>
                          <span className="article-category-badge">NEWS</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="news-empty-state glass-panel">
                  <Newspaper size={48} className="empty-state-icon" />
                  <h3>No Articles Found</h3>
                  <p>Try searching for a different keyword or view recent updates.</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Sidebar (Search & Recent) */}
          <aside className="news-right-sidebar">
            <div className="sidebar-section glass-panel">
              <h3 className="sidebar-title">Search</h3>
              <form onSubmit={handleSearch} className="sidebar-search-form">
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="sidebar-search-input"
                />
                <button type="submit" className="sidebar-search-button">
                  Search
                </button>
              </form>
            </div>

            <div className="sidebar-section glass-panel">
              <h3 className="sidebar-title">Recent Posts</h3>
              <ul className="recent-posts-list">
                {recentArticles.map((article) => (
                  <li
                    key={article._id}
                    className="recent-post-item"
                    onClick={() => navigate(`/news/${article._id}`)}
                  >
                    <span className="recent-post-chevron">›</span>
                    <span className="recent-post-title">{article.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
