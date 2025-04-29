import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAnimeId } from '../context/EpisodeContext';

type RootStackParamList = {
  Zoro: { episodeId: string | null };
  List: { initialTab: string };
};

interface Episode {
  id: string;
  title: string;
  image: string;
  episodeId: string;
  latestEpisode?: {
    number: number;
    id: string;
  };
}

const RecentEpisodes = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  // Tracks press state for each item by its id
  const [isPressedMap, setIsPressedMap] = useState<{ [key: string]: boolean }>({});
  const { setAnimeId, setEpisodeid } = useAnimeId();

  const fetchData = async () => {
    try {
      const response = await axios.get(
        'https://kangaroo-kappa.vercel.app//anime/zoro/recent-episodes'
      );
      const data: Episode[] = response.data.results;

      // Fetch detailed episode info for each item
      const updatedData = await Promise.all(
        data.map(async (item: Episode) => {
          try {
            const detailsResponse = await axios.get(
              `https://kangaroo-kappa.vercel.app/anime/zoro/info?id=${item.id}`
            );
            // Get the last episode
            const latestEpisode = detailsResponse.data.episodes?.slice(-1)[0];
            return { ...item, latestEpisode };
          } catch (error) {
            console.error(`Error fetching details for ${item.id}:`, error);
            return item;
          }
        })
      );

      setEpisodes(updatedData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePressIn = (id: string) => {
    setIsPressedMap(prev => ({ ...prev, [id]: true }));
  };

  const handlePressOut = (id: string) => {
    setIsPressedMap(prev => ({ ...prev, [id]: false }));
  };

  const renderItem = ({ item }: { item: Episode }) => (
    <Pressable
      onPressIn={() => handlePressIn(item.id)}
      onPressOut={() => handlePressOut(item.id)}
      onPress={() => {
        const episodeId = item.latestEpisode ? item.latestEpisode.id : null;
        setEpisodeid(episodeId);
        // Convert item.id from string to number to match expected type
        setAnimeId(item.id);
        navigation.navigate('Zoro', { episodeId });
      }}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
      {/* Overlay with title and episode info */}
      <View style={styles.overlay}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        {item.latestEpisode && (
          <Text style={styles.subtitle}>Episode: {item.latestEpisode.number}</Text>
        )}
      </View>
      {/* Show play icon overlay when pressed */}
      {isPressedMap[item.id] && (
        <View style={styles.playIconOverlay}>
          <View style={styles.playIconCircle}>
            <Ionicons name="play" size={30} color="white" />
          </View>
        </View>
      )}
    </Pressable>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!episodes.length) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.paginationContainer}>
        <Text style={styles.buttonText}>Recent Episodes</Text>
        <TouchableOpacity onPress={() => navigation.navigate('List', { initialTab: 'RecentEpisode' })}>
          <Text style={styles.buttonText}>View All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={episodes}
        horizontal
        keyExtractor={item => item.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  card: {
    width: 150,
    height: 250,
    marginRight: 20,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  cardPressed: {
    transform: [{ scale: 0.95 }],
    borderWidth: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: '#fff',
    fontSize: 14,
    marginTop: 2,
    textAlign: 'center',
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconCircle: {
    backgroundColor: '#222',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: 'white',
    fontSize: 18,
  },
});

export default RecentEpisodes;
