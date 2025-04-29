import React, { useEffect } from "react";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "react-native";

import { createStackNavigator } from "@react-navigation/stack";
import TabNavigator from "./TabNavigator"; // Import Tab Navigator
import Details from "../screens/Details";
import VideoPlayer from "../screens/VideoPlayer";
import WatchZoro from "../Watch/WatchZoro"; // Ensure the path and export name are correct
import WatchAnimePahe from "../Watch/WatchAnimepahe"; // Ensure the path and export name are correct
import WatchAnimekai from '../Watch/WatchAnimekai';
import WatchAnimeMaster from '../Watch/WatchAnimeMaster';
import ProfileScreen from "../Profile/Profile";
import { EpisodeProvider } from "../context/EpisodeContext"; // adjust the path as needed
import SearchHeader from "../Search/SearchHeader";
import Search from "../Search/SearchScreen";
import LoginScreen from "../Profile/Login";
import { UserProvider, useUser } from "../context/UserContext";
import EditProfileScreen from "../Profile/EditProfile";
import RegisterScreen from "../Profile/RegisterScreen";
import { MyPlaylistProvider } from '../context/MyPlaylistProvider'; // your PlaylistProvider with clearPlaylist
import { PlaylistProvider } from '../context/PlaylistProvider'; // the provider that has useMyId, if needed
import { BookmarkProvider } from "../context/BookmarkContent"; // update path as needed
import { EpisodeHistoryProvider } from "../context/EpisodeHistoryProvider";
import MyPlaylistScreen from '../Profile/MyPlaylistScreen';
import HistoryScreen from "../Profile/HistoryScreen";
export type RootStackParamList = {
  Tabs: undefined; 
  Details: { id: number };
  VideoPlayer: { anilistId: number; episodeNum: number };
  Zoro: undefined;
  Animepahe: undefined;
  Animekai: undefined;
  Animemaster: undefined;
  Search: undefined;
  Login: undefined;
  TabNavigator: undefined;
  EditProfile: undefined;
  Register: undefined;
  MyPlaylist: undefined;
  History: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function StackNavigator() {
  // Move the hook inside the component body
 useEffect(() => {
    // Set the Android navigation bar to transparent
    NavigationBar.setBackgroundColorAsync('#161616');
    // Optionally set the bar to auto-hide with gestures
    NavigationBar.setVisibilityAsync('visible');
  }, []);

  return (
        <UserProvider>
    <PlaylistProvider>
      <MyPlaylistProvider>
    <EpisodeHistoryProvider> 
    <EpisodeProvider> 
          <BookmarkProvider>

       <StatusBar backgroundColor="#161616" barStyle="light-content" />
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#161616',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerTitle: () => <SearchHeader />, // Use SearchHeader component for the title
        }}
      >
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="Details" component={Details} />
        <Stack.Screen name="Search" component={Search} />
              <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Register" component={RegisterScreen}/>
        <Stack.Screen name="TabNavigator" component={TabNavigator} />
                <Stack.Screen name="MyPlaylist" component={MyPlaylistScreen} />
                <Stack.Screen name="History" component={HistoryScreen} />

         <Stack.Screen
          name="Zoro"
          component={WatchZoro}
          options={{ headerShown: false }} // Hide header for Zoro
        />
        <Stack.Screen
          name="Animepahe"
          component={WatchAnimePahe}
          options={{ headerShown: false }} // Hide header for Animepahe
        />
        <Stack.Screen
          name="Animekai"
          component={WatchAnimekai}
          options={{ headerShown: false }} // Hide header for Animekai
        />
        <Stack.Screen
          name="Animemaster"
          component={WatchAnimeMaster}
          options={{ headerShown: false }} // Hide header for Animemaster
        />
        <Stack.Screen name="VideoPlayer" component={VideoPlayer} />
      </Stack.Navigator>
      </BookmarkProvider>
      
     </EpisodeProvider>
     </EpisodeHistoryProvider>
     </MyPlaylistProvider>
    </PlaylistProvider>
     </UserProvider>
  );
}
