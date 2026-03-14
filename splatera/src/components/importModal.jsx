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

export default function ImportModal({ paths, onConfirm, onClose }) {
  const [tags, setTags] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [batchName, setBatchName] = useState('');
  
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewCode, setPreviewCode] = useState('');
  const [previewExt, setPreviewExt] = useState('');

  useEffect(() => {
    if (!paths?.length) return;
    const firstPath = paths[0];
    
    // Авто-тег из папки
    const pathParts = firstPath.split(/[/\\]/);
    if (pathParts.length > 1) {
      const folderName = pathParts[pathParts.length - 2].toLowerCase();
      setTags([folderName]);
    }

    // Определение типа превью
    const ext = firstPath.slice(firstPath.lastIndexOf('.')).toLowerCase();
    setPreviewExt(ext);

    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext)) {
      setPreviewUrl(convertFileSrc(firstPath));
      setPreviewCode('');
    } else if (['.txt', '.md', '.js', '.py', '.rs', '.css', '.html', '.json'].includes(ext)) {
      invoke('read_full_text_file', { path: firstPath })
        .then(text => {
          const snippet = text.split('\n').slice(0, 20).join('\n');
          setPreviewCode(snippet);
          setPreviewUrl('');
        })
        .catch(console.error);
    }
  }, [paths]);

  const handleAddTags = () => {
    if (!inputValue.trim()) return;
    const newTags = inputValue.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    setTags([...new Set([...tags, ...newTags])]);
    setInputValue('');
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
        
        {/* БЛОК ПРЕВЬЮ */}
        <div className="modal-preview-wrapper" style={{ 
            backgroundColor: previewCode ? '#1E1E1E' : 'rgba(0,0,0,0.3)',
            alignItems: previewCode ? 'flex-start' : 'center'
        }}>
          {previewUrl && <img src={previewUrl} alt="preview" className="modal-preview-img" />}
          {previewCode && (
            <SyntaxHighlighter
              language={getLanguage(previewExt)}
              style={vscDarkPlus}
              customStyle={{ margin: 0, padding: '15px', background: 'transparent', fontSize: '11px', width: '100%' }}
              wrapLongLines={true}
            >
              {previewCode}
            </SyntaxHighlighter>
          )}
          {!previewUrl && !previewCode && <span className="no-tags">No preview available</span>}
        </div>

        <div className="modal-header">
          importing {paths.length} {paths.length === 1 ? 'asset' : 'assets'}:
        </div>

        {/* ИНПУТ ДЛЯ БАТЧ-НЕЙМИНГА */}
        <div className="tag-input-group">
          <input 
            type="text" 
            placeholder="batch rename (optional)..." 
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
          />
        </div>

        <div className="tags-container">
          {tags.length === 0 && <span className="no-tags">No tags attached</span>}
          {tags.map((tag, index) => (
            <div key={index} className="tag-item">
              <span className="tag-text">{tag}</span>
              <button className="tag-remove-btn" onClick={() => setTags(tags.filter(t => t !== tag))}><X size={14} /></button>
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

        <div className="modal-actions">
          <button className="modal-btn" onClick={onClose}>Cancel</button>
          <button className="modal-btn confirm" onClick={() => onConfirm(paths, tags, batchName)}>
            Import
          </button>
        </div>
      </div>
    </div>
  );
}