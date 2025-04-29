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
  ScrollView,
  TextInput,
  Animated,
   InteractionManager,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as ScreenOrientation from "expo-screen-orientation";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar";
import axios from "axios";
import { Anime, RootStackParamList, Episode, BackupResponse, Anime3, Anime3Episode } from "../Types/types";
import { useAnimeId } from "../context/EpisodeContext"; // adjust path as needed
import { useKeepAwake } from "expo-keep-awake";
import { StackNavigationProp } from "@react-navigation/stack";
 import AsyncStorage from '@react-native-async-storage/async-storage'; // Make sure AsyncStorage is installed
import { useEpisode } from "../context/EpisodeHistoryProvider";  // adjust path as needed :contentReference[oaicite:0]{index=0}&#8203;:contentReference[oaicite:1]{index=1}

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

const WatchAnimeMaster = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const videoRef = useRef<VideoRefMethods | null>(null);
   const { episodeid, animeId, setAnimeId, setEpisodeid } = useAnimeId();
const { episodes2, addEpisode, updateEpisode } = useEpisode();

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
  const [episodes, setEpisodes] = useState<Anime3[]>([]);
  const [headBackground, setheadBackground] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [item4, setItem4] = useState<BackupResponse | null>(null);
  const [backupImageUrl, setBackupImageUrl] = useState<string>("");
      const [animeTitle, setanimeTitle] = useState<string>("");

  const [isOn, setIsOn] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
const [savedPosition, setSavedPosition] = useState<number | null>(null);

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

      const fetchVideoData = async (server: 'tserver' | 'vhserver') => {
    try {
      const url = `https://animemaster-one.vercel.app/get-m3u8/${server}/${episodeid}`;
      const { data: json } = await axios.get(url);
      if (json.success && json.m3u8_url) {
        setInitialVideoSource(json.m3u8_url);
        setVideoSource(json.m3u8_url);
      }
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => { 
    
    fetchVideoData('tserver');
 }, 
  
  [episodeid]);

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

 const fetchAnimeDetails = async () => {
    try {
      const response = await axios.get(`https://animemaster-one.vercel.app/details/${animeId}`);
           const posterUrl = response.data.headBackground;
      const animeTitle = response.data.headTitle;
      setanimeTitle  (animeTitle)
      setBackupImageUrl(posterUrl)
      setEpisodes(response.data.episodes);
    } catch (error) {
      console.error('Failed to load episodes:', error);
    } finally {
      setLoading(false);
    }
  };

 

  useEffect(() => {
    if (animeId) {
      fetchAnimeDetails();
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
    const episodeNumber = currentEpisode?.episodeText  
    const episodeTitle = `${animeTitle || ""} ${episodeNumber !== null ? episodeNumber : ''}`;
    
    // Current timestamp for created_at
    const currentTimestamp = new Date().toISOString();
    
    // Get the image from currentEpisode
    const imageUrl = backupImageUrl || 'https://via.placeholder.com/40';
    
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
        provider: "Animemaster",

        
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

const filteredEpisodes = episodes
  .filter((episode) => {
    if (!searchQuery) return true;
    return episode.episodeText.toString().includes(searchQuery);
  })
  .sort((a, b) => {
    // Extract numerical value from episodeText
    const numA = parseInt(a.episodeText.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.episodeText.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });
  
  const filteredBackupEpisodes =
    item4 && Array.isArray(item4.episodes)
      ? item4.episodes
          .filter((episode) => {
            if (!searchQuery) return true;
            return episode.number.toString().includes(searchQuery);
          })
          .sort((a, b) => Number(a.number) - Number(b.number))
      : [];

  const currentIndex = filteredEpisodes.findIndex(
    (ep) => ep.episodeId === episodeid
  );

  const formatEpisodeId = (id: string) => {
    return id.replace("?", "$").replace("ep=", "episode$");
  };

const handlePreviousEpisode = () => {
  if (filteredEpisodes.length > 0 && currentIndex > 0) {
    const previousEpisode = filteredEpisodes[currentIndex - 1];
    setEpisodeLoading(true);
    setEpisodeid(previousEpisode.episodeId);
    navigation.navigate("Animemaster");
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
  if (filteredEpisodes.length > 0 && currentIndex < filteredEpisodes.length - 1) {
    const nextEpisode = filteredEpisodes[currentIndex + 1];
    setEpisodeLoading(true);
    setEpisodeid(nextEpisode.episodeId);
    navigation.navigate("Animemaster");
  }
};


 

const handleToggleFullScreen = async () => {
  // 1) Save current position
  const currentPos = currentTime;

  // 2) Flip your fullscreen flag immediately so your layout starts updating
  setIsFullscreen(prev => !prev);

  // 3) Do all the orientation / nav‑bar / status‑bar work
  if (!isFullscreen) {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    await NavigationBar.setVisibilityAsync("hidden");
    navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
    StatusBar.setHidden(true);
  } else {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    await NavigationBar.setVisibilityAsync("visible");
    navigation.getParent()?.setOptions({ tabBarStyle: { display: "flex" } });
    StatusBar.setHidden(false);
  }

  // 4) Wait for RN to finish the layout pass, then re‑seek
  InteractionManager.runAfterInteractions(() => {
    videoRef.current?.setPositionAsync(currentPos);
  });
};
  
  const currentEpisode = episodes.find((ep) => ep.episodeId === episodeid);

   const renderMasterEpisodes = ({ item }: { item: Anime3Episode }) => {
     return (
       <TouchableOpacity
         style={styles.episodeContainer}
         onPress={() => {
           const formattedEpisodeId = item.episodeId;
                     setEpisodeLoading(true);
           setEpisodeid(formattedEpisodeId);
           setAnimeId(animeId);
           navigation.navigate("Animemaster");
         }}
       >
                <Image
                     source={{
                       uri: backupImageUrl || "https://via.placeholder.com/150",
                     }}
                     style={styles.episodeThumbnail}
                   />
         <View style={styles.episodeTextContainer}>
           <Text style={styles.episodeTitle}>Episode {item.episodeText}</Text>
  
         </View>
       </TouchableOpacity>
     );
   };
 

  // Updated renderFullscreen with a single outer TouchableWithoutFeedback (with pointerEvents defaulted to "auto")
  // so that its inner TouchableOpacity buttons receive touches.
  const renderFullscreen = () => (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Pressable
        onPress={() => setControlsVisible(!controlsVisible)}
        style={styles.fullscreenContainer}
      >
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
        {/* The overlay container now uses pointerEvents="auto" so inner buttons can be pressed */}
        <TouchableWithoutFeedback onPress={() => !isLocked && setControlsVisible(!controlsVisible)}>
          <View style={[styles.overlay, styles.fullscreenOverlay]}>
            {controlsVisible && (
              <>
                <View style={styles.topControls}>
<TouchableOpacity onPress={async () => {
                   await returnToPortraitMode();
                   navigation.goBack();
                 }}>              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>                  {currentEpisode && (
                    <Text style={styles.episodeNumberText}>
                      Episode {currentEpisode.episodeText}
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
    disabled={currentIndex <= 0}
    style={[
      styles.navButton,
      currentIndex <= 0 && styles.disabledButton,
    ]}
  >
    <Ionicons name="chevron-back" size={24} color="white" />
  </TouchableOpacity>

  <TouchableOpacity onPress={handlePlayPause} style={styles.controlButton}>
    <Ionicons name={paused ? "play" : "pause"} size={32} color="white" />
  </TouchableOpacity>

  <TouchableOpacity
    onPress={handleNextEpisode}
    disabled={currentIndex >= filteredEpisodes.length - 1}
    style={[
      styles.navButton,
      currentIndex >= filteredEpisodes.length - 1 && styles.disabledButton,
    ]}
  >
    <Ionicons name="chevron-forward" size={24} color="white" />
  </TouchableOpacity>
</View>

                    <Text style={styles.timeText}>{formatTime(duration / 1000)}</Text>
                  </View>
                </View>
                {/* Instead of wrapping the play icon row in an extra TouchableWithoutFeedback,
                    we simply allow these buttons to work by not intercepting their touch events */}
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
        </TouchableWithoutFeedback>
      </Pressable>
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
      <Pressable onPress={() => setControlsVisible(!controlsVisible)} style={styles.normalContainer}>
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
        <TouchableWithoutFeedback onPress={() => !isLocked && setControlsVisible(!controlsVisible)}>
          <View style={styles.overlay}>
            {controlsVisible && (
              <>
                <View style={styles.topControls}>
              <TouchableOpacity onPress={async () => {
                                await returnToPortraitMode();
                                navigation.goBack();
                              }}>              <Ionicons name="arrow-back" size={24} color="white" />
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
    disabled={currentEpisode && currentIndex <= 0}
    style={[
      styles.navButton,
      currentEpisode && currentIndex <= 0 && styles.disabledButton,
    ]}
  >
    <Ionicons name="chevron-back" size={24} color="white" />
  </TouchableOpacity>

  <TouchableOpacity onPress={handlePlayPause} style={styles.controlButton}>
    <Ionicons name={paused ? "play" : "pause"} size={32} color="white" />
  </TouchableOpacity>

  <TouchableOpacity
    onPress={handleNextEpisode}
    disabled={currentEpisode && currentIndex >= filteredEpisodes.length - 1}
    style={[
      styles.navButton,
      currentEpisode && currentIndex >= filteredEpisodes.length - 1 && styles.disabledButton,
    ]}
  >
    <Ionicons name="chevron-forward" size={24} color="white" />
  </TouchableOpacity>
</View>

                    <Text style={styles.timeText}>{formatTime(duration / 1000)}</Text>
                  </View>
                  
                </View>
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
        </TouchableWithoutFeedback>
      </Pressable>
    {currentEpisode && (
  <View style={styles.episodeNavigation}>
    <TouchableOpacity
      onPress={handlePreviousEpisode}
      disabled={currentIndex <= 0}
      style={[
        styles.navButton,
        currentIndex <= 0 && styles.disabledButton,
      ]}
    >
      <Ionicons name="chevron-back" size={30} color="white" />
    </TouchableOpacity>

    <Text style={styles.episodeNumberText}>
      Episode {currentEpisode.episodeText}
    </Text>

    <TouchableOpacity
      onPress={handleNextEpisode}
      disabled={currentIndex >= filteredEpisodes.length - 1}
      style={[
        styles.navButton,
        currentIndex >= filteredEpisodes.length - 1 && styles.disabledButton,
      ]}
    >
      <Ionicons name="chevron-forward" size={30} color="white" />
    </TouchableOpacity>
  </View>
)}


      <View style={styles.serverButtons}>
          <TouchableOpacity
            style={[styles.serverButton, videoSource.includes('/tserver/') && styles.serverActive]}
            onPress={()=>fetchVideoData('tserver')}>
            <Text style={styles.serverText}>Server 1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.serverButton, videoSource.includes('/vhserver/') && styles.serverActive]}
            onPress={()=>fetchVideoData('vhserver')}>
            <Text style={styles.serverText}>Server 2</Text>
          </TouchableOpacity>
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
      <FlatList
        data={filteredEpisodes}
        renderItem={renderMasterEpisodes}
        keyExtractor={(item) => item.episodeId}
        scrollEnabled={false}
        contentContainerStyle={styles.episodesList}
      />
      
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
  loadingContainer2:{
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
   serverButtons:{flexDirection:'row',justifyContent:'center',padding:8,gap:12},
  serverButton:{paddingVertical:6,paddingHorizontal:12,borderRadius:4,backgroundColor:'#333'},
  serverActive:{backgroundColor:'#E50914'},
  serverText:{color:'#fff',fontSize:14},
});

export default WatchAnimeMaster;
