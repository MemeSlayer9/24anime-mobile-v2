import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Image, ActivityIndicator, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import axios from "axios";
import { Anime } from "../Types/types";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../Types/navigationtypes";
import { StackNavigationProp } from "@react-navigation/stack";

type TrendingScreenNavigationProp = StackNavigationProp<RootStackParamList, "Details">;

const TrendingItem: React.FC<{ item: Anime; itemWidth: number; navigation: TrendingScreenNavigationProp }> = ({ item, itemWidth, navigation }) => {
  const [isPressed, setIsPressed] = useState(false);
  const imageUrl = item.image || "https://via.placeholder.com/80x120";
  const title = item.title.english || item.title.romaji || "Unknown Title";
  const id = item.id.toString();

  return (
    <TouchableOpacity
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onPress={() => navigation.navigate("Details", { id: Number(id) })}
      style={[styles.itemContainer, { width: itemWidth }, isPressed && styles.itemPressed]}
    >
      <Image source={{ uri: imageUrl }} style={styles.image} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{id}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

const Trending = () => {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigation = useNavigation<TrendingScreenNavigationProp>();

  const { width } = Dimensions.get("window");
  const itemWidth = width / 3; // Each item takes up one-third of the screen width

  useEffect(() => {
    const fetchTrendingAnime = async () => {
      try {
        console.log("Fetching trending anime...");
        const response = await axios.get("https://mcgregor-seven.vercel.app/meta/anilist/trending");

        if (response.data && Array.isArray(response.data.results)) {
          setAnimeList(response.data.results as Anime[]);
        } else if (response.data && Array.isArray(response.data)) {
          setAnimeList(response.data as Anime[]);
        } else {
          console.warn("Unexpected API response format:", response.data);
          setAnimeList([]);
        }
      } catch (error) {
        console.error("Error fetching trending anime:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingAnime();
  }, []);

  const renderItem = ({ item }: { item: Anime }) => (
    <TrendingItem item={item} itemWidth={itemWidth} navigation={navigation} />
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={animeList}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.flatListContainer}
        renderItem={renderItem}
        getItemLayout={(data, index) => ({ length: itemWidth, offset: itemWidth * index, index })}
        initialScrollIndex={currentIndex}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
   },
  flatListContainer: {
    paddingHorizontal: 10,
  },
  textContainer: {
    marginTop: 10,
    alignItems: "center",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  itemContainer: {
    paddingVertical: 10,
    alignItems: "center",
    marginHorizontal: 10, // Adds spacing between items
    borderRadius: 5,
    overflow: "hidden",
  },
  itemPressed: {
     transform: [{ scale: 0.95 }],
  },
  image: {
    width: 140,
    height: 200,
    resizeMode: "cover",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default Trending;
