import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import './tagManager.css';

export default function TagManager({ data, onSave, onClose }) {
  // Локальный стейт тегов (чтобы видеть изменения до сохранения)
  const [tags, setTags] = useState(data.currentTags || []);
  const [inputValue, setInputValue] = useState('');

  // Удаление тега из локального списка
  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Добавление новых тегов (поддерживает ввод через запятую)
  const handleAddTags = () => {
    if (!inputValue.trim()) return;
    
    const newTags = inputValue
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    // Добавляем только уникальные
    const uniqueTags = [...new Set([...tags, ...newTags])];
    setTags(uniqueTags);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTags();
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="tag-manager-modal" onMouseDown={(e) => e.stopPropagation()}>
        
        <div className="tag-manager-header">
          <h3>Manage Tags</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="tags-container">
          {tags.length === 0 && <span className="no-tags">No tags attached</span>}
          {tags.map((tag, index) => (
            <div key={index} className="tag-item">
              <span className="tag-text">{tag}</span>
              <button className="tag-remove-btn" onClick={() => handleRemoveTag(tag)}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="tag-input-group">
          <input 
            type="text" 
            placeholder="Add new tags (comma separated)..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="tag-add-btn" onClick={handleAddTags}>
            <Plus size={18} />
          </button>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={() => onSave(data.id, tags)}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}