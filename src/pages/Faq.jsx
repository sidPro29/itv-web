import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Film, Tv, Play, Download, CreditCard, Sparkles } from 'lucide-react';
import './Faq.css';

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      icon: <Sparkles size={20} color="#007aff" />,
      question: "What is Interplanetary.tv?",
      answer: "Interplanetary Television (iTV) is a premium streaming television service dedicated to space exploration, astronomy, planetary science, and science fiction. We offer a mix of Free Ad-Supported Streaming TV (FAST) channels and Subscription Video on Demand (SVOD) movies, series, and exclusive documentaries."
    },
    {
      icon: <CreditCard size={20} color="#30d158" />,
      question: "How do subscription plans work?",
      answer: "We offer both Monthly and Yearly subscription levels. Subscribing gives you instant access to premium space documentaries, movies, and series without any advertisements and in High Definition (HD). You can purchase a plan easily using Stripe payment gateway. Active plans can be cancelled anytime from your profile screen."
    },
    {
      icon: <Play size={20} color="#ff3b30" />,
      question: "Can I watch on multiple devices?",
      answer: "Yes! Your Interplanetary TV account can be logged in on multiple supported devices simultaneously, including our Web app (itv-web) and the Smart LG TV App (LGTV-ITV-APP), allowing you to experience high-quality playback on any screen."
    },
    {
      icon: <Tv size={20} color="#af52de" />,
      question: "What kind of content is available?",
      answer: "Our catalog is sorted into TV Shows, Movies, News Videos, Documentary Films, Documentary Series, and Science-Fiction. Content is curated to bring you the best educational and entertainment assets from across the galaxy."
    },
    {
      icon: <Download size={20} color="#ff9500" />,
      question: "How do I download my purchase itinerary?",
      answer: "After purchasing any membership plan, navigate to your Profile page and select the 'Purchases' tab. On your active purchase card, click the 'Download Itinerary' button. This generates a detailed text document containing your transaction ID, customer email, purchase date, and subscription benefits."
    },
    {
      icon: <HelpCircle size={20} color="#54c1fb" />,
      question: "How do I contact customer support?",
      answer: "We are always here to help! You can reach out directly via email at info@interplanetary.tv or call us at +37123112488. You can also find these details in the 'Contact Us' tab on your profile page."
    }
  ];

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="faq-page-container animate-fade-in">
      <div className="faq-ambient-bg"></div>
      <div className="faq-content-wrapper">
        <div className="faq-header">
          <HelpCircle size={48} className="faq-main-icon" />
          <h1 className="faq-title">Frequently Asked Questions</h1>
          <p className="faq-subtitle">Everything you need to know about Interplanetary TV</p>
        </div>

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
                    <span className="faq-icon-wrapper">{faq.icon}</span>
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
      </div>
    </div>
  );
}
