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
  Animated,
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
  BackupResponse,
} from "../Types/types";
import { useAnimeId } from "../context/EpisodeContext";
import { zoroSlug } from "../mapping/zoroSlugMapping";
import { useBookMarkId } from "../context/BookmarkContent";
import { Ionicons } from '@expo/vector-icons';
import { useUser } from "../context/UserContext";
import { supabase } from '../supabase/supabaseClient';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type DetailsScreenRouteProp = RouteProp<RootStackParamList, "Details">;

interface AnimekaiEpisode {
  id: string;
  number: number;
  title: string;
  image: string;
  overview?: string;
  rating?: number;
}

interface AnimekaiResponse {
  episodesList: AnimekaiEpisode[];
}

interface UnifiedProviderEpisode {
  episodeNumber: number;
  episodeId: string;
  title: string;
  rating?: string;
  aired: boolean;
  overview?: string;
  thumbnail?: string;
  provider: string;
}

interface UnifiedProviderResponse {
  data: {
    malId: number;
    anilistId: number;
    image: string;
    color?: string;
    bannerImage?: string;
    title: {
      romaji: string;
      english?: string;
      native?: string;
    };
    trailer?: {
      id: string;
      site: string;
      thumbnail: string;
    };
    format: string;
    status: string;
    duration?: number;
    score?: number;
    genres: string[];
    episodes: number;
    synopsis?: string;
    season?: string;
    releaseDate?: string;
    endDate?: string;
    studio?: string;
    producers?: string[];
  };
  providerEpisodes: UnifiedProviderEpisode[];
}

const Details = () => {
  const route = useRoute<DetailsScreenRouteProp>();
  const { id } = route.params;
  const { setAnimeId, setEpisodeid } = useAnimeId();
  const { setbookMarkId } = useBookMarkId();
  const { user } = useUser();

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [provider, setProvider] = useState("zoro");
  const [zoroId, setZoroId] = useState("");
  const [dub, setDub] = useState("");
  const [item4, setItem4] = useState<BackupResponse | null>(null);
  const [backupImageUrl, setBackupImageUrl] = useState<string>("");
  const [HianimeId, setHianimeId] = useState<string>("");
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [notificationOpacity] = useState(new Animated.Value(0));
  const [notificationMessage, setNotificationMessage] = useState('Added to My Playlist');
  const [notificationIconName, setNotificationIconName] = useState<IoniconsName>('checkmark-circle');
  const [notificationIconColor, setNotificationIconColor] = useState('#4CD964');
  const [providerData, setProviderData] = useState<ProviderData | null>(null);
  const [animekaiEpisodes, setAnimekaiEpisodes] = useState<AnimekaiEpisode[]>([]);
  const [unifiedProviderData, setUnifiedProviderData] = useState<UnifiedProviderResponse | null>(null);

  const [anime, setAnime] = useState<Anime | null>(null);
  const [anime2, setAnime2] = useState<Anime2 | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleExpanded = () => setIsExpanded(prev => !prev);
  const [activeTab, setActiveTab] = useState('description');
  const [mappedZoroId, setMappedZoroId] = useState("");
  const [animekaiAnimeId, setAnimekaiAnimeId] = useState<string>("");
  
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  interface ProviderData {
    data: {
      title: {
        romaji: string;
      };
      image: string;
      score: number;
      status: string;
      season: string;
      genres: string[];
      synopsis: string;
    };
    provider: {
      id: string;
      name: string;
      provider: string;
    };
  }

  const tabs = [
    { key: "description", label: "Description" },
    { key: "relations", label: "Relations" },
    { key: "recommendations", label: "Recommendations" },
    { key: "characters", label: "Characters" },
  ];

  const fetchAnimeDetails = async () => {
    try {
      if (provider === "animekai" || provider === "allanime" || provider === "anizone" || provider === "animepahe") {
        const response = await axios.get(
          `https://panuhak.vercel.app/meta/anilist/info/${id}?provider=zoro`
        );

        const modifiedAnime = {
          ...response.data,
          posterImage: response.data.posterImage?.replace("/medium/", "/large/"),
          episodes: [],
        };

        setAnime(modifiedAnime);
        setEpisodes([]);
      } else {
        const response = await axios.get(
          `https://panuhak.vercel.app/meta/anilist/info/${id}?provider=${provider}`
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
      }
    } catch (err) {
      throw err;
    }
  };

  const formatAnimekaiId = (url: string): string => {
    if (!url) return '';
    const parts = url.split('/watch/');
    const slug = parts[1] || url;
    return `${slug}-token`;
  };

  const fetchAnimekaiEpisodes = async () => {
    try {
      console.log(`Fetching Animekai data for Anilist ID: ${id}`);
      
      const animeTitle = anime?.title?.romaji || anime?.title?.english || providerData?.data?.title?.romaji;
      
      if (!animeTitle) {
        console.log('No anime title available yet, waiting...');
        return;
      }
      
      console.log(`Searching Animekai with title: ${animeTitle}`);
      
      const searchResponse = await axios.get(
        `https://kenjitsu.vercel.app/api/animekai/anime/search?q=${encodeURIComponent(animeTitle)}`
      );
      
      console.log('Animekai Search Response:', searchResponse.data);
      
      const results = searchResponse.data?.data || [];
      
      if (results.length === 0) {
        console.log('No search results found');
        setAnimekaiEpisodes([]);
        return;
      }
      
      let matchedAnime = results.find((result: any) => 
        result.romaji === animeTitle || result.name === animeTitle
      );
      
      if (!matchedAnime && results.length > 0) {
        matchedAnime = results[0];
        console.log(`Using first search result: ${matchedAnime.name}`);
      }
      
      if (!matchedAnime) {
        console.log(`No Animekai anime found for: ${animeTitle}`);
        setAnimekaiEpisodes([]);
        return;
      }
      
      const animekaiId = matchedAnime.id;
      console.log(`Found Animekai anime with ID: ${animekaiId}`);
      setAnimekaiAnimeId(animekaiId);
      
      if (matchedAnime.episodes && Array.isArray(matchedAnime.episodes)) {
        console.log(`Using episodes from search result: ${matchedAnime.episodes.length} episodes`);
        setAnimekaiEpisodes(matchedAnime.episodes);
      } else {
        await fetchAnimekaiAnimeDetails(animekaiId);
      }
    } catch (error) {
      console.error("Error fetching Animekai data:", error);
      if (axios.isAxiosError(error)) {
        console.log('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      }
      setAnimekaiEpisodes([]);
    }
  };

  const fetchAnimekaiAnimeDetails = async (animekaiId: string) => {
    try {
      const animeResponse = await axios.get(
        `https://kenjitsu.vercel.app/api/animekai/anime/${animekaiId}`
      );
      
      console.log('Animekai Anime Response:', animeResponse.data);
      
      const episodes = animeResponse.data?.providerEpisodes || 
                      animeResponse.data?.data?.episodes || 
                      animeResponse.data?.episodes;
      
      if (episodes && Array.isArray(episodes)) {
        const mappedEpisodes = episodes.map((ep: any) => ({
          id: ep.episodeId || ep.id,
          number: ep.episodeNumber || ep.number,
          title: ep.title,
          image: ep.thumbnail || ep.image || anime?.image || providerData?.data?.image,
          overview: ep.overview,
          rating: ep.rating
        }));
        
        setAnimekaiEpisodes(mappedEpisodes);
        console.log(`Fetched ${mappedEpisodes.length} Animekai episodes`);
      } else {
        console.log('No episodes found in Animekai response');
        setAnimekaiEpisodes([]);
      }
    } catch (error) {
      console.error("Error fetching Animekai anime details:", error);
      setAnimekaiEpisodes([]);
    }
  };

  const fetchUnifiedProviderData = async (providerType: 'allanime' | 'anizone' | 'animepahe') => {
    try {
      console.log(`Fetching ${providerType} data for ID: ${id}`);
      const response = await axios.get(
        `https://kenjitsu.vercel.app/api/anilist/episodes/${id}?provider=${providerType}`
      );
      
      console.log(`${providerType} API Response:`, response.data);
      console.log('Provider Episodes from response:', response.data.providerEpisodes);
      console.log(`Fetched ${response.data.providerEpisodes?.length || 0} ${providerType} episodes`);
      
      setUnifiedProviderData(response.data);
    } catch (error) {
      console.error(`Error fetching ${providerType} data:`, error);
      setUnifiedProviderData(null);
    }
  };

  const fetchProvider = async () => {
    try {
      const response = await axios.get(`https://kenjitsu.vercel.app/api/anilist/mappings/${id}`);

      setProviderData(response.data);

      const providerData = response.data?.provider;

      if (providerData?.id) {
        setZoroId(providerData.id);
        console.log(`Provider ID found: ${providerData.id} for anime ${id}`);
      } else {
        console.log(`No provider ID found for ${id}, using main id as fallback`);
        setZoroId(id.toString());
      }

      if (providerData?.name) {
        console.log(`Provider name: ${providerData.name}`);
      }

      if (providerData?.provider) {
        console.log(`Provider type: ${providerData.provider}`);
      }

      setError(null);
    } catch (error) {
      console.error("Provider API failed", error);
      setZoroId(id.toString());
      setError("Failed to fetch provider data, using fallback");
    }
  };

  const stripHtmlTags = (html: string | null | undefined): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
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

  useEffect(() => {
    if (provider === "animekai") {
      fetchAnimekaiEpisodes();
    } else if (provider === "allanime" || provider === "anizone" || provider === "animepahe") {
      fetchUnifiedProviderData(provider);
    }
  }, [provider, id]);

  const fetchBackupImage = async () => {
    try {
      const mappedZoroId = zoroSlug[id] || zoroSlug[zoroId] || zoroId;
      
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

  const handleAddBookmark = async (id?: number): Promise<void> => {
    if (id == null || !user) return;
    
    if (isBookmarked) {
      try {
        const { error } = await supabase
          .from('playlists')
          .delete()
          .eq('user_id', user.id)
          .eq('episode_id', id);
        
        if (error) {
          console.error('Error removing bookmark:', error);
          return;
        }
        
        setIsBookmarked(false);
        setNotificationMessage('Removed from My Playlist');
        setNotificationIconName('close-circle');
        setNotificationIconColor('#FF3B30');
      } catch (error) {
        console.error('Error removing bookmark:', error);
      }
    } else {
      setbookMarkId(id);
      setIsBookmarked(true);
      setNotificationMessage('Added to My Playlist');
      setNotificationIconName('checkmark-circle');
      setNotificationIconColor('#4CD964');
    }
    
    Animated.sequence([
      Animated.timing(notificationOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.delay(1500),
      Animated.timing(notificationOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
  };

  useEffect(() => {
    const checkIfBookmarked = async () => {
      if (user && anime?.id) {
        try {
          const { data, error } = await supabase
            .from('playlists')
            .select('*')
            .eq('user_id', user.id)
            .eq('episode_id', anime.id);
          
          if (error) {
            console.error('Error checking bookmark status:', error);
            return;
          }
          
          setIsBookmarked(data && data.length > 0);
        } catch (error) {
          console.error('Error checking bookmark status:', error);
        }
      }
    };
    
    checkIfBookmarked();
  }, [user, anime]);

  const fetchEpisode = async () => {
    setLoading(true);
    try {
      const mappedZoroId = zoroSlug[id] || zoroSlug[zoroId] || zoroId;
      
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

  const filteredAnimekaiEpisodes = animekaiEpisodes
    .filter((episode) => {
      if (!searchQuery) return true;
      return episode.number.toString().includes(searchQuery);
    })
    .sort((a, b) => Number(a.number) - Number(b.number));

  const filteredUnifiedEpisodes = unifiedProviderData?.providerEpisodes
    ? unifiedProviderData.providerEpisodes
        .filter((episode) => {
          if (!searchQuery) return true;
          return episode.episodeNumber.toString().includes(searchQuery);
        })
        .sort((a, b) => Number(a.episodeNumber) - Number(b.episodeNumber))
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
          const formattedEpisodeId = item.episodeId;
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

  const renderAnimekaiEpisodeItem = ({ item }: { item: AnimekaiEpisode }) => {
    return (
      <TouchableOpacity
        style={styles.episodeContainer}
        onPress={() => {
         setEpisodeid(item.id);
          setAnimeId(animekaiAnimeId || id);
          navigation.navigate("Animekai");
          console.log("wamuz", item.id);
          console.log("cruz", animekaiAnimeId || id)
        }}
      >
        <Image
          source={{
            uri: item.image || anime?.image || providerData?.data?.image || "https://via.placeholder.com/150",
          }}
          style={styles.episodeThumbnail}
        />
        <View style={styles.episodeTextContainer}>
          <Text style={styles.episodeTitle}>Episode {item.number}</Text>
          <Text style={styles.episodeTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.rating && (
            <Text style={styles.episodeMeta}>Rating: {item.rating}%</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderUnifiedEpisodeItem = ({ item }: { item: UnifiedProviderEpisode }) => {
    const navigationMap = {
      'allanime': 'Allanime',
      'anizone': 'Anizone',
      'animepahe': 'Animepahe'
    };

    return (
      <TouchableOpacity
        style={styles.episodeContainer}
        onPress={() => {
          setEpisodeid(item.episodeId);
          setAnimeId(id);
          navigation.navigate(navigationMap[provider as keyof typeof navigationMap] as any);
          console.log(`${provider} Episode ID:`, item.episodeId);
        }}
      >
        <Image
          source={{
            uri: item.thumbnail || unifiedProviderData?.data?.image || anime?.image || "https://via.placeholder.com/150",
          }}
          style={styles.episodeThumbnail}
        />
        <View style={styles.episodeTextContainer}>
          <Text style={styles.episodeTitle}>Episode {item.episodeNumber}</Text>
          <Text style={styles.episodeTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.rating && (
            <Text style={styles.episodeMeta}>Rating: {item.rating}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const providerOptions = [
    { label: "Animepahe", value: "animepahe" },
    { label: "Zoro", value: "zoro" },
    { label: "Animekai", value: "animekai" },
    { label: "Allanime", value: "allanime" },
    { label: "Anizone", value: "anizone" },
  ];

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
            source={{ uri: unifiedProviderData?.data?.image || anime?.image || anime2?.coverImage?.large || providerData?.data?.image }}
            style={styles.image}
          />
          <LinearGradient
            colors={["rgba(10, 20, 22, 0)", "rgba(22, 22, 22, 1)"]}
            style={styles.overlayGradient}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {unifiedProviderData?.data?.title?.romaji || anime?.title?.romaji || providerData?.data?.title?.romaji}
          </Text>
          <View style={styles.metadata}>
            <Text style={styles.metadataText}>Rating: {unifiedProviderData?.data?.score || anime?.rating || providerData?.data?.score}%</Text>
            <Text style={styles.metadataText}>Status: {unifiedProviderData?.data?.status || anime?.status || providerData?.data?.status}</Text>
            <Text style={styles.metadataText}>Season: {unifiedProviderData?.data?.season || anime?.season || providerData?.data?.season}</Text>
          </View>
          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              {unifiedProviderData?.data?.genres?.join(", ") || anime?.genres.join(", ") || providerData?.data?.genres.join(", ")}
            </Text>
          </View>
          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              Started Date:{" "}
              {anime?.startIn
                ? `${anime?.startIn?.year || ''} ${months[anime?.startIn?.month - 1] || ''} ${anime?.startIn?.day || ''}`
                : anime?.startDate
                ? `${anime?.startDate?.year || ''} ${months[anime?.startDate?.month - 1] || ''} ${anime?.startDate?.day || ''}`
                : unifiedProviderData?.data?.releaseDate || ''}
            </Text>
            <Text style={styles.metadataText}>End Date:{" "}
              {anime?.endIn
                ? `${anime?.endIn?.year || ''} ${months[anime?.endIn?.month - 1] || ''} ${anime?.endIn?.day || ''}`
                : anime?.endDate
                ? `${anime?.endDate?.year || ''} ${months[anime?.endDate?.month - 1] || ''} ${anime?.endDate?.day || ''}`
                : unifiedProviderData?.data?.endDate || ''}
            </Text>
          </View>
        </View>
        
        <Animated.View 
          style={[
            styles.notificationContainer, 
            { opacity: notificationOpacity }
          ]}
        >
          <View style={styles.notificationContent}>
            <Ionicons name={notificationIconName} size={20} color={notificationIconColor} />
            <Text style={styles.notificationText}>{notificationMessage}</Text>
          </View>
        </Animated.View>

        {user && (
          <TouchableOpacity
            onPress={() => {
              const animeId = anime?.id;
              if (animeId !== undefined) {
                handleAddBookmark(typeof animeId === 'string' ? Number(animeId) : animeId);
              }
            }}
            style={styles.bookmarkButton}
          >
            <Ionicons 
              name={isBookmarked ? "bookmark" : "bookmark-outline"} 
              size={30} 
              color="#DB202C" 
            />
          </TouchableOpacity>
        )}

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

        {activeTab === 'description' && (
          <View style={styles.descriptionContainer}>
            <Text
              style={styles.description}
              numberOfLines={isExpanded ? undefined : 4}
              ellipsizeMode="tail"
            >
              {stripHtmlTags(unifiedProviderData?.data?.synopsis) ||
               stripHtmlTags(providerData?.data?.synopsis) || 
               anime?.description || 
               anime2?.description || 
               'No description available'}
            </Text>
            <TouchableOpacity onPress={toggleExpanded}>
              <Text style={styles.readMore}>
                {isExpanded ? "Read Less" : "Read More"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

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

        {activeTab === 'characters' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {anime?.characters?.map((character) => (
              <TouchableOpacity key={character?.id}>
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

      {/* Render episodes based on provider */}
      {provider === "zoro" && (
        <FlatList
          data={filteredBackupEpisodes}
          renderItem={renderBackupEpisodeItem}
          keyExtractor={(item) => item.episodeId}
          scrollEnabled={false}
          contentContainerStyle={styles.episodesList}
        />
      )}

      {provider === "animekai" && (
        filteredAnimekaiEpisodes.length > 0 ? (
          <FlatList
            data={filteredAnimekaiEpisodes}
            renderItem={renderAnimekaiEpisodeItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.episodesList}
          />
        ) : (
          <View style={styles.noEpisodesContainer}>
            <Text style={styles.noEpisodesText}>
              {loading ? "Loading episodes..." : "No episodes available for Animekai"}
            </Text>
          </View>
        )
      )}

      {(provider === "allanime" || provider === "anizone" || provider === "animepahe") && (
        filteredUnifiedEpisodes.length > 0 ? (
          <FlatList
            data={filteredUnifiedEpisodes}
            renderItem={renderUnifiedEpisodeItem}
            keyExtractor={(item) => item.episodeId}
            scrollEnabled={false}
            contentContainerStyle={styles.episodesList}
          />
        ) : (
          <View style={styles.noEpisodesContainer}>
            <Text style={styles.noEpisodesText}>
              {loading ? "Loading episodes..." : `No episodes available for ${provider}`}
            </Text>
          </View>
        )
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
  bookmarkButton: {
    position: 'absolute',
    top: 10,
    right: 10,
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
    color: "#fff",
  },
  dropdownText: {
    color: "#fff",
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
    borderBottomColor: "#DB202C",
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
  descriptionContainer: { 
    paddingHorizontal: 10, 
    marginVertical: 10 
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
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
  bitch: {
    width: 150,
    height: 200,
    borderRadius: 10,
    marginRight: 10,
  },
  notificationContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  notificationContent: {
    backgroundColor: 'rgba(22, 22, 22, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  notificationText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  noEpisodesContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noEpisodesText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default Details;