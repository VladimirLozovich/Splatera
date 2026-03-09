import { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { Masonry } from 'masonic';

import './App.css';
import Header from './components/header';
import Card from './components/card';
import Notification from './components/notification';

function App() {
  const [images, setImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [notif, setNotif] = useState({ show: false, title: '', desc: '', progress: null });
  
  const notifTimeout = useRef(null); 
  const scrollTimeout = useRef(null);

  const showTemporaryNotif = (title, desc) => {
    if (notifTimeout.current) clearTimeout(notifTimeout.current);
    
    setNotif({ show: true, title, desc, progress: null });
    
    notifTimeout.current = setTimeout(() => {
      setNotif(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  useEffect(() => {
    console.log("App loaded. Listening to Tauri events...");

    const preventDefault = (e) => e.preventDefault();
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);

    const handleGlobalNotif = (e) => {
      const { title, desc } = e.detail;
      showTemporaryNotif(title, desc);
    };
    window.addEventListener('show-notification', handleGlobalNotif);

    const unlistenDragEnterPromise = listen('tauri://drag-enter', () => setIsDragging(true));
    const unlistenDragLeavePromise = listen('tauri://drag-leave', () => setIsDragging(false));

    const unlistenDropPromise = listen('tauri://drag-drop', async (event) => {
      setIsDragging(false);
      const filePaths = event.payload.paths;
      if (!filePaths || filePaths.length === 0) return;

      const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
      const newlyProcessedImages = [];
      
      const totalToProcess = filePaths.length;
      let processedCount = 0;

      setNotif({ 
        show: true, 
        title: 'Processing Assets', 
        desc: `Preparing 0 of ${totalToProcess}...`, 
        progress: 0 
      });

      for (const path of filePaths) {
        const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
        
        if (validExtensions.includes(ext)) {
          try {
            const assetInfo = await invoke('process_asset', { path });
            const previewUrl = assetInfo.preview_path 
              ? convertFileSrc(assetInfo.preview_path) 
              : ''; 

            newlyProcessedImages.push({
              id: assetInfo.id,
              name: path.split(/[/\\]/).pop(),
              path: assetInfo.original_path,
              preview: previewUrl, 
              tags: assetInfo.tags,
              kind: assetInfo.kind,
              width: assetInfo.width,
              height: assetInfo.height
            });

            processedCount++;
            setNotif(prev => ({
              ...prev,
              desc: `Preparing ${processedCount} of ${totalToProcess}...`,
              progress: (processedCount / totalToProcess) * 100
            }));

          } catch (error) {
            console.error("Error processing file:", path, error);
          }
        }
      }

      if (newlyProcessedImages.length > 0) {
        setImages(prev => {
          const existingPaths = new Set(prev.map(img => img.path));
          const uniqueNewImages = newlyProcessedImages.filter(img => !existingPaths.has(img.path));
          return [...prev, ...uniqueNewImages];
        });
      }

      showTemporaryNotif('Process Complete', `Successfully imported ${processedCount} files.`);
    });

    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
      window.removeEventListener('show-notification', handleGlobalNotif);
      
      unlistenDragEnterPromise.then(unlisten => unlisten());
      unlistenDragLeavePromise.then(unlisten => unlisten());
      unlistenDropPromise.then(unlisten => unlisten());
    };
  }, []);

  const handleScroll = () => {
    if (!isScrolling) setIsScrolling(true);

    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150); 
  };

  return (
    <div 
      className={`app-container ${isDragging ? 'dragging' : ''} ${isScrolling ? 'is-scrolling' : ''}`}
      onScroll={handleScroll}
    >
      <Header />

      <Notification 
        isVisible={notif.show} 
        title={notif.title} 
        description={notif.desc} 
        progress={notif.progress} 
      />
      
      <div className="content-container">
        {images.length === 0 ? (
          <div className="empty-state">
            <h2>Drop to stash</h2>
            <p>Перетащи сюда картинки</p>
          </div>
        ) : (
          <Masonry
            items={images}          
            render={Card}           
            columnGutter={20}       
            columnWidth={350}       
            overscanBy={3}          
          />
        )}
      </div>
    </div>
  );
}

export default App;