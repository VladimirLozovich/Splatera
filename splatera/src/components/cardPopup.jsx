import { Copy, Maximize } from 'lucide-react';
import Button from './button';
import Label from './label';
import './CardPopup.css';

export default function CardPopup({ title, dateText, tags =[], onCopy, onMaximize }) {
  return (
    <div className="splatera-card-popup">
      
      {/* Левая часть: Информация */}
      <div className="popup-info">
        <span className="popup-title">{title}</span>
        <span className="popup-date">{dateText}</span>
      </div>

      {/* Правая часть: Управление */}
      <div className="popup-actions">
        
        {tags.map((tag, index) => (
          <Label key={index} text={tag} isActive={true} /> 
        ))}

        <Button icon={Copy} onClick={onCopy} />
        <Button icon={Maximize} onClick={onMaximize} />
      </div>

    </div>
  );
}