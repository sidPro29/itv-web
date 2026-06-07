import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Plus, Check, ThumbsUp, ThumbsDown, Share2, Loader2, Volume2, VolumeX } from 'lucide-react';
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
  const [inWatchlist, setInWatchlist] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);
  
  // TV Show Episodes & Background Trailer states
  const [episodes, setEpisodes] = useState([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState('');
  const [showBgVideo, setShowBgVideo] = useState(false);
  const [bgVideoReady, setBgVideoReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // Recommended & Popular Stacks states
  const [recommended, setRecommended] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [stacksLoading, setStacksLoading] = useState(false);

  // Reset and sync state when navigating between assets
  useEffect(() => {
    setError('');
    setTrailerUrl('');
    setShowBgVideo(false);
    setBgVideoReady(false);

    if (state?.post && state.post._id === id) {
      setPost(state.post);
      setLoading(false);
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

        if (post.type === 'movie' || post.type === 'movies') {
          clipId = post.trailer?.clipId;
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
              setTrailerUrl(data.url);
            }
          }
        } else if (directUrl) {
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
    if (!trailerUrl) {
      setShowBgVideo(false);
      setBgVideoReady(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowBgVideo(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [trailerUrl]);

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

  // Control muted state of background video
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
    }
  }, [isMuted, showBgVideo]);

  // Sync watchlist, liked and disliked states from localStorage
  useEffect(() => {
    if (!post) return;
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    setInWatchlist(watchlist.includes(post._id));
    
    const likedList = JSON.parse(localStorage.getItem('likedVideos') || '[]');
    setLiked(likedList.includes(post._id));
    
    const dislikedList = JSON.parse(localStorage.getItem('dislikedVideos') || '[]');
    setDisliked(dislikedList.includes(post._id));
  }, [post]);

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

  const handleLike = () => {
    if (!post) return;
    let likedList = JSON.parse(localStorage.getItem('likedVideos') || '[]');
    let dislikedList = JSON.parse(localStorage.getItem('dislikedVideos') || '[]');
    
    if (liked) {
      likedList = likedList.filter(id => id !== post._id);
      setLiked(false);
    } else {
      likedList.push(post._id);
      setLiked(true);
      dislikedList = dislikedList.filter(id => id !== post._id);
      setDisliked(false);
    }
    localStorage.setItem('likedVideos', JSON.stringify(likedList));
    localStorage.setItem('dislikedVideos', JSON.stringify(dislikedList));
  };

  const handleDislike = () => {
    if (!post) return;
    let likedList = JSON.parse(localStorage.getItem('likedVideos') || '[]');
    let dislikedList = JSON.parse(localStorage.getItem('dislikedVideos') || '[]');
    
    if (disliked) {
      dislikedList = dislikedList.filter(id => id !== post._id);
      setDisliked(false);
    } else {
      dislikedList.push(post._id);
      setDisliked(true);
      likedList = likedList.filter(id => id !== post._id);
      setLiked(false);
    }
    localStorage.setItem('likedVideos', JSON.stringify(likedList));
    localStorage.setItem('dislikedVideos', JSON.stringify(dislikedList));
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
      <div className="details-bg-overlay"></div>

      {showBgVideo && trailerUrl && bgVideoReady && (
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
      )}

      {/* Main Details Panel */}
      <div className="details-content-wrapper animate-fade-in">
        <button className="back-btn-float" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        {/* Right Info Section */}
        <div className="details-info-section">
          <span className="details-type-tag">{post.type ? post.type.toUpperCase() : 'VIDEO'}</span>
          
          <h1 className="details-title">{post.title}</h1>
          
          {post.subtitle && <h3 className="details-subtitle">{post.subtitle}</h3>}

          <p className="details-description">
            {post.description || 'No description available for this cosmic asset.'}
          </p>

          {/* Actions Panel */}
          <div className="details-actions">
            <button className="btn-primary details-watch-now-btn" onClick={handlePlay}>
              <Play size={20} fill="currentColor" />
              <span>Watch Now</span>
            </button>

            <button className={`details-action-btn ${inWatchlist ? 'active' : ''}`} onClick={handleWatchlistToggle} title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}>
              {inWatchlist ? <Check size={20} color="#30d158" /> : <Plus size={20} />}
              <span>Watchlist</span>
            </button>

            <div className="details-opinion-group">
              <button className={`opinion-btn ${liked ? 'active' : ''}`} onClick={handleLike} title="Like">
                <ThumbsUp size={18} fill={liked ? "currentColor" : "none"} />
              </button>
              <button className={`opinion-btn ${disliked ? 'active' : ''}`} onClick={handleDislike} title="Dislike">
                <ThumbsDown size={18} fill={disliked ? "currentColor" : "none"} />
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
                    onClick={() => navigate(`/play/${episode._id}`, { state: { post: episode } })}
                  >
                    <div className="episode-card-img-wrapper">
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
          <div className="details-stack-section">
            <h2 className="episodes-section-title">Recommended</h2>
            <div className="row-items">
              {recommended.map((item) => (
                <div key={`rec-${item._id}`} className="video-card glass-panel" onClick={() => navigate(`/details/${item._id}`, { state: { post: item } })}>
                  <div className="card-image-wrapper">
                    <img 
                      src={item.images && item.images[0] ? item.images[0] : bgImg} 
                      alt={item.title} 
                      style={{width: '100%', height: '100%', objectFit: 'cover'}}
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
          </div>
        )}

        {/* Popular Movies Stack */}
        {popularMovies.length > 0 && (
          <div className="details-stack-section">
            <h2 className="episodes-section-title">Popular Movies</h2>
            <div className="row-items">
              {popularMovies.map((item) => (
                <div key={`pop-${item._id}`} className="video-card glass-panel" onClick={() => navigate(`/details/${item._id}`, { state: { post: item } })}>
                  <div className="card-image-wrapper">
                    <img 
                      src={item.images && item.images[0] ? item.images[0] : bgImg} 
                      alt={item.title} 
                      style={{width: '100%', height: '100%', objectFit: 'cover'}}
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
          </div>
        )}

      </div>
    </div>
  );
}
