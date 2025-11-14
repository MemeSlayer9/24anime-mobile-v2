import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import RecentEpisode from '../List/RecentEpisode';
import Popular from '../List/Popular';
import Trending from '../List/Trending';
import Movies from '../List/Movies';
import OVA from '../List/OVA';

type ListScreenParams = {
  initialTab?: string;
};

type ListScreenRouteProp = RouteProp<{ List: ListScreenParams }, 'List'>;

const List = () => {
  const navigation = useNavigation();
  const route = useRoute<ListScreenRouteProp>();

  const [activeTab, setActiveTab] = useState('RecentEpisode');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  const onRefresh = () => {
    setRefreshing(true);
    
    // Increment refresh trigger to force all tabs to re-fetch
    setRefreshTrigger(prev => prev + 1);
    
    // Simulate API call delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const renderContent = () => {
    // Pass refreshTrigger to all components so they refetch when it changes
    if (activeTab === 'RecentEpisode') {
      return <RecentEpisode page={page} key={`recent-${refreshTrigger}`} />;
    } else if (activeTab === 'Popular') {
      return <Popular page={page} key={`popular-${refreshTrigger}`} />;
    } else if (activeTab === 'Trending') {
      return <Trending page={page} key={`trending-${refreshTrigger}`} />;
    } else if (activeTab === 'Movies') {
      return <Movies page={page} key={`movies-${refreshTrigger}`} />;
    } else if (activeTab === 'OVA') {
      return <OVA page={page} key={`ova-${refreshTrigger}`} />;
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

      <ScrollView 
        style={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={["#FFFFFF"]}
            progressBackgroundColor="#161616"
          />
        }
      >
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