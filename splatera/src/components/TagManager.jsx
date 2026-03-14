import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import './tagManager.css';

export default function TagManager({ data, onSave, onClose }) {
  const [tags, setTags] = useState(data.currentTags || []);
  const [inputValue, setInputValue] = useState('');

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleAddTags = () => {
    if (!inputValue.trim()) return;
    
    const newTags = inputValue
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

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
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
        
        <div className="modal-header">
          manage tags:
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
            placeholder="new tags (comma separated)..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="tag-add-btn" onClick={handleAddTags}>
            <Plus size={18} />
          </button>
        </div>

        <div className="modal-actions">
          <button className="modal-btn" onClick={onClose}>Cancel</button>
          <button className="modal-btn confirm" onClick={() => onSave(data.id, tags)}>Confirm</button>
        </div>

      </div>
    </div>
  );
}