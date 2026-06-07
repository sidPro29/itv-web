import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, User, ArrowLeft, Play, Loader2, Newspaper } from 'lucide-react';
import { ApiService } from '../api';
import './News.css';

export default function NewsDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [allArticles, setAllArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  // Pagination references
  const [prevArticle, setPrevArticle] = useState(null);
  const [nextArticle, setNextArticle] = useState(null);

  useEffect(() => {
    async function loadDetailAndAll() {
      try {
        setLoading(true);
        setError('');
        setIsPlaying(false);

        // Fetch detail
        const data = await ApiService.getNewsArticleById(id);
        setArticle(data);

        // Fetch all articles to resolve sidebar and next/prev links
        const list = await ApiService.getNewsArticles();
        
        // Sort all articles by publishedDate (fallback to createdAt) descending
        const sortedList = (list || []).sort((a, b) => {
          const dateA = new Date(a.publishedDate || a.createdAt || 0);
          const dateB = new Date(b.publishedDate || b.createdAt || 0);
          return dateB - dateA;
        });

        setAllArticles(sortedList);

        if (sortedList.length > 0) {
          const currentIndex = sortedList.findIndex(a => a._id === id);
          if (currentIndex !== -1) {
            // sortedList is sorted by date descending, so index - 1 is newer (next) and index + 1 is older (prev)
            setNextArticle(currentIndex > 0 ? sortedList[currentIndex - 1] : null);
            setPrevArticle(currentIndex < sortedList.length - 1 ? sortedList[currentIndex + 1] : null);
          }
        }
      } catch (err) {
        console.error('Failed to load article detail:', err);
        setError('Article not found or server error.');
      } finally {
        setLoading(false);
      }
    }
    loadDetailAndAll();
  }, [id]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('/news', { state: { searchQuery: searchQuery.trim() } });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '01.04.2026';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const getAuthorName = (art) => {
    return art.author || 'INTERPLANETARYTV';
  };

  // Helper to detect/convert YouTube or Vimeo URLs to embed format
  const getEmbedInfo = (url) => {
    if (!url) return null;
    
    // YouTube
    const ytReg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = url.match(ytReg);
    if (ytMatch && ytMatch[1]) {
      return {
        type: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`
      };
    }

    // Vimeo
    const vimeoReg = /vimeo\.com\/(?:video\/)?([0-9]+)/i;
    const vimeoMatch = url.match(vimeoReg);
    if (vimeoMatch && vimeoMatch[1]) {
      return {
        type: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`
      };
    }

    return { type: 'direct', embedUrl: url };
  };

  // Sidebar posts
  const recentArticles = allArticles.slice(0, 7);

  if (loading) {
    return (
      <div className="news-loading-screen">
        <Loader2 className="animate-spin" size={48} color="#007aff" />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading article details...</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="news-error-screen">
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <h2 style={{ color: '#ff453a', marginBottom: '1rem' }}>Article Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>The requested article does not exist or has been deleted.</p>
          <Link to="/news" className="btn-primary">Back to News</Link>
        </div>
      </div>
    );
  }

  const imageSrc = article.imageUrl || (article.images && article.images[0]) || '';
  const embed = getEmbedInfo(article.videoUrl);

  return (
    <div className="news-page-container">
      <div className="news-ambient-bg"></div>

      <div className="news-content-wrapper">
        <div className="news-grid-layout">
          
          {/* LEFT COLUMN: News Details */}
          <article className="news-left-column">
            <button className="back-news-btn" onClick={() => navigate('/news')}>
              <ArrowLeft size={16} />
              <span>Back to News</span>
            </button>

            <div className="news-details-meta">
              <div className="details-meta-item">
                <User size={16} className="meta-icon" />
                <span>{getAuthorName(article).toUpperCase()}</span>
              </div>
              <span className="details-meta-separator">|</span>
              <div className="details-meta-item">
                <Calendar size={16} className="meta-icon" />
                <span>{formatDate(article.publishedDate || article.createdAt)}</span>
              </div>
              <span className="details-meta-separator">|</span>
              <span className="details-category-badge">NEWS</span>
            </div>

            <h1 className="news-details-title">{article.title}</h1>

            {/* 16:9 Media Container */}
            <div className="news-details-media-container">
              {isPlaying && embed ? (
                embed.type === 'direct' ? (
                  <video
                    src={embed.embedUrl}
                    controls
                    autoPlay
                    className="details-video-player"
                  />
                ) : (
                  <iframe
                    src={embed.embedUrl}
                    title={article.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="details-video-player"
                  />
                )
              ) : (
                <div className="details-image-wrapper">
                  {imageSrc ? (
                    <img src={imageSrc} alt={article.title} className="details-poster-image" />
                  ) : (
                    <div className="details-placeholder">
                      <Newspaper size={64} color="#8c8f9c" />
                    </div>
                  )}
                  {article.videoUrl && (
                    <div className="details-play-overlay" onClick={() => setIsPlaying(true)}>
                      <button className="details-play-btn" title="Play Video">
                        <Play size={24} fill="#fff" color="#fff" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Description / Content */}
            <div className="news-details-content">
              {article.description && article.description.split('\n').map((paragraph, index) => {
                if (!paragraph.trim()) return null;
                return <p key={index}>{paragraph.replace(/<[^>]*>/g, '')}</p>;
              })}
            </div>

            {/* Keywords/Tags */}
            {article.keywords && article.keywords.length > 0 && (
              <div className="news-details-tags">
                {article.keywords.map((tag, idx) => (
                  <span key={idx} className="details-tag-pill">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="news-details-divider"></div>

            {/* Navigation (Prev / Next Articles) */}
            <div className="news-details-navigation">
              {prevArticle ? (
                <div
                  className="nav-link-box prev"
                  onClick={() => navigate(`/news/${prevArticle._id}`)}
                >
                  <span className="nav-direction">← Previous Post</span>
                  <span className="nav-article-title">{prevArticle.title}</span>
                </div>
              ) : (
                <div className="nav-link-box disabled">
                  <span className="nav-direction">← Previous Post</span>
                  <span className="nav-article-title">First Article</span>
                </div>
              )}

              {nextArticle ? (
                <div
                  className="nav-link-box next"
                  onClick={() => navigate(`/news/${nextArticle._id}`)}
                >
                  <span className="nav-direction">Next Post →</span>
                  <span className="nav-article-title">{nextArticle.title}</span>
                </div>
              ) : (
                <div className="nav-link-box disabled">
                  <span className="nav-direction">Next Post →</span>
                  <span className="nav-article-title">Latest Article</span>
                </div>
              )}
            </div>
          </article>

          {/* RIGHT COLUMN: Sidebar */}
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
                {recentArticles.map((art) => (
                  <li
                    key={art._id}
                    className="recent-post-item"
                    onClick={() => navigate(`/news/${art._id}`)}
                  >
                    <span className="recent-post-chevron">›</span>
                    <span className="recent-post-title">{art.title}</span>
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
