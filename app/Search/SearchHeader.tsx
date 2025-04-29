import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

interface SuggestionItem {
  id: string;
  malId: number;
  title: {
    romaji: string;
    english: string | null;
    native: string;
    userPreferred: string;
  };
  status: string;
  image: string;
}

// Extend the RootStackParamList to include both Details and Search routes.
type RootStackParamList = {
  Details: { id: string };
  Search: { query: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const SearchHeader = () => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    if (searchText.trim().length > 0) {
      fetch(`https://kangaroo-kappa.vercel.app/meta/anilist/${encodeURIComponent(searchText)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.results) {
            setSuggestions(data.results);
          } else {
            setSuggestions([]);
          }
        })
        .catch((error) => {
          console.error('Error fetching suggestions:', error);
          setSuggestions([]);
        });
    } else {
      setSuggestions([]);
    }
    // Reset the "view more" state whenever the search text changes
    setShowAllSuggestions(false);
  }, [searchText]);

  const handleSearch = () => {
    if (searchText) {
      // Handle search logic, e.g., navigating to a results screen
      setIsSearchActive(false);
    }
  };

  const renderSuggestionItem = ({ item }: { item: SuggestionItem }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => navigation.navigate('Details', { id: item.id })}
    >
      <Image source={{ uri: item.image }} style={styles.suggestionImage} />
      <Text style={styles.suggestionText}>{item.title.userPreferred}</Text>
    </TouchableOpacity>
  );

  // Limit suggestions to 3 if not expanded
  const displayedSuggestions = showAllSuggestions ? suggestions : suggestions.slice(0, 3);

  return (
    <View style={styles.container}>
      {isSearchActive ? (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#fff"
            value={searchText}
            onChangeText={setSearchText}
            autoFocus={true}
            onSubmitEditing={handleSearch}
          />
          {searchText.trim().length > 0 && suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={displayedSuggestions}
                keyExtractor={(item) => item.id}
                renderItem={renderSuggestionItem}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              />
              {/* Display the "View More" button only if there are more than 3 items */}
              {!showAllSuggestions && suggestions.length > 3 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Search', { query: searchText })}
                  style={styles.viewMoreButton}
                >
                  <Text style={styles.viewMoreText}>View More</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/logo1.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      )}
      <TouchableOpacity
        onPress={() => setIsSearchActive(!isSearchActive)}
        style={styles.iconContainer}
      >
        <Ionicons name={isSearchActive ? 'close' : 'search'} size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', // Logo/input on the left, icon on the right
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  logoContainer: {
    flex: 1,
    width: 100,
  },
  logo: {
    width: 120,
    height: 40,
  },
  searchContainer: {
    flex: 1,
    position: 'relative', // Ensures suggestions can be positioned absolutely relative to this container
  },
  searchInput: {
    color: '#fff',
    backgroundColor: '#333',
    paddingHorizontal: 15,
    height: 40,
    fontSize: 16,
    borderRadius: 5,
  },
  iconContainer: {
    paddingLeft: 10,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 45, // Adjust this value if needed to position right below the TextInput
    left: 0,
    right: 0,
    backgroundColor: '#161616',
    borderRadius: 5,
    maxHeight: 200, // Enables scrolling if suggestions exceed this height
    zIndex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  suggestionImage: {
    width: 40,
    height: 40,
    borderRadius: 5,
    marginRight: 10,
  },
  suggestionText: {
    color: '#fff',
    fontSize: 16,
  },
  viewMoreButton: {
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#333',
  },
  viewMoreText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default SearchHeader;
