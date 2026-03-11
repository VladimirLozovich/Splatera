import { useState, useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { FolderSearch, Import, Minimize2, Maximize, CircleX } from 'lucide-react';
import Logo from './Logo';
import Input from './Input';
import ColorPicker from './ColorPicker';
import Button from './Button';
import Label from './Label';
import './header.css';
import SettingsMenu from './settingsMenu';
import FilterMenu from './filterMenu';
import SortMenu from './sortMenu';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

export default function Header({ 
  activeFilter,
  setActiveFilter, 
  sortOrder,
  setSortOrder, 
  searchQuery, 
  setSearchQuery, 
  selectedTags, 
  setSelectedTags,
  pickerColor,
  setPickerColor,   
  selectedColor,   
  clearColor,
  dateFilter,
  setDateFilter,
}) {  
  const headerRef = useRef(null);
  const styleTagRef = useRef(null);
  const appWindow = getCurrentWindow();

  const handleImport = async () => {
    const selected = await open({
      multiple: true,
      filters: [{
        name: 'Images',
        extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']
      }]
    });
  
    if (!selected) return; // пользователь закрыл диалог
  
    // open() возвращает строку если multiple: false, массив если multiple: true
    const filePaths = Array.isArray(selected) ? selected : [selected];
  
    window.dispatchEvent(new CustomEvent('import-files', { detail: { filePaths } }));
  };

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      const newTag = searchQuery.trim().toLowerCase();
      if (!selectedTags.includes(newTag)) {
        setSelectedTags([...selectedTags, newTag]);
      }
      setSearchQuery('');
    }

    if (e.key === 'Backspace' && searchQuery === '' && selectedTags.length > 0) {
      setSelectedTags(selectedTags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove) => {
    setSelectedTags(selectedTags.filter(t => t !== tagToRemove));
  };

  return (
    <header className="splatera-header" data-tauri-drag-region ref={headerRef}>
      
      <div className="header-logo">
        <Logo size={40}/>
      </div>

      <div className="header-main-controls">
        <div className="search-container">
          <Input 
            icon={FolderSearch}  
            type="text"
            placeholder="Type to ponder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            selectedTags={selectedTags}
            onRemoveTag={removeTag}
            // Плашка цвета — одна, если цвет выбран
            selectedColors={selectedColor ? [selectedColor] : []}            
            onRemoveColor={clearColor}
          />
        </div>

        <ColorPicker 
          color={pickerColor} 
          onChange={setPickerColor}
        />

        <Button 
          icon={Import} 
          text={<span className="import-text">Import a new file</span>} 
          onClick={(handleImport)} 
          className="import-btn"
        />
      </div>

      <div className="header-secondary-controls">
        <div className="suggested-tags">
          <span className="tags-label">Suggested tags:</span>
          
          <div onClick={() => setActiveFilter(activeFilter === 'png' ? null : 'png')}>
            <Label text="PNG" isActive={activeFilter === 'png'} />
          </div>
          
          <div onClick={() => setActiveFilter(activeFilter === 'svg' ? null : 'svg')}>
            <Label text="SVG" isActive={activeFilter === 'svg'} />
          </div>
          
          <div onClick={() => setActiveFilter(activeFilter === 'txt' ? null : 'txt')}>
            <Label text="Text" isActive={activeFilter === 'txt'} />
          </div>
          
          <div onClick={() => setActiveFilter(activeFilter === 'images' ? null : 'images')}>
            <Label text="Images" isActive={activeFilter === 'images'} />
          </div>
        </div>

        <div className="action-buttons">
          <SortMenu sortOrder={sortOrder} setSortOrder={setSortOrder} />
          <FilterMenu 
            pickerColor={pickerColor}
            setPickerColor={setPickerColor}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
          />
          <SettingsMenu/>
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