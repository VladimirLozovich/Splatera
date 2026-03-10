import { useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { 
  FolderSearch, 
  Import, 
  ArrowUpDown, 
  Filter, 
  Minimize2, 
  Maximize, 
  CircleX 
} from 'lucide-react';

import Logo from './Logo';
import Input from './Input';
import ColorPicker from './ColorPicker';
import Button from './Button';
import Label from './Label';
import './header.css';

export default function Header({ activeFilter, setActiveFilter }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FFD16D');
  
  const appWindow = getCurrentWindow();

  const handleTagClick = (tag) => {
    if (activeFilter === tag) {
      setActiveFilter(null);
    } else {
      setActiveFilter(tag);
    }
  };

  return (
    <header className="splatera-header" data-tauri-drag-region>
      
      {/* 1. Логотип */}
      <div className="header-logo">
        <Logo size={40}/>
      </div>

      {/* 2. Основной блок: Поиск, Пикер, Импорт */}
      <div className="header-main-controls">
        <div className="search-container">
          <Input 
            placeholder="Type to ponder..." 
            icon={FolderSearch}
            value={searchQuery}
            // В будущем тут можно вызывать бэкенд для полнотекстового поиска
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <ColorPicker color={selectedColor} onChange={setSelectedColor} />
        
        <Button 
          icon={Import} 
          // Обернули текст, чтобы скрыть его через CSS на мобилках
          text={<span className="import-text">Import a new file</span>} 
          onClick={() => console.log('Открываем диалог импорта (Tauri Dialog API)')} 
          className="import-btn"
        />
      </div>

      {/* 3. Блок с тегами и фильтрами */}
      <div className="header-secondary-controls">
        <div className="suggested-tags">
          <span className="tags-label">Suggested tags:</span>
          
          {/* ИЗМЕНЕНО: Оживляем кнопки Label */}
          {/* Мы передаем функцию onClick и проверяем, совпадает ли тег с активным фильтром */}
          
          <div onClick={() => handleTagClick('png')}>
            <Label text="PNG" isActive={activeFilter === 'png'} />
          </div>
          
          <div onClick={() => handleTagClick('svg')}>
            <Label text="SVG" isActive={activeFilter === 'svg'} />
          </div>
          
          <div onClick={() => handleTagClick('txt')}>
            <Label text="Text" isActive={activeFilter === 'txt'} />
          </div>
          
          {/* Для "Images" мы можем пока не делать логику, или позже сделать фильтр по kind === 'Image' */}
          <div onClick={() => handleTagClick('images')}>
            <Label text="Images" isActive={activeFilter === 'images'} />
          </div>

        </div>

        <div className="action-buttons">
          <Button icon={ArrowUpDown} text="Sort" />
          <Button icon={Filter} text="Filter" />
        </div>
      </div>

      {/* 4. Кнопки управления окном */}
      <div className="window-controls">
        <Button icon={Minimize2} onClick={() => appWindow.minimize()} className="control-btn" />
        <Button icon={Maximize} onClick={() => appWindow.toggleMaximize()} className="control-btn" />
        <Button icon={CircleX} onClick={() => appWindow.close()} className="control-btn close-btn" />
      </div>

    </header>
  );
}