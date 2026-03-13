import { useState } from 'react'; 
import { invoke } from '@tauri-apps/api/core';
import CardPopup from './cardPopup';
import ContextMenu from './contextMenu'; 
import './card.css';

export default function Card({ data }) {
  const [menuData, setMenuData] = useState({ open: false, x: 0, y: 0 });

  if (!data || !data.id) return null;

  const handleContextMenu = (e) => {
    e.preventDefault(); // Запрещаем стандартное меню Windows
    setMenuData({
      open: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleAction = async (action) => {
    setMenuData({ ...menuData, open: false });
  
    switch (action) {
      case 'copy':
        await handleCopy();
        break;
  
      case 'open_folder':
        try {
          await invoke('open_in_folder', { path: data.path });
        } catch (err) {
          console.error(err);
        }
        break;
  
      case 'rename':
        window.dispatchEvent(new CustomEvent('open-rename-modal', { 
          detail: { id: data.id, name: data.name } 
        }));
        break;
  
      case 'delete':
        try {
          await invoke('delete_asset', { id: data.id });
            
          window.dispatchEvent(new CustomEvent('reload-library'));
    
          window.dispatchEvent(new CustomEvent('show-notification', {
            detail: { 
              title: 'Asset Removed', 
              desc: `"${data.name}" has been deleted.` 
            }
          }));
        } catch (err) {
            console.error('Failed to delete:', err);
        }
        break;

        case 'add_tag':
        window.dispatchEvent(new CustomEvent('open-tag-modal', { 
          detail: { id: data.id, currentTags: data.tags } 
        }));
        break;
  
      default:
        break;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp * 1000);
    const day   = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year  = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

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
  const displayName = data.name.replace(/\.[^/.]+$/, "");

  const cardAspectRatio = data.width && data.height 
    ? `${data.width} / ${data.height}` 
    : '1 / 1';

  const isCodeOrText = data.kind === 'Code' || data.kind === 'Text';

  return (
    <div 
      className="splatera-card" 
      style={{ aspectRatio: cardAspectRatio }} 
      onContextMenu={handleContextMenu}
    >
      {/* Рендерим либо код, либо картинку */}
      {isCodeOrText ? (
        <div className="code-preview-container">
          <pre><code>{data.contentSnippet || "No preview available"}</code></pre>
        </div>
      ) : (
        <img 
          src={data.preview} 
          alt={data.name} 
          loading="lazy"      
          decoding="async"    
        />
      )}
      
      <div className="popup-wrapper">
        <CardPopup 
          title={displayName}
          dateText={formatDate(data.created_at)}
          tags={data.tags ?? [ext]}
          onCopy={handleCopy}
          
          onMaximize={() => {
            window.dispatchEvent(new CustomEvent('open-lightbox', { detail: data }));
          }}
        />
        <ContextMenu 
          isOpen={menuData.open}
          // Передаем функцию, которая меняет только флаг open
          setIsOpen={(val) => setMenuData(prev => ({ ...prev, open: val }))}
          x={menuData.x}
          y={menuData.y}
          onAction={handleAction} 
        />
    </div>
    </div>
  );
}