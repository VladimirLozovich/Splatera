import { useRef, useEffect, useState } from 'react';
import './Input.css';

export default function Input({ 
  icon: Icon, 
  selectedTags = [], 
  selectedColors = [], 
  onRemoveTag, 
  onRemoveColor,
  ...props 
}) {
  const tagsRef = useRef(null);
  const [dynamicPadding, setDynamicPadding] = useState(12);

  // Динамически считаем отступ слева, чтобы каретка текста начиналась после тегов
  useEffect(() => {
    if (tagsRef.current) {
      const tagsWidth = tagsRef.current.offsetWidth;
      // Если теги есть, добавляем ширину контейнера + базовый отступ 12px
      setDynamicPadding(tagsWidth > 0 ? tagsWidth + 24 : 12); 
    }
  }, [selectedTags, selectedColors]);

  return (
    <div className="splatera-input-wrapper">
      {/* Контейнер с тегами (абсолютный) */}
      <div className="search-tags-container" ref={tagsRef}>
        
        {/* Выбранные цвета */}
        {selectedColors.map((color, idx) => (
          <div 
            key={`color-${idx}`} 
            className="input-tag-color" 
            style={{ backgroundColor: color }}
            onClick={() => onRemoveColor && onRemoveColor(color)}
            title="Убрать цвет"
          />
        ))}

        {/* Выбранные текстовые теги */}
        {selectedTags.map((tag, idx) => (
          <div key={`tag-${idx}`} className="input-tag-text">
            <span>{tag}</span>
            <button 
              type="button" 
              onClick={() => onRemoveTag && onRemoveTag(tag)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <input 
        className="splatera-input" 
        style={{ paddingLeft: `${dynamicPadding}px` }} 
        {...props} 
      />
      {Icon && <Icon size={16} className="input-icon" />}
    </div>
  );
}