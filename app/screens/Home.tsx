import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
 import Trending from '../Home/Trending'; // Adjust path as needed
     import Popular from '../Home/Popular'; // Adjust path as needed
     import RecentEpisode from '../Home/RecentEpisode'; // Adjust path as needed

    import Trending2 from '../Home/Trending2'; // Adjust path as needed

 
const Home = () => {
 
  return (
    <ScrollView style={styles.container}>
     
          
          <Trending />
             <RecentEpisode />
          <Popular/>
        <Trending2 />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161616',
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  offlineText: {
    color: 'white',
    fontSize: 20,
    textAlign: 'center',
  },
});

export default Home;
