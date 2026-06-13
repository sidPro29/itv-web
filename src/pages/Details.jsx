import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Plus, Check, ThumbsUp, ThumbsDown, Share2, Loader2, Volume2, VolumeX, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Eye, Crown, Info } from 'lucide-react';
import Hls from 'hls.js';
import { ApiService } from '../api';
import './Details.css';

export default function Details() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [post, setPost] = useState(state?.post || null);
  const [loading, setLoading] = useState(!state?.post);
  const [error, setError] = useState('');
  
  // Local states
  const [user, setUser] = useState(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [shareFeedback, setShareFeedback] = useState(false);
  const [viewTracked, setViewTracked] = useState(false);
  
  // Access Control states
  const [plans, setPlans] = useState([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [bgIsTrailer, setBgIsTrailer] = useState(false);
  const [minPlanName, setMinPlanName] = useState('');

  // TV Show Episodes & Background Trailer states
  const [episodes, setEpisodes] = useState([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState('');
  const [showBgVideo, setShowBgVideo] = useState(false);
  const [bgVideoReady, setBgVideoReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // Recommended & Popular Stacks states
  const [recommended, setRecommended] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [stacksLoading, setStacksLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const rowRefs = useRef({});

  const scrollRow = (rowId, direction) => {
    const el = rowRefs.current[rowId];
    if (el) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Track window scroll for scroll indicator button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch Current User and Plans
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      ApiService.getCurrentUserProfile()
        .then(u => setUser(u))
        .catch(() => {});
    }
    ApiService.getPlans()
      .then(p => setPlans(p))
      .catch(() => {});
  }, []);

  // Compute Access Check
  useEffect(() => {
    if (!post) return;

    if (!post.membership_level || post.membership_level.length === 0) {
      setHasAccess(true);
      setMinPlanName('');
      return;
    }

    // Calculate content min amount and name
    let contentMinAmount = Infinity;
    let minName = '';
    
    if (plans.length > 0) {
      for (const reqPlan of post.membership_level) {
        const fullPlan = plans.find(p => p._id === reqPlan.planId || p._id === reqPlan.planId?._id);
        if (fullPlan && fullPlan.amount < contentMinAmount) {
          contentMinAmount = fullPlan.amount;
          minName = fullPlan.name;
        }
      }
    }
    
    // Fallback if not found in plans list
    if (!minName) {
      minName = post.membership_level[0].planName || 'Premium';
    }
    setMinPlanName(minName);

    if (!user) {
      setHasAccess(false);
      return;
    }

    let userMaxAmount = 0;
    let directMatch = false;

    // Check direct match or calculate user max amount
    if (user.activePlans && Array.isArray(user.activePlans)) {
      for (const activePlan of user.activePlans) {
        if (post.membership_level.some(ml => ml.planId === activePlan.planId || ml.planId === activePlan.planId?._id)) {
          directMatch = true;
          break;
        }
        if (plans.length > 0) {
          const fullPlan = plans.find(p => p._id === activePlan.planId || p._id === activePlan.planId?._id);
          if (fullPlan && fullPlan.amount > userMaxAmount) {
            userMaxAmount = fullPlan.amount;
          }
        }
      }
    }

    if (directMatch) {
      setHasAccess(true);
      return;
    }

    if (plans.length === 0) {
      setHasAccess(false);
      return;
    }

    if (userMaxAmount >= contentMinAmount && contentMinAmount !== Infinity) {
      setHasAccess(true);
    } else {
      setHasAccess(false);
    }
  }, [post, user, plans]);

  const handleScrollToggle = () => {
    if (showScrollTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  };

  // Reset and sync state when navigating between assets
  useEffect(() => {
    setError('');
    setTrailerUrl('');
    setShowBgVideo(false);
    setBgVideoReady(false);

    if (state?.post && state.post._id === id) {
      setPost(state.post);
      setLoading(false);
      setViewTracked(false);
    } else {
      setPost(null);
      setLoading(true);
    }
  }, [id, state]);

  // Fetch asset details if not passed via route state
  useEffect(() => {
    if (post) return;
    
    async function fetchAsset() {
      try {
        setLoading(true);
        const data = await ApiService.getMediaAssetById(id);
        if (!data) {
          setError('Asset details not found.');
        } else {
          setPost(data);
        }
      } catch (err) {
        console.error('Failed to load asset details:', err);
        setError(err.message || 'Failed to retrieve asset details.');
      } finally {
        setLoading(false);
      }
    }
    fetchAsset();
  }, [id, post]);

  // Track view when asset is loaded
  useEffect(() => {
    if (post && post._id && !viewTracked) {
      ApiService.viewMediaAsset(post._id).then(res => {
        setPost(prev => ({ ...prev, views: res.views }));
        setViewTracked(true);
      }).catch(err => console.warn('Failed to record view', err));
    }
  }, [post, viewTracked]);

  // Load episodes if TV Show
  useEffect(() => {
    if (!post) return;
    const isTvShow = post.type === 'tvshow' || post.type === 'tvshows';
    if (!isTvShow) return;

    async function loadEpisodes() {
      try {
        setEpisodesLoading(true);
        const allEpisodes = await ApiService.getEpisodes();
        const filtered = (allEpisodes || []).filter(
          ep => ep.program?.programId === post._id
        ).sort((a, b) => {
          const getNum = (str, pattern) => {
            const m = str.match(pattern);
            return m ? parseInt(m[1], 10) : 0;
          };
          const aSeason = getNum(a.title, /Season\s*(\d+)/i) || 1;
          const bSeason = getNum(b.title, /Season\s*(\d+)/i) || 1;
          if (aSeason !== bSeason) return aSeason - bSeason;
          
          const aEp = getNum(a.title, /Episode\s*(\d+)/i) || 0;
          const bEp = getNum(b.title, /Episode\s*(\d+)/i) || 0;
          return aEp - bEp;
        });
        setEpisodes(filtered);
      } catch (err) {
        console.error('Failed to load episodes:', err);
      } finally {
        setEpisodesLoading(false);
      }
    }
    loadEpisodes();
  }, [post]);

  // Fetch Recommended and Popular Stacks
  useEffect(() => {
    if (!post) return;

    async function loadStacks() {
      try {
        setStacksLoading(true);
        const vids = await ApiService.getVideos() || [];
        const movs = await ApiService.getMovies() || [];
        const shows = await ApiService.getTVShows() || [];
        
        // Exclude current asset
        const allOther = [...vids, ...movs, ...shows].filter(item => item._id !== post._id);
        
        // Helper to get arrays of tags/genres
        const getArray = (val) => {
          if (!val) return [];
          if (Array.isArray(val)) return val;
          if (typeof val === 'string') return [val];
          return [];
        };

        const currentTags = [...getArray(post.tags), ...getArray(post.tag)].map(t => t.toLowerCase().trim());
        const currentGenres = [...getArray(post.genres), ...getArray(post.genre)].map(g => g.toLowerCase().trim());

        const scored = allOther.map(item => {
          const itemTags = [...getArray(item.tags), ...getArray(item.tag)].map(t => t.toLowerCase().trim());
          const itemGenres = [...getArray(item.genres), ...getArray(item.genre)].map(g => g.toLowerCase().trim());
          
          let matches = 0;
          currentTags.forEach(t => {
            if (itemTags.includes(t)) matches++;
          });
          currentGenres.forEach(g => {
            if (itemGenres.includes(g)) matches++;
          });
          return { item, score: matches };
        });

        // Get top 10 matching assets (score > 0) sorted descending
        const recs = scored
          .filter(s => s.score > 0)
          .sort((a, b) => b.score - a.score)
          .map(s => s.item)
          .slice(0, 10);

        setRecommended(recs);
        
        // Popular Movie Stack contains all movie assets (excluding current if it is a movie)
        const popular = movs.filter(m => m._id !== post._id);
        setPopularMovies(popular);
      } catch (err) {
        console.error('Failed to load stacks:', err);
      } finally {
        setStacksLoading(false);
      }
    }
    loadStacks();
  }, [post]);

  // Resolve background trailer/video stream URL based on type
  useEffect(() => {
    if (!post) return;

    async function resolveBgStream() {
      try {
        let clipId = null;
        let directUrl = null;
        let isTrailer = false;

        if (post.type === 'movie' || post.type === 'movies') {
          clipId = post.trailer?.clipId;
          if (clipId) isTrailer = true;
        } else if (post.type === 'tvshow' || post.type === 'tvshows') {
          clipId = post.videos?.clipId;
          if (!clipId && episodes.length > 0) {
            clipId = episodes[0].videos?.clipId;
          }

        } else if (post.type === 'video') {
          if (post.videos && typeof post.videos === 'object') {
            if (post.videos.clipId) {
              clipId = post.videos.clipId;
            } else {
              const keys = Object.keys(post.videos);
              for (const key of keys) {
                if (key.startsWith('non-svp') && typeof post.videos[key] === 'string' && post.videos[key].startsWith('http')) {
                  directUrl = post.videos[key];
                  break;
                }
              }
            }
          }
          if (!clipId && !directUrl) {
            if (post.videoUrls?.hls) directUrl = post.videoUrls.hls;
            else if (post.videoUrl && post.videoUrl[0]) directUrl = post.videoUrl[0];
          }
        }

        if (clipId) {
          const baseUrl = import.meta.env.VITE_API_URL || 'https://api.interplanetary.tv/api';
          const src = `${baseUrl}/media-assets/playback/${clipId}`;
          const res = await fetch(`${src}?format=json`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.url) {
              setBgIsTrailer(isTrailer);
              setTrailerUrl(data.url);
            }
          }
        } else if (directUrl) {
          setBgIsTrailer(isTrailer);
          setTrailerUrl(directUrl);
        }
      } catch (e) {
        console.warn('Could not resolve background stream URL:', e);
      }
    }
    resolveBgStream();
  }, [post, episodes]);

  // 2-Second Delay to Play Background Video
  useEffect(() => {
    if (!trailerUrl || (!bgIsTrailer && !hasAccess)) {
      setShowBgVideo(false);
      setBgVideoReady(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowBgVideo(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [trailerUrl, bgIsTrailer, hasAccess]);

  // Bind background HLS trailer/video player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !trailerUrl || !showBgVideo) return;

    if (Hls.isSupported() && trailerUrl.includes('.m3u8')) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(trailerUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.log('Background autoplay blocked', e));
      });
    } else {
      video.src = trailerUrl;
      video.play().catch(e => console.log('Background autoplay blocked', e));
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [trailerUrl, showBgVideo]);

  // Control muted state and volume of background video
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
      video.volume = volume;
    }
  }, [isMuted, volume, showBgVideo]);

  // Sync watchlist from localStorage
  useEffect(() => {
    if (!post) return;
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    setInWatchlist(watchlist.includes(post._id));
  }, [post]);

  // Sync likes state with backend
  useEffect(() => {
    if (post) {
      setLikesCount(post.likes ? post.likes.length : 0);
      if (user) {
        const uId = user._id || user.id;
        setLiked(post.likes && post.likes.includes(uId));
      } else {
        setLiked(false);
      }
    }
  }, [post, user]);

  const handleWatchlistToggle = () => {
    if (!post) return;
    let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    if (watchlist.includes(post._id)) {
      watchlist = watchlist.filter(itemId => itemId !== post._id);
      setInWatchlist(false);
    } else {
      watchlist.push(post._id);
      setInWatchlist(true);
    }
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    
    // Dispatch custom event to trigger homepage updates
    window.dispatchEvent(new Event('watchlistUpdated'));
  };

  const handleLike = async () => {
    if (!user) {
      alert("Please log in to like this video.");
      return;
    }
    if (!post) return;
    
    try {
      const newLikes = await ApiService.likeMediaAsset(post._id);
      setLikesCount(newLikes.length);
      setLiked(newLikes.includes(user._id || user.id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2000);
    }).catch(err => {
      console.error('Could not copy URL to clipboard:', err);
    });
  };

  const handlePlay = () => {
    if (!post) return;
    if (!hasAccess) {
      if (window.confirm(`You need at least the '${minPlanName || 'Premium'}' subscription plan to watch this content. Do you want to view our plans?`)) {
        navigate('/plans');
      }
      return;
    }
    navigate(`/play/${post._id}`, { state: { post } });
  };

  if (loading) {
    return (
      <div className="details-loading-container" style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050505',
        color: '#fff'
      }}>
        <Loader2 className="animate-spin" size={48} color="#007aff" />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Retrieving Cosmic Files...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="details-error-container" style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050505',
        padding: '2rem'
      }}>
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', borderColor: 'rgba(255, 69, 58, 0.2)' }}>
          <h2 style={{ color: '#ff453a', marginBottom: '1rem' }}>Data Retrieval Failed</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn-primary" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

    if (!post) return null;

  const bgImg = post.images && post.images[0] ? post.images[0] : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop';

  return (
    <div className="details-page-container">
      {/* Ambient Blurred Background Poster or Background Trailer Video */}
      {trailerUrl ? (
        <div className="details-bg-video-container">
          {showBgVideo && (
            <video
              ref={videoRef}
              className={`details-bg-video-element ${bgVideoReady ? 'visible' : ''}`}
              autoPlay
              muted={isMuted}
              loop
              playsInline
              onPlaying={() => setBgVideoReady(true)}
            />
          )}
          {showBgVideo && !bgVideoReady && (
            <div className="details-bg-video-loader">
              <Loader2 className="animate-spin" size={32} color="#007aff" />
            </div>
          )}
          {/* Static poster sits underneath and fades out when video is ready */}
          <div className={`details-bg ${bgVideoReady ? 'fade-out' : ''}`} style={{ backgroundImage: `url(${bgImg})` }}></div>
        </div>
      ) : (
        <div className="details-bg" style={{ backgroundImage: `url(${bgImg})` }}></div>
      )}
      <div className={`details-bg-overlay ${bgVideoReady ? 'fade-out' : ''}`}></div>

      {showBgVideo && trailerUrl && bgVideoReady && (
        <div className="details-volume-control" onClick={(e) => e.stopPropagation()}>
          <div className="details-volume-slider-container">
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
            className="details-mute-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            title={isMuted ? "Unmute Video" : "Mute Video"}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      )}

      {/* Main Details Panel */}
      <div className="details-content-wrapper animate-fade-in">
        <button className="back-btn-float" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        {/* Right Info Section */}
        <div className="details-info-section">
          
          <h1 className="details-title">{post.title}</h1>
          
          {post.subtitle && <h3 className="details-subtitle">{post.subtitle}</h3>}

          <p className="details-description">
            {post.description || 'No description available for this cosmic asset.'}
          </p>

          {/* Actions Panel */}
          <div className="details-actions">
            <button className="btn-primary details-watch-now-btn" onClick={handlePlay}>
              {hasAccess ? <Play size={20} fill="currentColor" /> : <Crown size={20} />}
              <span>{hasAccess ? "Watch Now" : "Subscribe to Watch"}</span>
            </button>

            <button className={`details-action-btn ${inWatchlist ? 'active' : ''}`} onClick={handleWatchlistToggle} title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}>
              {inWatchlist ? <Check size={20} color="#30d158" /> : <Plus size={20} />}
              <span>Watchlist</span>
            </button>

            <div className="details-opinion-group">
              <button className={`opinion-btn ${liked ? 'active' : ''}`} onClick={handleLike} title="Like">
                <ThumbsUp size={18} fill={liked ? "currentColor" : "none"} />
                <span style={{ fontSize: '0.85rem', marginLeft: '6px' }}>{likesCount}</span>
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <button className="details-action-btn" onClick={handleShare} title="Share Link">
                <Share2 size={18} />
                <span>Share</span>
              </button>
              {shareFeedback && (
                <div className="share-toast-bubble animate-slide-down">
                  Link Copied!
                </div>
              )}
            </div>
          </div>

          {minPlanName && !hasAccess && (
            <div className="details-premium-notice" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '-2.2rem', marginBottom: '2.5rem', fontStyle: 'italic', color: '#ffffff', fontSize: '0.8rem' }}>
              <Info size={20} />
              <span>This {post.type} <strong>{post.title}</strong> requires at least the <strong>{minPlanName}</strong> plan.</span>
            </div>
          )}

          {/* Metadata Badges */}
          <div className="details-metadata-grid">
            {post.genres && post.genres.length > 0 && (
              <div className="meta-row">
                <span className="meta-label">Genres:</span>
                <div className="meta-values">
                  {post.genres.map((g, idx) => <span key={idx} className="meta-value-tag">{g}</span>)}
                </div>
              </div>
            )}

            {post.languages && post.languages.length > 0 && (
              <div className="meta-row">
                <span className="meta-label">Languages:</span>
                <div className="meta-values">
                  {post.languages.map((l, idx) => <span key={idx} className="meta-value-tag">{l}</span>)}
                </div>
              </div>
            )}

            {post.tags && post.tags.length > 0 && (
              <div className="meta-row">
                <span className="meta-label">Tags:</span>
                <div className="meta-values">
                  {post.tags.map((t, idx) => <span key={idx} className="meta-value-tag">{t}</span>)}
                </div>
              </div>
            )}

            <div className="meta-row">
              <span className="meta-label">Released:</span>
              <span className="meta-value">
                {post.publishedDate ? new Date(post.publishedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}
              </span>
            </div>

            <div className="meta-row">
              <span className="meta-label">Views:</span>
              <span className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Eye size={16} /> {post.views || 0}
              </span>
            </div>
          </div>

        </div>

        {/* Episodes Section for TV Shows */}
        {(post.type === 'tvshow' || post.type === 'tvshows') && (
          <div className="details-episodes-section">
            <h2 className="episodes-section-title">Episodes</h2>
            {episodesLoading ? (
              <div className="episodes-loading">
                <Loader2 className="animate-spin" size={24} color="#007aff" />
                <span>Scanning Orbit for Episodes...</span>
              </div>
            ) : episodes.length > 0 ? (
              <div className="episodes-grid">
                {episodes.map((episode, index) => (
                  <div 
                    key={episode._id} 
                    className="episode-card glass-panel"
                    onClick={() => {
                      if (!hasAccess) {
                        if (window.confirm(`You need at least the '${minPlanName || 'Premium'}' subscription plan to watch this episode. Do you want to view our plans?`)) {
                          navigate('/plans');
                        }
                        return;
                      }
                      navigate(`/play/${episode._id}`, { state: { post: episode } });
                    }}
                  >
                    <div className="episode-card-img-wrapper" style={{ position: 'relative' }}>
                      {post.membership_level && post.membership_level.length > 0 && (
                        <div className="premium-badge">
                          <Crown size={16} />
                        </div>
                      )}
                      <img 
                        src={episode.images && episode.images[0] ? episode.images[0] : bgImg} 
                        alt={episode.title} 
                      />
                      <div className="episode-play-overlay">
                        <Play fill="currentColor" size={20} />
                      </div>
                    </div>
                    <div className="episode-card-info">
                      <span className="episode-number">Episode {index + 1}</span>
                      <h3>{episode.title}</h3>
                      <p className="episode-subtitle">{episode.subtitle || 'Episode'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-episodes-msg">No episodes found for this show yet.</p>
            )}
          </div>
        )}

        {/* Recommended Stack */}
        {recommended.length > 0 && (
          <div className="details-stack-section row-container">
            <h2 className="episodes-section-title">Recommended</h2>
            <button className="row-scroll-btn left" onClick={() => scrollRow('recommended', 'left')}>
              <ChevronLeft size={24} />
            </button>
            <div className="row-items" ref={el => rowRefs.current['recommended'] = el}>
              {recommended.map((item) => (
                <div key={`rec-${item._id}`} className="video-card glass-panel" onClick={() => navigate(`/details/${item._id}`, { state: { post: item } })}>
                  <div className="card-image-wrapper">
                    {item.membership_level && item.membership_level.length > 0 && (
                      <div className="premium-badge">
                        <Crown size={16} />
                      </div>
                    )}
                    <img 
                      src={item.images && item.images[0] ? item.images[0] : bgImg} 
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
                    <p>{item.type ? item.type.toUpperCase() : 'VIDEO'} • HD</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="row-scroll-btn right" onClick={() => scrollRow('recommended', 'right')}>
              <ChevronRight size={24} />
            </button>
          </div>
        )}

        {/* Popular Movies Stack */}
        {popularMovies.length > 0 && (
          <div className="details-stack-section row-container">
            <h2 className="episodes-section-title">Popular Movies</h2>
            <button className="row-scroll-btn left" onClick={() => scrollRow('popular', 'left')}>
              <ChevronLeft size={24} />
            </button>
            <div className="row-items" ref={el => rowRefs.current['popular'] = el}>
              {popularMovies.map((item) => (
                <div key={`pop-${item._id}`} className="video-card glass-panel" onClick={() => navigate(`/details/${item._id}`, { state: { post: item } })}>
                  <div className="card-image-wrapper">
                    {item.membership_level && item.membership_level.length > 0 && (
                      <div className="premium-badge">
                        <Crown size={16} />
                      </div>
                    )}
                    <img 
                      src={item.images && item.images[0] ? item.images[0] : bgImg} 
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
                    <p>{item.type ? item.type.toUpperCase() : 'MOVIE'} • HD</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="row-scroll-btn right" onClick={() => scrollRow('popular', 'right')}>
              <ChevronRight size={24} />
            </button>
          </div>
        )}

      </div>
      
      {/* Scroll Down/Up Indicator Button */}
      <button 
        className="details-scroll-toggle-btn animate-fade-in"
        onClick={handleScrollToggle}
        title={showScrollTop ? "Scroll to Top" : "Scroll to Bottom"}
      >
        {showScrollTop ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
      </button>
    </div>
  );
}
