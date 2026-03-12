import { Copy, Maximize } from 'lucide-react';
import Button from './button';
import Label from './label';
import './CardPopup.css';

export default function CardPopup({ title, dateText, tags =[], onCopy, onMaximize }) {

  const visibleTags = tags.slice(0, 2);
  const hiddenTagsCount = tags.length - 2;

  return (
    <div className="splatera-card-popup">
      
      {/* Левая часть: Информация */}
      <div className="popup-info">
        <span className="popup-title">{title}</span>
        <span className="popup-date">{dateText}</span>
      </div>

      {/* Правая часть: Управление */}
      <div className="popup-actions">
        
        {visibleTags.map((tag, index) => (
          <Label key={index} text={tag} isActive={true} /> 
        ))}

        {hiddenTagsCount > 0 && (
          <Label text={`+${hiddenTagsCount}`} isActive={true} />
        )}

        <Button icon={Copy} onClick={onCopy} />
        <Button icon={Maximize} onClick={onMaximize} />
      </div>

    </div>
  );
}