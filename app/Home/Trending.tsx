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
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import axios from 'axios';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
  import { useBookMarkId  } from "../context/BookmarkContent";

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
  // You might want to specify the type for your navigation if needed
  const navigation = useNavigation<NavigationProp<any>>();
   const { setbookMarkId } = useBookMarkId ();
 
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const flatListRef = useRef<FlatList<Episode>>(null);
  const [itemWidth, setItemWidth] = useState<number>(Dimensions.get('window').width);

  const fetchData = async (): Promise<void> => {
    try {
      // Provide type for the response data
      const response = await axios.get<{ results: Episode[] }>('https://kangaroo-kappa.vercel.app/meta/anilist/trending');
      setEpisodes(response.data.results);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const subscription = Dimensions.addEventListener('change', () => {
      const { width, height } = Dimensions.get('window');
      setItemWidth(width); // You can adjust logic if needed for orientation
    });

    // Clean up subscription on unmount
    return () => subscription?.remove();
  }, []);

  const handleAddBookmark = (id: number): void => {
            setbookMarkId(id)

     setIsBookmarked(true); // Mark as bookmarked
    console.log('Bookmark clicked, selectId:', id);
  };

  useEffect(() => {
    if (isBookmarked) {
      const timer = setTimeout(() => {
         setIsBookmarked(false); // Hide the message after 2 seconds
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isBookmarked]);

  const renderItem: ListRenderItem<Episode> = ({ item }) => (
    <View key={item.id} style={[styles.itemContainer, { width: itemWidth }]}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={[styles.image, { width: itemWidth }]} />
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
          <View style={styles.iconContainer}>
            <TouchableOpacity onPress={() => handleAddBookmark(item.id)}>
              <Ionicons name="bookmark-outline" size={30} color="#DB202C" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
    </View>
  );

  const handleNext = (): void => {
    if (currentIndex < episodes.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ animated: true, index: newIndex });
    }
  };

  const handlePrev = (): void => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ animated: true, index: newIndex });
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (!episodes.length) {
    return <Text style={styles.title}>No data available</Text>;
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
        pagingEnabled // Snap to one item at a time
      />
    </View>
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    flex: 1,
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
  iconContainer: {
    backgroundColor: 'black',
    borderRadius: 5,
    padding: 5,
    borderColor: '#DB202C',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});

export default Trending;
