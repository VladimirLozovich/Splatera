import { useState, useEffect, useRef } from 'react';
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
  
  const headerRef = useRef(null);
  const styleTagRef = useRef(null);
  const appWindow = getCurrentWindow();

  useEffect(() => {
    if (!headerRef.current) return;

    const styleTag = document.createElement('style');
    document.head.appendChild(styleTag);
    styleTagRef.current = styleTag;

    const observer = new ResizeObserver(([entry]) => {
      const headerHeight = entry.borderBoxSize[0].blockSize;
      const totalOffset = headerHeight + 10; 

      styleTag.innerHTML = `
        ::-webkit-scrollbar-track {
          margin-top: ${totalOffset}px !important;
        }
      `;
    });

    observer.observe(headerRef.current);

    return () => {
      observer.disconnect();
      if (styleTagRef.current && styleTagRef.current.parentNode) {
        styleTagRef.current.parentNode.removeChild(styleTagRef.current);
      }
    };
  }, []);

  const handleTagClick = (tag) => {
    if (activeFilter === tag) {
      setActiveFilter(null);
    } else {
      setActiveFilter(tag);
    }
  };

  return (
    <header className="splatera-header" data-tauri-drag-region ref={headerRef}>
      
      <div className="header-logo">
        <Logo size={40}/>
      </div>

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
          text={<span className="import-text">Import a new file</span>} 
          onClick={() => console.log('Открываем диалог импорта (Tauri Dialog API)')} 
          className="import-btn"
        />
      </div>

      <div className="header-secondary-controls">
        <div className="suggested-tags">
          <span className="tags-label">Suggested tags:</span>
          
          <div onClick={() => handleTagClick('png')}>
            <Label text="PNG" isActive={activeFilter === 'png'} />
          </div>
          
          <div onClick={() => handleTagClick('svg')}>
            <Label text="SVG" isActive={activeFilter === 'svg'} />
          </div>
          
          <div onClick={() => handleTagClick('txt')}>
            <Label text="Text" isActive={activeFilter === 'txt'} />
          </div>
          
          <div onClick={() => handleTagClick('images')}>
            <Label text="Images" isActive={activeFilter === 'images'} />
          </div>

        </div>

        <div className="action-buttons">
          <Button icon={ArrowUpDown} text="Sort" />
          <Button icon={Filter} text="Filter" />
        </div>
      </div>

      <div className="window-controls">
        <Button icon={Minimize2} onClick={() => appWindow.minimize()} className="control-btn" />
        <Button icon={Maximize} onClick={() => appWindow.toggleMaximize()} className="control-btn" />
        <Button icon={CircleX} onClick={() => appWindow.close()} className="control-btn close-btn" />
      </div>

    </header>
  );
}