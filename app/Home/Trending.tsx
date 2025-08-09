import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ListRenderItem,
} from 'react-native';
import axios from 'axios';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
  
// Define the interface for an episode
interface Episode {
  id: number;
  image: string;
  title: {
    userPreferred: string;
  };
  description: string;
  episodeId: string;
}

const Trending: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
   
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const flatListRef = useRef<FlatList<Episode>>(null);
  const [itemWidth] = useState<number>(Dimensions.get('window').width);
  

  // Function to fetch data
  const fetchData = async (): Promise<void> => {
    setLoading(true);
    
    try {
      const response = await axios.get<{ results: Episode[] }>(
        'https://kangaroo-kappa.vercel.app/meta/anilist/trending'
      );
      
      setEpisodes(response.data.results);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
    
    // Clean up
    return () => {
      // No cleanup needed
    };
  }, []);

  const renderItem: ListRenderItem<Episode> = ({ item }) => {
    return (
      <View key={item.id} style={[styles.itemContainer, { width: itemWidth }]}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: item.image }} 
            style={[styles.image, { width: itemWidth }]}
            // Add better image loading handling
            onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
          />
          <LinearGradient
            colors={['rgba(10, 20, 22, 0.2)', 'rgba(22, 22, 22, 1)']}
            style={styles.overlayGradient}
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, { width: itemWidth - 20 }]} numberOfLines={1} ellipsizeMode="tail">
            {item.title.userPreferred}
          </Text>
          <Text style={[styles.description, { width: itemWidth - 20 }]} numberOfLines={4} ellipsizeMode="tail">
            {item.description}
          </Text>
          <View style={[styles.container, { width: itemWidth - 20 }]}>
            <TouchableOpacity onPress={() => navigation.navigate('Details', { id: item.id })}>
              <View style={styles.playButtonContainer}>
                <Ionicons name="play" size={35} color="white" />
                <Text style={styles.playButtonText}>Watch Now</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DB202C" />
      </View>
    );
  }

  if (!episodes.length) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>No trending content available</Text>
        <TouchableOpacity style={styles.refreshNowButton} onPress={fetchData}>
          <Ionicons name="refresh" size={20} color="white" />
          <Text style={styles.refreshNowText}>Refresh Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        ref={flatListRef}
        data={episodes}
        keyExtractor={(item) => item.episodeId}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flatListContainer}
        getItemLayout={(_data, index) => ({ length: itemWidth, offset: itemWidth * index, index })}
        initialScrollIndex={currentIndex}
        pagingEnabled
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.floor(event.nativeEvent.contentOffset.x / itemWidth);
          setCurrentIndex(newIndex);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noDataText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 20,
  },
  refreshNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DB202C',
    padding: 10,
    borderRadius: 5,
  },
  refreshNowText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  itemContainer: {
    paddingVertical: 0,
    alignItems: 'center',
    marginHorizontal: 0,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 500,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlayGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  textContainer: {
    position: 'absolute',
    right: 10,
    top: '65%',
    transform: [{ translateY: -20 }],
    alignItems: 'flex-end',
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  flatListContainer: {
    paddingHorizontal: 0,
  },
  description: {
    fontSize: 15,
    color: '#fff',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 5,
    width: '100%',
  },
  playButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DB202C',
    padding: 5,
    borderRadius: 5,
    width: 200,
  },
  playButtonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: 'bold',
  },
});

export default Trending;  