import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

const Schedule = () => {

   type RootStackParamList = {
  Details: { id: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'Details'>;

  interface AnimeItem {
  id: string;
  title: {
    userPreferred: string;
  };
  genres: string[];
  currentEpisode: number | null;
  image: string;
  status: string;
  type: string;
  rating: number;
  totalEpisodes: number;
  description: string;
}
  // State definitions
  const [anime, setAnime] = useState([]);
  const [otherAnime, setOtherAnime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState('TV');
  const [year, setYear] = useState('2025');
  const [season, setSeason] = useState('WINTER');
  const [page, setPage] = useState(1);
  const [showOtherAnime, setShowOtherAnime] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  // Lists for the pickers
  const Format = ["TV", "TV_SHORT", "OVA", "ONA", "MOVIE", "SPECIAL"];
  const Seasons = ['Winter', 'Spring', 'Summer', 'Fall'];
  const startYear = 1999;
  const currentYear = new Date().getFullYear();
  const Years = [];
  for (let yr = startYear; yr <= currentYear; yr++) {
    Years.push(yr.toString());
  }

  

  // Handlers for pickers
const handleSeasonChange = (selectedValue: string) => {
  setSeason(selectedValue);
  setShowOtherAnime(false);
};
  const handleFormatChange = (selectedValue: string) => {
    setFormat(selectedValue);
    setShowOtherAnime(false);
  };

  const handleYearChange = (selectedValue: string) => {
    setYear(selectedValue);
    setShowOtherAnime(false);
  };

  const handleTBAButtonClick = () => {
    fetchData();
    setShowOtherAnime(true);
  };

  // Fetch data from the API endpoints
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch anime data for the selected season and year
      const { data: animeData } = await axios.get(
        `https://juanito66.vercel.app/meta/anilist/advanced-search?season=${season}&year=${year}&page=${page}&perPage=100&format=${format}`
      );

      // Fetch anime data that are not yet released
      const { data: otherData } = await axios.get(
        `https://juanito66.vercel.app/meta/anilist/advanced-search?status=NOT_YET_RELEASED&page=${page}&format=${format}`
      );

      setAnime(animeData.results || []);
      setOtherAnime(otherData.results || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching anime:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, format, year, season]);

  // Render individual anime item
const renderItem = ({ item }: { item: AnimeItem }) => (
  <View style={styles.itemContainer}>
    <TouchableOpacity
      onPress={() => navigation.navigate('Details', { id: item.id })}
      style={styles.episodeContainer}
    >
      <Text style={styles.title}>{item.title.userPreferred}</Text>
      <Text style={styles.genres}>Genres: {item.genres.join(", ")}</Text>
      {item.currentEpisode !== null && (
        <Text style={styles.status}>Current Episodes: {item.currentEpisode}</Text>
      )}
      <View style={styles.flexContainer}>
        <Image source={{ uri: item.image }} style={styles.image} />
        <View style={styles.textContainer}>
          <Text style={styles.status}>{item.status}</Text>
          <Text style={styles.status}>{item.type}</Text>
          <Text style={styles.status}>Ratings: {item.rating}%</Text>
          <Text style={styles.status}>Total Episodes: {item.totalEpisodes}</Text>
          <View style={styles.descriptionWrapper}>
            <ScrollView>
              <Text style={styles.description}>{item.description}</Text>
            </ScrollView>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  </View>
);


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!anime.length && !otherAnime.length) {
    return <Text style={styles.noDataText}>No data available</Text>;
  }

  return (
    <View style={styles.container}>
      {/* Vertical ScrollView to fill the entire height */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Horizontal ScrollView for the pickers */}
        <View style={styles.pickerSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={styles.scrollContainer}
          >
            <View style={styles.pickerWrapper}>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={season}
                  onValueChange={handleSeasonChange}
                  style={styles.picker}
                >
                  {Seasons.map((seasonOption, index) => (
                    <Picker.Item
                      key={index}
                      label={seasonOption}
                      value={seasonOption.toUpperCase()}
                    />
                  ))}
                </Picker>
              </View>

              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={format}
                  onValueChange={handleFormatChange}
                  style={styles.picker}
                >
                  {Format.map((formatOption, index) => (
                    <Picker.Item
                      key={index}
                      label={formatOption}
                      value={formatOption.toUpperCase()}
                    />
                  ))}
                </Picker>
              </View>

              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={year}
                  onValueChange={handleYearChange}
                  style={styles.picker}
                >
                  {Years.map((yearOption, index) => (
                    <Picker.Item key={index} label={yearOption} value={yearOption} />
                  ))}
                </Picker>
              </View>

              <TouchableOpacity onPress={handleTBAButtonClick} style={styles.tbaButton}>
                <Text style={styles.buttonText}>TBA</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Anime list section */}
        <View style={styles.animeSection}>
          {!showOtherAnime ? (
            <View>
               <FlatList
                data={anime}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
              />
            </View>
          ) : (
            <View>
              <Text style={styles.otherAnimeHeader}>Not Yet Released</Text>
              <FlatList
                data={otherAnime}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
              />
            </View>
          )}
        </View>
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Outer container fills the entire screen
  container: {
    flex: 1,
        backgroundColor: '#222',

    
   },
  // Ensures the vertical scroll view takes all available space
  contentContainer: {
    flexGrow: 1,
  },
  // Picker section with a fixed height
  pickerSection: {
    height: 100,
    backgroundColor: '#222',
    justifyContent: 'center',
  },
  // Horizontal scroll container for the pickers
  scrollContainer: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  // Row of sliding pickers and button
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerContainer: {
    width: 150,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    color: 'black',
  },
  tbaButton: {
    marginHorizontal: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Anime list section occupies the remaining space
  animeSection: {
    flex: 1,
    backgroundColor: '#222',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  noDataText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  // Styles for anime items
  itemContainer: {
    marginVertical: 10,
  },
  episodeContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    padding: 10,
  },
  image: {
    width: 200,
    height: 300,
    marginRight: 20,
    borderRadius: 8,
  },
  flexContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  genres: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  status: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  otherAnimeHeader: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
    textAlign: 'center',
  },
  textContainer: {
    flexDirection: 'column',
    maxWidth: 200,
  },
  descriptionWrapper: {
    height: 200,
    overflow: 'hidden',
  },
  description: {
    fontSize: 15,
    color: '#fff',
    maxWidth: 150,
  },
   paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 15,
    backgroundColor: '#222', // matching the background if needed
  },
 
  // Define button and disabledButton styles if not already defined
  button: {
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 5,
  },
  disabledButton: {
    opacity: 0.5,
  },
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

export default Schedule;
