import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'; // Import useNavigation and useRoute
import RecentEpisode from '../List/RecentEpisode'; // Adjust path as needed
import Popular from '../List/Popular'; // Adjust path as needed
import Trending from '../List/Trending'; // Adjust path as needed
import Movies from '../List/Movies'; // Adjust path as needed
import OVA from '../List/OVA'; // Adjust path as needed

type ListScreenParams = {
  initialTab?: string;
};

interface ListComponentProps {
  page: number;
}
type ListScreenRouteProp = RouteProp<{ List: ListScreenParams }, 'List'>;

const List = () => {
  const navigation = useNavigation(); // Get navigation object
     const route = useRoute<ListScreenRouteProp>();

  const [activeTab, setActiveTab] = useState('RecentEpisode'); // Default tab
  const [page, setPage] = useState(1); // Pagination state

  // Set the active tab from navigation parameters if provided
  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  const renderContent = () => {
    if (activeTab === 'RecentEpisode') {
      return <RecentEpisode page={page} />;
    } else if (activeTab === 'Popular') {
      return <Popular page={page} />;
    } else if (activeTab === 'Trending') {
      return <Trending page={page} />;
    } else if (activeTab === 'Movies') {
      return <Movies page={page} />;
      } else if (activeTab === 'OVA') {
      return <OVA page={page} />;
    } else {
      return null; 
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'RecentEpisode' && styles.activeTab]}
          onPress={() => setActiveTab('RecentEpisode')}
        >
          <Text style={[styles.tabText, activeTab === 'RecentEpisode' && styles.activeTabText]}>Recent</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Popular' && styles.activeTab]}
          onPress={() => setActiveTab('Popular')}
        >
          <Text style={[styles.tabText, activeTab === 'Popular' && styles.activeTabText]}>Popular</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Trending' && styles.activeTab]}
          onPress={() => setActiveTab('Trending')}
        >
          <Text style={[styles.tabText, activeTab === 'Trending' && styles.activeTabText]}>Trending</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Movies' && styles.activeTab]}
          onPress={() => setActiveTab('Movies')}
        >
          <Text style={[styles.tabText, activeTab === 'Movies' && styles.activeTabText]}>Movies</Text>
        </TouchableOpacity>
         <TouchableOpacity
          style={[styles.tab, activeTab === 'OVA' && styles.activeTab]}
          onPress={() => setActiveTab('OVA')}
        >
          <Text style={[styles.tabText, activeTab === 'OVA' && styles.activeTabText]}>OVA</Text>
        </TouchableOpacity>
        </ScrollView>
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
