import { useState, useEffect, useRef, useMemo } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Masonry } from 'masonic';
import { Import } from 'lucide-react';

import './App.css';
import Header from './components/header';
import Card from './components/card';
import Notification from './components/notification';
import Lightbox from './components/lightbox';
import InputModal from './components/inputModal';
import DropOverlay from './components/dropOverlay';
import TagManager from './components/tagManager';
import ImportModal from './components/importModal';

const formatTag = (tag) => {
  if (!tag) return '';
  const upperCaseTags = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'txt', 'md', 'json', 'html', 'css', 'js'];
  if (upperCaseTags.includes(tag.toLowerCase())) {
    return tag.toUpperCase();
  }
  return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
};

const mapAsset = (assetInfo) => ({
  id: assetInfo.id,
  name: assetInfo.metadata.file_name,
  path: assetInfo.original_path,
  preview: assetInfo.preview_path ? convertFileSrc(assetInfo.preview_path) : '',
  tags: (assetInfo.tags || []).map(formatTag),
  kind: assetInfo.kind,
  width: assetInfo.width,
  height: assetInfo.height,
  created_at: assetInfo.created_at,
  last_modified_os: assetInfo.metadata.last_modified_os,
  dominant_colors: assetInfo.dominant_colors ?? [],
  contentSnippet: assetInfo.content_snippet,
});

function App() {
  const [tagData, setTagData] = useState(null);
  const [images, setImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [notif, setNotif] = useState({ show: false, title: '', desc: '', progress: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [sortOrder, setSortOrder] = useState('date_desc');
  const [pickerColor, setPickerColor] = useState('#FFD16D');
  const [selectedColor, setSelectedColor] = useState(null);
  const [dateFilter, setDateFilter] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [renameData, setRenameData] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const notifTimeout = useRef(null);
  const scrollTimeout = useRef(null);

  const showTemporaryNotif = (title, desc) => {
    if (notifTimeout.current) clearTimeout(notifTimeout.current);
    setNotif({ show: true, title, desc, progress: null });
    notifTimeout.current = setTimeout(() => {
      setNotif(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Единая логика импорта
  const handleConfirmImport = async (paths, customTags, batchName) => {
    setPendingImport(null);
    const totalPaths = paths.length;
    let totalAssetsProcessed = 0;
  
    setNotif({ show: true, title: 'Processing Assets', desc: `Preparing...`, progress: 0 });
  
    for (let i = 0; i < totalPaths; i++) {
      const path = paths[i];
      try {
        const assets = await invoke('process_asset', { path });
        
        for (const assetInfo of assets) {
          totalAssetsProcessed++;

          if (customTags.length > 0) {
            const mergedTags = [...new Set([...assetInfo.tags, ...customTags])];
            await invoke('update_asset_tags', { id: assetInfo.id, tags: mergedTags });
          }
          
          if (batchName.trim()) {
            const needsNumber = totalPaths > 1 || assets.length > 1;
            const finalName = needsNumber ? `${batchName}_${totalAssetsProcessed}` : batchName;
            await invoke('rename_asset', { id: assetInfo.id, newName: finalName });
          }
        }
        
        setNotif(prev => ({
          ...prev,
          desc: `Processed ${i + 1} of ${totalPaths} entries...`,
          progress: ((i + 1) / totalPaths) * 100,
        }));
      } catch (err) {
        console.error("Error processing path:", path, err);
      }
    }
  
    setRefreshTrigger(prev => prev + 1); // Перезагружаем библиотеку
    showTemporaryNotif('Process Complete', `Successfully imported ${totalAssetsProcessed} files.`);
  };

  // Единая точка загрузки библиотеки из Rust
  const loadLibrary = async (tag) => {
    try {
      setImages([]);
      const assets = await invoke('get_library', { filterTag: tag });
      setImages(assets.map(mapAsset));
    } catch (error) {
      console.error("Ошибка при загрузке библиотеки:", error);
    }
  };

  // Перезагрузка при старте, смене фильтра или принудительном триггере
  useEffect(() => {
    loadLibrary(activeFilter);
  }, [activeFilter, refreshTrigger]);

  const confirmRename = async (newName) => {
    if (newName && newName !== renameData.name) {
      try {
        await invoke('rename_asset', { id: renameData.id, newName: newName });
        setRefreshTrigger(prev => prev + 1); 
      } catch (err) {
        console.error("Rename failed:", err);
      }
    }
    setRenameData(null);
  };

  const handleSaveTags = async (assetId, updatedTags) => {
    try {
      await invoke('update_asset_tags', { id: assetId, tags: updatedTags });
      setRefreshTrigger(prev => prev + 1);
      showTemporaryNotif('Tags Updated', 'Tags saved successfully.');
    } catch (err) {
      console.error('Failed to update tags:', err);
      showTemporaryNotif('Error', 'Failed to save tags.');
    }
    setTagData(null);
  };

  // ГЛОБАЛЬНЫЕ СЛУШАТЕЛИ СОБЫТИЙ
  useEffect(() => {
    console.log("App mounted. Registering listeners...");

    const preventDefault = (e) => e.preventDefault();
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);

    // Функции-обработчики кастомных событий окна
    const handleReload = () => {
      setRefreshTrigger(prev => prev + 1);
      showTemporaryNotif('Database Optimized', 'Library reloaded successfully.');
    };
    const handleRenameModal = (e) => setRenameData(e.detail);
    const handleTagModal = (e) => setTagData(e.detail);
    const handleOpenLightbox = (e) => setSelectedFile(e.detail);
    const handleGlobalNotif = (e) => showTemporaryNotif(e.detail.title, e.detail.desc);
    
    // Cлушатель импорта из кнопки
    const handleImportFiles = (e) => {
      const { filePaths } = e.detail;
      if (filePaths?.length) {
        setPendingImport(filePaths);
      }
    };

    window.addEventListener('reload-library', handleReload);
    window.addEventListener('open-rename-modal', handleRenameModal);
    window.addEventListener('open-tag-modal', handleTagModal);
    window.addEventListener('open-lightbox', handleOpenLightbox);
    window.addEventListener('show-notification', handleGlobalNotif);
    window.addEventListener('import-files', handleImportFiles);

    // Tauri D&D Events
    const unlistenDragEnterPromise = listen('tauri://drag-enter', () => setIsDragging(true));
    const unlistenDragLeavePromise = listen('tauri://drag-leave', () => setIsDragging(false));
    const unlistenDropPromise = listen('tauri://drag-drop', (event) => {
      setIsDragging(false);
      const filePaths = event.payload.paths;
      if (filePaths?.length) {
        setPendingImport(filePaths);
      }
    });

    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
      window.removeEventListener('reload-library', handleReload);
      window.removeEventListener('open-rename-modal', handleRenameModal);
      window.removeEventListener('open-tag-modal', handleTagModal);
      window.removeEventListener('open-lightbox', handleOpenLightbox);
      window.removeEventListener('show-notification', handleGlobalNotif);
      window.removeEventListener('import-files', handleImportFiles);

      unlistenDragEnterPromise.then(u => u());
      unlistenDragLeavePromise.then(u => u());
      unlistenDropPromise.then(u => u());
    };
  }, []);


  const colorDistance = (hex1, hex2) => {
    const parse = h => [
      parseInt(h.slice(1, 3), 16),
      parseInt(h.slice(3, 5), 16),
      parseInt(h.slice(5, 7), 16),
    ];
    const [r1, g1, b1] = parse(hex1);
    const [r2, g2, b2] = parse(hex2);
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  };

  const displayedImages = useMemo(() => {
    return images
      .filter(img => img && typeof img === 'object' && img.id)
      .filter(img => {
        const matchesQuery = !searchQuery ||
          img.name?.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          img.tags?.some(tag => tag.toLowerCase().includes(searchQuery.trim().toLowerCase()));

        const matchesTags = !selectedTags?.length ||
          selectedTags.every(selected =>
            img.tags?.some(tag => tag.toLowerCase() === selected.toLowerCase())
          );

        const matchesColors = !selectedColor ||
          img.dominant_colors.some(imgColor =>
            colorDistance(selectedColor, imgColor) < 60
          );

        const matchesDate = !dateFilter || (() => {
          const date = new Date(img.last_modified_os * 1000);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}.${month}.${year}`.includes(dateFilter);
        })();

        return matchesQuery && matchesTags && matchesColors && matchesDate;
      })
      .sort((a, b) => {
        switch (sortOrder) {
          case 'name_asc':  return a.name.localeCompare(b.name);
          case 'name_desc': return b.name.localeCompare(a.name);
          case 'date_desc': return b.created_at - a.created_at;
          case 'date_asc':  return a.created_at - b.created_at;
          default: return 0;
        }
      });
  }, [images, searchQuery, selectedTags, selectedColor, dateFilter, sortOrder]);

  const handleScroll = () => {
    if (!isScrolling) setIsScrolling(true);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => setIsScrolling(false), 150);
  };

  const handlePickerChange = (color) => {
    setPickerColor(color);
    setSelectedColor(color);
  };

  return (
    <div
      className={`app-container ${isDragging ? 'dragging' : ''} ${isScrolling ? 'is-scrolling' : ''}`}
      onScroll={handleScroll}
    >
      <Header
        selectedColor={selectedColor}
        clearColor={() => setSelectedColor(null)}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        pickerColor={pickerColor}
        setPickerColor={handlePickerChange}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
      />

      <Notification
        isVisible={notif.show}
        title={notif.title}
        description={notif.desc}
        progress={notif.progress}
      />

      <div className="content-container">
        {displayedImages.length === 0 ? (
          <div className="empty-state">
            <h2>Drop to stash</h2>
            <p>Перетащи сюда картинки</p>
          </div>
        ) : (
          <Masonry
            key={searchQuery + selectedTags.join(',') + (selectedColor ?? '') + sortOrder + dateFilter}
            itemKey={(data, index) => data?.id ?? `fallback-${index}`}
            items={displayedImages}
            render={Card}
            columnGutter={15}
            columnWidth={350}
            overscanBy={3}
          />
        )}
      </div>

      {renameData && (
        <InputModal 
          title="Enter new display name:"
          data={renameData}
          onConfirm={confirmRename}
          onCancel={() => setRenameData(null)}
        />
      )}

      {tagData && (
        <TagManager
          data={tagData}
          onSave={handleSaveTags}
          onClose={() => setTagData(null)}
        />
      )}

      {isDragging && <DropOverlay />}
      
      {selectedFile && <Lightbox file={selectedFile} onClose={() => setSelectedFile(null)} />}
      
      {pendingImport && (
        <ImportModal 
          paths={pendingImport} 
          onConfirm={handleConfirmImport} 
          onClose={() => setPendingImport(null)} 
        />
      )}
    </div>
  );
}

export default App;