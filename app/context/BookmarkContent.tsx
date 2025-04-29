import React, { createContext, useState, useContext } from "react";

interface BookmarkProviderProps {
  children: React.ReactNode;
}

interface BookmarkContextProps {
  bookMarkId: number | null;
  setbookMarkId: (id: number | null) => void;
}
 
const BookmarkContext = createContext<BookmarkContextProps | undefined>(undefined);

export const BookmarkProvider: React.FC<BookmarkProviderProps> = ({ children }) => {
  const [bookMarkId, setbookMarkId] = useState<number | null>(null);

  return (
    <BookmarkContext.Provider value={{ bookMarkId, setbookMarkId }}>
      {children}
    </BookmarkContext.Provider>
  );
};

export const useBookMarkId = () => {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error("useBookMarkId must be used within a BookmarkProvider");
  }
  return context;
};
