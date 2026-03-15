import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './tagManager.css';

const getLanguage = (ext) => {
  const map = { js: 'javascript', py: 'python', rs: 'rust', html: 'html', css: 'css', json: 'json', md: 'markdown' };
  return map[ext.replace('.', '').toLowerCase()] || 'text';
};

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
const TEXT_EXTS  = ['.txt', '.md', '.js', '.py', '.rs', '.css', '.html', '.json'];

const getAutoTags = (path) => {
  const parts = path.split(/[/\\]/);
  const folder = parts.length > 1 ? parts[parts.length - 2].toLowerCase() : '';
  return folder ? [folder] : [];
};

export default function ImportModal({ paths, onConfirm, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmed, setConfirmed] = useState([]);

  const [tags, setTags] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [batchName, setBatchName] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewCode, setPreviewCode] = useState('');
  const [previewExt, setPreviewExt] = useState('');

  const currentPath = paths[currentIndex];
  const isLast = currentIndex === paths.length - 1;

  // Загружаем превью и авто-теги при смене файла
  useEffect(() => {
    if (!currentPath) return;

    setPreviewUrl('');
    setPreviewCode('');
    setInputValue('');
    setBatchName('');
    setTags(getAutoTags(currentPath));

    const ext = currentPath.slice(currentPath.lastIndexOf('.')).toLowerCase();
    setPreviewExt(ext);

    if (IMAGE_EXTS.includes(ext)) {
      setPreviewUrl(convertFileSrc(currentPath));
    } else if (TEXT_EXTS.includes(ext)) {
      invoke('read_full_text_file', { path: currentPath })
        .then(text => setPreviewCode(text.split('\n').slice(0, 20).join('\n')))
        .catch(console.error);
    }
  }, [currentIndex]);

  const handleAddTags = () => {
    if (!inputValue.trim()) return;
    const newTags = inputValue.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    setTags(prev => [...new Set([...prev, ...newTags])]);
    setInputValue('');
  };

  const advance = (nextConfirmed) => {
    if (isLast) {
      onConfirm(nextConfirmed);
    } else {
      setConfirmed(nextConfirmed);
      setCurrentIndex(i => i + 1);
    }
  };

  // Подтвердить текущий файл
  const handleImport = () => {
    advance([...confirmed, { path: currentPath, tags, batchName }]);
  };

  // Пропустить текущий файл
  const handleSkip = () => {
    if (isLast && confirmed.length === 0) {
      onClose();
    } else {
      advance(confirmed);
    }
  };

  // Импортировать все оставшиеся с авто-тегами
  const handleSkipAll = () => {
    const remaining = paths.slice(currentIndex).map(path => ({
      path,
      tags: getAutoTags(path),
      batchName: '',
    }));
    onConfirm([...confirmed, ...remaining]);
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>

        {/* ПРЕВЬЮ */}
        <div className="modal-preview-wrapper" style={{
          backgroundColor: previewCode ? '#1E1E1E' : 'rgba(0,0,0,0.3)',
          alignItems: previewCode ? 'flex-start' : 'center',
        }}>
          {previewUrl && <img src={previewUrl} alt="preview" className="modal-preview-img" />}
          {previewCode && (
            <SyntaxHighlighter
              language={getLanguage(previewExt)}
              style={vscDarkPlus}
              customStyle={{ margin: 0, padding: '15px', background: 'transparent', fontSize: '11px', width: '100%' }}
              wrapLongLines
            >
              {previewCode}
            </SyntaxHighlighter>
          )}
          {!previewUrl && !previewCode && <span className="no-tags">No preview available</span>}
        </div>

        {/* СЧЁТЧИК */}
        <div className="modal-header">
          importing {currentIndex + 1} of {paths.length}:
        </div>

        {/* БАТЧ-НЕЙМ */}
        <div className="tag-input-group">
          <input
            type="text"
            placeholder="batch rename (optional)..."
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
          />
        </div>

        {/* ТЕГИ */}
        <div className="tags-container">
          {tags.length === 0 && <span className="no-tags">No tags attached</span>}
          {tags.map((tag, index) => (
            <div key={index} className="tag-item">
              <span className="tag-text">{tag}</span>
              <button className="tag-remove-btn" onClick={() => setTags(tags.filter(t => t !== tag))}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="tag-input-group">
          <input
            type="text"
            placeholder="add tags (comma separated)..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTags()}
          />
          <button className="tag-add-btn" onClick={handleAddTags}><Plus size={18} /></button>
        </div>

        {/* КНОПКИ */}
        <div className="modal-actions">
          <button className="modal-btn" onClick={onClose}>Cancel</button>
          {paths.length > 1 && (
            <button className="modal-btn" onClick={handleSkipAll}>Skip All</button>
          )}
          <button className="modal-btn" onClick={handleSkip}>Skip</button>
          <button className="modal-btn confirm" onClick={handleImport}>Import</button>
        </div>

      </div>
    </div>
  );
}