import React, { useState, useEffect } from 'react';
import { 
  View, 
  ActivityIndicator, 
  FlatList, 
  Text, 
  StyleSheet, 
  Image, 
  Dimensions, 
  TouchableOpacity 
} from 'react-native';
import axios from 'axios';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Extend the RootStackParamList to include both Details and Search routes.
type RootStackParamList = {
  Details: { id: string };
  Search: { query: string };
};

// This type is used for navigation when going to the Details screen.
type DetailsNavigationProp = StackNavigationProp<RootStackParamList, 'Details'>;
// Define the route type for the Search screen.
type SearchRouteProp = RouteProp<RootStackParamList, 'Search'>;

// Define an interface for your episode item.
interface Episode {
  id: string;
  episodeId: string;
  image: string;
  title: {
    userPreferred: string;
  };
}

const Search = () => {
  // Use the proper generic type to let TypeScript know the route params structure.
  const route = useRoute<SearchRouteProp>();
  const { query } = route.params;
  // Navigation for moving to the Details screen.
  const navigation = useNavigation<DetailsNavigationProp>();
  
  const [loading, setLoading] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  const fetchData = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const response = await axios.get(`https://juanito66.vercel.app/meta/anilist/${query}?perPage=100`);
      setEpisodes(response.data.results);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [query]);

  // Explicitly type the item parameter as Episode.
  const renderItem = ({ item }: { item: Episode }) => (
    <View style={styles.itemContainer}>
      <TouchableOpacity onPress={() => navigation.navigate('Details', { id: item.id })}>
        <Image source={{ uri: item.image }} style={styles.image} />
        <View style={styles.textContainer}>
          <Text 
            style={[styles.title, { width: 150 }]} 
            numberOfLines={1} 
            ellipsizeMode="tail"
          >
            {item.title.userPreferred}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (!episodes.length) {
    return <Text>No data available</Text>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={episodes}
        keyExtractor={(item) => item.episodeId}
        renderItem={renderItem}
        numColumns={2}
        key={'_'}
        columnWrapperStyle={styles.row}
      />
    </View>
  );
};

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161616',
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemContainer: {
    width: (screenWidth / 2) - 5,
    padding: 10,
    borderRadius: 8,
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 8,
  },
  textContainer: {
    paddingVertical: 5,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  episode: {
    fontSize: 14,
    color: 'white',
    marginVertical: 4,
    textAlign: 'center',
  },
  link: {
    fontSize: 14,
    color: 'lightblue',
    marginTop: 5,
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  button: {
    padding: 10,
    backgroundColor: '#444',
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default Search;
