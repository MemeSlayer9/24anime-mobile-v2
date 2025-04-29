import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { Dropdown } from "react-native-element-dropdown";
import {
  Anime,
  RootStackParamList,
  Episode,
  Anime2,
  Anime3,
  Anime3Episode,
  BackupResponse,
} from "../Types/types";
import { useAnimeId } from "../context/EpisodeContext";
import { slugMapping } from "../mapping/slugMapping"; // adjust the relative path as needed
import { zoroSlug } from "../mapping/zoroSlugMapping";

// Define the route type for this screen
type DetailsScreenRouteProp = RouteProp<RootStackParamList, "Details">;

const Details = () => {
  const route = useRoute<DetailsScreenRouteProp>();
  const { id } = route.params;
  const { setAnimeId, setEpisodeid } = useAnimeId();

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [provider, setProvider] = useState("zoro");
  const [zoroId, setZoroId] = useState("");
  const [dub, setDub] = useState("");
  const [item4, setItem4] = useState<BackupResponse | null>(null);
    const [backupImageUrl, setBackupImageUrl] = useState<string>("");
  const [HianimeId, setHianimeId] = useState<string>("");
  const [slug, setSlug] = useState<string>("");

  const [anime, setAnime] = useState<Anime | null>(null);
  const [anime2, setAnime2] = useState<Anime2 | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
const [isExpanded, setIsExpanded] = useState(false);
const toggleExpanded = () => setIsExpanded(prev => !prev);
  const [activeTab, setActiveTab] = useState('description'); // Default tab
const [mappedZoroId, setMappedZoroId] = useState("");

  // New state to store additional details fetched using the slug URL
  const [slugDetails, setSlugDetails] = useState<Anime3 | null>(null);

    const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
   // Helper function to generate slug from text
  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };
const tabs = [
  { key: "description", label: "Description" },
  { key: "relations",    label: "Relations" },
  { key: "recommendations", label: "Recommendations" },
  { key: "characters",   label: "Characters" },
];
  // Fetch anime details using the primary API
  const fetchAnimeDetails = async () => {
    try {
      const response = await axios.get(
        `https://partyonyou.vercel.app/meta/anilist/info/${id}?provider=${provider}`
      );

      const modifiedAnime = {
        ...response.data,
        posterImage: response.data.posterImage?.replace("/medium/", "/large/"),
      };

      setAnime(modifiedAnime);
 
      if (modifiedAnime.episodes) {
        const mappedEpisodes = modifiedAnime.episodes.map((episode: any) => ({
          ...episode,
          episodeid: episode.id,
        }));
        setEpisodes(mappedEpisodes);
      } else {
        setEpisodes([]);
      }
    } catch (err) {
      throw err;
    }
  };

  // Fetch provider details from a backup API
  const fetchProvider = async () => {
    try {
      const response = await axios.get(`https://api.amvstr.me/api/v2/info/${id}`);

      const modifiedAnime = {
        ...response.data,
        posterImage: response.data.posterImage?.replace("/medium/", "/large/"),
      };
      setAnime2(modifiedAnime);
 setAnime2(response.data);
      if (response.data?.id_provider) {
        const { idZoro } = response.data.id_provider;
        setZoroId(idZoro);
      }

      if (response.data?.dub !== undefined) {
        const { dub } = response.data;
        setDub(dub);
      }

      setError(null);
    } catch (error) {
      console.error("Backup API also failed", error);
      setError("Failed to fetch data from both APIs");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [primaryResult, providerResult] = await Promise.allSettled([
        fetchAnimeDetails(),
        fetchProvider(),
      ]);

      if (
        primaryResult.status === "rejected" &&
        providerResult.status === "rejected"
      ) {
        setError("Failed to fetch data from both APIs");
      } else {
        setError(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [id, provider]);

const fetchBackupImage = async () => {
  try {
    // Check if there's a mapping for this zoroId
    const mappedZoroId = zoroSlug[zoroId] || zoroId;
    
    const response = await axios.get(
      `https://wazzap-delta.vercel.app/api/v2/hianime/anime/${mappedZoroId}`
    );
    const posterUrl = response.data?.data?.anime?.info?.poster;
    const hianimeid = response.data?.data?.anime?.info?.id;
    
    setBackupImageUrl(posterUrl);
    setHianimeId(hianimeid);
  } catch (error) {
    console.error("Error fetching backup image:", error);
  } finally {
    setLoading(false);
  }
};

// Similarly, update your fetchEpisode function:
const fetchEpisode = async () => {
  setLoading(true);
  try {
    // Check if there's a mapping for this zoroId
    const mappedZoroId = zoroSlug[zoroId] || zoroId;
    
    const response = await axios.get(
      `https://wazzap-delta.vercel.app/api/v2/hianime/anime/${mappedZoroId}/episodes`
    );
    setItem4(response.data?.data || null);
  } catch (error) {
    console.error("Error fetching episodes:", error);
    setItem4(null);
  } finally {
    setLoading(false);
  }
};

 useEffect(() => {
  if (zoroId) {
    const mapped = zoroSlug[zoroId] || zoroId;
    setMappedZoroId(mapped);
  }
}, [zoroId]);

useEffect(() => {
  if (mappedZoroId) {
    fetchEpisode();
    fetchBackupImage();
  }
}, [mappedZoroId]);

  // Fetch additional details using a slug (only needed for Animemaster/Animemasterdub)
   useEffect(() => {
    if (anime?.title?.english) {
      const baseSlug = slugify(anime.title.english);
      let newSlug: string;

      if (provider === "animemasterdub" && dub && dub !== "false") {
        newSlug = slugMapping[`${baseSlug}-dub`] || `${baseSlug}-dub`;
      } else {
        newSlug = slugMapping[baseSlug] || baseSlug;
      }

      // 2. Store it in state
      setSlug(newSlug);
      console.log("Fetching details for slug:", newSlug);

      axios
        .get(`https://animemaster-one.vercel.app/details/${newSlug}`)
        .then((res) => setSlugDetails(res.data))
        .catch((err) =>
          console.error("Error fetching details with slug:", err)
        );
        console.log(`https://animemaster-one.vercel.app/details/${newSlug}`);
    }
  }, [anime, provider, dub]);

 
  if (loading) {
    return (
      <View style={styles.container}>
        <Image
          source={{
            uri: "https://media.tenor.com/On7kvXhzml4AAAAj/loading-gif.gif",
          }}
          style={styles.loadingGif}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  // Filter master episodes for Animemaster/Animemasterdub provider and sort them in ascending order.
  const filteredMasterEpisodes =
    slugDetails?.episodes && Array.isArray(slugDetails.episodes)
      ? slugDetails.episodes
          .filter((episode) => {
            if (!searchQuery) return true;
            return episode.episodeText
              .toLowerCase()
              .includes(searchQuery.toLowerCase());
          })
          .sort((a, b) => {
            const numA = parseInt(a.episodeText.replace(/[^0-9]/g, ""), 10);
            const numB = parseInt(b.episodeText.replace(/[^0-9]/g, ""), 10);
            return numA - numB;
          })
      : [];

  // Filter zoro/backup episodes for non-Animemaster providers
  const filteredEpisodes = episodes
    .filter((episode) => {
      if (!searchQuery) return true;
      return episode.number.toString().includes(searchQuery);
    })
    .sort((a, b) => Number(a.number) - Number(b.number));

  const filteredBackupEpisodes =
    item4 && Array.isArray(item4.episodes)
      ? item4.episodes
          .filter((episode) => {
            if (!searchQuery) return true;
            return episode.number.toString().includes(searchQuery);
          })
          .sort((a, b) => Number(a.number) - Number(b.number))
      : [];

  const renderEpisodeItem = ({ item }: { item: Episode }) => {
    return (
      <TouchableOpacity
        style={styles.episodeContainer}
        
        onPress={() => {
          setEpisodeid(item.episodeid);
          if (provider === "zoro") {
            navigation.navigate("Zoro");
          } else if (provider === "animepahe") {
            navigation.navigate("Animepahe");
          } else if (provider === "animekai") {
            navigation.navigate("Animekai");
          }
                   setAnimeId(id);

        }}
      >
        
        <Image source={{ uri: item.image }} style={styles.episodeThumbnail} />
        <View style={styles.episodeTextContainer}>
          <Text style={styles.episodeTitle}>Episode {item.number}</Text>
          <Text style={styles.episodeTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.episodeMeta}>{item.createdAt}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderBackupEpisodeItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={styles.episodeContainer}
        onPress={() => {
          const formattedEpisodeId = item.episodeId
            .replace("?", "$")
            .replace("ep=", "episode$");
          setEpisodeid(formattedEpisodeId);
                  setAnimeId(mappedZoroId);

          navigation.navigate("Zoro");
        }}
      >
        <Image
          source={{
            uri: backupImageUrl || "https://via.placeholder.com/150",
          }}
          style={styles.episodeThumbnail}
        />
        <View style={styles.episodeTextContainer}>
          <Text style={styles.episodeTitle}>Episode {item.number}</Text>
          <Text style={styles.episodeTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.isFiller && <Text style={styles.episodeMeta}>Filler</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderMasterEpisodes = ({ item }: { item: Anime3Episode }) => {
    return (
      <TouchableOpacity
        style={styles.episodeContainer}
        onPress={() => {
          const formattedEpisodeId = item.episodeId;
          setEpisodeid(formattedEpisodeId);
          setAnimeId(slug);
          navigation.navigate("Animemaster");
        }}
      >
        <Image
          source={{
            uri:
              slugDetails?.headBackground ||
              "https://via.placeholder.com/150",
          }}
          style={styles.episodeThumbnail}
        />
        <View style={styles.episodeTextContainer}>
          <Text style={styles.episodeTitle}>Episode {item.episodeText}</Text>
 
        </View>
      </TouchableOpacity>
    );
  };

  // Define base provider options
  const baseProviders = [
    { label: "Animepahe", value: "animepahe" },
    { label: "Zoro", value: "zoro" },
    { label: "Animekai", value: "animekai" },
    { label: "Animemaster", value: "animemaster" },
  ];

  // Conditionally add Animemasterdub if dub is truthy
  const providerOptions =
    dub && dub !== "false"
      ? [...baseProviders, { label: "Animemasterdub", value: "animemasterdub" }]
      : baseProviders;

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[
          "#161616",
          "rgba(22, 22, 22, 0.9)",
          "rgba(22, 22, 22, 0.8)",
        ]}
        style={styles.gradient}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: anime?.image || anime2?.coverImage?.large }}
            style={styles.image}
          />
          <LinearGradient
            colors={["rgba(10, 20, 22, 0)", "rgba(22, 22, 22, 1)"]}
            style={styles.overlayGradient}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {anime?.title?.romaji || anime2?.title?.romaji}
          </Text>
                             <View style={styles.metadata}>
               <Text style={styles.metadataText}>Rating: {anime?.rating || anime2?.score?.averageScore}%</Text>
                  <Text style={styles.metadataText}>Status: {anime?.status}</Text>
                <Text style={styles.metadataText}>Season: {anime?.season}</Text>
                 

        </View>
            <View style={styles.metadata}>

                    <Text style={styles.metadataText}>{anime?.genres.join(", ")}</Text>
                    </View>
                                               <View style={styles.metadata}>

<Text style={styles.metadataText}>
  Started Date:{" "}
  {anime?.startIn
    ? `${anime?.startIn?.year || ''} ${
        months[anime?.startIn?.month - 1] || ''
      } ${anime?.startIn?.day || ''}`
    : anime?.startDate
    ? `${anime?.startDate?.year || ''} ${
        months[anime?.startDate?.month - 1] || ''
      } ${anime?.startDate?.day || ''}`
    : ''}
</Text>
<Text style={styles.metadataText}>End Date:{" "}
   {anime?.endIn
    ? `${anime?.endIn?.year || ''} ${
        months[anime?.endIn?.month - 1] || ''
      } ${anime?.endIn?.day || ''}`
    : anime?.endDate
    ? `${anime?.endDate?.year || ''} ${
        months[anime?.endDate?.month - 1] || ''
      } ${anime?.endDate?.day || ''}`
    : ''}
</Text>
</View>
                 

        </View>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
  {tabs.map((tab) => {
    const isActive = activeTab === tab.key;
    return (
      <TouchableOpacity
        key={tab.key}
        onPress={() => setActiveTab(tab.key)}
        style={[
          styles.tabButton,
          isActive && styles.activeTabButton
        ]}
      >
        <Text
          style={[
            styles.tabText,
            isActive && styles.activeTabText
          ]}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  })}
</ScrollView>

{/* Description Tab Content */}
{activeTab === 'description' && (
  <View style={styles.descriptionContainer}>
    <Text
      style={styles.description}
      numberOfLines={isExpanded ? undefined : 4}
      ellipsizeMode="tail"
    >
      {anime?.description || anime2?.description}
    </Text>
    <TouchableOpacity onPress={toggleExpanded}>
      <Text style={styles.readMore}>
        {isExpanded ? "Read Less" : "Read More"}
      </Text>
    </TouchableOpacity>
  </View>
)}

{/* Recommendations Tab Content */}
{activeTab === 'recommendations' && (
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {(anime?.results || anime?.recommendations)?.map((recommendation) => (
      <TouchableOpacity
        key={recommendation?.id}
        style={styles.relation}
        onPress={() => navigation.navigate('Details', { id: recommendation?.id })}
      >
        <Image
          source={{ uri: recommendation?.coverImage?.large || recommendation?.image }}
          style={styles.bitch}
        />
        <Text
          style={[styles.episodeTitle, { width: 120 }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {recommendation?.title?.romaji}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
)}

{/* Relations Tab Content */}
{activeTab === 'relations' && (
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {(anime?.relation || anime?.relations)
      ?.filter(relation => (relation?.format === 'TV' || relation?.type === 'TV' || relation?.format === 'MOVIE' || relation?.type === 'MOVIE'))
      ?.map((relation) => (
        <TouchableOpacity
          key={relation?.id}
          style={styles.relation}
          onPress={() => navigation.navigate('Details', { id: relation?.id })}
        >
          <Image
            source={{ uri: relation?.coverImage?.large || relation?.image }}
            style={styles.bitch}
          />
          <View style={styles.textContainer}>
            <Text style={styles.episodeTitle}>Status: {relation?.status}</Text>
            <Text
              style={[styles.episodeTitle, { width: 120 }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {relation?.title?.romaji}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
  </ScrollView>
)}

{/* Characters Tab Content */}
{activeTab === 'characters' && (
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {anime?.characters?.map((character) => (
      <TouchableOpacity
        key={character?.id}
      >
        <Image
          source={{ uri: character?.image }}
          style={styles.bitch}
        />
        <View style={styles.textContainer}>
          <Text style={styles.episodeTitle}>{character?.name?.full}</Text>
        </View>
      </TouchableOpacity>
    ))}
  </ScrollView>
)}
      </LinearGradient>
       <View style={styles.dropdownContainer}>
        <Text style={styles.dropdownLabel}>Select Server:</Text>
      <Dropdown
  style={styles.dropdown}
  data={providerOptions}
  labelField="label"
  valueField="value"
  placeholder="Select Provider"
  value={provider}
  onChange={(item) => {
    setProvider(item.value);
  }}
  placeholderStyle={styles.dropdownPlaceholder}
  selectedTextStyle={styles.dropdownText}
/>
      </View>
      <View style={styles.nextEpisodesHeader}>
        <Text style={styles.nextEpisodesText}>Episodes</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by number"
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
          keyboardType="numeric"
        />
      </View>

       {provider === "zoro" && (
  <FlatList
    data={filteredBackupEpisodes}
    renderItem={renderBackupEpisodeItem}
    keyExtractor={(item) => item.episodeId}
    scrollEnabled={false}
    contentContainerStyle={styles.episodesList}
  />
)}

{/* For providers other than zoro, animemaster, and animemasterdub */}
{provider !== "zoro" && provider !== "animemaster" && provider !== "animemasterdub" && (
  filteredEpisodes.length > 0 ? (
    <FlatList
      data={filteredEpisodes}
      renderItem={renderEpisodeItem}
      keyExtractor={(item) => item.episodeid}
      scrollEnabled={false}
      contentContainerStyle={styles.episodesList}
    />
  ) : (
    filteredBackupEpisodes.length > 0 && (
      <FlatList
        data={filteredBackupEpisodes}
        renderItem={renderBackupEpisodeItem}
        keyExtractor={(item) => item.episodeId}
        scrollEnabled={false}
        contentContainerStyle={styles.episodesList}
      />
    )
  )
)}

{/* Render master episodes if Animemaster is selected */}
{provider === "animemaster" &&
  slugDetails?.episodes &&
  Array.isArray(slugDetails.episodes) && (
    <FlatList
      data={filteredMasterEpisodes}
      renderItem={renderMasterEpisodes}
      keyExtractor={(item) => item.episodeId}
      scrollEnabled={false}
      contentContainerStyle={styles.episodesList}
    />
)}

{/* Render master episodes if Animemasterdub is selected */}
{provider === "animemasterdub" &&
  slugDetails?.episodes &&
  Array.isArray(slugDetails.episodes) && (
    <FlatList
      data={filteredMasterEpisodes}
      renderItem={renderMasterEpisodes}
      keyExtractor={(item) => item.episodeId}
      scrollEnabled={false}
      contentContainerStyle={styles.episodesList}
    />
)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#161616",
  },
  dropdownContainer: {
    padding: 10,
    backgroundColor: "#1E1E1E",
    margin: 10,
    borderRadius: 8,
  },
  dropdownLabel: {
    color: "#fff",
    marginBottom: 6,
    fontSize: 16,
  },
  dropdown: {
    backgroundColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 10,
    color: "#pin",
  },
    dropdownPlaceholder: {
    color: "#fff", // Set placeholder text color to white
  },
  dropdownText: {
    color: "#fff", // Set selected text color to white
  },
  logContainer: {
    padding: 10,
    alignItems: "center",
  },
  logText: {
    color: "#fff",
    fontSize: 16,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 500,
  },
  gradient: {
    flex: 1,
  },
  loadingGif: {
    width: 100,
    height: 100,
    alignSelf: "center",
    marginTop: 20,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  episodeMeta: {
    fontSize: 14,
    color: "#BBBBBB",
    marginTop: 4,
  },
  nextEpisodesHeader: {
    marginBottom: 12,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nextEpisodesText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  searchInput: {
    backgroundColor: "#333",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    color: "#fff",
    minWidth: 120,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    padding: 10,
    textAlign: "center",
  },
  dubText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    marginVertical: 10,
    color: "#fff",
    paddingHorizontal: 10,
    textAlign: 'center',
  },
  episodesList: {
    paddingBottom: 16,
  },
  overlayGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  episodeThumbnail: {
    width: "40%",
    height: 100,
    borderRadius: 8,
  },
  episodeTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  error: {
    fontSize: 18,
    color: "red",
  },
  episodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    margin: 10,
    overflow: "hidden",
    padding: 10,
  },
  tabsContainer: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  tabButton: {
    marginHorizontal: 12,
    paddingVertical: 8,
  },
  activeTabButton: {
    borderBottomWidth: 3,
    borderBottomColor: "#DB202C",  // your accent color
  },
  tabText: {
    fontSize: 14,
    color: "#aaa",
  },
  activeTabText: {
    color: "#fff",
  },
 
  readMore: {
  color: "#1E90FF",
  marginTop: 4,
  fontSize: 14,
  textAlign: "center",
},
  descriptionContainer: { paddingHorizontal: 10, marginVertical: 10 },
  metadata: {
  flexDirection: 'row', // Horizontal layout
  justifyContent: 'center', // Center items horizontally
  alignItems: 'center', // Center items vertically
  marginVertical: 10, // Add spacing around the section
},
   metadataText: {
    color: '#fff',
    marginHorizontal: 5,
    textAlign: 'center',
  },
    relation: {
     alignItems: 'center',
    marginBottom: 10,
     borderRadius: 10,
    padding: 10,
  },
    bitch:{
   width: 150,
    height: 200,
    borderRadius: 10,
    marginRight: 10,
  },
});

export default Details;
