import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

interface ProfileContextType {
  profile: any; // Update "any" to a more specific type if available
  setProfileImage: Dispatch<SetStateAction<any>>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ImageProviderProps {
  children: ReactNode;
}

export const ImageProvider: React.FC<ImageProviderProps> = ({ children }) => {
  const [profile, setProfileImage] = useState<any>(null);

  return (
    <ProfileContext.Provider value={{ profile, setProfileImage }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within an ImageProvider');
  }
  return context;
};
