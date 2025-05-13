import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ToastAndroid } from 'react-native';

// Define the shape of a downloaded file
export interface DownloadedFile {
  id: string;
  animeId: string | number;
  episodeId: string;
  episodeNumber: string | number;
  title: string;
  quality: string;
  fileUri: string;
  downloadDate: string;
  thumbnail: string;
  fileSize?: string;
}

interface DownloadContextType {
  downloads: DownloadedFile[];
  addDownload: (download: DownloadedFile) => Promise<void>;
  removeDownload: (id: string) => Promise<void>;
  isDownloaded: (episodeId: string) => boolean;
  getDownload: (episodeId: string) => DownloadedFile | undefined;
  clearAllDownloads: () => Promise<void>;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const useDownloads = () => {
  const context = useContext(DownloadContext);
  if (context === undefined) {
    throw new Error('useDownloads must be used within a DownloadProvider');
  }
  return context;
};

export const DownloadProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [downloads, setDownloads] = useState<DownloadedFile[]>([]);

  // Load downloads from storage on mount
  useEffect(() => {
    const loadDownloads = async () => {
      try {
        const savedDownloads = await AsyncStorage.getItem('downloads');
        if (savedDownloads) {
          setDownloads(JSON.parse(savedDownloads));
        }
      } catch (error) {
        console.error('Failed to load downloads from storage:', error);
        ToastAndroid.show('Failed to load downloads', ToastAndroid.SHORT);
      }
    };

    loadDownloads();
  }, []);

  // Save downloads to storage whenever they change
  useEffect(() => {
    const saveDownloads = async () => {
      try {
        await AsyncStorage.setItem('downloads', JSON.stringify(downloads));
      } catch (error) {
        console.error('Failed to save downloads to storage:', error);
      }
    };

    if (downloads.length > 0) {
      saveDownloads();
    }
  }, [downloads]);

  const addDownload = async (download: DownloadedFile) => {
    try {
      // Check if already exists
      const exists = downloads.some(d => d.episodeId === download.episodeId);
      if (exists) {
        // Update existing download
        setDownloads(prevDownloads => 
          prevDownloads.map(d => 
            d.episodeId === download.episodeId ? { ...d, ...download } : d
          )
        );
        ToastAndroid.show('Download updated', ToastAndroid.SHORT);
      } else {
        // Add new download
        setDownloads(prevDownloads => [...prevDownloads, download]);
        ToastAndroid.show('Download added', ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error('Failed to add download:', error);
      ToastAndroid.show('Failed to add download', ToastAndroid.SHORT);
    }
  };

  const removeDownload = async (id: string) => {
    try {
      setDownloads(prevDownloads => prevDownloads.filter(d => d.id !== id));
      ToastAndroid.show('Download removed', ToastAndroid.SHORT);
    } catch (error) {
      console.error('Failed to remove download:', error);
      ToastAndroid.show('Failed to remove download', ToastAndroid.SHORT);
    }
  };
  
  const isDownloaded = (episodeId: string) => {
    return downloads.some(d => d.episodeId === episodeId);
  };
  
  const getDownload = (episodeId: string) => {
    return downloads.find(d => d.episodeId === episodeId);
  };

  const clearAllDownloads = async () => {
    try {
      await AsyncStorage.removeItem('downloads');
      setDownloads([]);
      ToastAndroid.show('All downloads cleared', ToastAndroid.SHORT);
    } catch (error) {
      console.error('Failed to clear downloads:', error);
      ToastAndroid.show('Failed to clear downloads', ToastAndroid.SHORT);
    }
  };

  return (
    <DownloadContext.Provider 
      value={{ 
        downloads, 
        addDownload, 
        removeDownload, 
        isDownloaded,
        getDownload,
        clearAllDownloads 
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
};