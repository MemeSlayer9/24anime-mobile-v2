import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, ActivityIndicator, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

// Define your navigation param list
type RootStackParamList = {
  Schedule: undefined;
  Details: { id: number };
  // ... other routes if needed
};

// Define your navigation prop type for the component (if needed)
type NavigationProp = StackNavigationProp<RootStackParamList, 'Schedule'>;

interface AnimeItem {
  id: number;
  title: {
    userPreferred: string;
  };
  airingAt: number;
  image: string;
}
interface ScheduleProps {
  page: number;
}

const Schedule: React.FC<ScheduleProps> = () => {
  const [anime, setAnime] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [countdown, setCountdown] = useState<{ [key: number]: string }>({});

  // Use navigation with the correct type
  const navigation = useNavigation<NavigationProp>();

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const fetchData = async () => {
    try {
      let allResults: AnimeItem[] = [];
      for (let page = 1; page <= 6; page++) {
        const response = await axios.get(`https://juanito66.vercel.app/meta/anilist/airing-schedule?page=${page}`);
        const data: AnimeItem[] = response.data.results;
        allResults = [...allResults, ...data];
      }
      setAnime(allResults);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching anime:', error);
      setLoading(false);
    }
  };

  const calculateCountdown = (airingAt: number): string => {
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDifference = airingAt - currentTime;

    if (timeDifference <= 0) {
      return "Airing now";
    } else {
      const days = Math.floor(timeDifference / (60 * 60 * 24));
      const hours = Math.floor((timeDifference % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((timeDifference % (60 * 60)) / 60);
      const seconds = Math.floor(timeDifference % 60);
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
  };

  useEffect(() => {
    const updateCountdowns = () => {
      const newCountdown = anime.reduce((acc: { [key: number]: string }, item) => {
        acc[item.id] = calculateCountdown(item.airingAt);
        return acc;
      }, {});
      setCountdown(newCountdown);
    };

    updateCountdowns();
    const timer = setInterval(updateCountdowns, 1000);

    return () => clearInterval(timer);
  }, [anime]);

  useEffect(() => {
    fetchData();
  }, []);

  const filteredAnime = anime.filter((item) => new Date(item.airingAt * 1000).getDay() === selectedDay);

  const renderItem = ({ item }: { item: AnimeItem }) => {
    const airingDay = new Date(item.airingAt * 1000).getDay();
    const airingDayName = daysOfWeek[airingDay];
    const countdownText = countdown[item.id];

    return (
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Details', { id: item.id })}
          style={styles.episodeContainer}
        >
          <Image source={{ uri: item.image }} style={styles.image} />
          <View style={styles.textContainer}>
            <Text style={styles.title}>{item.title.userPreferred}</Text>
            <Text style={styles.countdownText}>{countdownText}</Text>
            <Text style={styles.airingDay}>Airs on: {airingDayName}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (!anime.length) {
    return <Text>No data available</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {daysOfWeek.map((day, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setSelectedDay(index)}
              style={[styles.tabButton, selectedDay === index && styles.activeTab]}
            >
              <Text style={styles.tabText}>{day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredAnime}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#161616',
  },
  tabButton: {
    padding: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: 'white',
  },
  tabText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  episodeContainer: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  image: {
    width: 100,
    height: 150,
    marginRight: 10,
    borderRadius: 8,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  countdownText: {
    color: 'yellow',
  },
  airingDay: {
    color: 'gray',
  },
});

export default Schedule;
