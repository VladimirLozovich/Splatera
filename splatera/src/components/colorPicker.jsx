import { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import Input from './input';
import './colorPicker.css';

export default function ColorPicker({ color, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef();

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="color-picker-wrapper" style={{ position: 'relative' }} ref={popoverRef}>
      
      {/* Круглый триггер (Кнопка) */}
      <div 
        className="color-picker-trigger"
        style={{ backgroundColor: color }}
        onClick={() => setIsOpen(!isOpen)}
      />

      {/* Попап с выбором цвета */}
      {isOpen && (
        <div className="color-picker-popover">
          <div className="picker-label">Filter by Color</div>
          
          {/* Инпут HEX кода */}
          <Input 
            value={color} 
            onChange={(e) => onChange(e.target.value)} 
            placeholder="#HEX..."
          />
          
          {/* Сам пикер из библиотеки */}
          <HexColorPicker color={color} onChange={onChange} />
        </div>
      )}
    </div>
  );
}