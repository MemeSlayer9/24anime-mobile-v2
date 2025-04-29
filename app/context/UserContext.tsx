import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define shape of your user
export type User = {
  id: string;
  username: string;
  profileImage: string;
  created_at: string;
};

// Context payload
type UserContextProps = {
  user: User | null;
  setUser: (user: User | null) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
};

export const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load stored user on mount
  useEffect(() => {
    const restoreUser = async () => {
      try {
        const json = await AsyncStorage.getItem('@user');
        if (json) {
          setUserState(JSON.parse(json));
        }
      } catch (e) {
        console.error('Failed to load user from storage', e);
      } finally {
        setLoading(false);
      }
    };
    restoreUser();
  }, []);

  // Wrapper to update state and AsyncStorage
  const setUser = async (userData: User | null) => {
    try {
      setUserState(userData);
      if (userData) {
        await AsyncStorage.setItem('@user', JSON.stringify(userData));
      } else {
        await AsyncStorage.removeItem('@user');
      }
    } catch (e) {
      console.error('Failed to persist user', e);
    }
  };

  // Supabase logout + clear storage
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Supabase sign out error', error);
      throw error;
    }
    await setUser(null);
  };

  // While loading, don't render children to avoid flicker
  if (loading) {
    return null;
  }

  return (
    <UserContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </UserContext.Provider>
  );
};

// Hook for consuming context
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
