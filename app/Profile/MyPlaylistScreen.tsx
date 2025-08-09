// MyPlaylist.tsx
import React, { useEffect, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Image,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBookMarkId } from "../context/BookmarkContent";
import { usePlaylist } from '../context/MyPlaylistProvider';
import { supabase } from '../supabase/supabaseClient';
import { Ionicons } from '@expo/vector-icons';

// Define your navigation types
type RootStackParamList = {
  Details: { id: string | number };
  // Add other screens as needed
};

// Create a properly typed navigation hook
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Details'>;

const MyPlaylist = () => {
  const navigation = useNavigation<NavigationProp>();
  // Retrieve both bookMarkId and setbookMarkId so we can reset the trigger.
  const { bookMarkId, setbookMarkId } = useBookMarkId();
  const { clearPlaylist: clearLocalPlaylist } = usePlaylist();

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userPlaylist, setUserPlaylist] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [episodeToDelete, setEpisodeToDelete] = useState<string | number | null>(null);

  // Helper function to clear local playlist state.
  const clearLocalStatePlaylist = () => {
    setUserPlaylist([]);
  };

  // Fetch user details from Supabase authentication session.
  const getUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    return data?.user;
  };

  // Fetch the user's playlist from Supabase.
  const fetchUserPlaylist = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user playlist:', error);
      } else {
        setUserPlaylist(data);
      }
    } catch (error) {
      console.error('Database error while fetching user playlist:', error);
    }
  };

  // Fetch user details and their playlists.
  const fetchUserAndPlaylist = async () => {
    const currentUser = await getUser();
    if (currentUser) {
      setUser(currentUser);
      await fetchUserPlaylist(currentUser.id);
    }
  };

  // Initial fetch when component mounts.
  useEffect(() => {
    fetchUserAndPlaylist();
  }, []);

  // Listen for authentication state changes.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearLocalStatePlaylist();
        setUser(null);
      } else if (event === 'SIGNED_IN') {
        fetchUserAndPlaylist();
      }
    });
    
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  // Fetch the episode details from the API using bookMarkId.
  const fetchDetail = async () => {
    try {
      if (!bookMarkId) return;
      const response = await axios.get(`https://api.amvstr.me/api/v2/info/${bookMarkId}`);
      setItem(response.data);
    } catch (error) {
      console.error('Failed to fetch episode details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookMarkId) {
      setLoading(true);
      fetchDetail();
    }
  }, [bookMarkId]);

  // Auto‑add effect: if item is fetched and user exists, add the episode.
  useEffect(() => {
    if (item && bookMarkId && user) {
      const newEpisode = {
        title: item.title?.userPreferred || item.title,
        id: item.id,
        image: item.coverImage?.large || '',
      };
      saveEpisodeToDatabase(newEpisode);
      setItem(null);
    }
  }, [item, bookMarkId, user]);

  // Clear all data locally, from Supabase, and reset context state including bookMarkId.
  const clearData = async () => {
    try {
      clearLocalStatePlaylist();
      clearLocalPlaylist();
      setItem(null);
      // Reset bookMarkId so that auto‑adding stops when you navigate back.
      setbookMarkId(null);

      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing playlist from Supabase:', error);
      } else {
        setUserPlaylist([]);
      }
    } catch (error) {
      console.error('Database error while clearing playlist:', error);
    }
  };

  // Delete a specific episode from the playlist and reset bookMarkId.
  const deleteEpisode = async (episodeId: string | number) => {
    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('user_id', user.id)
        .eq('episode_id', episodeId);

      if (error) {
        console.error('Error deleting episode:', error);
        return;
      }
      // Reset bookMarkId to prevent auto‑adding the same episode upon navigation.
      setbookMarkId(null);

      setUserPlaylist((prev) =>
        prev.filter(
          (episode) =>
            episode.episode_id !== episodeId && episode.id !== episodeId
        )
      );
      setShowModal(false);
    } catch (error) {
      console.error('Error during episode deletion:', error);
    }
  };

  // Open delete confirmation modal.
  const handleDeletePress = (episodeId: string | number) => {
    setEpisodeToDelete(episodeId);
    setShowModal(true);
  };

  // Close delete confirmation modal.
  const closeModal = () => {
    setShowModal(false);
  };

  // Save episode to Supabase and update local playlist.
  const saveEpisodeToDatabase = async (episode: { title: string; id: number | string; image: string }) => {
    try {
      if (!user) {
        console.error('No user is authenticated.');
        return;
      }
      // Check if the episode already exists.
      const { data: existingEpisodes, error: fetchError } = await supabase
        .from('playlists')
        .select('episode_id')
        .eq('user_id', user.id)
        .eq('episode_id', episode.id);

      if (fetchError) {
        console.error('Error checking for existing episode:', fetchError);
        return;
      }

      if (existingEpisodes && existingEpisodes.length > 0) {
        return;
      }

      const { error } = await supabase
        .from('playlists')
        .insert([
          {
            user_id: user.id,
            episode_id: episode.id,
            episode_title: episode.title,
            episode_image: episode.image,
          },
        ]);

      if (error) {
        console.error('Error adding episode to playlist:', error);
      } else {
        setUserPlaylist((prev) => [...prev, { ...episode, user_id: user.id }]);
      }
    } catch (error) {
      console.error('Database error while saving episode:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.paginationContainer}>
        <Text style={styles.title}>My Playlist</Text>
        <TouchableOpacity onPress={clearData}>
          <Text style={[styles.title, { width: 130 }]}>Clear Playlist</Text>
        </TouchableOpacity>
       
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {userPlaylist.length > 0 ? (
          userPlaylist
            .slice()
            .reverse()
            .map((episode, index) => (
              <View key={index} style={styles.itemContainer}>
                {episode.episode_id && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Details', { id: episode.episode_id })}
                    style={styles.rowContainer}
                  >
                    {episode.episode_image && (
                      <Image source={{ uri: episode.episode_image }} style={styles.episodeImage} />
                    )}
                    <View style={styles.episodeContainer}>
                      {episode.episode_title && (
                        <View style={styles.titleRow}>
                          <Text style={styles.episodeTitle} numberOfLines={1} ellipsizeMode="tail">
                            {episode.episode_title}
                          </Text>
                          <TouchableOpacity onPress={() => handleDeletePress(episode.episode_id)}>
                            <Ionicons name="ellipsis-vertical-outline" size={20} color="#FFF" style={styles.icon} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )}

                {episode.id && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Details', { id: episode.id })}
                    style={styles.rowContainer}
                  >
                    {episode.image && (
                      <Image source={{ uri: episode.image }} style={styles.episodeImage} />
                    )}
                    <View style={styles.episodeContainer}>
                      {episode.title && (
                        <View style={styles.titleRow}>
                          <Text style={styles.episodeTitle} numberOfLines={1} ellipsizeMode="tail">
                            {episode.title}
                          </Text>
                          <TouchableOpacity onPress={() => handleDeletePress(episode.id)}>
                            <Ionicons name="ellipsis-vertical-outline" size={20} color="#FFF" style={styles.icon} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            ))
        ) : (
          <Text style={styles.text}>No previous episodes selected.</Text>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="fade" transparent={true}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Delete from MyPlaylist</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this item from your playlist?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={closeModal} style={styles.cancelButton}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteEpisode(episodeToDelete!)} style={styles.deleteButton}>
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161616',
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  episodeImage: {
    width: 100,
    height: 140,
    resizeMode: 'cover',
    borderRadius: 8,
    marginRight: 10,
  },
  episodeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  episodeTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
    marginRight: 10,
  },
  icon: {
    padding: 5,
  },
  text: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    marginTop: 20,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#2C2C2C',
    padding: 20,
    borderRadius: 10,
    width: 300,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    color: '#FFF',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    backgroundColor: '#666',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#D9534F',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '500',
  },
});

export default MyPlaylist;