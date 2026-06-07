import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Hls from 'hls.js';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ApiService } from '../api';
import './Player.css';

export default function Player() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [post, setPost] = useState(state?.post || null);
  const [loading, setLoading] = useState(!state?.post);
  const [error, setError] = useState('');

  // Fetch post if missing (e.g., direct load or page refresh)
  useEffect(() => {
    if (post) return;
    
    async function fetchAsset() {
      try {
        setLoading(true);
        const data = await ApiService.getMediaAssetById(id);
        if (!data) {
          setError('Content not available, will be available soon.');
        } else {
          setPost(data);
        }
      } catch (err) {
        console.error('Failed to load video asset:', err);
        setError('Content not available, will be available soon.');
      } finally {
        setLoading(false);
      }
    }
    fetchAsset();
  }, [id, post]);

  const [streamUrl, setStreamUrl] = useState('');

  // Handle video source resolution
  useEffect(() => {
    if (loading || !post) return;

    async function resolveSource() {
      try {
        let src = null;
        
        // 1. Check new videos object structure
        if (post.videos && typeof post.videos === 'object') {
          const v = post.videos;
          
          // If it has an SVP clipId, use the backend playback proxy route
          if (v.clipId) {
            const baseUrl = import.meta.env.VITE_API_URL || 'https://api.interplanetary.tv/api';
            src = `${baseUrl}/media-assets/playback/${v.clipId}`;
          } else {
            // Otherwise search for non-svp video URLs
            const keys = Object.keys(v);
            for (const key of keys) {
              if (key.startsWith('non-svp') && typeof v[key] === 'string' && v[key].startsWith('http')) {
                src = v[key];
                break;
              }
            }
          }
        }
        
        // 2. Fallback to legacy structures
        if (!src) {
          if (post.videoUrls) {
            if (post.videoUrls.hls) src = post.videoUrls.hls;
            else if (post.videoUrls.mp4) src = post.videoUrls.mp4;
          }
          if (!src && post.videoUrl && post.videoUrl[0]) {
            src = post.videoUrl[0];
          }
        }

        if (!src) {
          setError('Content not available, will be available soon.');
          return;
        }

        // 3. If it's a playback proxy URL, resolve the redirect on the backend via format=json
        if (src.includes('/media-assets/playback/')) {
          const res = await fetch(`${src}?format=json`);
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          const data = await res.json();
          if (data && data.url) {
            src = data.url;
          } else {
            throw new Error('No stream URL returned in JSON response');
          }
        }

        console.log('Final resolved stream URL:', src);
        setStreamUrl(src);
      } catch (err) {
        console.error('Failed to resolve stream URL:', err);
        setError('Content not available, will be available soon.');
      }
    }

    resolveSource();
  }, [post, loading]);

  // Handle HLS player binding when streamUrl is resolved
  useEffect(() => {
    if (!streamUrl) return;

    const video = videoRef.current;
    if (!video) return;

    let hls = null;

    const handleTimeUpdate = () => {
      if (!video.duration || !post) return;
      const progress = video.currentTime;
      const duration = video.duration;
      const percentage = (progress / duration) * 100;

      let continueList = JSON.parse(localStorage.getItem('continueWatching') || '[]');

      if (progress > 20 && percentage < 90) {
        const existingIdx = continueList.findIndex(item => item && item.id === post._id);
        const record = {
          id: post._id,
          progress,
          percentage,
          timestamp: Date.now()
        };

        if (existingIdx > -1) {
          continueList[existingIdx] = record;
        } else {
          continueList.push(record);
        }

        localStorage.setItem('continueWatching', JSON.stringify(continueList));
        window.dispatchEvent(new Event('continueWatchingUpdated'));
      } else if (percentage >= 90 || progress <= 20) {
        // Remove if completed or if too close to start
        const updatedList = continueList.filter(item => item && item.id !== post._id);
        localStorage.setItem('continueWatching', JSON.stringify(updatedList));
        window.dispatchEvent(new Event('continueWatchingUpdated'));
      }
    };

    const applyResumeProgress = () => {
      const continueList = JSON.parse(localStorage.getItem('continueWatching') || '[]');
      const saved = continueList.find(item => item && item.id === post?._id);
      if (saved && saved.progress) {
        console.log(`Resuming playback from: ${saved.progress}s`);
        video.currentTime = saved.progress;
      }
    };

    const handleVideoError = (e) => {
      console.error('HTML5 Video element error:', video.error || e);
      setError('Content not available, will be available soon.');
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('error', handleVideoError);

    if (Hls.isSupported() && streamUrl.includes('.m3u8')) {
      hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        applyResumeProgress();
        video.play().catch(e => console.error('Auto-play prevented', e));
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('HLS Fatal Error:', data);
          switch(data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("Fatal network error, attempting recovery...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("Fatal media error, attempting recovery...");
              hls.recoverMediaError();
              break;
            default:
              setError('Content not available, will be available soon.');
              break;
          }
        }
      });
    } else if (streamUrl.includes('.mp4') || !streamUrl.includes('.m3u8')) {
      // Direct MP4 or standard video playback (Chrome/Firefox/Safari)
      video.src = streamUrl;
      const onPlayReady = () => {
        applyResumeProgress();
        video.play().catch(e => console.error('Auto-play prevented', e));
      };
      video.addEventListener('loadedmetadata', onPlayReady);
      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('error', handleVideoError);
        video.removeEventListener('loadedmetadata', onPlayReady);
        video.src = '';
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = streamUrl;
      const onNativeReady = () => {
        applyResumeProgress();
        video.play().catch(e => console.error('Auto-play prevented', e));
      };
      video.addEventListener('loadedmetadata', onNativeReady);
      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('error', handleVideoError);
        video.removeEventListener('loadedmetadata', onNativeReady);
        video.src = '';
      };
    } else {
      setError('Content not available, will be available soon.');
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('error', handleVideoError);
      if (hls) {
        hls.destroy();
      }
    };
  }, [streamUrl, post]);

  if (error) {
    return (
      <div className="player-error-container">
        <div className="player-header-overlay">
          <button className="back-btn" onClick={() => navigate(-1)} title="Go Back">
            <ArrowLeft size={22} />
          </button>
        </div>
        <div className="error-message glass-panel" style={{ borderColor: 'rgba(255, 69, 58, 0.2)', padding: '2.5rem', textAlign: 'center' }}>
          <h2 style={{ color: '#ff453a', marginBottom: '0.75rem' }}>Playback Error</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn-primary" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  if (loading || !streamUrl) {
    return (
      <div className="player-loading-container animate-fade-in" style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050505',
        color: '#fff'
      }}>
        <div className="player-header-overlay">
          <button className="back-btn" onClick={() => navigate(-1)} title="Go Back">
            <ArrowLeft size={22} />
          </button>
        </div>
        <Loader2 className="animate-spin" size={48} color="#007aff" />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Preparing Cosmic Stream...</p>
      </div>
    );
  }

  return (
    <div className="player-container">
      <div className="player-header-overlay animate-fade-in">
        <button className="back-btn" onClick={() => navigate(-1)} title="Go Back">
          <ArrowLeft size={22} />
        </button>
        {post && <span className="player-video-title">{post.title}</span>}
      </div>
      
      <img src="/ITV-Logo-copy.gif" alt="Interplanetary TV" className="player-logo-overlay" />
      
      <video
        ref={videoRef}
        className="video-element"
        controls
        autoPlay
        playsInline
      />
    </div>
  );
}
