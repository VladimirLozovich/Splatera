import { invoke } from '@tauri-apps/api/core';
import CardPopup from './cardPopup';
import './card.css';

export default function Card({ data }) {
  
  const handleCopy = async () => {
    try {
      await invoke('copy_image_to_clipboard', { path: data.path });
      
      window.dispatchEvent(new CustomEvent('show-notification', {
        detail: {
          title: 'Image Copied',
          desc: `${data.name} copied to clipboard.`
        }
      }));

    } catch (error) {
      console.error('Ошибка копирования:', error);
      window.dispatchEvent(new CustomEvent('show-notification', {
        detail: { title: 'Error', desc: 'Failed to copy image.' }
      }));
    }
  };

  const ext = data.name.split('.').pop().toUpperCase();

  const cardAspectRatio = data.width && data.height 
    ? `${data.width} / ${data.height}` 
    : '1 / 1';

  return (
    <div 
      className="splatera-card" 
      style={{ aspectRatio: cardAspectRatio }} 
    >
      <img 
        src={data.preview} 
        alt={data.name} 
        loading="lazy"      
        decoding="async"    
      />
      
      <div className="popup-wrapper">
        <CardPopup 
          title={data.name} 
          dateText="Saved just now" 
          tags={[ext, 'Image']} 
          onCopy={handleCopy}
          onMaximize={() => console.log('Фулскрин для:', data.name)}
        />
      </div>
    </div>
  );
}