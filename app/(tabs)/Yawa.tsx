import React from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ScrollView 
} from 'react-native';

type Episode = {
  id: string;
  title: string;
  duration: string;
  subOrDub: string;
  thumbnail: string;
};

const episodesData: Episode[] = [
  {
    id: '1',
    title: 'S1 E2 - Trainer Sakonji U...',
    duration: '49m',
    subOrDub: 'Sub | Dub',
    thumbnail: 'https://media.kitsu.app/episodes/thumbnails/284705/original.png',
  },
  {
    id: '2',
    title: 'S1 E3 - Sabito and Mako...',
    duration: '49m',
    subOrDub: 'Sub | Dub',
    thumbnail: 'https://media.kitsu.app/episodes/thumbnails/284705/original.png',
  },
  {
    id: '3',
    title: 'S1 E4 - Final Selection',
    duration: '49m',
    subOrDub: 'Sub | Dub',
    thumbnail: 'https://media.kitsu.app/episodes/thumbnails/284705/original.png',
  },
];

const AnimeDetailsScreen: React.FC = () => {
  const renderEpisodeItem = ({ item }: { item: Episode }) => {
    return (
      <TouchableOpacity style={styles.episodeContainer}>
        {/* Episode Thumbnail */}
        <Image 
          source={{ uri: item.thumbnail }} 
          style={styles.episodeThumbnail} 
        />
        {/* Episode Info */}
        <View style={styles.episodeTextContainer}>
          <Text style={styles.episodeTitle}>{item.title}</Text>
          <Text style={styles.episodeMeta}>
            {item.duration} - {item.subOrDub}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Top Section with Title and Description */}
      <View style={styles.topSection}>
        <Text style={styles.episodeTitleText}>S1 E1 - Cruelty</Text>
        <Text style={styles.seriesInfo}>Series • Sub | Dub</Text>
        <Text style={styles.description}>
          After a demon attack leaves his family slain and his sister cursed,
          Tanjiro embarks upon a perilous journey to find a cure and
          avenge those he’s lost.
        </Text>

        {/* Stats: 13.1k / 3.1k / 13.1k */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>13.1k</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>3.1k</Text>
            <Text style={styles.statLabel}>Shares</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>13.1k</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
        </View>
      </View>

      {/* Next Episodes */}
      <View style={styles.nextEpisodesHeader}>
        <Text style={styles.nextEpisodesText}>Next Episodes</Text>
      </View>

      <FlatList
        data={episodesData}
        renderItem={renderEpisodeItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.episodesList}
      />

      {/* All Episodes Button */}
      <TouchableOpacity style={styles.allEpisodesButton}>
        <Text style={styles.allEpisodesButtonText}>All Episodes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default AnimeDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  topSection: {
    marginBottom: 24,
  },
  episodeTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  seriesInfo: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 16,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#999999',
  },
  nextEpisodesHeader: {
    marginBottom: 12,
  },
  nextEpisodesText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  episodesList: {
    paddingBottom: 16,
  },
  episodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    overflow: 'hidden',
  },
  episodeThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  episodeTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  episodeMeta: {
    fontSize: 14,
    color: '#BBBBBB',
    marginTop: 4,
  },
  allEpisodesButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FF6500',
    borderRadius: 8,
  },
  allEpisodesButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
