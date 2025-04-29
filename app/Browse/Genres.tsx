import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, FlatList, Image, TouchableOpacity, Dimensions } from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker'; // Import the Picker component
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Details: { id: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'Details'>;

// Define the shape of the data item
interface AnimeItem {
  id: string | number;
  image: string;
  title: {
    english: string;
    // Add additional language fields if needed
  };
  // Add other fields if necessary
}

interface GenresProps {
  page: number;
}
const Genres: React.FC<GenresProps> = () => {
  const navigation = useNavigation<NavigationProp>();

  const [selectedGenre, setSelectedGenre] = useState<string>('Action'); // Default to 'Action'
  const [data, setData] = useState<AnimeItem[]>([]); // Store the fetched data with proper type annotation
  const [loading, setLoading] = useState<boolean>(false); // Loading state
  const [page, setPage] = useState<number>(1); // For pagination

  const genres: string[] = [
    "Action", "Adventure", "Cars", "Comedy", "Drama", "Fantasy", 
    "Horror", "Mahou Shoujo", "Mecha", "Music", "Mystery", 
    "Psychological", "Romance", "Sci-Fi", "Slice of Life", "Sports", 
    "Supernatural", "Thriller"
  ];

  // Fetch data when the selected genre changes
  const fetchData = async (genre: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`https://juanito66.vercel.app/meta/anilist/advanced-search?genres=["${genre}"]&page=${page}`);
      setData(response.data.results); // Update the state with the fetched data
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Call fetchData when the selectedGenre or page changes
  useEffect(() => {
    fetchData(selectedGenre);
  }, [selectedGenre, page]);

  // Define the render item function with explicit typing
  const renderItem = ({ item }: { item: AnimeItem }) => (
    <View style={styles.itemContainer}>
      <TouchableOpacity onPress={() => navigation.navigate('Details', { id: item.id.toString() })}>
        <Image source={{ uri: item.image }} style={styles.image} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { width: 150 }]} numberOfLines={1} ellipsizeMode="tail">
            {item.title.english}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Genre Picker */}
      <Picker
        selectedValue={selectedGenre}
        onValueChange={(itemValue) => {
          setSelectedGenre(itemValue);
          setPage(1); // Reset to page 1 whenever the genre changes
        }}
        style={styles.picker}
      >
        {genres.map((genre, index) => (
          <Picker.Item key={index} label={genre} value={genre} />
        ))}
      </Picker>

      {/* Loading Indicator */}
      {loading && <ActivityIndicator size="large" color="#DB202C" />}

      {/* Fetched Data Display */}
      {!loading && data.length > 0 && (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          numColumns={2}
          key={'_'} // Force a fresh render
          columnWrapperStyle={styles.row}
        />
      )}

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

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#000',
  },
  picker: {
    height: 50,
    backgroundColor: '#333',
    color: 'white',
    marginBottom: 20,
  },
  itemContainer: {
    width: (screenWidth / 2) - 5,
    padding: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center', // Center-align the text
  },
  textContainer: {
    paddingVertical: 5,
    alignItems: 'center', // Center the content
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  button: {
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 5,
  },
  disabledButton: {
    opacity: 0.5,
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
  row: {
    justifyContent: 'space-between',
  },
});

export default Genres;
