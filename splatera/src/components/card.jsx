import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { startDrag } from '@crabnebula/tauri-plugin-drag';
import CardPopup from './cardPopup';
import ContextMenu from './contextMenu';
import './card.css';

// — Утилиты —

const getLanguage = (ext) => {
  if (!ext) return 'text';
  const map = {
    js: 'javascript', py: 'python', rs: 'rust',
    html: 'html', css: 'css', json: 'json', md: 'markdown',
  };
  return map[ext.toLowerCase()] || 'text';
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown date';
  const date  = new Date(timestamp * 1000);
  const day   = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
};

const notify = (title, desc) => {
  window.dispatchEvent(new CustomEvent('show-notification', { detail: { title, desc } }));
};

// — Компонент —

export default function Card({ data }) {
  const [menuData, setMenuData] = useState({ open: false, x: 0, y: 0 });

  if (!data || !data.id) return null;

  // Вычисляем сразу — до всех обработчиков
  const ext          = data.name.split('.').pop().toUpperCase();
  const displayName  = data.name.replace(/\.[^/.]+$/, '');
  const isCodeOrText = data.kind === 'Code' || data.kind === 'Text';
  const cardAspectRatio = data.width && data.height ? `${data.width} / ${data.height}` : '1 / 1';

  const handleDragStart = async (e) => {
    e.preventDefault();
    try {
      const rawIconPath = data.previewPath || data.path;
      const iconPath = await invoke('resolve_path', { path: rawIconPath });
      await startDrag({ item: [data.path], icon: iconPath });
    } catch (err) {
      console.error('Drag failed:', err);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setMenuData({ open: true, x: e.clientX, y: e.clientY });
  };

  const handleCopy = async () => {
    try {
      if (isCodeOrText) {
        await invoke('copy_text_to_clipboard', { path: data.path });
        notify('Text Copied', `${data.name} copied to clipboard.`);
      } else {
        await invoke('copy_image_to_clipboard', { path: data.path });
        notify('Image Copied', `${data.name} copied to clipboard.`);
      }
    } catch {
      notify('Error', 'Failed to copy.');
    }
  };

  const handleAction = async (action) => {
    setMenuData(prev => ({ ...prev, open: false }));

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
        window.dispatchEvent(new CustomEvent('open-rename-modal', { detail: data }));
        break;

      case 'add_tag':
        window.dispatchEvent(new CustomEvent('open-tag-modal', { detail: data }));
        break;

      case 'delete':
        try {
          await invoke('delete_asset', { id: data.id });
          window.dispatchEvent(new CustomEvent('reload-library'));
          notify('Asset Removed', `"${data.name}" has been deleted.`);
        } catch (err) {
          console.error('Failed to delete:', err);
        }
        break;

      default:
        break;
    }
  };

  return (
    <div
      className="splatera-card"
      style={{ aspectRatio: cardAspectRatio }}
      draggable
      onDragStart={handleDragStart}
      onContextMenu={handleContextMenu}
    >
      {isCodeOrText ? (
        <div className="code-preview-container">
          <SyntaxHighlighter
            language={getLanguage(ext)}
            style={vscDarkPlus}
            customStyle={{
              margin: 0, padding: 0,
              background: 'transparent',
              fontSize: '11px',
              overflow: 'hidden',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
            wrapLongLines
          >
            {data.contentSnippet || 'No preview available'}
          </SyntaxHighlighter>
        </div>
      ) : (
        <img src={data.preview} alt={data.name} loading="lazy" decoding="async" />
      )}

      <div className="popup-wrapper">
        <CardPopup
          title={displayName}
          dateText={formatDate(data.created_at)}
          tags={data.tags ?? [ext]}
          onCopy={handleCopy}
          onMaximize={() => window.dispatchEvent(new CustomEvent('open-lightbox', { detail: data }))}
          onManageTags={() => window.dispatchEvent(new CustomEvent('open-tag-modal', { detail: data }))}
        />
        <ContextMenu
          isOpen={menuData.open}
          setIsOpen={(val) => setMenuData(prev => ({ ...prev, open: val }))}
          x={menuData.x}
          y={menuData.y}
          onAction={handleAction}
        />
      </div>
    </div>
  );
}