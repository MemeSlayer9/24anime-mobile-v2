import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Video } from "expo-av";
import { RouteProp, useRoute } from "@react-navigation/native";
 import {    RootStackParamList } from "../Types/types";

type VideoPlayerRouteProp = RouteProp<RootStackParamList, "VideoPlayer">;

const VideoPlayer = () => {
  const route = useRoute<VideoPlayerRouteProp>();
  const { anilistId, episodeNum } = route.params;

  const [m3u8Url, setM3u8Url] = useState<string | null>(null);

  const fetchM3u8Url = async (anilistId: number, episodeNum: number) => {
    try {
        const ip = "192.168.254.101";
    const response = await fetch(`http://${ip}:3000/scrape?url=https://player.smashy.stream/anime?anilist=${anilistId}%26e=${episodeNum}`);
      const data = await response.json();
      if (data.success) {
        setM3u8Url(data.m3u8Url);
      }

      console.log(`http://${ip}:3000/scrape?url=https://player.smashy.stream/anime?anilist=${anilistId}%26e=${episodeNum}`);
    } catch (error) {
      console.error("Error fetching M3U8 URL:", error);
    }
  };

  useEffect(() => {
    if (anilistId && episodeNum) {
      fetchM3u8Url(anilistId, episodeNum);
    }
  }, [anilistId, episodeNum]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Watch Anime</Text>
      {m3u8Url ? (
        <Video
          source={{ uri: m3u8Url }}
          style={styles.video}
          useNativeControls
          resizeMode="contain"
          isLooping
        />
      ) : (
        <Text>Loading video...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#161616",
    padding: 10,
  },
  title: {
    fontSize: 24,
    color: "#fff",
    textAlign: "center",
  },
  video: {
    width: "100%",
    height: 300,
    backgroundColor: "#000",
    marginBottom: 20,
  },
});

export default VideoPlayer;