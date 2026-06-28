import React, { useState, useEffect } from 'react';
import { ApiService } from '../api';
import './ApksModal.css';

export default function ApksModal({ onClose }) {
  const [apks, setApks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchApks = async () => {
      try {
        const res = await ApiService.getApks();
        setApks(res.data || []);
      } catch (err) {
        console.error('Failed to fetch APKs:', err);
        setError('Could not load available APKs at this time.');
      } finally {
        setLoading(false);
      }
    };
    fetchApks();
  }, []);

  const getAbsoluteUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl && apiUrl.startsWith('http')) {
      try {
        const origin = new URL(apiUrl).origin;
        return `${origin}${url}`;
      } catch (e) {
        console.error(e);
      }
    }
    return `${window.location.origin}${url}`;
  };

  return (
    <div className="apks-modal-overlay" onClick={onClose}>
      <div className="apks-modal-content" onClick={e => e.stopPropagation()}>
        <button className="apks-modal-close" onClick={onClose}>×</button>
        <h2>Download ITV Apps</h2>
        <p className="apks-modal-subtitle">Install our apps directly on your Android devices</p>

        {loading ? (
          <div className="apks-loading">Loading available apps...</div>
        ) : error ? (
          <div className="apks-error">{error}</div>
        ) : apks.length === 0 ? (
          <div className="apks-empty">No APKs are currently available for download.</div>
        ) : (
          <div className="apks-list">
            {apks.map(apk => (
              <div key={apk._id} className="apk-item">
                <img src={getAbsoluteUrl(apk.imageUrl)} alt={apk.title} className="apk-image" />
                <div className="apk-details">
                  <h3>{apk.title}</h3>
                </div>
                <a href={getAbsoluteUrl(apk.apkUrl)} download className="apk-download-btn">
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
