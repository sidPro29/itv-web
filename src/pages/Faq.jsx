import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { ApiService } from '../api';
import './Faq.css';

const { ChevronDown, HelpCircle, Loader2 } = LucideIcons;

const renderIcon = (name, color) => {
  const IconComponent = LucideIcons[name] || HelpCircle;
  return <IconComponent size={20} color={color || '#54c1fb'} />;
};

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [title, setTitle] = useState('Frequently Asked Questions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const data = await ApiService.getPage('faq');
        setTitle(data.title || 'Frequently Asked Questions');
        setFaqs(Array.isArray(data.content) ? data.content : []);
      } catch (err) {
        console.error(err);
        setError('Failed to load FAQs.');
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="faq-page-container animate-fade-in">
      <div className="faq-ambient-bg"></div>
      <div className="faq-content-wrapper">
        <div className="faq-header">
          <HelpCircle size={48} className="faq-main-icon" />
          <h1 className="faq-title">{title}</h1>
          <p className="faq-subtitle">Everything you need to know about Interplanetary TV</p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '30vh' }}>
            <Loader2 className="spinner" size={40} style={{ color: '#007aff', marginBottom: '10px' }} />
            <p style={{ color: '#8c8f9c' }}>Loading questions...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#ff3b30' }}>
            <p>{error}</p>
          </div>
        ) : faqs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#8c8f9c' }}>
            <p>No questions posted yet.</p>
          </div>
        ) : (
          <div className="faq-accordion-list">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div 
                  key={index} 
                  className={`faq-item glass-panel ${isOpen ? 'active' : ''}`}
                  onClick={() => toggleAccordion(index)}
                >
                  <div className="faq-question-row">
                    <div className="faq-question-left">
                      <span className="faq-icon-wrapper">
                        {renderIcon(faq.iconName, faq.iconColor)}
                      </span>
                      <h3 className="faq-question-text">{faq.question}</h3>
                    </div>
                    <ChevronDown size={20} className={`faq-chevron ${isOpen ? 'open' : ''}`} />
                  </div>
                  
                  <div className={`faq-answer-container ${isOpen ? 'show' : ''}`}>
                    <p className="faq-answer-text">{faq.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
