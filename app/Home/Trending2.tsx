import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';

// Define your navigation parameter list
type RootStackParamList = {
  Details: { id: string };
  List: { initialTab: string }; // Ensure the "List" route is defined here
};

// Create a typed navigation prop for the "Details" or "List" route as needed
type NavigationProp = StackNavigationProp<RootStackParamList, 'List'>;

interface AnimeTitle {
  romaji: string;
  english: string;
  native: string;
  userPreferred: string;
}

interface AnimeItem {
  id: string;
  image: string;
  title: AnimeTitle;
}

interface ApiResponse {
  results: AnimeItem[];
}

const AnimeCard: React.FC<{ item: AnimeItem }> = ({ item }) => {
  // Using navigation for the Details page in AnimeCard
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'Details'>>();
  const [isPressed, setIsPressed] = useState(false);
 
  return (
    <Pressable
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onPress={() => navigation.navigate('Details', { id: item.id })}
      style={[styles.card, isPressed && styles.cardPressed]}
    >
      <Image
        source={{ uri: item.image }}
        style={styles.image}
        resizeMode="cover"
      />
      {/* Overlay with ID and title always visible */}
      <View style={styles.overlay}>
        <Text style={styles.title} numberOfLines={1}>{item.title.userPreferred}</Text>
      </View>
      {/* Conditionally render play/pause overlay when pressed */}
      {isPressed && (
        <View style={styles.playIconOverlay}>
          <View style={styles.playIconCircle}>
            <Ionicons name="play" size={30} color="white" />
          </View>
        </View>
      )}
    </Pressable>
  );
};

const AnimeCarousel: React.FC = () => {
  const [data, setData] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add the navigation object for AnimeCarousel
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    axios
      .get<ApiResponse>('https://kangaroo-kappa.vercel.app/meta/anilist/trending')
      .then(response => {
        setData(response.data.results);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.paginationContainer}>
        <Text style={styles.buttonText}>Trending</Text>
        <TouchableOpacity onPress={() => navigation.navigate('List', { initialTab: 'Trending' })}>
          <Text style={styles.buttonText}>View All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={data}
        horizontal
        keyExtractor={item => item.id}
        renderItem={({ item }) => <AnimeCard item={item} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      />
    </View>
  );
};

export default AnimeCarousel;

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  id: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
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
});
