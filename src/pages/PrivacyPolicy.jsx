import React, { useState, useEffect } from 'react';
import { ApiService } from '../api';
import { Loader2 } from 'lucide-react';
import './LegalPages.css';

export default function PrivacyPolicy() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const data = await ApiService.getPage('privacy-policy');
        setPageData(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load privacy policy.');
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, []);

  return (
    <div className="legal-page-container animate-fade-in">
      <div className="legal-ambient-bg"></div>
      <div className="legal-content-wrapper glass-panel">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '30vh' }}>
            <Loader2 className="spinner" size={40} style={{ color: '#007aff', marginBottom: '10px' }} />
            <p style={{ color: '#8c8f9c' }}>Loading privacy policy...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#ff3b30' }}>
            <p>{error}</p>
          </div>
        ) : pageData ? (
          <>
            <h1 className="legal-title">{pageData.title || 'Privacy Policy'}</h1>
            <p className="legal-subtitle">
              Last updated: {pageData.updatedAt ? new Date(pageData.updatedAt).toLocaleDateString() : 'June 7, 2026'}
            </p>
            <div className="legal-divider"></div>
            <div 
              className="legal-text-content" 
              dangerouslySetInnerHTML={{ __html: pageData.content }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
