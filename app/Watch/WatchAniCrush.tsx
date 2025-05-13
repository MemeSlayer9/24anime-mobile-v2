import React, { useRef, useState, useEffect } from "react";
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
  TextInput,
  FlatList,
  Image,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as ScreenOrientation from "expo-screen-orientation";
import { useNavigation } from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar";
import axios from "axios";
import { useKeepAwake } from "expo-keep-awake";

import { useRoute, RouteProp } from "@react-navigation/native";
import { Anime, RootStackParamList, Episode, BackupResponse, AnicrushEpisode } from "../Types/types";
import { useAnimeId } from "../context/EpisodeContext"; // adjust path as needed
import AsyncStorage from '@react-native-async-storage/async-storage'; // Make sure AsyncStorage is installed
import { useEpisode } from "../context/EpisodeHistoryProvider";  // adjust path as needed :contentReference[oaicite:0]{index=0}&#8203;:contentReference[oaicite:1]{index=1}
import { StackNavigationProp } from "@react-navigation/stack";

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



  

const VideoWithSubtitles = Video as any;

const WatchZoro = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const videoRef = useRef<VideoRefMethods | null>(null);
  const route = useRoute();
  const { episodeid, animeId, setAnimeId, setEpisodeid } = useAnimeId();
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
 
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
  const [item4, setItem4] = useState<BackupResponse | null>(null);
  const [backupImageUrl, setBackupImageUrl] = useState<string>("");
    const [animeTitle, setAnimetitle] = useState<string>("");
  const [anicrushEpisodes, setAnicrushEpisodes] = useState<Episode[]>([]);

const [isDubMode, setIsDubMode] = useState(false);
const { episodes2, addEpisode, updateEpisode } = useEpisode();
const [dub, setDub] = useState<boolean | string | null>(null);

  const [selectedSubtitle, setSelectedSubtitle] = useState("disabled");
  const [subtitlesPickerVisible, setSubtitlesPickerVisible] = useState(false);
  const [parsedSubtitles, setParsedSubtitles] = useState<
    Array<{ start: number; end: number; text: string }>
  >([]);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [introSegment, setIntroSegment] = useState<Segment | null>(null);
  const [outroSegment, setOutroSegment] = useState<Segment | null>(null);
  const [savedPosition, setSavedPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
    const [activeType, setActiveType] = useState(null);


      useKeepAwake();
    
  const handleRewind = async () => {
  const newTime = currentTime - 10000; // 10 seconds in milliseconds
  await videoRef.current?.setPositionAsync(newTime > 0 ? newTime : 0);
  setControlsVisible(true); // Show controls briefly after interaction
  resetControlsTimer(); // Reset the timeout for hiding controls
};

const handleFastForward = async () => {
  const newTime = currentTime + 10000; // 10 seconds in milliseconds
  await videoRef.current?.setPositionAsync(newTime < duration ? newTime : duration);
  setControlsVisible(true); // Show controls briefly after interaction
  resetControlsTimer(); // Reset the timeout for hiding controls
};
    
// Add this function to manage controls visibility timer
const resetControlsTimer = () => {
  if (controlsTimeoutRef.current) {
    clearTimeout(controlsTimeoutRef.current);
  }
  
  controlsTimeoutRef.current = setTimeout(() => {
    setControlsVisible(false);
  }, 3000); // Hide controls after 3 seconds of inactivity
};
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


  // Add auto-hide controls timeout
  useEffect(() => {
    if (controlsVisible && !pickerVisible && !subtitlesPickerVisible) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 5000); // Hide controls after 5 seconds of inactivity
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [controlsVisible, pickerVisible, subtitlesPickerVisible]);

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

  // Save video position periodically
  useEffect(() => {
    const saveInterval = setInterval(async () => {
      if (episodeid && currentTime > 0) {
        try {
          await AsyncStorage.setItem(
            `playbackPosition_${episodeid}`, 
            JSON.stringify(currentTime)
          );
        } catch (e) {
          console.warn("⚠️ failed to save position:", e);
        }
      }
    }, 5000); // Save every 5 seconds
    
    return () => clearInterval(saveInterval);
  }, [episodeid, currentTime]);

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

const handleSubClick = () => {
  
  setEpisodeLoading(true); // Set loading state to true
  setIsDubMode(false);
  fetchVideoWithDubSetting(false);
  
};

const handleDubClick = () => {
  setEpisodeLoading(true); // Set loading state to true
  setIsDubMode(true);
  fetchVideoWithDubSetting(true);
};

useEffect(() => {
  const fetchProvider = async () => {
    try {
      const response = await axios.get(
        `https://api.amvstr.me/api/v2/info/${animeId}`
      );

      if (response.data?.dub !== undefined) {
        setDub(response.data.dub);
      }
    } catch (error) {
      console.error("Backup API also failed", error);
    }
  };

  if (animeId) {
    fetchProvider();
  }
}, [animeId]);

const fetchVideoWithDubSetting = async (isDub: boolean): Promise<void> => {
  try {
    // Changed URL parameter from dub=true/false to subOrDub=dub/sub
    const url = `https://anicrush-api-eight.vercel.app/api/anime/hls/${episodeid}&subOrDub=${isDub ? 'dub' : 'sub'}`;
    const proxyUrl = "https://hls.ciphertv.dev/proxy/";
    console.log(url);
    
    const response = await axios.get(url);
    const json = response.data;
    
    // Check if result and sources exist in the response
    if (json.result && json.result.sources && json.result.sources.length > 0) {
      // Add the proxy URL to the source URL
      const sourceUrl = `${proxyUrl}${json.result.sources[0].file}`;
      setInitialVideoSource(sourceUrl);
      setVideoSource(sourceUrl);
      setSelectedQuality(sourceUrl);
    }
    
    // Define types for track objects
    interface Track {
      kind: string;
      file: string;
      label: string;
    }
    
    // Updated to handle "tracks" instead of "subtitles"
    if (json.result && json.result.tracks) {
      // Convert tracks to the Subtitle format expected by your app
      const subtitles = json.result.tracks
        .filter((track: Track) => track.kind === "captions")
        .map((track: Track) => ({
          url: track.file,
          lang: track.label
        }));
      
      setSubtitles(subtitles);
      
      // Define subtitle interface
      interface Subtitle {
        url: string;
        lang: string;
      }
      
      // Find English subtitle
      const englishSubtitle = subtitles.find((sub: Subtitle) => 
        sub.lang.toLowerCase().includes("english") || 
        sub.lang.toLowerCase().includes("eng")
      );
      
      if (englishSubtitle) {
        setSelectedSubtitle(englishSubtitle.lang);
      }
    }
    
    // Updated to handle intro/outro from the result object
    if (json.result && json.result.intro) {
      setIntroSegment(json.result.intro);
    }
    
    if (json.result && json.result.outro) {
      setOutroSegment(json.result.outro);
    }
  } catch (error) {
    console.error("Error fetching video data: ", error);
  } finally {
    // Reset loading state once fetch is complete
    // Adding a slight delay to ensure UI updates smoothly
    setTimeout(() => setEpisodeLoading(false), 500);
  }
};
useEffect(() => {
  const isDubbed =   currentBackupEpisode?.isDubbed === true;
  setIsDubMode(isDubbed);
  fetchVideoWithDubSetting(isDubbed);
}, [episodeid]);

  useEffect(() => {
    const fetchEpisode = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://anicrush-api-eight.vercel.app/api/mapper/${animeId}`);
        const data = await response.json();
        
        if (data && data.episodes) {
          setAnicrushEpisodes(data.episodes);
        }
        // Removed setError for no episodes
      } catch (err) {
        // Removed setError for fetch failure
      } finally {
        setLoading(false);
      }
    };
    
    fetchEpisode();
  }, [animeId]);

useEffect(() => {
  if (initialVideoSource) {
    const fetchQualities = async () => {
      setLoadingQualities(true);
      try {
        const response = await axios.get(initialVideoSource);
        const baseUrl = initialVideoSource.substring(0, initialVideoSource.lastIndexOf("/") + 1);
        
        // Use a map to store unique qualities by resolution height
        const qualityMap = new Map<string, { label: string; uri: string; bandwidth?: number }>();
        
        response.data.split('\n').forEach((line: string, i: number, arr: string[]) => {
          if (line.includes('RESOLUTION=')) {
            const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
            if (resolutionMatch) {
              const resolution = resolutionMatch[1];
              const uri = arr[i + 1]?.startsWith('http') ? arr[i + 1] : `${baseUrl}${arr[i + 1]}`;
              
              // Extract the height from the resolution (e.g., "1920x1080" -> "1080")
              const height = resolution.split('x')[1];
              if (height) {
                const label = `${height}p`;
                // Only add this quality if we haven't seen this height before
                // or if the bandwidth is higher (better quality for same resolution)
                const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
                const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1]) : 0;
                
                if (!qualityMap.has(height) || 
                    (bandwidth > (qualityMap.get(height)?.bandwidth || 0))) {
                  qualityMap.set(height, { 
                    label, 
                    uri, 
                    bandwidth
                  });
                }
              }
            }
          }
        });
        
        // Convert the map to an array and sort by height (highest first)
        let uniqueQualities = Array.from(qualityMap.values())
          .map(({ label, uri }) => ({ label, uri }))
          .sort((a, b) => {
            const heightA = parseInt(a.label.replace('p', ''));
            const heightB = parseInt(b.label.replace('p', ''));
            return heightB - heightA;
          });
        
        // Add Auto quality at the top
        if (uniqueQualities.length) {
          uniqueQualities.unshift({ label: "Auto", uri: initialVideoSource });
        } else {
          uniqueQualities.push({ label: "Auto", uri: initialVideoSource });
        }
        
        setQualities(uniqueQualities);
      } catch (error) {
        console.error("Error fetching qualities: ", error);
        setQualities([{ label: "Auto", uri: initialVideoSource }]);
      } finally {
        setLoadingQualities(false);
      }
    };
    fetchQualities();
  }
}, [initialVideoSource]);

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
    // Push the last cue if the file does not end with a blank line.
    if (cue) {
      cues.push(cue);
    }
    return cues;
  };

  

  // Helper: Convert time string (e.g. "00:01:23.456") to seconds.
  const parseTime = (timeStr: string) => {
    const parts = timeStr.split(":");
    let seconds = 0;
    if (parts.length === 3) {
      seconds =
        parseFloat(parts[0]) * 3600 +
        parseFloat(parts[1]) * 60 +
        parseFloat(parts[2]);
    } else if (parts.length === 2) {
      seconds = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return seconds;
  };
  
  useEffect(() => {
    const fetchSubtitle = async () => {
      if (selectedSubtitle !== "disabled") {
        // Find the subtitle object for the selected language.
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

  const handlePlayPause = async () => {
    if (paused) await videoRef.current?.playAsync();
    else await videoRef.current?.pauseAsync();
    setPaused(!paused);
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 1000);
  };
 
  const handleToggleFullScreen = async () => {
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
      StatusBar.setHidden(false); // Show the status bar
      setControlsVisible(true);
    }
    setIsFullscreen(!isFullscreen);
  };
  
 
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
    const episodeNumber =   currentBackupEpisode?.number;
    const episodeTitle =  `${animeTitle} - Episode ${episodeNumber !== null ? episodeNumber : ''}`;
    
    // Current timestamp for created_at
    const currentTimestamp = new Date().toISOString();
    
    // Get the image from currentEpisode
    const imageUrl =   backupImageUrl || 'https://via.placeholder.com/40';
    
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
        provider: "Anicrush",
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
};

useEffect(() => {
  // Set loading to true when episodeid changes
  setEpisodeLoading(true);
  
  // Add a timeout to ensure the loading state is cleared if playback status doesn't trigger
  const timer = setTimeout(() => {
    setEpisodeLoading(false);
  }, 1000); // 5-second fallback
  
  return () => clearTimeout(timer);
}, [episodeid]);
const handlePreviousEpisode = () => {
  if (filteredAnicrushEpisodes.length > 0) {
    const currentBackupIndex = filteredAnicrushEpisodes.findIndex(
      (item) => (item.id) === episodeid
    );
    if (currentBackupIndex > 0) {
      const prevEpisode = filteredAnicrushEpisodes[currentBackupIndex - 1];
      setEpisodeLoading(true);
      setEpisodeid((prevEpisode.id));
      navigation.navigate("Anicrush");
    }
  }
};
const returnToPortraitMode = async () => {
  if (isFullscreen) {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    await NavigationBar.setVisibilityAsync("visible");
    navigation.getParent()?.setOptions({ tabBarStyle: { display: "flex" } });
    StatusBar.setHidden(false);
    setIsFullscreen(false);
  }
};

const handleNextEpisode = () => {
  if (filteredAnicrushEpisodes.length > 0) {
    const currentBackupIndex = filteredAnicrushEpisodes.findIndex(
      (item) => (item.id) === episodeid
    );
    if (currentBackupIndex < filteredAnicrushEpisodes.length - 1) {
      const nextEpisode = filteredAnicrushEpisodes[currentBackupIndex + 1];
      setEpisodeLoading(true);
      setEpisodeid((nextEpisode.id));
      navigation.navigate("Anicrush");
    }
  }
};
const filteredAnicrushEpisodes = Array.isArray(anicrushEpisodes) 
? anicrushEpisodes
    .filter((episode) => {
      if (!searchQuery) return true;
      return episode.number?.toString().includes(searchQuery);
    })
    .sort((a, b) => Number(a.number || 0) - Number(b.number || 0))
: [];

  const currentBackupEpisode = filteredAnicrushEpisodes.find(
  (item) => (item.id) === episodeid
);
const currentBackupIndex = filteredAnicrushEpisodes.findIndex(
  (item) => (item.id) === episodeid
);


  const renderAnicrushEpisodeItem = ({ item }: { item: AnicrushEpisode }) => (
    <TouchableOpacity 
    style={styles.episodeContainer}
    onPress={() => {
      // Convert item.id to string if it exists
      if (item.id !== undefined && item.id !== null) {
        setEpisodeid(String(item.id)); // Convert to string to ensure compatibility
      }
      
      // Use the animeId prop that's passed to this component
      if (animeId !== undefined && animeId !== null) {
        setAnimeId(String(animeId)); // Convert to string to ensure it matches expected type
      }
      
      // Make sure "Anicrush" is in your RootStackParamList
      navigation.navigate("Anicrush" as any); // Remove 'as any' after updating types
    }}
  >
    {item.image ? (
      <Image
        source={{ uri: item.image }}
        style={styles.episodeThumbnail}
        resizeMode="cover"
      />
    ) : null}
    
    <View style={styles.episodeTextContainer}>
      <Text style={styles.episodeTitle} numberOfLines={1}>
        {item.name_english} {item.name ? `(${item.name})` : ''}
      </Text>
      <Text style={styles.episodeTitle}>Episode {item.number}</Text>

      <Text style={styles.episodeMeta}>
        Aired: {item.airDate} • {item.runtime} min
      </Text>
    </View>
  </TouchableOpacity>
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
  

  // Return the component JSX
  return (
    <View style={styles.container}>
      {/* Video Player Container */}
      <Pressable 
        onPress={() => setControlsVisible(!controlsVisible)}
        style={isFullscreen ? styles.fullscreenContainer : styles.normalContainer}
      >
        <VideoWithSubtitles
          ref={videoRef}
          source={{ uri: videoSource }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          volume={volume}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          textTracks={subtitles.map(sub => ({
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

        <TouchableWithoutFeedback onPress={() => !isLocked && setControlsVisible(!controlsVisible)}>
          <View style={[styles.overlay, isFullscreen && styles.fullscreenOverlay]}>
            {controlsVisible && (
              <>
                <View style={styles.topControls}>
                   <TouchableOpacity onPress={async () => {
                   await returnToPortraitMode();
                   navigation.goBack();
                 }}>
                   <Ionicons name="arrow-back" size={24} color="white" />
                 </TouchableOpacity>
                   {currentBackupEpisode && (
                               <Text style={styles.episodeNumberText}>
                                 Episode {currentBackupEpisode.number}
                               </Text>
                             )}
                  <View style={styles.rightControls}>
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
                          // Jump to the end of the intro segment.
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
                          // Jump to the end of the outro segment.
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
                      <TouchableOpacity onPress={() => setShowVolumeSlider(!showVolumeSlider)}>
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
      disabled={currentBackupEpisode && currentBackupIndex <= 0}
      style={[
        styles.navButton,
        (currentBackupEpisode && currentBackupIndex <= 0) && styles.disabledButton,
      ]}
    >
      <Ionicons name="chevron-back" size={30} color="white" />
    </TouchableOpacity>
                      <TouchableOpacity onPress={handlePlayPause} style={styles.controlButton}>
                        <Ionicons name={paused ? "play" : "pause"} size={32} color="white" />
                      </TouchableOpacity>
                    <TouchableOpacity
      onPress={handleNextEpisode}
      disabled={currentBackupEpisode && currentBackupIndex >= filteredAnicrushEpisodes.length - 1}
      style={[
        styles.navButton,
        (currentBackupEpisode && currentBackupIndex >= filteredAnicrushEpisodes.length - 1) && styles.disabledButton,
      ]}
    >
      <Ionicons name="chevron-forward" size={30} color="white" />
    </TouchableOpacity>
                    </View>
                    <Text style={styles.timeText}>{formatTime(duration / 1000)}</Text>
                  </View>
                </View>
                     <View style={styles.playIconOverlayRow}>
                  {isVideoLoading ? (
                    // Only show spinner while loading
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="red" />
                    </View>
                  ) : (
                    // Show rewind, play/pause, and fast-forward once loaded
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
                        <Ionicons name={paused ? "play" : "pause"} size={50} color="white" />
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
        </TouchableWithoutFeedback>
      </Pressable>

      {/* Quality Picker Modal */}
 <Modal visible={pickerVisible} transparent animationType="slide">
  <View style={styles.modalBackdrop}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Select Quality</Text>
      {loadingQualities ? (
        <ActivityIndicator size="large" color="#E50914" />
      ) : (
        qualities.map((quality) => (
          <TouchableOpacity
            key={quality.uri}
            style={[
              styles.qualityItem,
              videoSource === quality.uri && styles.selectedQualityItem
            ]}
            onPress={async () => {
              // Store current position before changing quality
              const positionToRestore = currentTime;
              
              // Change the video source
              setVideoSource(quality.uri);
              setSelectedQuality(quality.uri);
              setPickerVisible(false);
              
              // Need to wait a moment for the video to load before seeking
              // This setTimeout gives the player time to load the new source
              setTimeout(async () => {
                if (videoRef.current && positionToRestore > 0) {
                  await videoRef.current.setPositionAsync(positionToRestore);
                }
              }, 1000); // Wait 1 second before seeking
            }}
          >
            <Text style={[
              styles.qualityText,
              videoSource === quality.uri && styles.selectedQualityText
            ]}>
              {quality.label}
            </Text>
          </TouchableOpacity>
        ))
      )}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => setPickerVisible(false)}
      >
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

      {/* Subtitles Picker Modal */}
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
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSubtitlesPickerVisible(false)}
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Only show the episode list and search input when NOT in fullscreen mode */}
      {!isFullscreen && (
        <> 

     
          {currentBackupEpisode && (
  <View style={styles.episodeNavigation}>
    <TouchableOpacity
      onPress={handlePreviousEpisode}
      disabled={currentBackupEpisode && currentBackupIndex <= 0}
      style={[
        styles.navButton,
        (currentBackupEpisode && currentBackupIndex <= 0) && styles.disabledButton,
      ]}
    >
      <Ionicons name="chevron-back" size={30} color="white" />
    </TouchableOpacity>
    
    <Text style={styles.episodeNumberText}>
      Episode {currentBackupEpisode?.number}
    </Text>
    <TouchableOpacity
      onPress={handleNextEpisode}
      disabled={currentBackupEpisode && currentBackupIndex >= filteredAnicrushEpisodes.length - 1}
      style={[
        styles.navButton,
        (currentBackupEpisode && currentBackupIndex >= filteredAnicrushEpisodes.length - 1) && styles.disabledButton,
      ]}
    >
      <Ionicons name="chevron-forward" size={30} color="white" />
    </TouchableOpacity>
  </View>
)}
  <View style={styles.nextEpisodesHeader}>
  <Text style={styles.nextEpisodesText}>Episodes</Text>
  
<View style={styles.badgeContainer}>
  {/* Always show SUB button */}
<TouchableOpacity 
        style={[
          styles.badge, 
          styles.subbedBadge,
          !isDubMode && styles.activeBadge  // Apply active style when NOT in dub mode
        ]}
        onPress={handleSubClick}
      >          <Text style={styles.badgeText}>SUB</Text>
  </TouchableOpacity>
  
  {/* Show DUB button only when dub is true */}
  {dub === true && (
 <TouchableOpacity 
        style={[
          styles.badge, 
          styles.dubbedBadge,
          isDubMode && styles.activeBadge  // Apply active style when IN dub mode
        ]}
        onPress={handleDubClick}
      >      <Text style={styles.badgeText}>DUB</Text>
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
            data={filteredAnicrushEpisodes}
            renderItem={renderAnicrushEpisodeItem}
            keyExtractor={(item) => item.id?.toString() || `episode-${item.number}`}
            contentContainerStyle={styles.episodesList}
          />
        </>
      )}
    </View>
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
  video: {
    width: "100%",
    height: "100%",
  },
  episodeTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 16,
  },
  episodeMeta: {
    fontSize: 14,
    color: "#BBBBBB",
    marginTop: 4,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
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
  bottomControls: {
    marginBottom: 16,
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
  playIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  subtitleContainer: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 8,
    borderRadius: 4,
    maxWidth: "80%",
  },
  subtitleText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  segmentsContainer: {
    alignItems: "flex-end",
    position: "absolute",
    top: 150,
    right: 16,
    zIndex: 10,
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
    episodeThumbnail: {
    width: "40%",
    height: 100,
    borderRadius: 8,
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
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  episodesList: {
    paddingBottom: 16,
  },
  searchInput: {
    backgroundColor: "#333",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    color: "#fff",
    margin: 10,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 5,
  },
  subbedBadge: {
    backgroundColor: 'rgb(36, 34, 53)',
  },
  dubbedBadge: {
    backgroundColor: 'rgb(36, 34, 53)',
  },
  activeBadge: {
  backgroundColor: '#E50914',  // Red color to match your theme
  borderWidth: 2,
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
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
   loadingContainer2: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#161616",
  },
  loadingGif: {
    width: 100,
    height: 100,
    resizeMode: "contain",
  },
   playIconOverlayRow: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '110%',
    top: '40%',
    gap: 40,
    zIndex: 10,
  },
  rewindOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fastForwardOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewindIcon: {
    width: 35,
    height: 35,
    tintColor: 'white',
  },
  fastForwardIcon: {
    width: 35,
    height: 35,
    tintColor: 'white',
  },
   selectedQualityItem: {
    backgroundColor: '#333', // or whatever style you want for selected items
    borderColor: '#E50914',
    borderWidth: 1,
  },
  selectedQualityText: {
    color: '#E50914', // or whatever style you want for the text of selected items
    fontWeight: 'bold',
  }
});

export default WatchZoro;