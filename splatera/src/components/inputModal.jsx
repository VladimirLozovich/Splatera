import { useState, useEffect } from 'react';
import Input from './input';
import Button from './button';
import './InputModal.css';

export default function InputModal({ title, defaultValue, onConfirm, onCancel }) {
  const [value, setValue] = useState(defaultValue || '');

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('modal-overlay')) onCancel();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">{title}</div>
        
        <Input 
          autoFocus 
          value={value} 
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onConfirm(value)}
        />

        <div className="modal-actions">
          <Button text="Cancel" onClick={onCancel} className="modal-btn" />
          <Button text="Confirm" onClick={() => onConfirm(value)} className="modal-btn" />
        </div>
      </div>
    </div>
  );
}