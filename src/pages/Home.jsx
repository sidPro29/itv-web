import { useState, useEffect, useRef } from 'react';
import { Play, Info, RefreshCw, Plus, Check, Loader2, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { ApiService } from '../api';
import './Home.css';

// Lock Hero banner to asset: wp_asset_id: 587
const HERO_WP_ASSET_ID = 587;

export default function Home() {
  const [allContent, setAllContent] = useState([]);
  const [stacks, setStacks] = useState({
    liveTv: [],
    top10: [],
    bingeVideos: [],
    bingeEpicSeries: [],
    mustWatchSpaceEpic: [],
    spaceToGround: [],
    news: [],
    talkShows: [],
    documentarySeries: [],
    documentaryFilms: [],
    scienceFiction: []
  });
  
  // Local Storage Stacks
  const [watchlist, setWatchlist] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  
  // Hero Banner States
  const [heroContent, setHeroContent] = useState(null);
  const [heroVideoUrl, setHeroVideoUrl] = useState('');
  const [showHeroVideo, setShowHeroVideo] = useState(false);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const heroVideoRef = useRef(null);
  const hlsRef = useRef(null);

  // Global Page States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [heroInWatchlist, setHeroInWatchlist] = useState(false);
  
  const navigate = useNavigate();

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      
      const vids = await ApiService.getVideos();
      const movs = await ApiService.getMovies();
      const shows = await ApiService.getTVShows();
      
      // Combine all content for local storage lookups
      const combined = [...(vids || []), ...(movs || []), ...(shows || [])];
      setAllContent(combined);

      // Lock Hero banner to asset: wp_asset_id: 587
      const liveAsset = combined.find(item => item.wp_asset_id === HERO_WP_ASSET_ID || item.title === "Interplanetary (Live)");
      if (liveAsset) {
        setHeroContent(liveAsset);
      } else {
        setHeroContent(null);
      }

      // Filter other categories: exclude the live hero to avoid duplication in grids
      const isHero = (item) => item.wp_asset_id === HERO_WP_ASSET_ID || item.title === "Interplanetary (Live)";
      const filteredCombined = combined.filter(item => !isHero(item));
      const filteredVids = (vids || []).filter(item => !isHero(item));
      const filteredMovs = (movs || []).filter(item => !isHero(item));
      const filteredShows = (shows || []).filter(item => !isHero(item));

      // Filter 11 stacks
      const containsCi = (str, q) => str && str.toLowerCase().includes(q.toLowerCase());

      const checkTag = (p, q) => {
        const tags = p.tag || p.tags;
        if (!tags) return false;
        if (Array.isArray(tags)) return tags.some(t => t && t.toLowerCase().includes(q.toLowerCase()));
        return tags.toLowerCase().includes(q.toLowerCase());
      };

      const checkGenre = (p, q) => {
        const genres = p.genre || p.genres;
        if (!genres) return false;
        if (Array.isArray(genres)) return genres.some(g => g && g.toLowerCase().includes(q.toLowerCase()));
        return genres.toLowerCase().includes(q.toLowerCase());
      };

      const checkDesc = (p, q) => {
        return p.description && p.description.toLowerCase().includes(q.toLowerCase());
      };

      const checkTitle = (p, q) => {
        const title = p.title || p.titleStr;
        return title && title.toLowerCase().includes(q.toLowerCase());
      };

      const checkFields = (p, q) => {
        return checkTag(p, q) || checkGenre(p, q) || checkDesc(p, q);
      };

      setStacks({
        liveTv: filteredCombined.filter(p => checkTag(p, 'live 24/7')),
        top10: filteredCombined.filter(p => checkTag(p, 'Our Top 10')),
        bingeVideos: filteredCombined.filter(p => checkTag(p, 'Binge Videos')),
        bingeEpicSeries: filteredShows,
        mustWatchSpaceEpic: filteredMovs,
        spaceToGround: filteredCombined.filter(p => checkTitle(p, 'Space to Ground')),
        news: filteredCombined.filter(p => checkFields(p, 'news')),
        talkShows: filteredCombined.filter(p => checkFields(p, 'talk show')),
        documentarySeries: filteredCombined.filter(p => checkFields(p, 'Documentary Series')),
        documentaryFilms: filteredCombined.filter(p => checkFields(p, 'Documentary film')),
        scienceFiction: filteredCombined.filter(p => checkFields(p, 'science fiction') || checkFields(p, 'sci-fi') || checkTag(p, 'sci-fi') || checkGenre(p, 'sci-fi'))
      });

      // Load watchlist and continue watching rows
      loadLocalLists(combined);
    } catch (err) {
      console.error("Failed to load home page content", err);
      setError(err.message || 'The server could not be reached. Please check the backend API.');
    } finally {
      setLoading(false);
    }
  }

  const loadLocalLists = (itemsList) => {
    const list = itemsList || allContent;
    if (list.length === 0) return;

    // 1. Watchlist Row
    const watchlistIds = JSON.parse(localStorage.getItem('watchlist') || '[]');
    const matchingWatchlist = list.filter(item => watchlistIds.includes(item._id));
    setWatchlist(matchingWatchlist);

    // 2. Continue Watching Row
    const cwRecords = JSON.parse(localStorage.getItem('continueWatching') || '[]');
    // Sort recently watched first
    const sortedRecords = [...cwRecords].sort((a, b) => b.timestamp - a.timestamp);
    const matchingCw = sortedRecords.map(rec => {
      const asset = list.find(item => item._id === rec.id);
      if (asset) {
        return {
          ...asset,
          progressPercent: rec.percentage,
          progressSeconds: rec.progress
        };
      }
      return null;
    }).filter(Boolean);
    setContinueWatching(matchingCw);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync hero watchlist state
  useEffect(() => {
    if (!heroContent) return;
    const watchlistIds = JSON.parse(localStorage.getItem('watchlist') || '[]');
    setHeroInWatchlist(watchlistIds.includes(heroContent._id));
  }, [heroContent]);

  // Reactive listener for local watchlist and continue watching changes
  useEffect(() => {
    const syncLists = () => {
      loadLocalLists();
    };
    window.addEventListener('watchlistUpdated', syncLists);
    window.addEventListener('continueWatchingUpdated', syncLists);
    return () => {
      window.removeEventListener('watchlistUpdated', syncLists);
      window.removeEventListener('continueWatchingUpdated', syncLists);
    };
  }, [allContent]);

  // Resolve hero banner stream URL
  useEffect(() => {
    if (!heroContent) return;

    setHeroVideoUrl('');
    setHeroVideoReady(false);

    async function resolveHeroStream() {
      try {
        let src = null;
        
        // 1. Check videos structure
        if (heroContent.videos && typeof heroContent.videos === 'object') {
          const v = heroContent.videos;
          if (v.clipId) {
            const baseUrl = import.meta.env.VITE_API_URL || 'https://api.interplanetary.tv/api';
            src = `${baseUrl}/media-assets/playback/${v.clipId}`;
          } else {
            const keys = Object.keys(v);
            for (const key of keys) {
              if (key.startsWith('non-svp') && typeof v[key] === 'string' && v[key].startsWith('http')) {
                src = v[key];
                break;
              }
            }
          }
        }

        // 2. Fallbacks
        if (!src && heroContent.videoUrls) {
          if (heroContent.videoUrls.hls) src = heroContent.videoUrls.hls;
          else if (heroContent.videoUrls.mp4) src = heroContent.videoUrls.mp4;
        }

        if (!src && heroContent.videoUrl && heroContent.videoUrl[0]) {
          src = heroContent.videoUrl[0];
        }

        // Resolve local playback redirect if format=json is supported
        if (src && src.includes('/media-assets/playback/')) {
          try {
            const res = await fetch(`${src}?format=json`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.url) src = data.url;
            }
          } catch (e) {
            console.warn("Could not pre-resolve hero video URL", e);
          }
        }

        if (src) {
          setHeroVideoUrl(src);
        }
      } catch (err) {
        console.error('Failed to resolve hero video stream URL:', err);
      }
    }

    resolveHeroStream();
  }, [heroContent]);

  // Autoplay hero banner video after 2 seconds delay on mount
  useEffect(() => {
    if (!heroContent) return;

    setShowHeroVideo(false);
    setHeroVideoReady(false);

    const delayTimer = setTimeout(() => {
      setShowHeroVideo(true);
    }, 2000);

    return () => {
      clearTimeout(delayTimer);
    };
  }, [heroContent]);

  // Bind/Play HLS/HTML5 player to banner background element
  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;

    if (!showHeroVideo || !heroVideoUrl) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.src = '';
      return;
    }

    // If already loaded/initialized, simply resume playing
    if (video.paused && (video.src || hlsRef.current)) {
      video.play().catch(e => console.log('Resume blocked', e));
      return;
    }

    // Initialize player on first load
    if (Hls.isSupported() && heroVideoUrl.includes('.m3u8')) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(heroVideoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.log('Autoplay blocked initially', e));
      });
    } else {
      video.src = heroVideoUrl;
      video.play().catch(e => console.log('Autoplay blocked initially', e));
    }
  }, [showHeroVideo, heroVideoUrl]);

  // Control muted state of hero video
  useEffect(() => {
    const video = heroVideoRef.current;
    if (video) {
      video.muted = isMuted;
    }
  }, [isMuted, showHeroVideo]);

  const handleHeroWatchlistToggle = () => {
    if (!heroContent) return;
    let localList = JSON.parse(localStorage.getItem('watchlist') || '[]');
    if (localList.includes(heroContent._id)) {
      localList = localList.filter(id => id !== heroContent._id);
      setHeroInWatchlist(false);
    } else {
      localList.push(heroContent._id);
      setHeroInWatchlist(true);
    }
    localStorage.setItem('watchlist', JSON.stringify(localList));
    window.dispatchEvent(new Event('watchlistUpdated'));
  };

  const navigateToDetails = (item) => {
    navigate(`/details/${item._id}`, { state: { post: item } });
  };

  const navigateToPlayerDirect = (item) => {
    navigate(`/play/${item._id}`, { state: { post: item } });
  };

  const renderRow = (title, items) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="row-container animate-fade-in" key={title}>
        <h2 className="row-title">{title}</h2>
        <div className="row-items">
          {items.map((item) => (
            <div key={item._id} className="video-card glass-panel" onClick={() => navigateToDetails(item)}>
              <div className="card-image-wrapper">
                <img 
                  src={item.images && item.images[0] ? item.images[0] : ''} 
                  alt={item.title} 
                  style={{width: '100%', height: '100%', objectFit: 'cover'}}
                />
                <div className="card-overlay">
                  <Play className="card-play-btn" size={32} />
                </div>
              </div>
              <div className="card-info">
                <h3>{item.title}</h3>
                <p>{item.type} • HD</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderHeroSkeleton = () => (
    <section className="skeleton-hero">
      <div className="skeleton-hero-content">
        <div className="skeleton-badge shimmer"></div>
        <div className="skeleton-title shimmer"></div>
        <div className="skeleton-desc shimmer"></div>
        <div className="skeleton-btn-row">
          <div className="skeleton-btn shimmer"></div>
          <div className="skeleton-btn shimmer"></div>
        </div>
      </div>
    </section>
  );

  const renderRowSkeleton = () => (
    <div className="skeleton-row-container">
      <h2 className="row-title" style={{ width: '180px', height: '24px', borderRadius: '4px', background: '#111' }}>
        <div className="shimmer" style={{ width: '100%', height: '100%', borderRadius: '4px' }}></div>
      </h2>
      <div className="skeleton-row-grid">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="skeleton-card">
            <div className="skeleton-card-img shimmer"></div>
            <div className="skeleton-card-info">
              <div className="skeleton-card-title shimmer"></div>
              <div className="skeleton-card-meta shimmer"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="error-screen animate-fade-in">
        <div className="error-card glass-panel">
          <div className="error-icon-wrapper">
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="#ff453a" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="error-svg">
              <line x1="1" y1="1" x2="23" y2="23"></line>
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.5"></path>
              <path d="M5 12.5a10.94 10.94 0 0 1 5.83-2.84"></path>
              <path d="M12 18.5a4.25 4.25 0 0 1-1.91-.48"></path>
              <path d="M13.1 14.18a1.5 1.5 0 0 0-1.2-1.2"></path>
              <path d="M12 2v2"></path>
              <path d="M12 22v-2"></path>
              <path d="M2 12h2"></path>
              <path d="M20 12h2"></path>
            </svg>
          </div>
          <h2>Cosmic Connection Disrupted</h2>
          <p className="error-desc">{error}</p>
          <p className="error-help">Please verify your internet connection and local backend API status.</p>
          <button className="btn-primary retry-btn" onClick={loadData}>
            <RefreshCw size={18} style={{ marginRight: '8px' }} />
            Try Reconnecting
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="home-container">
        {renderHeroSkeleton()}
        <section className="content-rows" style={{ marginTop: '-4rem' }}>
          {renderRowSkeleton()}
          {renderRowSkeleton()}
        </section>
      </div>
    );
  }

  const heroBg = heroContent?.images && heroContent.images[0] ? heroContent.images[0] : 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=2070&auto=format&fit=crop';

  return (
    <div className="home-container">
      {heroContent && (
        <section className="hero-section">
          <div className="hero-overlay"></div>
          
          {/* Always render background image underneath to prevent black screens */}
          <div className="hero-bg">
            <img 
              src={heroBg} 
              alt={heroContent.title} 
              className="hero-image"
            />
          </div>
          
          {/* Autoplay Video Banner Background */}
          {showHeroVideo && heroVideoUrl && (
            <div className="hero-video-container">
              <video 
                ref={heroVideoRef}
                className={`hero-video-element ${heroVideoReady ? 'visible' : ''}`}
                muted={isMuted}
                autoPlay
                playsInline
                loop
                onPlaying={() => setHeroVideoReady(true)}
                onWaiting={() => setHeroVideoReady(false)}
                onLoadStart={() => setHeroVideoReady(false)}
              />
              {!heroVideoReady && (
                <div className="hero-video-loader">
                  <Loader2 className="animate-spin" size={40} color="#007aff" />
                </div>
              )}
            </div>
          )}
          
          {showHeroVideo && heroVideoUrl && heroVideoReady && (
            <button 
              className="hero-mute-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
              title={isMuted ? "Unmute Video" : "Mute Video"}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          )}
          
          <div className="hero-content animate-fade-in">
            <span className="hero-badge">{heroContent.type ? heroContent.type.toUpperCase() : 'NEW'}</span>
            <h1 className="hero-title">{heroContent.title}</h1>
            <p className="hero-description">
              {heroContent.description || 'Explore the deepest corners of the universe in our latest high-definition documentary series.'}
            </p>
            
            <div className="hero-actions">
              {/* Hero play button navigates DIRECTLY to fullscreen player */}
              <button className="btn-primary" onClick={() => navigateToPlayerDirect(heroContent)}>
                <Play size={20} fill="currentColor" />
                Watch Now
              </button>
              
              {/* Hero more info button navigates to Details screen */}
              <button className="btn-secondary" onClick={() => navigateToDetails(heroContent)}>
                <Info size={20} />
                More Info
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Content Rows */}
      <section className="content-rows">
        
        {/* 1. Continue Watching (Locally Managed) */}
        {continueWatching.length > 0 && (
          <div className="row-container animate-fade-in">
            <h2 className="row-title">Continue Watching</h2>
            <div className="row-items">
              {continueWatching.map((item) => (
                <div key={`cw-${item._id}`} className="video-card glass-panel" onClick={() => navigateToDetails(item)}>
                  <div className="card-image-wrapper">
                    <img 
                      src={item.images && item.images[0] ? item.images[0] : ''} 
                      alt={item.title} 
                      style={{width: '100%', height: '100%', objectFit: 'cover'}}
                    />
                    <div className="card-overlay">
                      <Play className="card-play-btn" size={32} />
                    </div>
                    {/* Completion progress bar */}
                    <div className="card-progress-bar-container">
                      <div className="card-progress-bar-fill" style={{ width: `${item.progressPercent}%` }}></div>
                    </div>
                  </div>
                  <div className="card-info">
                    <h3>{item.title}</h3>
                    <p>{item.type} • {Math.round(item.progressPercent)}% watched</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. My Watchlist (Locally Managed) */}
        {watchlist.length > 0 && (
          <div className="row-container animate-fade-in">
            <h2 className="row-title">My Watchlist</h2>
            <div className="row-items">
              {watchlist.map((item) => (
                <div key={`wl-${item._id}`} className="video-card glass-panel" onClick={() => navigateToDetails(item)}>
                  <div className="card-image-wrapper">
                    <img 
                      src={item.images && item.images[0] ? item.images[0] : ''} 
                      alt={item.title} 
                      style={{width: '100%', height: '100%', objectFit: 'cover'}}
                    />
                    <div className="card-overlay">
                      <Play className="card-play-btn" size={32} />
                    </div>
                  </div>
                  <div className="card-info">
                    <h3>{item.title}</h3>
                    <p>{item.type} • HD</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Standard API Categories */}
        {Object.values(stacks).every(arr => !arr || arr.length === 0) && (
          <div className="row-container" style={{ textAlign: 'center', marginTop: '100px' }}>
            <h2 className="row-title">No Content Available</h2>
            <p style={{ color: 'var(--text-secondary)' }}>The database is currently empty. Please upload videos via the CMS.</p>
          </div>
        )}

        {renderRow('Live TV', stacks.liveTv)}
        {renderRow('Our Top 10', stacks.top10)}
        {renderRow('Binge Videos', stacks.bingeVideos)}
        {renderRow('Binge-Epic Series', stacks.bingeEpicSeries)}
        {renderRow('Must-Watch Space Epics', stacks.mustWatchSpaceEpic)}
        {renderRow('Space-to-Ground Report', stacks.spaceToGround)}
        {renderRow('News', stacks.news)}
        {renderRow('Talk-Shows', stacks.talkShows)}
        {renderRow('Documentary Series', stacks.documentarySeries)}
        {renderRow('Documentary Film', stacks.documentaryFilms)}
        {renderRow('Science-Fiction', stacks.scienceFiction)}

      </section>
    </div>
  );
}
