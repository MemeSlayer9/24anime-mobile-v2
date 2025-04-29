import React, { createContext, useState, useContext } from "react";

interface EpisodeProviderProps {
  children: React.ReactNode;
}

interface EpisodeContextProps {
  animeId: string | null;
  setAnimeId: (id: string | null) => void;
    episodeid: string | null;
  setEpisodeid: (id: string | null) => void;
}

const EpisodeContext = createContext<EpisodeContextProps | undefined>(undefined);

export const EpisodeProvider: React.FC<EpisodeProviderProps> = ({ children }) => {
  const [animeId, setAnimeId] = useState<string | null>(null);
 
  const [episodeid, setEpisodeid] = useState<string | null>(null);
 
  return (
    <EpisodeContext.Provider value={{ animeId, setAnimeId, episodeid, setEpisodeid,   }}>
      {children}
    </EpisodeContext.Provider>
  );
};

export const useAnimeId = () => {
  const context = useContext(EpisodeContext);
  if (!context) {
    throw new Error("useEpisode must be used within an EpisodeProvider");
  }
  return context;
};
