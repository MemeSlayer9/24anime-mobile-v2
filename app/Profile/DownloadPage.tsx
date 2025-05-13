import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ToastAndroid,
  Dimensions,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDownloads, DownloadedFile } from '../context/DownloadContext'
import { useAnimeId } from '../context/EpisodeContext';
import * as FileSystem from "expo-file-system";

 import { RootStackParamList } from '../Types/types';

const { width } = Dimensions.get('window');

const DownloadsPage = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { downloads, removeDownload, clearAllDownloads } = useDownloads();
  const { setAnimeId, setEpisodeid } = useAnimeId();
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterByAnime, setFilterByAnime] = useState<string | null>(null);
  const [groupedDownloads, setGroupedDownloads] = useState<{[key: string]: DownloadedFile[]}>({});

  // Group downloads by anime
  useEffect(() => {
    const grouped = downloads.reduce((acc, download) => {
      const animeId = download.animeId.toString();
      if (!acc[animeId]) {
        acc[animeId] = [];
      }
      acc[animeId].push(download);
      return acc;
    }, {} as {[key: string]: DownloadedFile[]});
    
    // Sort episodes within each anime group
    Object.keys(grouped).forEach(animeId => {
      grouped[animeId].sort((a, b) => {
        const epA = typeof a.episodeNumber === 'string' ? parseInt(a.episodeNumber) : a.episodeNumber;
        const epB = typeof b.episodeNumber === 'string' ? parseInt(b.episodeNumber) : b.episodeNumber;
        return epA - epB;
      });
    });
    
    setGroupedDownloads(grouped);
  }, [downloads]);

  const checkFileExists = async (fileUri: string) => {
    try {
      const info = await FileSystem.getInfoAsync(fileUri);
      return info.exists;
    } catch (error) {
      console.error('Error checking file:', error);
      return false;
    }
  };

  const handlePlayEpisode = async (download: DownloadedFile) => {
    try {
      // Check if file still exists
      const exists = await checkFileExists(download.fileUri);
      if (!exists) {
        Alert.alert(
          "File Not Found",
          "The downloaded file could not be found. It may have been deleted. Would you like to remove it from your downloads?",
          [
            {
              text: "Cancel",
              style: "cancel"
            },
            {
              text: "Remove",
              onPress: () => handleRemoveDownload(download.id)
            }
          ]
        );
        return;
      }

      // Set the episode ID and anime ID
      setAnimeId(download.animeId);
      setEpisodeid(download.episodeId);
      
      // Navigate to watch page
      navigation.navigate('Animepahe', {
        episodeid: download.episodeId,
        animeId: download.animeId,
        useLocalFile: true,
        localFileUri: download.fileUri
      });
    } catch (error) {
      console.error('Error playing episode:', error);
      ToastAndroid.show('Error playing episode', ToastAndroid.SHORT);
    }
  };

  const handleRemoveDownload = async (id: string) => {
    try {
      setDeletingId(id);
      const download = downloads.find(d => d.id === id);
      
      if (download) {
        // Check if file exists before trying to delete
        const exists = await checkFileExists(download.fileUri);
        if (exists) {
          await FileSystem.deleteAsync(download.fileUri, { idempotent: true });
        }
      }
      
      await removeDownload(id);
    } catch (error) {
      console.error('Error removing download:', error);
      ToastAndroid.show('Error removing download', ToastAndroid.SHORT);
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewAnime = (animeId: string) => {
    setFilterByAnime(animeId);
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Downloads",
      "Are you sure you want to delete all downloaded episodes? This will remove the files from your device.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              // Delete all downloaded files
              for (const download of downloads) {
                const exists = await checkFileExists(download.fileUri);
                if (exists) {
                  await FileSystem.deleteAsync(download.fileUri, { idempotent: true });
                }
              }
              
              await clearAllDownloads();
            } catch (error) {
              console.error('Error clearing downloads:', error);
              ToastAndroid.show('Error clearing downloads', ToastAndroid.SHORT);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderAnimeItem = ({ item }: { item: [string, DownloadedFile[]] }) => {
    const [animeId, episodesArray] = item;
    const firstEpisode = episodesArray[0];
    const episodeCount = episodesArray.length;
    
    return (
      <TouchableOpacity 
        style={styles.animeItem}
        onPress={() => handleViewAnime(animeId)}
      >
        <Image 
          source={{ uri: firstEpisode.thumbnail }} 
          style={styles.animeThumbnail}
          defaultSource={{ uri: 'https://via.placeholder.com/150' }}
        />
        <View style={styles.animeInfo}>
          <Text style={styles.animeTitle} numberOfLines={2}>
            {firstEpisode.title.split(' - ')[0]}
          </Text>
          <Text style={styles.episodeCount}>
            {episodeCount} {episodeCount === 1 ? 'episode' : 'episodes'} downloaded
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#888" />
      </TouchableOpacity>
    );
  };

  const renderEpisodeItem = ({ item }: { item: DownloadedFile }) => {
    return (
      <View style={styles.episodeItem}>
        <TouchableOpacity 
          style={styles.episodeThumbnailContainer}
          onPress={() => handlePlayEpisode(item)}
        >
          <Image 
            source={{ uri: item.thumbnail }} 
            style={styles.episodeThumbnail}
            defaultSource={{ uri: 'https://via.placeholder.com/150' }}
          />
          <View style={styles.playIconContainer}>
            <Ionicons name="play-circle" size={40} color="white" />
          </View>
        </TouchableOpacity>
        
        <View style={styles.episodeInfo}>
          <Text style={styles.episodeTitle}>
            Episode {item.episodeNumber}
          </Text>
          <Text style={styles.episodeQuality}>
            {item.quality}
          </Text>
          <Text style={styles.episodeDate}>
            Downloaded: {new Date(item.downloadDate).toLocaleDateString()}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => {
            Alert.alert(
              "Delete Download",
              "Are you sure you want to delete this downloaded episode?",
              [
                {
                  text: "Cancel",
                  style: "cancel"
                },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => handleRemoveDownload(item.id)
                }
              ]
            );
          }}
          disabled={deletingId === item.id}
        >
          {deletingId === item.id ? (
            <ActivityIndicator size="small" color="#E50914" />
          ) : (
            <Ionicons name="trash-outline" size={24} color="#E50914" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Show selected anime's episodes or main anime list
  if (filterByAnime) {
    const episodes = groupedDownloads[filterByAnime] || [];
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setFilterByAnime(null)}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Downloaded Episodes</Text>
          
          {episodes.length > 0 && (
            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={handleClearAll}
            >
              <Ionicons name="trash-outline" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
        
        {episodes.length > 0 ? (
          <FlatList
            data={episodes}
            renderItem={renderEpisodeItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="cloud-download-outline" size={64} color="#555" />
            <Text style={styles.emptyText}>No downloaded episodes found</Text>
          </View>
        )}
      </View>
    );
  }

  // Main anime list view
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Downloads</Text>
        
        {downloads.length > 0 && (
          <TouchableOpacity
            style={styles.clearAllButton}
            onPress={handleClearAll}
          >
            <Ionicons name="trash-outline" size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>
      
      {downloads.length > 0 ? (
        <FlatList
          data={Object.entries(groupedDownloads)}
          renderItem={renderAnimeItem}
          keyExtractor={([animeId]) => animeId}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-download-outline" size={64} color="#555" />
          <Text style={styles.emptyText}>No downloads found</Text>
          <Text style={styles.emptySubtext}>
            Your downloaded anime episodes will appear here
          </Text>
        </View>
      )}
      
      <Modal visible={isLoading} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E50914" />
            <Text style={styles.loadingText}>Clearing downloads...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  clearAllButton: {
    padding: 8,
  },
  listContainer: {
    paddingVertical: 8,
  },
  animeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  animeThumbnail: {
    width: 80,
    height: 120,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  animeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  animeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  episodeCount: {
    fontSize: 14,
    color: '#888',
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  episodeThumbnailContainer: {
    position: 'relative',
  },
  episodeThumbnail: {
    width: 120,
    height: 68,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  playIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  episodeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  episodeQuality: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  episodeDate: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    width: width * 0.8,
  },
  loadingText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
  },
});

export default DownloadsPage;