import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAnimeId } from '../context/EpisodeContext';

const screenWidth = Dimensions.get('window').width;

type RootStackParamList = {
  Zoro: { episodeId: string | null };
};

interface RecentEpisodeProps {
  page: number;
}
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

const RecentEpisode: React.FC<RecentEpisodeProps> = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const { setAnimeId, setEpisodeid } = useAnimeId();

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `https://kangaroo-kappa.vercel.app/anime/zoro/recent-episodes?page=${page}`
      );
      const data: Episode[] = response.data.results;

      // Fetch detailed episode info for each episode
      const updatedData = await Promise.all(
        data.map(async (item: Episode) => {
          try {
            const detailsResponse = await axios.get(
              `https://kangaroo-kappa.vercel.app/anime/zoro/info?id=${item.id}`
            );
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
  }, [page]); // refetch when the page changes

  const renderItem = ({ item }: { item: Episode }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => {
        const episodeId = item.latestEpisode ? item.latestEpisode.id : null;
                setAnimeId(item.id);

        setEpisodeid(episodeId);
        navigation.navigate('Zoro', { episodeId });
      }}
    >
      <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        {item.latestEpisode && (
          <Text style={styles.subtitle}>Episode: {item.latestEpisode.number}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.wrapper, styles.center]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!episodes.length) {
    return (
      <View style={[styles.wrapper, styles.center]}>
        <Text style={{ color: 'white' }}>No data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <FlatList
        data={episodes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
      />
      {/* Pagination controls */}
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.button, page === 1 && styles.disabledButton]}
          onPress={() => {
            if (page > 1) setPage(page - 1);
          }}
          disabled={page === 1}
        >
          <Text style={styles.buttonText}>Previous</Text>
        </TouchableOpacity>
        <Text style={styles.pageText}>{page}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setPage(page + 1)}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RecentEpisode;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
     padding: 10,
    justifyContent: 'space-between',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemContainer: {
    width: (screenWidth / 2) - 15,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#222',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 250,
  },
  textContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
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
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    alignItems: 'center',
  },
  button: {
    backgroundColor: 'red',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  disabledButton: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  pageText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 2,
  },
});
