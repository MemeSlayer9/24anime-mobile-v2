import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import Trending from '../Home/Trending';
import Popular from '../Home/Popular';
import RecentEpisode from '../Home/RecentEpisode';
import Trending2 from '../Home/Trending2';

const Home = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Increment key to force child components to remount and refetch data
    setRefreshKey(prev => prev + 1);
    
    // Simulate refresh time - adjust based on your actual data fetching
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#ffffff']} // Android spinner color
          tintColor="#ffffff" // iOS spinner color
          progressBackgroundColor="#161616" // Android background
        />
      }
    >
      <Trending key={`trending-${refreshKey}`} />
      <RecentEpisode key={`recent-${refreshKey}`} />
      <Popular key={`popular-${refreshKey}`} />
      <Trending2 key={`trending2-${refreshKey}`} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161616',
  },
});

export default Home;