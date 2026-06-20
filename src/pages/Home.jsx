import { useState, useEffect, useRef } from 'react';
import { Play, Info, RefreshCw, Plus, Check, Loader2, Volume2, VolumeX, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { ApiService } from '../api';
import Footer from '../components/Footer';
import './Home.css';

// Lock Hero banner to asset: wp_asset_id: 587
const HERO_WP_ASSET_ID = 587;

const ScrollableRow = ({ title, children }) => {
  const scrollRef = useRef(null);
  
  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -600 : 600;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="row-container animate-fade-in">
      <h2 className="row-title">{title}</h2>
      <button className="row-scroll-btn left" onClick={(e) => { e.stopPropagation(); scroll('left'); }}>
        <ChevronLeft size={24} />
      </button>
      <div className="row-items" ref={scrollRef}>
        {children}
      </div>
      <button className="row-scroll-btn right" onClick={(e) => { e.stopPropagation(); scroll('right'); }}>
        <ChevronRight size={24} />
      </button>
    </div>
  );
};

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
  const [volume, setVolume] = useState(1);
  const [heroViewTracked, setHeroViewTracked] = useState(false);
  const heroVideoRef = useRef(null);
  const hlsRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [heroInWatchlist, setHeroInWatchlist] = useState(false);
  const [heroLiked, setHeroLiked] = useState(false);
  const [heroLikesCount, setHeroLikesCount] = useState(0);
  const [user, setUser] = useState(null);
  
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
    const token = localStorage.getItem('token');
    if (token) {
      ApiService.getCurrentUserProfile()
        .then(u => setUser(u))
        .catch(() => {});
    }
  }, []);

  // Sync hero states
  useEffect(() => {
    if (!heroContent) return;
    const watchlistIds = JSON.parse(localStorage.getItem('watchlist') || '[]');
    setHeroInWatchlist(watchlistIds.includes(heroContent._id));

    setHeroLikesCount(heroContent.likes ? heroContent.likes.length : 0);
    if (user) {
      const uId = user._id || user.id;
      setHeroLiked(heroContent.likes && heroContent.likes.includes(uId));
    } else {
      setHeroLiked(false);
    }
  }, [heroContent, user]);

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
    
    // Track view for hero banner
    if (!heroViewTracked) {
      ApiService.viewMediaAsset(heroContent._id).catch(err => console.warn('Failed to record hero view', err));
      setHeroViewTracked(true);
    }

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

    setShowHeroVideo(true);
    setHeroVideoReady(false);
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

  // Control muted state and volume of hero video
  useEffect(() => {
    const video = heroVideoRef.current;
    if (video) {
      video.muted = isMuted;
      video.volume = volume;
    }
  }, [isMuted, volume, showHeroVideo]);

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

  const handleHeroLike = async (e) => {
    e.stopPropagation();
    if (!user) {
      alert("Please log in to like this video.");
      return;
    }
    if (!heroContent) return;
    
    try {
      const newLikes = await ApiService.likeMediaAsset(heroContent._id);
      setHeroLikesCount(newLikes.length);
      setHeroLiked(newLikes.includes(user._id || user.id));
      
      // Update local heroContent so re-renders don't revert count
      setHeroContent(prev => ({ ...prev, likes: newLikes }));
    } catch (err) {
      console.error(err);
    }
  };

  const navigateToDetails = (item) => {
    navigate(`/details/${item._id}`, { state: { post: item } });
  };

  const navigateToPlayerDirect = (item) => {
    navigate(`/play/${item._id}`, { state: { post: item } });
  };

  const toggleHeroPlay = () => {
    if (heroVideoRef.current) {
      if (heroVideoRef.current.paused) {
        // Auto seek to the latest live edge
        try {
          if (hlsRef.current && hlsRef.current.liveSyncPosition) {
            heroVideoRef.current.currentTime = hlsRef.current.liveSyncPosition;
          } else if (heroVideoRef.current.seekable && heroVideoRef.current.seekable.length > 0) {
            heroVideoRef.current.currentTime = heroVideoRef.current.seekable.end(heroVideoRef.current.seekable.length - 1);
          }
        } catch (err) {
          console.warn('Could not seek to live edge', err);
        }
        heroVideoRef.current.play().catch(e => console.log('Play blocked', e));
      } else {
        heroVideoRef.current.pause();
      }
    }
  };

  const renderRow = (title, items) => {
    if (!items || items.length === 0) return null;
    return (
      <ScrollableRow key={title} title={title}>
        {items.map((item) => (
          <div key={item._id} className="video-card glass-panel" onClick={() => navigateToDetails(item)}>
            <div className="card-image-wrapper">
              {item.membership_level && item.membership_level.length > 0 && (
                <div className="premium-badge">
                  <Crown size={16} />
                </div>
              )}
              <img 
                src={item.images && item.images[0] ? item.images[0] : ''} 
                alt={item.title} 
                style={{width: '100%', height: '100%', objectFit: 'cover'}}
                loading="lazy"
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
      </ScrollableRow>
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
        <section className="hero-section" onClick={toggleHeroPlay}>
          <div className="hero-overlay" style={{ background: 'transparent' }}></div>
          
          <div className="hero-live-badge">
            <span className="live-dot"></span> LIVE
          </div>
          
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
          

          
          <div className="hero-content animate-fade-in">
            <h1 className="hero-title">{heroContent.title}</h1>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', fontSize: '0.9rem', color: '#ccc' }}>
               <span style={{ border: '1px solid rgba(255,255,255,0.4)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{heroContent.rating || '3+ U/A'}</span>
               <span>{heroContent.type ? heroContent.type.toUpperCase() : 'VIDEO'}</span>
               <span>HD</span>
            </div>
            <p className="hero-description">
              {heroContent.description || 'Interplanetary.tv (iTV) is your ultimate gateway to the cosmos—bringing you cutting-edge news, captivating education, and thrilling entertainment all about space.'}
            </p>
            <div className="hero-actions">
              {/* Hero play button navigates DIRECTLY to fullscreen player */}
              <button className="btn-primary" onClick={(e) => { e.stopPropagation(); navigateToPlayerDirect(heroContent); }}>
                <Play size={20} fill="currentColor" />
                Watch Now
              </button>
              
              {/* Hero more info button navigates to Details screen */}
              <button className="details-action-btn" onClick={(e) => { e.stopPropagation(); navigateToDetails(heroContent); }}>
                <Info size={18} />
                <span>More Info</span>
              </button>
              
              <button className={`details-action-btn ${heroInWatchlist ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); handleHeroWatchlistToggle(); }}>
                {heroInWatchlist ? <Check size={18} color="#30d158" /> : <Plus size={18} />}
                <span>Watchlist</span>
              </button>

              <div className="details-opinion-group" onClick={(e) => e.stopPropagation()}>
                <button className={`opinion-btn ${heroLiked ? 'active' : ''}`} onClick={handleHeroLike} title="Like">
                  <ThumbsUp size={16} fill={heroLiked ? "currentColor" : "none"} />
                  <span style={{ fontSize: '0.85rem', marginLeft: '6px' }}>{heroLikesCount}</span>
                </button>
              </div>

              {showHeroVideo && heroVideoUrl && heroVideoReady && (
                <div className="hero-volume-control" style={{ position: 'relative', bottom: 'auto', right: 'auto' }} onClick={(e) => e.stopPropagation()}>
                  <div className="volume-slider-container">
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05" 
                      value={isMuted ? 0 : volume} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setVolume(val);
                        if (val > 0) setIsMuted(false);
                        else setIsMuted(true);
                      }}
                      className="volume-slider"
                    />
                  </div>
                  <button 
                    className="hero-mute-btn"
                    onClick={() => setIsMuted(!isMuted)}
                    title={isMuted ? "Unmute Video" : "Mute Video"}
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Content Rows */}
      <section className="content-rows">
        

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

        {/* Footer embedded in the scrollable row container */}
        <div style={{ marginTop: '3rem' }}>
          <Footer forceShow={true} />
        </div>
      </section>
    </div>
  );
}
