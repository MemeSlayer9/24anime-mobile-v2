import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import Schedule from '../Browse/Schedule';    // Adjust the path as needed
import AnimeChart from '../Browse/AnimeChart'; // Adjust the path as needed
import Genres from '../Browse/Genres';         // Adjust the path as needed

// Define the parameter list for React Navigation
type ListParamList = {
  List: {
    initialTab?: string;
  };
};

type ListRouteProp = RouteProp<ListParamList, 'List'>;

const List: React.FC = () => {
  const route = useRoute<ListRouteProp>();
  const [activeTab, setActiveTab] = useState('Schedule');
  const [page, setPage] = useState(1);

  // Update active tab if provided in navigation params
  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  // Render the appropriate component based on the active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'Schedule':
        return <Schedule page={page} />;
      case 'AnimeChart':
        return <AnimeChart page={page} />;
      case 'Genres':
        return <Genres page={page} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Schedule' && styles.activeTab]}
          onPress={() => setActiveTab('Schedule')}
        >
          <Text style={[styles.tabText, activeTab === 'Schedule' && styles.activeTabText]}>
            Schedule
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'AnimeChart' && styles.activeTab]}
          onPress={() => setActiveTab('AnimeChart')}
        >
          <Text style={[styles.tabText, activeTab === 'AnimeChart' && styles.activeTabText]}>
            AnimeChart
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Genres' && styles.activeTab]}
          onPress={() => setActiveTab('Genres')}
        >
          <Text style={[styles.tabText, activeTab === 'Genres' && styles.activeTabText]}>
            Genres
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.contentContainer}>
        {renderContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161616',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#161616',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FFFFFF',
  },
  tabText: {
    color: '#BBBBBB',
    fontSize: 16,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
});

export default List;
