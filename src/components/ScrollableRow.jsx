import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './ScrollableRow.css';

/**
 * ScrollableRow — a premium horizontal scroll container with
 * left/right arrow buttons, edge-fade gradient, and smooth momentum scroll.
 *
 * Props:
 *   children  — the card elements to display
 *   className — optional extra class on the track
 */
export default function ScrollableRow({ children, className = '' }) {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft]   = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    checkScrollability();
    el.addEventListener('scroll', checkScrollability, { passive: true });
    const ro = new ResizeObserver(checkScrollability);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScrollability);
      ro.disconnect();
    };
  }, [children]);

  const scroll = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 600, behavior: 'smooth' });
  };

  return (
    <div className="sr-wrapper">
      {/* Left arrow */}
      <button
        className={`sr-arrow sr-arrow-left ${canScrollLeft ? 'sr-arrow-visible' : ''}`}
        onClick={() => scroll(-1)}
        aria-label="Scroll left"
        tabIndex={canScrollLeft ? 0 : -1}
      >
        <ChevronLeft size={22} />
      </button>

      {/* Scrollable track */}
      <div ref={trackRef} className={`sr-track ${className}`}>
        {children}
        <div className="sr-end-spacer" />
      </div>

      {/* Right arrow */}
      <button
        className={`sr-arrow sr-arrow-right ${canScrollRight ? 'sr-arrow-visible' : ''}`}
        onClick={() => scroll(1)}
        aria-label="Scroll right"
        tabIndex={canScrollRight ? 0 : -1}
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}
