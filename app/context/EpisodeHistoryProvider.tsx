// src/contexts/EpisodeContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';

// 1. Define the Episode type based on your table schema
export interface Episode {
  id: number;
  episode_id: string;
  title: string;
  series_id: string;
  image_url: string;
  created_at: string;       // ISO timestamp
   duration: number;         // in seconds
  saved_position: number;   // in seconds
  provider: string;
}

// 2. Define what data & actions the context will provide
interface EpisodeContextData {
  episodes2: Episode[];
  addEpisode: (episode: Episode) => void;
  updateEpisode: (id: number, updates: Partial<Episode>) => void;
  removeEpisode: (id: number) => void;
  clearAll: () => void;
}

// 3. Create the context with a default (will be overwritten by Provider)
const EpisodeContext = createContext<EpisodeContextData>({
  episodes2: [],
  addEpisode: () => {},
  updateEpisode: () => {},
  removeEpisode: () => {},
  clearAll: () => {},
});

// 4. Build the Provider component (renamed to EpisodeHistoryProvider)
export const EpisodeHistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [episodes2, setEpisodes] = useState<Episode[]>([]);

  const addEpisode = (episode: Episode) => {
    setEpisodes(prev => [...prev, episode]);
  };

  const updateEpisode = (id: number, updates: Partial<Episode>) => {
    setEpisodes(prev =>
      prev.map(ep => (ep.id === id ? { ...ep, ...updates } : ep))
    );
  };

  const removeEpisode = (id: number) => {
    setEpisodes(prev => prev.filter(ep => ep.id !== id));
  };

  const clearAll = () => {
    setEpisodes([]);
  };

  return (
    <EpisodeContext.Provider
      value={{ episodes2, addEpisode, updateEpisode, removeEpisode, clearAll }}
    >
      {children}
    </EpisodeContext.Provider>
  );
};

// 5. Custom hook for easy consumption
export const useEpisode = (): EpisodeContextData => {
  const context = useContext(EpisodeContext);
  if (!context) {
    throw new Error('useEpisode must be used within an EpisodeHistoryProvider');
  }
  return context;
};
