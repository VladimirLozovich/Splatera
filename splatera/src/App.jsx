import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import Masonry from 'react-masonry-css';
import './App.css';

function App() {
  const[images, setImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    console.log("Приложение загружено. Слушаем события Tauri...");

    // Блокируем нативный браузерный D&D
    const preventDefault = (e) => e.preventDefault();
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);

    const unlistenDragEnterPromise = listen('tauri://drag-enter', () => {
      setIsDragging(true);
    });

    const unlistenDragLeavePromise = listen('tauri://drag-leave', () => {
      setIsDragging(false);
    });

    const unlistenDropPromise = listen('tauri://drag-drop', async (event) => {
      setIsDragging(false);
      
      const filePaths = event.payload.paths;
      if (!filePaths || filePaths.length === 0) return;

      const validExtensions =['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
      
      for (const path of filePaths) {
        const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
        
        if (validExtensions.includes(ext)) {
          try {
            const bytes = await invoke('read_file_bytes', { path });
            
            const blob = new Blob([new Uint8Array(bytes)], { type: `image/${ext.replace('.', '')}` });
            const previewUrl = URL.createObjectURL(blob);
            const fileName = path.split(/[/\\]/).pop();

            setImages(prev => {
              if (prev.some(img => img.path === path)) {
                console.log(`Файл ${fileName} уже есть в сетке, пропускаем.`);
                return prev;
              }
              return[...prev, {
                id: Math.random().toString(36).substring(7),
                name: fileName,
                path: path,
                preview: previewUrl
              }];
            });

          } catch (error) {
            console.error("Ошибка при чтении файла:", path, error);
          }
        }
      }
    });

    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
      
      unlistenDragEnterPromise.then(unlisten => unlisten());
      unlistenDragLeavePromise.then(unlisten => unlisten());
      unlistenDropPromise.then(unlisten => unlisten());
    };
  },[]);

  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1
  };

  return (
    <div className={`app-container ${isDragging ? 'dragging' : ''}`}>
      {images.length === 0 ? (
        <div className="empty-state">
          <h2>Drop to stash</h2>
          <p>Перетащи сюда картинки</p>
        </div>
      ) : (
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="my-masonry-grid"
          columnClassName="my-masonry-grid_column"
        >
          {images.map(img => (
            <div key={img.id} className="card">
              <img src={img.preview} alt={img.name} />
              <div className="card-overlay">
                <span>{img.name}</span>
              </div>
            </div>
          ))}
        </Masonry>
      )}
    </div>
  );
}

export default App;