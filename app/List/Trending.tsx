import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Image, 
  ActivityIndicator, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Details: { id: string };
};

// Create a typed navigation prop for the "Details" route
type NavigationProp = StackNavigationProp<RootStackParamList, 'Details'>;
const screenWidth = Dimensions.get('window').width;

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

interface TrendingProps {
  page: number;
}

const AnimeGrid: React.FC<TrendingProps> = () => {
  const [data, setData] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    setLoading(true);
    axios
      .get<ApiResponse>(`https://kangaroo-kappa.vercel.app/meta/anilist/trending?page=${page}&perPage=100`)
      .then(response => setData(response.data.results))
      .catch(error => console.error('Error fetching data:', error))
      .finally(() => setLoading(false));
  }, [page]);

  const renderItem = ({ item }: { item: AnimeItem }) => (
    <TouchableOpacity 
      style={styles.itemContainer}
      onPress={() => navigation.navigate('Details', { id: item.id })}
    >
      <Image 
        source={{ uri: item.image }} 
        style={styles.image} 
        resizeMode="cover" 
      />
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {item.title.userPreferred}
        </Text>
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

  if (!data.length) {
    return (
      <View style={[styles.wrapper, styles.center]}>
        <Text style={{ color: 'white' }}>No data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
      />
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
        {/* Updated the page text styling here */}
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

export default AnimeGrid;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
     padding: 10,
    justifyContent: 'space-between', // Ensures pagination is at the bottom
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
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
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
  // New style for the page number text
  pageText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 15,
    paddingVertical: 5,
     borderRadius: 5,
    // Optionally, add a shadow for iOS or elevation for Android:
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,  
    elevation: 2,
  },
});
