import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the type for your context
interface MyListIDContextType {
  MyListID: number | null;
  setsMyListID: React.Dispatch<React.SetStateAction<number | null>>;
}

// Create the context with an initial value of undefined
const MyListIDContext = createContext<MyListIDContextType | undefined>(undefined);

interface PlaylistProviderProps {
  children: ReactNode;
}

export const PlaylistProvider = ({ children }: PlaylistProviderProps) => {
  const [MyListID, setsMyListID] = useState<number | null>(null);

  return (
    <MyListIDContext.Provider value={{ MyListID, setsMyListID }}>
      {children}
    </MyListIDContext.Provider>
  );
};

// Custom hook for consuming the context
export const useMyId = (): MyListIDContextType => {
  const context = useContext(MyListIDContext);
  if (!context) {
    throw new Error('useMyId must be used within a PlaylistProvider');
  }
  return context;
};
