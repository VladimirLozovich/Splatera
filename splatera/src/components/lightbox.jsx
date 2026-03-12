import { useEffect, useState, useRef } from 'react';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { Copy, Minimize2 } from 'lucide-react';
import Button from './button';
import Label from './label';
import './lightbox.css';

export default function Lightbox({ file, onClose }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  
  const overlayRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    const overlay = overlayRef.current;
    if (!overlay) return;

    const handleWheelNative = (e) => {
      e.preventDefault();
      const zoomFactor = 0.0015; 
      const delta = -e.deltaY * zoomFactor;

      setScale((prev) => {
        const next = prev + delta;
        const newScale = Math.min(Math.max(next, 0.3), 10);
        if (newScale <= 1) setOffset({ x: 0, y: 0 });
        return newScale;
      });
    };

    overlay.addEventListener('wheel', handleWheelNative, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      overlay.removeEventListener('wheel', handleWheelNative);
    };
  }, [onClose]);

  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    setIsPanning(true);
    setStartPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setOffset({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleBackdropClick = (e) => {
    if (e.target === overlayRef.current || e.target.classList.contains('lightbox-content')) {
      onClose();
    }
  };

  const targetPath = file.original_path || file.path;
  const originalImageUrl = convertFileSrc(targetPath);
  const ext = file.name ? file.name.split('.').pop().toUpperCase() : 'IMG';

  return (
    <div 
      className="splatera-lightbox-overlay" 
      ref={overlayRef}
      onClick={handleBackdropClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="lightbox-controls">
        <Label text={ext} isActive={true} />
        <Label text="Image" isActive={true} />
        <Button icon={Copy} onClick={() => invoke('copy_image_to_clipboard', { path: file.path })} />
        <Button icon={Minimize2} onClick={onClose} /> 
      </div>

      <div className="lightbox-content">
        <img 
          ref={imgRef}
          src={originalImageUrl} 
          alt={file.name} 
          className="lightbox-image" 
          onMouseDown={handleMouseDown}
          onClick={(e) => e.stopPropagation()}
          style={{ 
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
            cursor: scale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in',
            userSelect: 'none',
            WebkitUserDrag: 'none'
          }} 
        />
      </div>
    </div>
  );
}