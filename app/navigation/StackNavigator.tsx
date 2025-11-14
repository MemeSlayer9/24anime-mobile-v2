import React, { useEffect } from "react";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "react-native";

import { createStackNavigator } from "@react-navigation/stack";
import TabNavigator from "./TabNavigator";
import Details from "../screens/Details";
import VideoPlayer from "../screens/VideoPlayer";
import WatchZoro from "../Watch/WatchZoro";
import WatchAnimePahe from "../Watch/WatchAnimepahe";
import WatchAnimekai from '../Watch/WatchAnimekai';
import WatchAllanime from '../Watch/WatchAllanime';
import WatchAnimeMaster from '../Watch/WatchAnimeMaster';
import WatchAnicrush from '../Watch/WatchAniCrush';
import WatchAnizone from  '../Watch/WatchAnizone';
import { EpisodeProvider } from "../context/EpisodeContext";
import SearchHeader from "../Search/SearchHeader";
import Search from "../Search/SearchScreen";
import LoginScreen from "../Profile/Login";
import { UserProvider } from "../context/UserContext";
import EditProfileScreen from "../Profile/EditProfile";
import RegisterScreen from "../Profile/RegisterScreen";
import { MyPlaylistProvider } from '../context/MyPlaylistProvider';
import { PlaylistProvider } from '../context/PlaylistProvider';
import { BookmarkProvider } from "../context/BookmarkContent";
import { EpisodeHistoryProvider } from "../context/EpisodeHistoryProvider";
import MyPlaylistScreen from '../Profile/MyPlaylistScreen';
import HistoryScreen from "../Profile/HistoryScreen";
import { DownloadProvider } from "../context/DownloadContext"; // added DownloadProvider import

export type RootStackParamList = {
  Tabs: undefined; 
  Details: { id: number };
  VideoPlayer: { anilistId: number; episodeNum: number };
  Zoro: undefined;
  Animepahe: undefined;
  Animekai: undefined;
  Allanime: undefined;
  Animemaster: undefined;
  Search: undefined;
  Login: undefined;
  TabNavigator: undefined;
  EditProfile: undefined;
  Register: undefined;
  MyPlaylist: undefined;
  History: undefined;
  Anicrush: undefined;
  Anizone: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function StackNavigator() {
  useEffect(() => {
    NavigationBar.setBackgroundColorAsync('#161616');
    NavigationBar.setVisibilityAsync('visible');
  }, []);

  return (
    <UserProvider>
      <DownloadProvider>  {/* Wrap navigation in DownloadProvider */}
        <PlaylistProvider>
          <MyPlaylistProvider>
            <EpisodeHistoryProvider>
              <EpisodeProvider>
                <BookmarkProvider>
                  <StatusBar backgroundColor="#161616" barStyle="light-content" />
                  <Stack.Navigator
                    screenOptions={{
                      headerShown: true,
                      headerStyle: { backgroundColor: '#161616' },
                      headerTintColor: '#fff',
                      headerTitleStyle: { fontWeight: 'bold' },
                      headerTitle: () => <SearchHeader />,
                    }}
                  >
                    <Stack.Screen name="Tabs" component={TabNavigator} />
                    <Stack.Screen name="Details" component={Details} />
                    <Stack.Screen name="Search" component={Search} />
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                    <Stack.Screen name="MyPlaylist" component={MyPlaylistScreen} />
                    <Stack.Screen name="History" component={HistoryScreen} />

                    <Stack.Screen
                      name="Zoro"
                      component={WatchZoro}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="Animepahe"
                      component={WatchAnimePahe}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="Animekai"
                      component={WatchAnimekai}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="Animemaster"
                      component={WatchAnimeMaster}
                      options={{ headerShown: false }}
                    />
                     <Stack.Screen
                      name="Anicrush"
                      component={WatchAnicrush}
                      options={{ headerShown: false }}
                    />
                       <Stack.Screen
                      name="Allanime"
                      component={WatchAllanime}
                      options={{ headerShown: false }}
                    />
                     <Stack.Screen
                      name="Anizone"
                      component={WatchAnizone}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen name="VideoPlayer" component={VideoPlayer} />
                  </Stack.Navigator>
                </BookmarkProvider>
              </EpisodeProvider>
            </EpisodeHistoryProvider>
          </MyPlaylistProvider>
        </PlaylistProvider>
      </DownloadProvider>
    </UserProvider>
  );
}
