import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Loader2 } from 'lucide-react';
import { ApiService } from '../api';
import './VideoGrid.css';

const CATEGORY_CONFIGS = {
  'tvshows': {
    title: 'TV Shows',
    filter: (item) => item.type === 'tvshow'
  },
  'movies': {
    title: 'Movies',
    filter: (item) => item.type === 'movie'
  },
  'videos': {
    title: 'Videos',
    filter: (item) => item.type === 'video'
  },
  'news-videos': {
    title: 'News Videos',
    filter: (item) => 
      item.type === 'video' && (
        (item.genres && item.genres.some(g => g.toLowerCase().includes('news'))) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes('news'))) ||
        item.title.toLowerCase().includes('news')
      )
  },
  'documentary-films': {
    title: 'Documentary Films',
    filter: (item) => 
      (item.genres && item.genres.some(g => g.toLowerCase().includes('documentary film') || g.toLowerCase() === 'documentary')) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes('documentary film') || t.toLowerCase() === 'documentary')) ||
      (item.description && item.description.toLowerCase().includes('documentary film'))
  },
  'documentary-series': {
    title: 'Documentary Series',
    filter: (item) => 
      (item.genres && item.genres.some(g => g.toLowerCase().includes('documentary series'))) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes('documentary series'))) ||
      (item.description && item.description.toLowerCase().includes('documentary series'))
  },
  'science-fiction': {
    title: 'Science-Fiction',
    filter: (item) => 
      (item.genres && item.genres.some(g => g.toLowerCase().includes('science'))) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes('science'))) ||
      (item.description && item.description.toLowerCase().includes('science'))
  }
};

export default function VideoGrid() {
  const { category } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const config = CATEGORY_CONFIGS[category] || { title: 'All Videos', filter: () => true };

  useEffect(() => {
    async function loadCategoryContent() {
      try {
        setLoading(true);
        const vids = await ApiService.getVideos().catch(() => []);
        const movs = await ApiService.getMovies().catch(() => []);
        const shows = await ApiService.getTVShows().catch(() => []);
        const combined = [...vids, ...movs, ...shows];

        // Apply specific filter
        const filtered = combined.filter(config.filter);
        setItems(filtered);
      } catch (e) {
        console.error("Failed to load category assets:", e);
      } finally {
        setLoading(false);
      }
    }
    loadCategoryContent();
  }, [category]);

  const handleCardClick = (item) => {
    navigate(`/details/${item._id}`, { state: { post: item } });
  };

  if (loading) {
    return (
      <div className="grid-loading-container">
        <Loader2 className="animate-spin" size={48} color="#007aff" />
        <p>Loading content...</p>
      </div>
    );
  }

  return (
    <div className="category-grid-page">
      <div className="category-ambient-bg"></div>

      <div className="category-header-section animate-fade-in">
        <h1 className="category-title">{config.title}</h1>
      </div>

      {items.length > 0 ? (
        <div className="category-results-grid animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {items.map(item => (
            <div key={item._id} className="video-card glass-panel" onClick={() => handleCardClick(item)}>
              <div className="card-image-wrapper">
                <img 
                  src={item.images && item.images[0] ? item.images[0] : ''} 
                  alt={item.title} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div className="card-overlay">
                  <Play className="card-play-btn" size={32} />
                </div>
              </div>
              <div className="card-info">
                <h3>{item.title}</h3>
                <p>{item.type.toUpperCase()} • HD</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="category-empty-state animate-fade-in">
          <h2>No assets found</h2>
          <p>This category does not have any items yet.</p>
        </div>
      )}
    </div>
  );
}
