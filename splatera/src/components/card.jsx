import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';
import CardPopup from './cardPopup';
import './card.css';

export default function Card({ file }) {
  const[isHovered, setIsHovered] = useState(false);

  const handleCopy = async () => {
    // TODO: Добавить уведу о копировании
    try {
      await invoke('copy_image_to_clipboard', { path: file.path });
      console.log('Картинка скопирована в буфер!');
    } catch (error) {
      console.error('Ошибка копирования:', error);
    }
  };

  const ext = file.name.split('.').pop().toUpperCase();

  return (
    <div 
      className="splatera-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img src={file.preview} alt={file.name} />
      
      {/* Рендерим менюшку ТОЛЬКО если курсор на карточке! */}
      {isHovered && (
        <CardPopup 
          title={file.name} 
          dateText="Saved just now" 
          tags={[ext, 'Image']} 
          onCopy={handleCopy}
          onMaximize={() => console.log('Фулскрин для:', file.name)}
        />
      )}
    </div>
  );
}