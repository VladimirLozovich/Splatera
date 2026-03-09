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

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FFD16D');
  
  const appWindow = getCurrentWindow();

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
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <ColorPicker color={selectedColor} onChange={setSelectedColor} />
        
        <Button 
          icon={Import} 
          // Обернули текст, чтобы скрыть его через CSS на мобилках
          text={<span className="import-text">Import a new file</span>} 
          onClick={() => console.log('Открываем диалог импорта')} 
          className="import-btn"
        />
      </div>

      {/* 3. Блок с тегами и фильтрами (будет скрыт на узких экранах) */}
      <div className="header-secondary-controls">
        <div className="suggested-tags">
          <span className="tags-label">Suggested tags:</span>
          <Label text="PNG" isActive={true} />
          <Label text="SVG" isActive={false} />
          <Label text="Text" isActive={false} />
          <Label text="Images" isActive={true} />
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