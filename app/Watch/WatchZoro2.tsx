import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  Text,
  Modal,
  ActivityIndicator,
  Pressable,
  StatusBar,
  FlatList,
  Image,
  ScrollView,
  TextInput,
  Animated,
  Alert,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as ScreenOrientation from "expo-screen-orientation";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar";
import axios from "axios";
import { Anime, RootStackParamList, Episode, BackupResponse } from "../Types/types";
import { useAnimeId } from "../context/EpisodeContext"; // adjust path as needed
import { useKeepAwake } from "expo-keep-awake";
import { StackNavigationProp } from "@react-navigation/stack";
import AsyncStorage from '@react-native-async-storage/async-storage'; // Make sure AsyncStorage is installed
import { useEpisode } from "../context/EpisodeHistoryProvider";  // adjust path as needed :contentReference[oaicite:0]{index=0}&#8203;:contentReference[oaicite:1]{index=1}
import { zoroSlug } from "../mapping/zoroSlugMapping";

const { height, width } = Dimensions.get("window");

interface VideoRefMethods {
  playAsync: () => Promise<void>;
  pauseAsync: () => Promise<void>;
  unloadAsync: () => Promise<void>;
  loadAsync: (
    source: { uri: string },
    initialStatus?: object,
    downloadFirst?: boolean
  ) => Promise<void>;
  setPositionAsync: (position: number) => Promise<void>;
}

interface Subtitle {
  url: string;
  lang: string;
}

interface Segment {
  start: number;
  end: number;
}

type VideoPlayerRouteProp = RouteProp<RootStackParamList, "Zoro">;

const VideoWithSubtitles = Video as any;

const WatchZoro = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const videoRef = useRef<VideoRefMethods | null>(null);
  const route = useRoute<VideoPlayerRouteProp>();
  const { episodeid, animeId, setAnimeId, setEpisodeid } = useAnimeId();
const { episodes2, addEpisode, updateEpisode } = useEpisode();
  const [zoroId, setZoroId] = useState("");
  const [dub, setDub] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [initialVideoSource, setInitialVideoSource] = useState("");
  const [videoSource, setVideoSource] = useState("");
  const [paused, setPaused] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qualities, setQualities] = useState<Array<{ label: string; uri: string }>>([]);
  const [selectedQuality, setSelectedQuality] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loadingQualities, setLoadingQualities] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [selectedSubtitle, setSelectedSubtitle] = useState("disabled");
  const [subtitlesPickerVisible, setSubtitlesPickerVisible] = useState(false);
  const [parsedSubtitles, setParsedSubtitles] = useState<
    Array<{ start: number; end: number; text: string }>
  >([]);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [introSegment, setIntroSegment] = useState<Segment | null>(null);
  const [outroSegment, setOutroSegment] = useState<Segment | null>(null);
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [item4, setItem4] = useState<BackupResponse | null>(null);
    const [item5, setItem5] = useState<BackupResponse | null>(null);
const [isDubMode, setIsDubMode] = useState(false);

  const [backupImageUrl, setBackupImageUrl] = useState<string>("");
  const [isOn, setIsOn] = useState(false);
const [savedPosition, setSavedPosition] = useState<number | null>(null);

  console.log(animeId);
  useEffect(() => {
  const loadSaved = async () => {
    if (!episodeid) return;
    try {
      const json = await AsyncStorage.getItem(`playbackPosition_${episodeid}`);
      if (json !== null) {
        setSavedPosition(JSON.parse(json));
      }
    } catch (e) {
      console.warn("⚠️ failed to load saved position:", e);
    }
  };
  loadSaved();
}, [episodeid]);


  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: isOn ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isOn, animation]);

  const translateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 50],
  });

  const toggleSwitch = () => {
    setIsOn(previous => !previous);
  };

  useKeepAwake();
  
  
  useEffect(() => {
    if (episodeLoading) {
      const timeout = setTimeout(() => {
        console.warn("Fallback clearing episodeLoading after 10 seconds");
        setEpisodeLoading(false);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [episodeLoading]);

  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleOverlay = () => {
    setShowPlayIcon(true);
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    overlayTimeoutRef.current = setTimeout(() => {
      setShowPlayIcon(false);
    }, 2000);
  };

  const handleRewind = async () => {
    const newTime = currentTime - 10000;
    await videoRef.current?.setPositionAsync(newTime > 0 ? newTime : 0);
    toggleOverlay();
  };

  const handleFastForward = async () => {
    const newTime = currentTime + 10000;
    await videoRef.current?.setPositionAsync(newTime < duration ? newTime : duration);
    toggleOverlay();
  };

  const handlePlayPause = async () => {
    if (paused) await videoRef.current?.playAsync();
    else await videoRef.current?.pauseAsync();
    setPaused(!paused);
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 1000);
    toggleOverlay();
  };

  const handleSubClick = () => {
  setIsDubMode(false);
  fetchVideoWithDubSetting(false);
};

const handleDubClick = () => {
  setIsDubMode(true);
  fetchVideoWithDubSetting(true);
};

const fetchVideoWithDubSetting = async (isDub: boolean): Promise<void> => {
  try {
    const url = `https://kangaroo-kappa.vercel.app/anime/zoro/watch/${episodeid}?dub=${isDub ? 'true' : 'false'}`;
    
    const response = await axios.get(url);
    const json = response.data;
    if (json.sources && json.sources.length > 0) {
      const sourceUrl = json.sources[0].url;
      setInitialVideoSource(sourceUrl);2
      setVideoSource(sourceUrl);
      setSelectedQuality(sourceUrl);
    }
    if (json.subtitles) {
      setSubtitles(json.subtitles);
      const englishSubtitle = (json.subtitles as Subtitle[]).find((sub) =>
        sub.lang.toLowerCase().includes("en") || sub.lang.toLowerCase().includes("english")
      );
      if (englishSubtitle) {
        setSelectedSubtitle(englishSubtitle.lang);
      }
    }
    if (json.intro) {
      setIntroSegment(json.intro);
    }
    if (json.outro) {
      setOutroSegment(json.outro);
    }
  } catch (error) {
    console.error("Error fetching video data: ", error);
  }
};

// Update your useEffect to initialize with either sub or dub based on what's available
useEffect(() => {
  const isDubbed = currentEpisode?.isDubbed === true || currentBackupEpisode?.isDubbed === true;
  setIsDubMode(isDubbed);
  fetchVideoWithDubSetting(isDubbed);
}, [episodeid]);

  useEffect(() => {
    if (initialVideoSource) {
      const fetchQualities = async () => {
        setLoadingQualities(true);
        try {
          const response = await axios.get(initialVideoSource);
          const baseUrl = initialVideoSource.substring(0, initialVideoSource.lastIndexOf("/") + 1);
          const qualities = response.data.split("\n").reduce(
            (acc: Array<{ label: string; uri: string }>, line: string, i: number, arr: string[]) => {
              if (line.includes("RESOLUTION=")) {
                const resolution = line.match(/RESOLUTION=(\d+x\d+)/)?.[1] || "Auto";
                const parts = resolution.split("x");
                const heightLabel = parts[1] ? `${parts[1]}p` : resolution;
                const uri = arr[i + 1]?.startsWith("http")
                    ? arr[i + 1]
                    : `${baseUrl}${arr[i + 1]}`;
                if (!acc.some((q) => q.label === heightLabel)) {
                  acc.push({ label: heightLabel, uri });
                }
              }
              return acc;
            },
            []
          );
          setQualities(qualities.length ? qualities : [{ label: "Auto", uri: initialVideoSource }]);
        } catch (error) {
          console.error("Error fetching qualities: ", error);
        } finally {
          setLoadingQualities(false);
        }
      };
      fetchQualities();
    }
  }, [initialVideoSource]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const getVolumeIcon = (vol: number) => {
    if (vol === 0) return "volume-mute-sharp";
    if (vol > 0 && vol <= 0.33) return "volume-low-sharp";
    if (vol > 0.33 && vol <= 0.66) return "volume-medium-sharp";
    return "volume-high-sharp";
  };

  const parseTime = (timeStr: string) => {
    const parts = timeStr.split(":");
    let seconds = 0;
    if (parts.length === 3) {
      seconds = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
      seconds = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return seconds;
  };

  const parseVTT = (vttText: string) => {
    const cues: Array<{ start: number; end: number; text: string }> = [];
    const lines = vttText.split("\n");
    let cue: { start: number; end: number; text: string } | null = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes("-->")) {
        const [startStr, endStr] = line.split("-->");
        const start = parseTime(startStr.trim());
        const end = parseTime(endStr.trim());
        cue = { start, end, text: "" };
      } else if (line === "" && cue) {
        cues.push(cue);
        cue = null;
      } else if (cue) {
        cue.text += line + " ";
      }
    }
    if (cue) {
      cues.push(cue);
    }
    return cues;
  };

  useEffect(() => {
    const fetchSubtitle = async () => {
      if (selectedSubtitle !== "disabled") {
        const subtitleObj = subtitles.find((sub) => sub.lang === selectedSubtitle);
        if (subtitleObj) {
          try {
            const response = await axios.get(subtitleObj.url);
            const vttText = response.data;
            const cues = parseVTT(vttText);
            setParsedSubtitles(cues);
          } catch (error) {
            console.error("Error fetching subtitle file:", error);
          }
        }
      } else {
        setParsedSubtitles([]);
        setCurrentSubtitle("");
      }
    };
    fetchSubtitle();
  }, [selectedSubtitle, subtitles]);

  useEffect(() => {
    if (episodeLoading) {
      const timeout = setTimeout(() => {
        setEpisodeLoading(false);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [episodeLoading]);

 
    const fetchEpisode2 = async () => {
    setLoading(true);
    try {

          const mappedZoroId = zoroSlug[zoroId] || zoroId;
      
      const response = await axios.get(`https://kangaroo-kappa.vercel.app/anime/zoro/info?id=${mappedZoroId}`);
                  console.log(`https://kangaroo-kappa.vercel.app/anime/zoro/info?id=${mappedZoroId}`, "yawa");

      const data = response.data || null;
      setItem5(data);
    } catch (error) {
      console.error("Error fetching fallback episodes:", error);
     } finally {
      setLoading(false);
    }
  };

    const fetchProvider = async () => {
    try {
      const response = await axios.get(`https://api.amvstr.me/api/v2/info/${animeId}`);

      const modifiedAnime = {
        ...response.data,
        posterImage: response.data.posterImage?.replace("/medium/", "/large/"),
      };
       setAnimeId(modifiedAnime.id);

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
      if (zoroId) {
         fetchEpisode2();
      }
    }, [zoroId]);
    useEffect(() => {
 fetchProvider();
   }, [animeId]);

  
  const fetchAnimeDetails = async () => {
    try {
      const response = await axios.get(`https://kangaroo-kappa.vercel.app/meta/anilist/info/${animeId}?provider=zoro`);
      const modifiedAnime = {
        ...response.data,
        posterImage: response.data.posterImage?.replace("/medium/", "/large/"),
      };
      setAnime(modifiedAnime);
      setAnimeId(modifiedAnime.id);
   
      if (modifiedAnime.episodes) {
        const mappedEpisodes = modifiedAnime.episodes.map((episode: any) => ({
          ...episode,
          episodeid: episode.id,
        }));
        setEpisodes(mappedEpisodes);
      }
    } catch (err) {
      console.error("Error fetching anime details:", err);
      await fetchEpisode();
    }
  };

  const fetchEpisode = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`https://kangaroo-kappa.vercel.app/anime/zoro/info?id=${animeId}`);
      const data = response.data || null;
      setItem4(data);
    } catch (error) {
      console.error("Error fetching fallback episodes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBackupImage = async () => {
    try {
      const response = await axios.get(`https://wazzap-delta.vercel.app/api/v2/hianime/anime/${animeId}`);
      const posterUrl = response.data?.data?.anime?.info?.poster;
      setBackupImageUrl(posterUrl);
    } catch (error) {
     } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (animeId) {
      fetchAnimeDetails();
      fetchBackupImage();
    }
  }, [animeId]);
const savePlaybackPosition = async (positionMillis: number): Promise<void> => {
  try {
    if (!episodeid) return;
    const key = `playbackPosition_${episodeid}`;
    await AsyncStorage.setItem(key, JSON.stringify(positionMillis));
    
    // — convert to seconds —
    const savedSec = Math.floor(positionMillis / 1000);
    const durSec = Math.floor(duration / 1000);
    
    // — check if we already have this episode in context —
    const existing = episodes2.find(ep => ep.episode_id === episodeid);
  
 
    // Create episode title with episode number
    const episodeNumber = currentEpisode?.number || currentBackupEpisode?.number;
    const episodeTitle = `${anime?.title?.romaji || ""} Episode ${episodeNumber !== null ? episodeNumber : ''}`;
    
    // Current timestamp for created_at
    const currentTimestamp = new Date().toISOString();
    
    // Get the image from currentEpisode
    const imageUrl = currentEpisode?.image || backupImageUrl || 'https://via.placeholder.com/40';
    
    if (existing) {
      // update just the saved position & duration
      updateEpisode(existing.id, {
        saved_position: savedSec,
        duration: durSec,
        title: episodeTitle, // Updated title with episode number
      });
    } else {
      // add a fresh record
      addEpisode({
        id: Date.now(),
        episode_id: episodeid,
        title: episodeTitle,
        series_id: String(animeId), // Convert animeId to string
        image_url: imageUrl, // Using the episode image instead of anime image
        created_at: currentTimestamp,
        duration: durSec,
        saved_position: savedSec,
        provider: "Zoro",
      });
    }
  } catch (error) {
    console.error('Failed to save the playback position:', error);
  }
};
  
const handlePlaybackStatusUpdate = async (status: any) => {
  if (!status.isLoaded) return;

  // — restore position once —
  if (savedPosition !== null && status.positionMillis === 0) {
    try {
      await videoRef.current?.setPositionAsync(savedPosition);
    } catch (e) {
      console.warn("⚠️ failed to restore position:", e);
    }
    setSavedPosition(null);
  }

  // — your existing UI/state logic —
  if (episodeLoading) setEpisodeLoading(false);
  if (!isSliding)  setSliderValue(status.positionMillis);
  if (isVideoLoading) setIsVideoLoading(false);
  setCurrentTime(status.positionMillis);
  setDuration(status.durationMillis || 0);

  if (selectedSubtitle !== "disabled") {
    const currentSec = status.positionMillis / 1000;
    const cue = parsedSubtitles.find(
      (c) => currentSec >= c.start && currentSec < c.end
    );
    setCurrentSubtitle(cue?.text || "");
  }

  // — save on pause or finish —
  if (!status.isPlaying && status.positionMillis > 0) {
    savePlaybackPosition(status.positionMillis);
  }

  // — auto‑next episode —
  if (status.didJustFinish && isOn) {
    handleNextEpisode();
  }
};

  const handleQualityChange = (newUri: string) => {
    const currentPos = currentTime;
    setVideoSource(newUri);
    setSelectedQuality(newUri);
    setTimeout(() => {
      videoRef.current?.setPositionAsync(currentPos);
    }, 300);
  };

   
const filteredEpisodes = useMemo(() => {
  // Map the episodes and add isSubbed and isDubbed properties from item5
  const enhancedEpisodes = episodes.map(episode => {
    // Find the matching episode in item5.episodes by number
    // Convert both to strings or numbers for comparison
    const matchingEp = item5?.episodes?.find(ep => 
      String(ep.number) === String(episode.number)
    );
    
    if (matchingEp) {
      return {
        ...episode,
        isSubbed: matchingEp.isSubbed,
        isDubbed: matchingEp.isDubbed
      };
    }
    return episode;
  });
  
  // Then apply your existing filtering and sorting
  return enhancedEpisodes
    .filter((episode) => {
      if (!searchQuery) return true;
      return episode.number.toString().includes(searchQuery);
    })
    .sort((a, b) => Number(a.number) - Number(b.number));
}, [episodes, item5?.episodes, item4?.episodes, searchQuery]);

const filteredBackupEpisodes = useMemo(() => {
  if (!item4 || !Array.isArray(item4.episodes)) return [];

  return item4.episodes
    .map(episode => {
      // Check if this episode has subtitle/dub info already
      // If not, try to find matching info from item5
      if (episode.isSubbed === undefined || episode.isDubbed === undefined) {
        const episodeNumberStr = String(episode.number);
        const matchingEp5 = item5?.episodes?.find(ep => 
          String(ep.number) === episodeNumberStr
        );

        return {
          ...episode,
          isSubbed: episode.isSubbed ?? matchingEp5?.isSubbed ?? false,
          isDubbed: episode.isDubbed ?? matchingEp5?.isDubbed ?? false
        };
      }
      return episode;
    })
    .filter((episode) => {
      if (!searchQuery) return true;
      return episode.number.toString().includes(searchQuery);
    })
    .sort((a, b) => Number(a.number) - Number(b.number));
}, [item4?.episodes, item5?.episodes, searchQuery]);



   const currentIndex = filteredEpisodes.findIndex(
    (ep) => ep.episodeid === episodeid
  );

  
  const handlePreviousEpisode = () => {
    if (filteredEpisodes.length > 0) {
      if (currentIndex > 0) {
        const previousEpisode = filteredEpisodes[currentIndex - 1];
        setEpisodeLoading(true);
        setEpisodeid(previousEpisode.episodeid);
        navigation.navigate("Zoro");
      }
    } else if (filteredBackupEpisodes.length > 0) {
      const currentBackupIndex = filteredBackupEpisodes.findIndex(
        (item) => (item.episodeId) === episodeid
      );
      if (currentBackupIndex > 0) {
        const prevEpisode = filteredBackupEpisodes[currentBackupIndex - 1];
        setEpisodeLoading(true);
        setEpisodeid((prevEpisode.episodeId));
        navigation.navigate("Zoro");
      }
    }
  };

  const handleNextEpisode = () => {
    if (filteredEpisodes.length > 0) {
      if (currentIndex < filteredEpisodes.length - 1) {
        const nextEpisode = filteredEpisodes[currentIndex + 1];
        setEpisodeLoading(true);
        setEpisodeid(nextEpisode.episodeid);
        navigation.navigate("Zoro");
      }
    } else if (filteredBackupEpisodes.length > 0) {
      const currentBackupIndex = filteredBackupEpisodes.findIndex(
        (item) => (item.episodeId) === episodeid
      );
      if (currentBackupIndex < filteredBackupEpisodes.length - 1) {
        const nextEpisode = filteredBackupEpisodes[currentBackupIndex + 1];
        setEpisodeLoading(true);
        setEpisodeid((nextEpisode.episodeId));
        navigation.navigate("Zoro");
      }
    }
  };

  const currentBackupEpisode = filteredBackupEpisodes.find(
    (item) => (item.id) === episodeid
  );
  const currentBackupIndex = filteredBackupEpisodes.findIndex(
    (item) => (item.id) === episodeid
  );

  const handleToggleFullScreen = async () => {
    const currentPos = currentTime;
    if (!isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      await NavigationBar.setVisibilityAsync("hidden");
      navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
      StatusBar.setHidden(true);
      setControlsVisible(true);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      await NavigationBar.setVisibilityAsync("visible");
      navigation.getParent()?.setOptions({ tabBarStyle: { display: "flex" } });
      StatusBar.setHidden(false);
      setControlsVisible(true);
    }
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      videoRef.current?.setPositionAsync(currentPos);
    }, 300);
  };
  
  
  const currentEpisode = episodes.find((ep) => ep.episodeid === episodeid);

  const renderEpisodeItem = ({ item }: { item: Episode }) => {
    return (
      <TouchableOpacity
        style={styles.episodeContainer}
        onPress={() => {
          setEpisodeLoading(true);
          setEpisodeid(item.episodeid);
           navigation.navigate("Zoro");
        }}
      >
        <Image source={{ uri: item.image }} style={styles.episodeThumbnail} />
        <View style={styles.episodeTextContainer}>
          <Text style={styles.episodeTitle}>Episode {item.number}</Text>
          
          <Text style={styles.episodeTitle} numberOfLines={1}>
            {item.title}
          </Text>
             <View style={styles.badgeContainer}>
          {item.isSubbed === true && (
            <View style={[styles.badge, styles.subbedBadge]}>
              <Text style={styles.badgeText}>SUB</Text>
            </View>
          )}
          {item.isDubbed === true && (
            <View style={[styles.badge, styles.dubbedBadge]}>
              <Text style={styles.badgeText}>DUB</Text>
            </View>
          )}
        </View>
          <Text style={styles.episodeMeta}>{item.createdAt}</Text>
        </View>
      </TouchableOpacity>
    );
  };
const renderBackupEpisodeItem = ({ item }: { item: any }) => {
  // For debugging: console.log(`Episode ${item.number}:`, item.isSubbed, item.isDubbed);
  
  return (
    <TouchableOpacity
      style={styles.episodeContainer}
      onPress={() => {
        setEpisodeLoading(true);
        const formattedEpisodeId = item.id
        
        setEpisodeid(formattedEpisodeId);
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
        
        <View style={styles.badgeContainer}>
          {item.isSubbed === true && (
            <View style={[styles.badge, styles.subbedBadge]}>
              <Text style={styles.badgeText}>SUB</Text>
            </View>
          )}
          {item.isDubbed === true && (
            <View style={[styles.badge, styles.dubbedBadge]}>
              <Text style={styles.badgeText}>DUB</Text>
            </View>
          )}
        </View>
        
        {item.isFiller && <Text style={styles.episodeMeta}>Filler</Text>}
      </View>
    </TouchableOpacity>
  );
};


  
  // Updated renderFullscreen with a single outer TouchableWithoutFeedback (with pointerEvents defaulted to "auto")
  // so that its inner TouchableOpacity buttons receive touches.
const renderFullscreen = () => (
  <View style={{ flex: 1, backgroundColor: "#000" }}>
    <VideoWithSubtitles
      ref={videoRef}
      source={{ uri: videoSource }}
      style={styles.video}
      resizeMode={ResizeMode.CONTAIN}
      shouldPlay
      volume={volume}
      onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      textTracks={subtitles.map((sub) => ({
        uri: sub.url,
        language: sub.lang,
        type: "text/vtt",
        title: sub.lang,
      }))}
      selectedTextTrack={{
        type: selectedSubtitle === "disabled" ? "disabled" : "title",
        value: selectedSubtitle,
      }}
    />
    {isVideoLoading && (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="red" style={{ height: height * 0.4 }} />
      </View>
    )}
    {currentSubtitle && (
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitleText}>{currentSubtitle}</Text>
      </View>
    )}
    
    {/* Replace TouchableWithoutFeedback with a regular View */}
    <View style={[styles.overlay, styles.fullscreenOverlay]}>
      {/* Add a background pressable to handle taps for showing/hiding controls */}
      <Pressable 
        style={StyleSheet.absoluteFill} 
        onPress={() => !isLocked && setControlsVisible(!controlsVisible)}
      />
      
      {controlsVisible && (
        <>
          <View style={styles.topControls}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            {currentEpisode && (
              <Text style={styles.episodeNumberText}>
                Episode {currentEpisode.number}
              </Text>
            )}
            <View style={styles.rightControls}>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  onPress={() => { if (isOn) setIsOn(false); }}
                  style={styles.iconContainer}
                >
                  <Ionicons name="pause" size={24} color={isOn ? '#000' : '#fff'} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { if (!isOn) setIsOn(true); }}
                  style={styles.iconContainer}
                >
                  <Ionicons name="play" size={24} color={isOn ? '#fff' : '#000'} />
                </TouchableOpacity>
                <Animated.View style={[styles.slider2, { transform: [{ translateX }] }]} />
              </View>
              <TouchableOpacity onPress={() => setSubtitlesPickerVisible(true)}>
                <Ionicons name="text" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPickerVisible(true)}>
                <Ionicons name="settings" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleToggleFullScreen}>
                <Ionicons name={isFullscreen ? "contract" : "expand"} size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.segmentsContainer}>
            {introSegment &&
              currentTime / 1000 >= introSegment.start &&
              currentTime / 1000 < introSegment.end && (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={() => {
                    videoRef.current?.setPositionAsync(introSegment.end * 1000);
                  }}
                >
                  <Text style={styles.skipButtonText}>Skip Intro</Text>
                </TouchableOpacity>
              )}
            {outroSegment &&
              outroSegment.start !== 0 &&
              currentTime / 1000 >= outroSegment.start &&
              currentTime / 1000 < outroSegment.end && (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={() => {
                    videoRef.current?.setPositionAsync(outroSegment.end * 1000);
                  }}
                >
                  <Text style={styles.skipButtonText}>Skip Outro</Text>
                </TouchableOpacity>
              )}
          </View>
          <View style={styles.bottomControls}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration}
              value={sliderValue}
              onSlidingStart={() => setIsSliding(true)}
              onSlidingComplete={async (value) => {
                await videoRef.current?.setPositionAsync(value);
                setIsSliding(false);
              }}
              minimumTrackTintColor="#E50914"
              maximumTrackTintColor="#404040"
              thumbTintColor="#E50914"
            />
            <View style={styles.timeControls}>
              <Text style={styles.timeText}>{formatTime(currentTime / 1000)}</Text>
              <View style={styles.volumeWrapper}>
                <TouchableOpacity onPress={() => setShowVolumeSlider(true)}>
                  <Ionicons name={getVolumeIcon(volume)} size={28} color="white" />
                </TouchableOpacity>
                {showVolumeSlider && (
                  <Slider
                    style={styles.volumeSlider}
                    minimumValue={0}
                    maximumValue={1}
                    value={volume}
                    onValueChange={setVolume}
                    onSlidingComplete={() => setShowVolumeSlider(false)}
                    minimumTrackTintColor="red"
                    maximumTrackTintColor="gray"
                    thumbTintColor="red"
                  />
                )}
              </View>
              <View style={styles.centerControls}>
                <TouchableOpacity
                  onPress={handlePreviousEpisode}
                  disabled={
                    (currentEpisode && currentIndex <= 0) ||
                    (currentBackupEpisode && currentBackupIndex <= 0)
                  }
                  style={[
                    styles.navButton,
                    ((currentEpisode && currentIndex <= 0) || 
                    (currentBackupEpisode && currentBackupIndex <= 0)) && styles.disabledButton,
                  ]}
                >
                  <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePlayPause} style={styles.controlButton}>
                  <Ionicons name={paused ? "play" : "pause"} size={32} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleNextEpisode}
                  disabled={
                    (currentEpisode && currentIndex >= filteredEpisodes.length - 1) ||
                    (currentBackupEpisode && currentBackupIndex >= filteredBackupEpisodes.length - 1)
                  }
                  style={[
                    styles.navButton,
                    ((currentEpisode && currentIndex >= filteredEpisodes.length - 1) || 
                    (currentBackupEpisode && currentBackupIndex >= filteredBackupEpisodes.length - 1)) && styles.disabledButton,
                  ]}
                >
                  <Ionicons name="chevron-forward" size={24} color="white" />
                </TouchableOpacity>
              </View>
              <Text style={styles.timeText}>{formatTime(duration / 1000)}</Text>
            </View>
          </View>
          {/* playIconOverlayRow with explicit hitSlop for better touch areas */}
       <View style={styles.playIconOverlayRow}>
  {isVideoLoading ? (
    // Only show spinner while loading
    <View style={styles.loadingContainer}>
      <ActivityIndicator 
        size="large" 
        color="red" 
        style={{ height: height * 0.3 }} 
      />
    </View>
  ) : (
    // Show rewind, play/pause, and fast‑forward once loaded
    <>
      <TouchableOpacity 
        onPress={handleRewind} 
        style={styles.rewindOverlay}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Image
          source={{ uri: "https://cdn0.iconfinder.com/data/icons/player-controls/512/10sec_backward-1024.png" }}
          style={styles.rewindIcon}
        />
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={handlePlayPause}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Ionicons 
          name={paused ? "play" : "pause"} 
          size={50} 
          color="white" 
        />
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={handleFastForward} 
        style={styles.fastForwardOverlay}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Image
          source={{ uri: "https://cdn0.iconfinder.com/data/icons/player-controls/512/10sec_forward-1024.png" }}
          style={styles.fastForwardIcon}
        />
      </TouchableOpacity>
    </>
  )}
</View>

        </>
      )}
    </View>
    <Modal visible={pickerVisible} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Quality</Text>
          {qualities.map((quality) => (
            <TouchableOpacity
              key={quality.uri}
              style={styles.qualityItem}
              onPress={() => {
                handleQualityChange(quality.uri);
                setPickerVisible(false);
              }}
            >
              <Text style={styles.qualityText}>{quality.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.closeButton} onPress={() => setPickerVisible(false)}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    <Modal visible={subtitlesPickerVisible} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Subtitle</Text>
          <TouchableOpacity
            style={styles.qualityItem}
            onPress={() => {
              setSelectedSubtitle("disabled");
              setSubtitlesPickerVisible(false);
            }}
          >
            <Text style={styles.qualityText}>Disabled</Text>
          </TouchableOpacity>
          {subtitles.map((sub) => (
            <TouchableOpacity
              key={sub.lang}
              style={styles.qualityItem}
              onPress={() => {
                setSelectedSubtitle(sub.lang);
                setSubtitlesPickerVisible(false);
              }}
            >
              <Text style={styles.qualityText}>{sub.lang}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.closeButton} onPress={() => setSubtitlesPickerVisible(false)}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </View>
);

const renderNormal = () => (
  <ScrollView style={styles.container}>
    <View style={styles.normalContainer}>
      <VideoWithSubtitles
        ref={videoRef}
        source={{ uri: videoSource }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        volume={volume}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        textTracks={subtitles.map((sub) => ({
          uri: sub.url,
          language: sub.lang,
          type: "text/vtt",
          title: sub.lang,
        }))}
        selectedTextTrack={{
          type: selectedSubtitle === "disabled" ? "disabled" : "title",
          value: selectedSubtitle,
        }}
      />
   
      {currentSubtitle && (
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitleText}>{currentSubtitle}</Text>
        </View>
      )}
      
      {/* Replace TouchableWithoutFeedback with a regular View */}
      <View style={styles.overlay}>
        {/* Add a background pressable to handle taps for showing/hiding controls */}
        <Pressable 
          style={StyleSheet.absoluteFill} 
          onPress={() => !isLocked && setControlsVisible(!controlsVisible)}
        />
        
        {controlsVisible && (
          <>
            <View style={styles.topControls}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <View style={styles.rightControls}>
                <TouchableOpacity onPress={toggleSwitch}>
                  <View style={styles.toggleContainer}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="pause" size={24} color={isOn ? '#000' : '#fff'} />
                    </View>
                    <View style={styles.iconContainer}>
                      <Ionicons name="play" size={24} color={isOn ? '#fff' : '#000'} />
                    </View>
                    <Animated.View style={[styles.slider2, { transform: [{ translateX }] }]} />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSubtitlesPickerVisible(true)}>
                  <Ionicons name="text" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPickerVisible(true)}>
                  <Ionicons name="settings" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleToggleFullScreen}>
                  <Ionicons name={isFullscreen ? "contract" : "expand"} size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.segmentsContainer}>
              {introSegment &&
                currentTime / 1000 >= introSegment.start &&
                currentTime / 1000 < introSegment.end && (
                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => {
                      videoRef.current?.setPositionAsync(introSegment.end * 1000);
                    }}
                  >
                    <Text style={styles.skipButtonText}>Skip Intro</Text>
                  </TouchableOpacity>
                )}
              {outroSegment &&
                outroSegment.start !== 0 &&
                currentTime / 1000 >= outroSegment.start &&
                currentTime / 1000 < outroSegment.end && (
                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => {
                      videoRef.current?.setPositionAsync(outroSegment.end * 1000);
                    }}
                  >
                    <Text style={styles.skipButtonText}>Skip Outro</Text>
                  </TouchableOpacity>
                )}
            </View>
            <View style={styles.bottomControls}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration}
                value={sliderValue}
                onSlidingStart={() => setIsSliding(true)}
                onSlidingComplete={async (value) => {
                  await videoRef.current?.setPositionAsync(value);
                  setIsSliding(false);
                }}
                minimumTrackTintColor="#E50914"
                maximumTrackTintColor="#404040"
                thumbTintColor="#E50914"
              />
              <View style={styles.timeControls}>
                <Text style={styles.timeText}>{formatTime(currentTime / 1000)}</Text>
                <View style={styles.volumeWrapper}>
                  <TouchableOpacity onPress={() => setShowVolumeSlider(true)}>
                    <Ionicons name={getVolumeIcon(volume)} size={28} color="white" />
                  </TouchableOpacity>
                  {showVolumeSlider && (
                    <Slider
                      style={styles.volumeSlider}
                      minimumValue={0}
                      maximumValue={1}
                      value={volume}
                      onValueChange={setVolume}
                      onSlidingComplete={() => setShowVolumeSlider(false)}
                      minimumTrackTintColor="red"
                      maximumTrackTintColor="gray"
                      thumbTintColor="red"
                    />
                  )}
                </View>
                <View style={styles.centerControls}>
                  <TouchableOpacity
                    onPress={handlePreviousEpisode}
                    disabled={
                      (currentEpisode && currentIndex <= 0) ||
                      (currentBackupEpisode && currentBackupIndex <= 0)
                    }
                    style={[
                      styles.navButton,
                      ((currentEpisode && currentIndex <= 0) ||
                      (currentBackupEpisode && currentBackupIndex <= 0)) && styles.disabledButton,
                    ]}
                  >
                    <Ionicons name="chevron-back" size={24} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handlePlayPause} style={styles.controlButton}>
                    <Ionicons name={paused ? "play" : "pause"} size={32} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleNextEpisode}
                    disabled={
                      (currentEpisode && currentIndex >= filteredEpisodes.length - 1) ||
                      (currentBackupEpisode && currentBackupIndex >= filteredBackupEpisodes.length - 1)
                    }
                    style={[
                      styles.navButton,
                      ((currentEpisode && currentIndex >= filteredEpisodes.length - 1) ||
                      (currentBackupEpisode && currentBackupIndex >= filteredBackupEpisodes.length - 1)) && styles.disabledButton,
                    ]}
                  >
                    <Ionicons name="chevron-forward" size={24} color="white" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.timeText}>{formatTime(duration / 1000)}</Text>
              </View>
            </View>
            {/* Add hitSlop for better touch areas */}
    <View style={styles.playIconOverlayRow}>
  {isVideoLoading ? (
    // Only show spinner while loading
    <View style={styles.loadingContainer}>
      <ActivityIndicator 
        size="large" 
        color="red" 
        style={{ height: height * 0.3 }} 
      />
    </View>
  ) : (
    // Show rewind, play/pause, and fast‑forward once loaded
    <>
      <TouchableOpacity 
        onPress={handleRewind} 
        style={styles.rewindOverlay}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Image
          source={{ uri: "https://cdn0.iconfinder.com/data/icons/player-controls/512/10sec_backward-1024.png" }}
          style={styles.rewindIcon}
        />
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={handlePlayPause}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Ionicons 
          name={paused ? "play" : "pause"} 
          size={50} 
          color="white" 
        />
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={handleFastForward} 
        style={styles.fastForwardOverlay}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Image
          source={{ uri: "https://cdn0.iconfinder.com/data/icons/player-controls/512/10sec_forward-1024.png" }}
          style={styles.fastForwardIcon}
        />
      </TouchableOpacity>
    </>
  )}
</View>

          </>
        )}
      </View>
    </View>
  
    {(currentEpisode || currentBackupEpisode) && (
      <View style={styles.episodeNavigation}>
        <TouchableOpacity
          onPress={handlePreviousEpisode}
          disabled={
            (currentEpisode && currentIndex <= 0) ||
            (currentBackupEpisode && currentBackupIndex <= 0)
          }
          style={[
            styles.navButton,
            ((currentEpisode && currentIndex <= 0) ||
            (currentBackupEpisode && currentBackupIndex <= 0)) && styles.disabledButton,
          ]}
        >
          <Ionicons name="chevron-back" size={30} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.episodeNumberText}>
          Episode {currentEpisode?.number || currentBackupEpisode?.number}
        </Text>
        <TouchableOpacity
          onPress={handleNextEpisode}
          disabled={
            (currentEpisode && currentIndex >= filteredEpisodes.length - 1) ||
            (currentBackupEpisode && currentBackupIndex >= filteredBackupEpisodes.length - 1)
          }
          style={[
            styles.navButton,
            ((currentEpisode && currentIndex >= filteredEpisodes.length - 1) ||
            (currentBackupEpisode && currentBackupIndex >= filteredBackupEpisodes.length - 1)) && styles.disabledButton,
          ]}
        >
          <Ionicons name="chevron-forward" size={30} color="white" />
        </TouchableOpacity>
      </View>
    )}

    <View style={styles.nextEpisodesHeader}>
      <Text style={styles.nextEpisodesText}>Episodes</Text>
{/* Display badges for the first filtered episode if it exists */}
{filteredEpisodes.length > 0 && (
  <View style={styles.badgeContainer}>
    {filteredEpisodes[0].isSubbed === true && (
      <TouchableOpacity 
        style={[styles.badge, styles.subbedBadge]}
        onPress={handleSubClick}
      >
        <Text style={styles.badgeText}>SUB</Text>
      </TouchableOpacity>
    )}
    {filteredEpisodes[0].isDubbed === true && (
      <TouchableOpacity 
        style={[styles.badge, styles.dubbedBadge]}
        onPress={handleDubClick}
      >
        <Text style={styles.badgeText}>DUB</Text>
      </TouchableOpacity>
    )}
  </View>
)}
{/* Display badges for the current episode */}
<View style={styles.badgeContainer}>
  {/* Check if we have a current episode from main source */}
  {currentEpisode?.isSubbed === true && (
    <TouchableOpacity 
      style={[styles.badge, styles.subbedBadge]}
      onPress={handleSubClick}
    >
      <Text style={styles.badgeText}>SUB</Text>
    </TouchableOpacity>
  )}
  {currentEpisode?.isDubbed === true && (
    <TouchableOpacity 
      style={[styles.badge, styles.dubbedBadge]}
      onPress={handleDubClick}
    >
      <Text style={styles.badgeText}>DUB</Text>
    </TouchableOpacity>
  )}
  
  {/* If no current episode from main source, check backup */}
  {!currentEpisode && currentBackupEpisode?.isSubbed === true && (
    <TouchableOpacity 
      style={[styles.badge, styles.subbedBadge]}
      onPress={handleSubClick}
    >
      <Text style={styles.badgeText}>SUB</Text>
    </TouchableOpacity>
  )}
  {!currentEpisode && currentBackupEpisode?.isDubbed === true && (
    <TouchableOpacity 
      style={[styles.badge, styles.dubbedBadge]}
      onPress={handleDubClick}
    >
      <Text style={styles.badgeText}>DUB</Text>
    </TouchableOpacity>
  )}
</View>
 
      <TextInput
        style={styles.searchInput}
        placeholder="Search by number"
        placeholderTextColor="#888"
        value={searchQuery}
        onChangeText={setSearchQuery}
        keyboardType="numeric"
      />
    </View>
    <FlatList
      data={filteredEpisodes}
      renderItem={renderEpisodeItem}
      keyExtractor={(item) => item.episodeid}
      scrollEnabled={false}
      contentContainerStyle={styles.episodesList}
    />

    
    {filteredEpisodes.length === 0 && (
      <FlatList
        data={filteredBackupEpisodes}
        renderItem={renderBackupEpisodeItem}
        keyExtractor={(item) => item.episodeId}
        scrollEnabled={false}
        contentContainerStyle={styles.episodesList}
      />
    )}
   
    <Modal visible={pickerVisible} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Quality</Text>
          {qualities.map((quality) => (
            <TouchableOpacity
              key={quality.uri}
              style={styles.qualityItem}
              onPress={() => {
                handleQualityChange(quality.uri);
                setPickerVisible(false);
              }}
            >
              <Text style={styles.qualityText}>{quality.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.closeButton} onPress={() => setPickerVisible(false)}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    <Modal visible={subtitlesPickerVisible} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Subtitle</Text>
          <TouchableOpacity
            style={styles.qualityItem}
            onPress={() => {
              setSelectedSubtitle("disabled");
              setSubtitlesPickerVisible(false);
            }}
          >
            <Text style={styles.qualityText}>Disabled</Text>
          </TouchableOpacity>
          {subtitles.map((sub) => (
            <TouchableOpacity
              key={sub.lang}
              style={styles.qualityItem}
              onPress={() => {
                setSelectedSubtitle(sub.lang);
                setSubtitlesPickerVisible(false);
              }}
            >
              <Text style={styles.qualityText}>{sub.lang}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.closeButton} onPress={() => setSubtitlesPickerVisible(false)}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </ScrollView>
);

if (episodeLoading) {
  return (
    <View style={styles.loadingContainer2}>
      <Image
        source={{ uri: "https://media.tenor.com/On7kvXhzml4AAAAj/loading-gif.gif" }}
        style={styles.loadingGif}
      />
    </View>
  );
}

  if (episodeLoading) {
    return (
      <View style={styles.loadingContainer2}>
        <Image
          source={{ uri: "https://media.tenor.com/On7kvXhzml4AAAAj/loading-gif.gif" }}
          style={styles.loadingGif}
        />
      </View>
    );
  }

  return (
    <>
      {isFullscreen ? renderFullscreen() : renderNormal()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  normalContainer: {
    height: height * 0.4,
  },
  fullscreenContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 16,
  },
  fullscreenOverlay: {
    paddingHorizontal: 32,
  },
  topControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rightControls: {
    flexDirection: "row",
    gap: 20,
  },
  toggleContainer: {
    width: 100,
    borderRadius: 20,
    backgroundColor: "#ccc",
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomControls: {
    marginBottom: 16,
  },
  slider2: {
    position: "absolute",
    width: 48,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  timeControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeText: {
    color: "#fff",
    fontSize: 14,
  },
  volumeWrapper: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  volumeSlider: {
    position: "absolute",
    bottom: 65,
    left: -58,
    width: 150,
    height: 40,
    transform: [{ rotate: "-90deg" }],
  },
  centerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  subtitleContainer: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 8,
    borderRadius: 4,
  },
  subtitleText: {
    color: "#fff",
    fontSize: 16,
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
  episodeMeta: {
    fontSize: 14,
    color: "#BBBBBB",
    marginTop: 4,
  },
  episodesList: {
    paddingBottom: 16,
  },
  segmentsContainer: {
    alignItems: "center",
    marginBottom: 5,
    top: 150,
    right: 10,
    zIndex: 10,
    position: "absolute",
  },
  skipButton: {
    backgroundColor: "red",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "red",
    alignItems: "center",
    marginVertical: 5,
  },
  skipButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  controlButton: {
    marginHorizontal: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1a1a1a",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 15,
    textAlign: "center",
  },
  qualityItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#404040",
  },
  qualityText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  closeButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#E50914",
    borderRadius: 6,
  },
  closeText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
 
   },
    loadingContainer2: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
        backgroundColor: "#161616",

 
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
  loadingGif: {
    width: 100,
    height: 100,
    resizeMode: "contain",
  },
  episodeNumberText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  episodeNavigation: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  navButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: "#555",
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
  playIconOverlayRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 50,
    paddingHorizontal: 20,
    // Changed from "box-only" to "auto" so children can receive touches
    pointerEvents: "auto",
  },
  rewindOverlay: {
    marginRight: 20,
  },
  fastForwardOverlay: {
    marginLeft: 20,
  },
  rewindIcon: {
    width: 24,
    height: 24,
    tintColor: "white",
  },
  fastForwardIcon: {
    width: 24,
    height: 24,
    tintColor: "white",
  },
    episodeItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  subbedBadge: {
    backgroundColor: '#3498db',
  },
  dubbedBadge: {
    backgroundColor: '#e74c3c',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  activeBadge: {
  borderWidth: 2,
  borderColor: '#fff', // Or any color to highlight the active selection
},
   
});

export default WatchZoro;
