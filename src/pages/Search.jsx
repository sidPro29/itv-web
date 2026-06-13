import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X, Loader2, Play } from 'lucide-react';
import { ApiService } from '../api';
import './Search.css';

export default function Search() {
  const [allContent, setAllContent] = useState([]);
  const [filteredContent, setFilteredContent] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadAllContent() {
      try {
        setLoading(true);
        const vids = await ApiService.getVideos().catch(() => []);
        const movs = await ApiService.getMovies().catch(() => []);
        const shows = await ApiService.getTVShows().catch(() => []);
        
        // Merge all assets
        const combined = [
          ...vids.map(item => ({ ...item, displayType: 'Video' })),
          ...movs.map(item => ({ ...item, displayType: 'Movie' })),
          ...shows.map(item => ({ ...item, displayType: 'TV Show' }))
        ];

        // Shuffle items (like Kotlin's shuffled() in LGTV Search)
        const shuffled = combined.sort(() => Math.random() - 0.5);
        setAllContent(shuffled);
        setFilteredContent(shuffled);
      } catch (e) {
        console.error("Failed to load search data:", e);
      } finally {
        setLoading(false);
      }
    }
    loadAllContent();
  }, []);

  // Filter content whenever searchQuery or selectedFilter changes
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    
    const filtered = allContent.filter(item => {
      const matchesQuery = !query || 
        item.title.toLowerCase().includes(query) || 
        (item.description && item.description.toLowerCase().includes(query));

      const matchesFilter = selectedFilter === 'All'
        ? true
        : selectedFilter === 'TV Shows'
          ? item.type === 'tvshow'
          : selectedFilter === 'Movies'
            ? item.type === 'movie'
            : selectedFilter === 'Videos'
              ? item.type === 'video'
              : true;

      return matchesQuery && matchesFilter;
    });

    setFilteredContent(filtered);
  }, [searchQuery, selectedFilter, allContent]);

  const handleCardClick = (item) => {
    navigate(`/details/${item._id}`, { state: { post: item } });
  };

  const handleClear = () => {
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="search-loading-container">
        <Loader2 className="animate-spin" size={48} color="#007aff" />
        <p>Loading content...</p>
      </div>
    );
  }

  return (
    <div className="search-page">
      <div className="search-ambient-bg"></div>
      
      {/* Header */}
      <div className="search-header-section animate-fade-in">
        <h1 className="search-page-title">Search</h1>
        <p className="search-page-subtitle">Find your favorite space content</p>
      </div>

      {/* Input Bar */}
      <div className="search-input-outer-wrapper animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="search-input-inner-wrapper">
          <SearchIcon size={22} className="search-input-icon" />
          <input 
            type="text" 
            className="search-main-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies, shows, documentaries..."
            autoFocus
          />
          {searchQuery && (
            <button className="search-input-clear-btn" onClick={handleClear}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="search-filter-tabs animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {['All', 'TV Shows', 'Videos', 'Movies'].map(tab => (
          <button 
            key={tab}
            className={`search-filter-tab-btn ${selectedFilter === tab ? 'active' : ''}`}
            onClick={() => setSelectedFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Results Info */}
      <div className="search-results-counter animate-fade-in" style={{ animationDelay: '0.15s' }}>
        {filteredContent.length} result{filteredContent.length !== 1 ? 's' : ''} found
      </div>

      {/* Grid */}
      {filteredContent.length > 0 ? (
        <div className="search-results-grid animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {filteredContent.map(item => (
            <div key={item._id} className="video-card glass-panel" onClick={() => handleCardClick(item)}>
              <div className="card-image-wrapper">
                {item.membership_level && item.membership_level.length > 0 && (
                  <div className="premium-badge">
                    <Crown size={16} />
                  </div>
                )}
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
                <p>{item.displayType} • HD</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="search-empty-state animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <SearchIcon size={64} className="empty-search-icon" />
          <h2>No results found</h2>
          <p>Try a different search term or filter</p>
        </div>
      )}
    </div>
  );
}
