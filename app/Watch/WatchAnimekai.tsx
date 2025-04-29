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
  FlatList,
  Image,
  TextInput,
  BackHandler 
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as ScreenOrientation from "expo-screen-orientation";
import { useNavigation } from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar";
import axios from "axios";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Anime, RootStackParamList, Episode, BackupResponse } from "../Types/types";
import { useAnimeId } from "../context/EpisodeContext"; // adjust path as needed
import { useEpisode } from "../context/EpisodeHistoryProvider";  // adjust path as needed :contentReference[oaicite:0]{index=0}&#8203;:contentReference[oaicite:1]{index=1}
import AsyncStorage from '@react-native-async-storage/async-storage'; // Make sure AsyncStorage is installed
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
  kind: string;
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
 const { episodes2, addEpisode, updateEpisode } = useEpisode();
   const [searchQuery, setSearchQuery] = useState<string>("");
   const [episodeLoading, setEpisodeLoading] = useState(false);
 
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
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [anime, setAnime] = useState<Anime | null>(null);
  const [isOn, setIsOn] = useState(false);
const [savedPosition, setSavedPosition] = useState<number | null>(null);

  const [selectedSubtitle, setSelectedSubtitle] = useState("disabled");
  const [subtitlesPickerVisible, setSubtitlesPickerVisible] = useState(false);
  const [parsedSubtitles, setParsedSubtitles] = useState<
    Array<{ start: number; end: number; text: string }>
  >([]);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [introSegment, setIntroSegment] = useState<Segment | null>(null);
  const [outroSegment, setOutroSegment] = useState<Segment | null>(null);
const [videoError, setVideoError] = useState(false);
const [dub, setDub] = useState<boolean | string | null>(null);
   const [error, setError] = useState<string | null>(null);
 const [isDubMode, setIsDubMode] = useState(false);
 
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

   const toggleSwitch = () => {
    setIsOn(previous => !previous);
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
    const episodeNumber = currentEpisode?.number;
    const episodeTitle = `${anime?.title?.romaji || ""} Episode ${episodeNumber !== null ? episodeNumber : ''}`;
    
    // Current timestamp for created_at
    const currentTimestamp = new Date().toISOString();
    
    // Get the image from currentEpisode
    const imageUrl = currentEpisode?.image ||   'https://via.placeholder.com/40';
    
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
        provider: "Animekai",

        
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

const handleSubClick = () => {
  
  setEpisodeLoading(true); // Set loading state to true
  setIsDubMode(false);
   
};

const handleDubClick = () => {
  setEpisodeLoading(true); // Set loading state to true
  setIsDubMode(true);
  };

useEffect(() => {
  const fetchProvider = async () => {
    try {
      const response = await axios.get(`https://api.amvstr.me/api/v2/info/${animeId}`);
      
      if (response.data?.dub !== undefined) {
        setDub(response.data.dub);
      }
      
      setError(null);
    } catch (error) {
      console.error("Backup API also failed", error);
      setError("Failed to fetch data from both APIs");
    }
  };
  
  if (animeId) {
    fetchProvider();
  }
}, [animeId]);
 
const fetchVideoData = async () => {
  try {
    setIsVideoLoading(true); // Show loading state
    setVideoError(false); // Reset error state
    
    // Add the dub parameter to the URL
    const response = await axios.get(
      `https://partyonyou.vercel.app/anime/animekai/watch/${episodeid}?dub=${isDubMode ? 'true' : 'false'}`
    );
    
    console.log(
      `https://partyonyou.vercel.app/anime/animekai/watch/${episodeid}?dub=${isDubMode ? 'true' : 'false'}`
    );
    
    const json = response.data;
    
    if (json.sources && json.sources.length > 0) {
      const sourceUrl = json.sources[0].url;
      setInitialVideoSource(sourceUrl);
      setVideoSource(sourceUrl);
      setSelectedQuality(sourceUrl);
    } else {
      // No sources found - show error
      setVideoError(true);
    }
    
    // Set subtitles from API if available and select English if available.
    if (json.subtitles) {
      setSubtitles(json.subtitles);
      const englishSubtitle = (json.subtitles as Subtitle[]).find((sub: Subtitle) =>
        sub.kind.toLowerCase().includes("en") ||
        sub.kind.toLowerCase().includes("english")
      );
      if (englishSubtitle) {
        setSelectedSubtitle(englishSubtitle.kind);
      }
    }
    
    // Set intro/outro segments if available.
    if (json.intro) {
      setIntroSegment(json.intro);
    }
    if (json.outro) {
      setOutroSegment(json.outro);
    }
  } catch (error) {
    console.error("Error fetching video data: ", error);
    // Set error state to true when API fails
    setVideoError(true);
  } finally {
    setIsVideoLoading(false); // Hide loading state regardless of outcome
    setEpisodeLoading(false); // Make sure to reset episode loading state
  }
};

 

  
   useEffect(() => {
  setTimeout(() => setEpisodeLoading(false), 500);
  fetchVideoData();
  
}, [episodeid, isDubMode]);

const handleBackPress = async () => {
  if (isFullscreen) {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      await NavigationBar.setVisibilityAsync("visible");
      navigation.getParent()?.setOptions({ tabBarStyle: { display: "flex" } });
      StatusBar.setHidden(false);
      setIsFullscreen(false);
    } catch (error) {
      console.error("Error returning to portrait mode:", error);
    }
  }
  navigation.goBack();
};
useEffect(() => {
  const backAction = () => {
    if (isFullscreen) {
      handleToggleFullScreen();
      return true; // Prevents default back behavior
    }
    return false; // Allows default back behavior
  };

  const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
  return () => backHandler.remove();
}, [isFullscreen]);
useEffect(() => {
  return () => {
    // This will run when component unmounts
    if (isFullscreen) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      NavigationBar.setVisibilityAsync("visible");
      if (navigation.getParent()) {
        navigation.getParent()?.setOptions({ tabBarStyle: { display: "flex" } });
      }
      StatusBar.setHidden(false);
    }
  };
}, [isFullscreen, navigation]);

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

  

    const fetchAnimeDetails = async () => {
    try {
      const response = await axios.get(`https://partyonyou.vercel.app/meta/anilist/info/${animeId}?provider=animekai`);
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
     }
  };

    useEffect(() => {
       if (animeId) {
         fetchAnimeDetails();
        }
     }, [animeId]);
  
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

// Add this useEffect to initialize and clean up the timer
useEffect(() => {
  if (controlsVisible) {
    resetControlsTimer();
  }
  
  return () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };
}, [controlsVisible]);

  

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
        // Find the subtitle object for the selected kinduage.
        const subtitleObj = subtitles.find((sub) => sub.kind === selectedSubtitle);
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
            StatusBar.setHidden(true,);  
         setControlsVisible(true);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        await NavigationBar.setVisibilityAsync("visible");
        navigation.getParent()?.setOptions({ tabBarStyle: { display: "flex" } });
            StatusBar.setHidden(false,); // Show the status bar

         setControlsVisible(true);
      }
      setIsFullscreen(!isFullscreen);
    };
 
    
 const handlePreviousEpisode = () => {
  if (filteredEpisodes.length > 0) {
    if (currentIndex > 0) {
      const previousEpisode = filteredEpisodes[currentIndex - 1];
      setEpisodeLoading(true);
      setEpisodeid(previousEpisode.episodeid);
      navigation.navigate("Animekai");
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
  if (filteredEpisodes.length > 0) {
    if (currentIndex < filteredEpisodes.length - 1) {
      const nextEpisode = filteredEpisodes[currentIndex + 1];
      setEpisodeLoading(true);
      setEpisodeid(nextEpisode.episodeid);
      navigation.navigate("Animekai");
    }
  }
};


 

   const filteredEpisodes = episodes
    .filter((episode) => {
      if (!searchQuery) return true;
      return episode.number.toString().includes(searchQuery);
    })
    .sort((a, b) => Number(a.number) - Number(b.number));

      const currentIndex = filteredEpisodes.findIndex(
    (ep) => ep.episodeid === episodeid
  );

      const currentEpisode = episodes.find((ep) => ep.episodeid === episodeid);

      const renderEpisodeItem = ({ item }: { item: Episode }) => {
        return (
          <TouchableOpacity
            style={styles.episodeContainer}
            onPress={() => {
          setEpisodeLoading(true);
              setEpisodeid(item.episodeid);
              navigation.navigate("Animekai");
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
    <View style={styles.container}>
  <Pressable 
  onPress={() => setControlsVisible(!controlsVisible)}
  style={isFullscreen ? styles.fullscreenContainer : styles.normalContainer}
>
  
  {videoError ? (
    // Error state - only show error content
    <View style={styles.errorContainer}>
      <Image
        source={{ uri: "https://img.freepik.com/free-vector/glitch-error-404-page_23-2148105404.jpg?t=st=1745470901~exp=1745474501~hmac=e12cc53fcf022d08acf6c5416b21ad457b494572dda8eee4a8c724b7d5fe1127&w=826" }}
        style={styles.errorImage}
        resizeMode="contain"
      />
      <Text style={styles.errorText}>Video not found</Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={() => {
          setVideoError(false);
          fetchVideoData();
        }}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  ) : (
    // Video playing state - show video and controls
    <>
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
          kinduage: sub.kind,
          type: "text/vtt",
          title: sub.kind,
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
  {currentEpisode && (
              <Text style={styles.episodeNumberText}>
                Episode {currentEpisode.number}
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
                    <TouchableOpacity style={styles.controlButton}>
                      <Ionicons name="play-back" size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePlayPause} style={styles.controlButton}>
                      <Ionicons name={paused ? "play" : "pause"} size={32} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.controlButton}>
                      <Ionicons name="play-forward" size={24} color="white" />
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
    </>
  )}
</Pressable>

        
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
           <View style={styles.nextEpisodesHeader}>
              <Text style={styles.nextEpisodesText}>Episodes</Text>
                
            </View>
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
                key={sub.kind}
                style={styles.qualityItem}
                onPress={() => {
                  setSelectedSubtitle(sub.kind);
                  setSubtitlesPickerVisible(false);
                }}
              >
                <Text style={styles.qualityText}>{sub.kind}</Text>
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
       {!isFullscreen && (
 <> 
   {currentEpisode && (
  <View style={styles.episodeNavigation}>
    <TouchableOpacity
      onPress={handlePreviousEpisode}
      disabled={currentEpisode && currentIndex <= 0}
      style={[
        styles.navButton,
        (currentEpisode && currentIndex <= 0) && styles.disabledButton,
      ]}
    >
      <Ionicons name="chevron-back" size={30} color="white" />
    </TouchableOpacity>
    <Text style={styles.episodeNumberText}>
      Episode {currentEpisode?.number}
    </Text>
    <TouchableOpacity
      onPress={handleNextEpisode}
      disabled={currentEpisode && currentIndex >= filteredEpisodes.length - 1}
      style={[
        styles.navButton,
        (currentEpisode && currentIndex >= filteredEpisodes.length - 1) && styles.disabledButton,
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
            data={filteredEpisodes}
            renderItem={renderEpisodeItem}
            keyExtractor={(item) => item.episodeid}
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
  },
  subtitleText: {
    color: "#fff",
    fontSize: 16,
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
  backgroundColor: 'red',
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: 'red',
  alignItems: 'center',
  marginVertical: 5,
  
},
skipButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: 'bold',
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
    backgroundColor: "rgba(0,0,0,0.5)",
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
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
   episodeNumberText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
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
   errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    height: '100%',
    width: '100%',
  },
  errorImage: {
    width: '80%',
    height: '60%',
    marginBottom: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#E50914',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
   buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 12,
  },
  button: {
    backgroundColor: "#E50914",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginHorizontal: 6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
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