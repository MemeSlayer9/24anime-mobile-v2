// MyPlaylistProvider.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useMyId } from './PlaylistProvider'; // Adjust the import based on your project structure

// Define the type for the playlist context
interface PlaylistContextType {
  playlist: any[];
  addEpisodeToPlaylist: (episode: any) => void;
  clearPlaylist: () => void;
}

// Create a context with an initial undefined value
const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

interface MyPlaylistProviderProps {
  children: ReactNode;
}

export const MyPlaylistProvider = ({ children }: MyPlaylistProviderProps) => {
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [item, setItem] = useState<any>(null);
  const { MyListID, setsMyListID } = useMyId(); // Ensure useMyId is defined and typed

  const addEpisodeToPlaylist = (episode: any) => {
    setPlaylist((prevPlaylist) => {
      // Check if the episode already exists
      const alreadyExists = prevPlaylist.some((e) => e.id === episode.id);
      if (!alreadyExists) {
        return [...prevPlaylist, episode];
      }
      return prevPlaylist;
    });
  };

  const clearPlaylist = () => {
    setPlaylist([]);
    setItem(null); // Reset item to avoid duplicate additions
    setsMyListID(null); // Reset the MyListID (or similar identifier) to ensure it can be reused
  };

  return (
    <PlaylistContext.Provider value={{ playlist, addEpisodeToPlaylist, clearPlaylist }}>
      {children}
    </PlaylistContext.Provider>
  );
};

export const usePlaylist = () => {
  const context = useContext(PlaylistContext);
  if (context === undefined) {
    throw new Error('usePlaylist must be used within a MyPlaylistProvider');
  }
  return context;
};
