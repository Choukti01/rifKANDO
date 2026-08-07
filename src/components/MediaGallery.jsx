import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, PlayIcon } from '@heroicons/react/24/outline';
import MarketplaceImage from './common/MarketplaceImage';
import { getImageUrl } from '../utils/imageUtils';   // ✅ added

const MediaGallery = ({ media = [], onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [currentIndex]);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % media.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 50) {
      nextSlide();
    }
    if (touchEndX.current - touchStartX.current > 50) {
      prevSlide();
    }
  };

  const current = media[currentIndex];
  if (!current) return null;

  return (
    <div className="gallery-overlay" onClick={onClose}>
      <div 
        className="gallery-container" 
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button className="close-btn" onClick={onClose} aria-label="Close gallery"><XMarkIcon className="w-6 h-6" /></button>
        {media.length > 1 && (
          <>
            <button className="nav prev" onClick={prevSlide} aria-label="Previous image"><ChevronLeftIcon className="w-8 h-8" /></button>
            <button className="nav next" onClick={nextSlide} aria-label="Next image"><ChevronRightIcon className="w-8 h-8" /></button>
          </>
        )}
        <div className="media-viewer">
          {current.type === 'video' ? (
            <div className="video-container">
              {!isVideoPlaying && <button className="play-btn" onClick={() => setIsVideoPlaying(true)}><PlayIcon className="w-16 h-16" /></button>}
              {isVideoPlaying ? 
                <video src={getImageUrl(current.url)} controls autoPlay className="video-player" /> : 
                <video src={getImageUrl(current.url)} className="video-poster" />
              }
            </div>
          ) : (
            <MarketplaceImage source={current.url} alt="Gallery image" className="gallery-image" />
          )}
        </div>
        <div className="counter">{currentIndex+1} / {media.length}</div>
        <div className="thumbnails">
          {media.map((item, idx) => (
            <div key={idx} className={`thumb ${idx === currentIndex ? 'active' : ''}`} onClick={() => setCurrentIndex(idx)}>
              {item.type === 'video' ? 
                <div className="video-thumb">🎬</div> : 
                <MarketplaceImage source={item.url} alt="Gallery thumbnail" />
              }
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .gallery-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.95); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .gallery-container { position: relative; width: 90vw; height: 90vh; display: flex; align-items: center; justify-content: center; }
        .close-btn { position: absolute; top: 1rem; right: 1rem; background: rgba(0,0,0,0.5); border: none; border-radius: 50%; padding: 0.5rem; cursor: pointer; color: white; z-index: 10; }
        .nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); border: none; border-radius: 50%; padding: 1rem; cursor: pointer; color: white; }
        .prev { left: 1rem; } .next { right: 1rem; }
        .media-viewer { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        .gallery-image { max-width: 100%; max-height: 100%; object-fit: contain; }
        .video-container { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        .video-player, .video-poster { max-width: 100%; max-height: 100%; }
        .play-btn { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); background: rgba(0,0,0,0.7); border: none; border-radius: 50%; padding: 1rem; cursor: pointer; color: white; }
        .counter { position: absolute; bottom: 5rem; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); padding: 0.25rem 0.75rem; border-radius: 2rem; color: white; font-size: 0.875rem; }
        .thumbnails { position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%); display: flex; gap: 0.5rem; background: rgba(0,0,0,0.5); padding: 0.5rem; border-radius: 0.5rem; overflow-x: auto; max-width: 80%; }
        .thumb { width: 60px; height: 60px; border-radius: 0.25rem; overflow: hidden; cursor: pointer; opacity: 0.6; border: 2px solid transparent; }
        .thumb.active { opacity: 1; border-color: #87CEEB; }
        .thumb img { width: 100%; height: 100%; object-fit: cover; }
        .video-thumb { width: 100%; height: 100%; background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: 2rem; }
        @media (max-width: 640px) {
          .gallery-container { width: 100vw; height: 100dvh; padding: 1rem; }
          .close-btn { top: max(1rem, env(safe-area-inset-top)); right: 1rem; display: grid; width: 44px; height: 44px; padding: 0; place-items: center; }
          .nav { display: grid; width: 44px; height: 44px; padding: 0; place-items: center; }
          .prev { left: 0.75rem; } .next { right: 0.75rem; }
          .counter { bottom: 4.5rem; }
          .thumbnails { bottom: 0.75rem; width: calc(100% - 2rem); max-width: none; padding: 0.375rem; }
          .thumb { flex: 0 0 48px; width: 48px; height: 48px; }
        }
      `}</style>
    </div>
  );
};

export default MediaGallery;
