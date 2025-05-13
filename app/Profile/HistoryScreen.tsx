import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  Alert,
  AppState,
} from 'react-native';
import { useEpisode, Episode } from '../context/EpisodeHistoryProvider';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../Types/types';
import { Feather } from '@expo/vector-icons';
import { useAnimeId } from "../context/EpisodeContext";
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../supabase/supabaseClient';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

type HistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'History'>;

type Props = {
  navigation: HistoryScreenNavigationProp;
};

const HistoryScreen = ({ navigation }) => {
  const { episodes2, removeEpisode, clearAll, addEpisode } = useEpisode(); // Added addEpisode here
  const { episodeid, animeId, setAnimeId, setEpisodeid } = useAnimeId();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [episodeToDelete, setEpisodeToDelete] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [syncedEpisodes, setSyncedEpisodes] = useState<Set<string>>(new Set());
  const [appState, setAppState] = useState(AppState.currentState);

  // Initialize display order with the most recent unique episode entries
  const [displayOrder, setDisplayOrder] = useState<Episode[]>([]);
  
  // Track clicked episodes and their order
  const [clickedOrder, setClickedOrder] = useState<string[]>([]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
        // Re-fetch data when app comes to foreground
        if (userId) {
          fetchSupabaseHistory();
        }
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState, userId]);

  // Get current user on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        return;
      }
      
      if (data?.session?.user?.id) {
        setUserId(data.session.user.id);
        console.log('User ID set:', data.session.user.id);
      } else {
        console.log('No user is logged in');
      }
    };

    getCurrentUser();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.id) {
          setUserId(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUserId(null);
          setSyncedEpisodes(new Set());
        }
      }
    );

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Function to sync an episode to Supabase
  const syncEpisodeToSupabase = async (episode: Episode) => {
    if (!userId) {
      console.log('Cannot sync to Supabase: No user logged in');
      return;
    }

    try {
      const { data: existingRecords, error: fetchError } = await supabase
        .from('episode_history')
        .select('*')
        .eq('user_id', userId)
        .eq('episode_id', episode.episode_id);

      if (fetchError) {
        console.error('Error fetching episode history:', fetchError);
        return;
      }

      if (existingRecords && existingRecords.length > 0) {
        if (existingRecords.length > 1) {
          console.log(`Found ${existingRecords.length} duplicate entries for episode ${episode.episode_id}. Cleaning up...`);
          
          const sortedRecords = [...existingRecords].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          const newestRecord = sortedRecords[0];
          
          for (let i = 1; i < sortedRecords.length; i++) {
            const { error: deleteError } = await supabase
              .from('episode_history')
              .delete()
              .eq('id', sortedRecords[i].id);
              
            if (deleteError) {
              console.error(`Error deleting duplicate record ${sortedRecords[i].id}:`, deleteError);
            }
          }
          
          const { error } = await supabase
            .from('episode_history')
            .update({
              saved_position: episode.saved_position,
              duration: episode.duration,
              created_at: new Date().toISOString(),
            })
            .eq('id', newestRecord.id);

          if (error) {
            console.error('Error updating episode in Supabase:', error);
          } else {
            console.log(`Updated episode ${episode.episode_id} in Supabase and cleaned up ${existingRecords.length - 1} duplicates`);
            setSyncedEpisodes(prev => new Set(prev).add(episode.episode_id));
          }
        } else {
          const { error } = await supabase
            .from('episode_history')
            .update({
              saved_position: episode.saved_position,
              duration: episode.duration,
              created_at: new Date().toISOString(),
            })
            .eq('id', existingRecords[0].id);

          if (error) {
            console.error('Error updating episode in Supabase:', error);
          } else {
            console.log(`Updated episode ${episode.episode_id} in Supabase`);
            setSyncedEpisodes(prev => new Set(prev).add(episode.episode_id));
          }
        }
      } else {
        const { error } = await supabase
          .from('episode_history')
          .insert({
            episode_id: episode.episode_id,
            title: episode.title || `Episode ${episode.episode_id}`,
            series_id: episode.series_id,
            image_url: episode.image_url,
            created_at: new Date().toISOString(),
            user_id: userId,
            duration: episode.duration,
            saved_position: episode.saved_position,
            provider: episode.provider
          });

        if (error) {
          console.error('Error inserting episode to Supabase:', error);
        } else {
          console.log(`Added episode ${episode.episode_id} to Supabase`);
          setSyncedEpisodes(prev => new Set(prev).add(episode.episode_id));
        }
      }
    } catch (err) {
      console.error('Unexpected error syncing with Supabase:', err);
    }
  };

  // Function to delete episode from Supabase
  const deleteEpisodeFromSupabase = async (episode: Episode) => {
    if (!userId) {
      console.log('Cannot delete from Supabase: No user logged in');
      return;
    }

    try {
      const { error } = await supabase
        .from('episode_history')
        .delete()
        .eq('user_id', userId)
        .eq('episode_id', episode.episode_id);

      if (error) {
        console.error('Error deleting episode from Supabase:', error);
      } else {
        console.log(`Deleted episode ${episode.episode_id} from Supabase`);
        setSyncedEpisodes(prev => {
          const newSet = new Set(prev);
          newSet.delete(episode.episode_id);
          return newSet;
        });
      }
    } catch (err) {
      console.error('Unexpected error deleting from Supabase:', err);
    }
  };

  // Function to clear all history from Supabase
  const clearAllFromSupabase = async () => {
    if (!userId) {
      console.log('Cannot clear history from Supabase: No user logged in');
      return;
    }

    try {
      const { error } = await supabase
        .from('episode_history')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error clearing history from Supabase:', error);
      } else {
        console.log('Cleared all episode history from Supabase');
        setSyncedEpisodes(new Set());
      }
    } catch (err) {
      console.error('Unexpected error clearing history from Supabase:', err);
    }
  };

  // Fetch episodes from Supabase on initial load and import them to local storage
  const fetchSupabaseHistory = async () => {
    if (!userId) {
      console.log('Cannot fetch from Supabase: No user logged in');
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('episode_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching history from Supabase:', error);
      } else if (data && data.length > 0) {
        console.log(`Fetched ${data.length} episodes from Supabase`);
        
        // Record these as already synced
        const episodeIds = data.map(item => item.episode_id);
        setSyncedEpisodes(new Set(episodeIds));
        
        // Create a map of existing local episodes by episode_id for quick lookup
        const localEpisodesMap = new Map();
        episodes2.forEach(ep => {
          localEpisodesMap.set(ep.episode_id, ep);
        });
        
        // Import Supabase episodes into local storage if they don't exist locally
        // or if the Supabase version is newer
        let updatedLocalStorage = false;
        
        data.forEach(supabaseEp => {
          const localEp = localEpisodesMap.get(supabaseEp.episode_id);
          
          // If the episode doesn't exist locally or Supabase version is newer
          if (!localEp || new Date(supabaseEp.created_at) > new Date(localEp.created_at || '')) {
            // Convert Supabase episode to local Episode format
            const episode: Episode = {
              id: Date.now() + Math.random(), // Generate a unique ID for the local episode
              episode_id: supabaseEp.episode_id,
              series_id: supabaseEp.series_id,
              title: supabaseEp.title,
              image_url: supabaseEp.image_url,
              duration: supabaseEp.duration || 0,
              saved_position: supabaseEp.saved_position || 0,
              created_at: supabaseEp.created_at,
              provider: supabaseEp.provider || 'Unknown'
            };
            
            // Add to local episodes
            addEpisode(episode);
            updatedLocalStorage = true;
            console.log(`Imported episode ${episode.episode_id} from Supabase to local storage`);
          }
        });
        
        if (updatedLocalStorage) {
          // If we updated the local storage, process episodes again
          processEpisodes();
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to sync only episodes that haven't been synced yet
  const syncLocalEpisodesToSupabase = useCallback(() => {
    if (!userId || episodes2.length === 0) return;
    
    const episodesToSync = episodes2.filter(ep => !syncedEpisodes.has(ep.episode_id));
    console.log(`Found ${episodesToSync.length} episodes to sync to Supabase`);
    
    episodesToSync.forEach(episode => {
      syncEpisodeToSupabase(episode);
    });
  }, [userId, episodes2, syncedEpisodes]);

  // Function to process episodes and update display order
  const processEpisodes = useCallback(() => {
    console.log(`Processing ${episodes2.length} episodes for display...`);
    
    // Get unique episodes by keeping the most recent entry for each episode_id
    const map = new Map<string, Episode>();
    
    // Iterate through episodes in reverse order to prioritize newer entries
    [...episodes2].reverse().forEach(ep => {
      // This will ensure map contains the most recent episode for each episode_id
      map.set(ep.episode_id, ep);
    });
    
    // Convert to array and reverse back to have newest at the top
    const uniqueEpisodes = Array.from(map.values());
    
    // Sort by timestamp or ID in descending order (newest first)
    const sorted = [...uniqueEpisodes].sort((a, b) => {
      // This will put newest episodes (higher IDs) at the top
      return b.id - a.id;
    });
    
    // Then reorder based on clicked history (most recently clicked at top)
    if (clickedOrder.length > 0) {
      // Sort by click history (most recent first)
      sorted.sort((a, b) => {
        const aIndex = clickedOrder.indexOf(a.episode_id);
        const bIndex = clickedOrder.indexOf(b.episode_id);
        
        // If both items have been clicked
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex; // Lower index (more recent click) comes first
        }
        
        // If only one has been clicked, it comes first
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        // Neither has been clicked, maintain original order
        return 0;
      });
    }
    
    console.log(`Setting display order with ${sorted.length} episodes`);
    setDisplayOrder(sorted);
  }, [episodes2, clickedOrder]);

  // Initial load
  useEffect(() => {
    processEpisodes();
  }, [processEpisodes]);

  // When user ID changes, fetch from Supabase
  useEffect(() => {
    if (userId) {
      fetchSupabaseHistory();
    }
  }, [userId]);

  // When episodes2 changes, update display
  useEffect(() => {
    processEpisodes();
  }, [episodes2, processEpisodes]);

  // Sync local episodes to Supabase only after we know which ones are already synced
  useEffect(() => {
    if (syncedEpisodes.size > 0 || userId) {
      syncLocalEpisodesToSupabase();
    }
  }, [syncLocalEpisodesToSupabase, syncedEpisodes.size, userId]);

  // Auto refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Screen came into focus, refreshing...');
      processEpisodes();
      if (userId) {
        fetchSupabaseHistory(); // Changed to always fetch when focusing
      }
      return () => {}; // Cleanup function
    }, [processEpisodes, userId])
  );

  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    processEpisodes();
    if (userId) {
      fetchSupabaseHistory();
    }
    setTimeout(() => setRefreshing(false), 1000); // Add a small delay for better UX
  }, [processEpisodes, userId]);

  // Handle episode click
  const handleEpisodeClick = (episode: Episode) => {
    // Update clicked order by moving this episode to the front
    setClickedOrder(prev => {
      const newOrder = prev.filter(id => id !== episode.episode_id);
      return [episode.episode_id, ...newOrder];
    });
    
    // Update context
    setAnimeId(episode.series_id);
    setEpisodeid(episode.episode_id);
    
    // Sync to Supabase that this episode was clicked
    if (userId) {
      syncEpisodeToSupabase({
        ...episode,
        created_at: new Date().toISOString() // Update timestamp to mark as most recently clicked
      });
    }
    
    // Navigate based on provider
    switch(episode.provider) {
      case 'Zoro':
        navigation.navigate('Zoro', { episodeId: episode.episode_id });
        break;
      case 'Animepahe':
        navigation.navigate('Animepahe', { episodeId: episode.episode_id });
        break;
      case 'Animemaster':
        navigation.navigate('Animemaster', { episodeId: episode.episode_id });
        break;
      case 'Animekai':
        navigation.navigate('Animekai', { episodeId: episode.episode_id });
        break;
      default:
        // Fallback to Zoro if provider is unknown
        console.log(`Unknown provider: ${episode.provider || 'not specified'}, defaulting to Zoro`);
        navigation.navigate('Zoro', { episodeId: episode.episode_id });
    }
  };

  // Function to delete episode after confirmation
  const deleteEpisode = async (episode: Episode) => {
    console.log(`Removing episode with provider: ${episode.provider}`);
    
    // Delete from local
    removeEpisode(episode.id);
    
    // Delete from Supabase if user is logged in
    if (userId) {
      await deleteEpisodeFromSupabase(episode);
    }
    
    // Also remove from clicked order if present
    setClickedOrder(prev => prev.filter(id => id !== episode.episode_id));
    
    // Refresh the display after removing an episode
    processEpisodes();
    setModalVisible(false);
    setEpisodeToDelete(null);
  };

  // Function to show delete confirmation modal
  const showDeleteModal = (episode: Episode) => {
    setEpisodeToDelete(episode);
    setModalVisible(true);
  };

  // Function to clear history
  const handleClearHistory = async () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to clear all watch history? This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Clear All", 
          style: "destructive",
          onPress: async () => {
            console.log('Clearing all episode history');
            
            // Clear local history
            clearAll();
            
            // Clear Supabase history if user is logged in
            if (userId) {
              await clearAllFromSupabase();
            }
            
            setDisplayOrder([]);
            setClickedOrder([]);
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Episode }) => {
    const pct =
      item.duration > 0
        ? Math.min(1, item.saved_position / item.duration)
        : 0;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.card}
        onPress={() => handleEpisodeClick(item)}
      >
        <ImageBackground
          source={{ uri: item.image_url! }}
          style={styles.thumb}
          imageStyle={styles.thumbImage}
        >
          <View style={styles.playIcon}>
            <Feather name="play-circle" size={40} color="#fff" />
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { flex: pct }]} />
            <View style={{ flex: 1 - pct }} />
          </View>
        </ImageBackground>

        <View style={styles.detailRow}>
          <View style={styles.textGroup}>
            <Text style={styles.title}>
              {item.title || `Ep ${item.series_id}`}
            </Text>
            <Text style={styles.subtitle}>
              {item.provider || 'Unknown provider'}
            </Text>
          </View>
          <Text style={styles.timeText}>
            {formatTime(item.saved_position)} / {formatTime(item.duration)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => showDeleteModal(item)}
        >
          <Feather name="more-vertical" size={20} color="#888" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Delete Confirmation Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Delete from MyPlaylist</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this item from your playlist?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)} 
                style={styles.cancelButton}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => deleteEpisode(episodeToDelete!)} 
                style={styles.deleteButton}
              >
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header with title and clear button */}
      <View style={styles.paginationContainer}>
        <Text style={styles.title}>Watch History</Text>
        {displayOrder.length > 0 && (
          <TouchableOpacity onPress={handleClearHistory}>
            <Text style={[styles.title, { width: 130 }]}>Clear History</Text>
          </TouchableOpacity>
        )}
      </View>

      {!userId && (
        <View style={styles.loginPrompt}>
          <Text style={styles.loginText}>Sign in to sync your watch history across devices</Text>
        </View>
      )}

      {displayOrder.length === 0 ? (
        <View style={styles.empty}>
          {loading ? (
            <Text style={styles.emptyText}>Loading history...</Text>
          ) : (
            <Text style={styles.emptyText}>No history yet</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={displayOrder}
          keyExtractor={item => item.episode_id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#e50914']}
              tintColor="#e50914"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#161616",
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: 180,
    justifyContent: 'flex-end',
  },
  thumbImage: { resizeMode: 'cover' },
  playIcon: {
    position: 'absolute',
    top: '40%',
    left: '42%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    height: 4,
    flexDirection: 'row',
    backgroundColor: '#444',
  },
  progressFill: {
    backgroundColor: '#e50914',
  },
  detailRow: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  textGroup: { flex: 1 },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: '#bbb',
    fontSize: 12,
    marginTop: 4,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 8,
  },
  moreBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { 
    color: '#888', 
    fontSize: 16 
  },
  loginPrompt: {
    backgroundColor: '#1e1e1e',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  loginText: {
    color: '#bbb',
    textAlign: 'center',
    fontSize: 14,
  },
  // Modal styles
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

export default HistoryScreen;