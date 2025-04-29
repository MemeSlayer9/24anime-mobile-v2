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
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as ScreenOrientation from "expo-screen-orientation";
import { useNavigation } from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar";
import axios from "axios";

const { height } = Dimensions.get("window");

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

// Define an interface for subtitles.
interface Subtitle {
  url: string;
  lang: string;
}

// Define an interface for segments.
interface Segment {
  start: number;
  end: number;
}

// Cast the Video component as any to allow passing textTracks properties
const VideoWithSubtitles = Video as any;

const VideoPlayer = () => {
  const navigation = useNavigation();
  const videoRef = useRef<VideoRefMethods | null>(null);

  // Video source, quality options, subtitles, and UI controls.
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
  // State for locking controls.
  const [isLocked, setIsLocked] = useState(false);
  // State for displaying an overlay play/pause icon.
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  // State for controlling controls visibility in fullscreen.
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // State for subtitles.
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState("disabled");
  const [subtitlesPickerVisible, setSubtitlesPickerVisible] = useState(false);
  // New state: parsed cues from the subtitle file and the currently displayed subtitle.
  const [parsedSubtitles, setParsedSubtitles] = useState<
    Array<{ start: number; end: number; text: string }>
  >([]);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  // New state for segments.
  const [introSegment, setIntroSegment] = useState<Segment | null>(null);
  const [outroSegment, setOutroSegment] = useState<Segment | null>(null);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Adjust volume icon logic.
  const getVolumeIcon = (vol: number) => {
    if (vol === 0) return "volume-mute-sharp";
    if (vol > 0 && vol <= 0.33) return "volume-low-sharp";
    if (vol > 0.33 && vol <= 0.66) return "volume-medium-sharp";
    if (vol > 0.66) return "volume-high-sharp";
    return "volume-high-sharp";
  };

  // Fetch video data (including sources, subtitles, and segments) from API.
  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        const response = await axios.get(
          "https://kangaroo-kappa.vercel.app/anime/zoro/watch/jujutsu-kaisen-tv-534$episode$52329"
        );
        const json = response.data;
        if (json.sources && json.sources.length > 0) {
          const sourceUrl = json.sources[0].url;
          setInitialVideoSource(sourceUrl);
          setVideoSource(sourceUrl);
          setSelectedQuality(sourceUrl);
        }
        // Set subtitles from API if available and select English if available.
        if (json.subtitles) {
          setSubtitles(json.subtitles);
          const englishSubtitle = (json.subtitles as Subtitle[]).find((sub: Subtitle) =>
            sub.lang.toLowerCase().includes("en") ||
            sub.lang.toLowerCase().includes("english")
          );
          if (englishSubtitle) {
            setSelectedSubtitle(englishSubtitle.lang);
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
      }
    };
    fetchVideoData();
  }, []);

  // Fetch and parse quality options from the master playlist.
  useEffect(() => {
    if (initialVideoSource) {
      const fetchQualities = async () => {
        setLoadingQualities(true);
        try {
          const response = await axios.get(initialVideoSource, { responseType: "text" });
          const text = response.data;
          const lines = text.split("\n");
          const options: Array<{ label: string; uri: string }> = [];
          const baseUrl = initialVideoSource.substring(
            0,
            initialVideoSource.lastIndexOf("/") + 1
          );
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith("#EXT-X-STREAM-INF:")) {
              const resolutionMatch = lines[i].match(/RESOLUTION=(\d+)x(\d+)/);
              let label = "Quality Option";
              if (resolutionMatch) {
                label = `${resolutionMatch[2]}p`;
              }
              if (lines[i + 1] && !lines[i + 1].startsWith("#")) {
                let variantUri = lines[i + 1].trim();
                if (!variantUri.startsWith("http")) {
                  variantUri = baseUrl + variantUri;
                }
                options.push({ label, uri: variantUri });
              }
            }
          }
          if (options.length === 0) {
            options.push({ label: "Auto", uri: initialVideoSource });
          }
          setQualities(options);
          setSelectedQuality(options[0].uri);
        } catch (error) {
          console.error("Error fetching qualities: ", error);
        } finally {
          setLoadingQualities(false);
        }
      };
      fetchQualities();
    }
  }, [initialVideoSource]);

  // New effect: Fetch and parse the selected subtitle file.
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

  // Parse VTT file into an array of cues.
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

  const handlePlayPause = async () => {
    if (paused) {
      await videoRef.current?.playAsync();
    } else {
      await videoRef.current?.pauseAsync();
    }
    setPaused(!paused);
    // Display the overlay icon briefly.
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 1000);
  };

  const handleToggleFullScreen = async () => {
    if (!isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      await NavigationBar.setVisibilityAsync("hidden");
      navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
      // In fullscreen, show controls initially then auto-hide them.
      setControlsVisible(true);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      await NavigationBar.setVisibilityAsync("visible");
      navigation.getParent()?.setOptions({ tabBarStyle: { display: "flex" } });
      // When exiting fullscreen, always show controls.
      setControlsVisible(true);
    }
    setIsFullscreen(!isFullscreen);
  };

  const onQualityChange = async (newUri: string) => {
    setPickerVisible(false);
    try {
      if (videoRef.current) {
        await videoRef.current.unloadAsync();
        await videoRef.current.loadAsync({ uri: newUri }, {}, true);
      }
      setVideoSource(newUri);
      setSelectedQuality(newUri);
    } catch (error) {
      console.error("Error changing quality: ", error);
    }
  };

  const handlePlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      if (!isSliding) {
        setSliderValue(status.positionMillis);
      }
      setCurrentTime(status.positionMillis);
      setDuration(status.durationMillis || 0);
      // Update the subtitle text based on the current playback time.
      if (selectedSubtitle !== "disabled" && parsedSubtitles.length > 0) {
        // Convert current time from millis to seconds.
        const currentSec = status.positionMillis / 1000;
        const cue = parsedSubtitles.find(
          (c) => currentSec >= c.start && currentSec < c.end
        );
        setCurrentSubtitle(cue ? cue.text : "");
      }
    }
  };

  // Handler for toggling the lock state.
  const handleLockToggle = () => {
    setIsLocked((prev) => !prev);
  };

  // Handler for toggling controls in fullscreen mode.
  const handleOverlayPress = () => {
    if (isFullscreen) {
      setControlsVisible((prev) => !prev);
    }
  };

  // Auto-hide controls in fullscreen after 3 seconds of inactivity.
  useEffect(() => {
    if (isFullscreen && controlsVisible) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isFullscreen, controlsVisible]);

  // Determine if controls should be shown:
  // - Always show controls when not in fullscreen.
  // - In fullscreen, show controls only when controlsVisible is true.
  const shouldShowControls = !isFullscreen || (isFullscreen && controlsVisible);

  return (
    <View style={styles.container}>
      {videoSource ? (
        <VideoWithSubtitles
          key={videoSource}
          ref={videoRef as any}
          source={{ uri: videoSource }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          volume={volume}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          // Pass textTracks for native subtitle support.
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
      ) : (
        <ActivityIndicator size="large" color="red" style={{ height: height * 0.4 }} />
      )}

      {/* Subtitle overlay */}
      {currentSubtitle !== "" && (
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitleText}>{currentSubtitle}</Text>
        </View>
      )}

      {/* Wrap overlay in TouchableWithoutFeedback so that taps toggle controls in fullscreen */}
      <TouchableWithoutFeedback onPress={handleOverlayPress}>
        <View style={styles.overlay}>
          {/* Top Row */}
          {shouldShowControls && !isLocked && (
            <View style={styles.topRow}>
              <View style={styles.leftContainer}>
                <TouchableOpacity style={styles.backButton}>
                  <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.titleText}>Jujutsu Kaisen Episode 1</Text>
              </View>
              <View style={styles.topControls}>
                <Ionicons name="play-outline" size={24} color="white" />
                <TouchableOpacity onPress={() => setSubtitlesPickerVisible(true)}>
                  <Ionicons name="options" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPickerVisible(true)}>
                  <Ionicons name="settings-outline" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleToggleFullScreen}>
                  <Ionicons name="scan-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Overlay Play/Pause Icon */}
          {showPlayIcon && (
            <View style={styles.iconOverlay}>
              <Ionicons name={paused ? "play" : "pause"} size={64} color="white" />
            </View>
          )}

          
          <View style={styles.sliderContainer}>
            {/* Display intro and outro segments above the slider */}
               {isLocked && (
              <View style={styles.unlockContainer}>
                <TouchableOpacity onPress={handleLockToggle}>
                  <Ionicons name="lock-open" size={28} color="white" />
                </TouchableOpacity>
              </View>
            )}

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






            {shouldShowControls && (
              <>
                <View style={styles.timestampContainer}>
                  <Text style={styles.timestamp}>{formatTime(currentTime / 1000)}</Text>
                  <Text style={styles.timestamp}>{formatTime(duration / 1000)}</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={duration}
                  value={sliderValue}
                  onValueChange={(value) => {
                    setIsSliding(true);
                    setSliderValue(value);
                  }}
                  onSlidingComplete={(value) => {
                    videoRef.current?.setPositionAsync(value);
                    setIsSliding(false);
                  }}
                  minimumTrackTintColor="red"
                  maximumTrackTintColor="gray"
                  thumbTintColor="red"
                />
              </>
            )}

            <View style={styles.controlsContainer}>
              {/* Left Controls (Volume and Lock) */}
              {shouldShowControls && !isLocked && (
                <View style={styles.leftControls}>
                  <TouchableOpacity onPress={handleLockToggle}>
                    <Ionicons name="lock-closed" size={28} color="white" />
                  </TouchableOpacity>
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
                </View>
              )}
              {/* Center Controls */}
              {shouldShowControls && !isLocked && (
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
              )}
              {/* Right Controls */}
              {shouldShowControls && !isLocked && (
                <View style={styles.rightControls}>
                  <TouchableOpacity onPress={handleToggleFullScreen}>
                    <Ionicons name="scan-outline" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Quality Picker Modal */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={pickerVisible}
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {loadingQualities ? (
              <ActivityIndicator size="large" color="red" />
            ) : (
              <>
                <Text style={styles.modalTitle}>Select Video Quality</Text>
                {qualities.map((q) => (
                  <TouchableOpacity
                    key={q.uri}
                    style={styles.qualityOption}
                    onPress={() => onQualityChange(q.uri)}
                  >
                    <Text style={styles.qualityOptionText}>{q.label}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setPickerVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Subtitles Picker Modal */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={subtitlesPickerVisible}
        onRequestClose={() => setSubtitlesPickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Subtitle</Text>
            <TouchableOpacity
              style={styles.qualityOption}
              onPress={() => {
                setSelectedSubtitle("disabled");
                setSubtitlesPickerVisible(false);
              }}
            >
              <Text style={styles.qualityOptionText}>Off</Text>
            </TouchableOpacity>
            {subtitles.map((sub) => (
              <TouchableOpacity
                key={sub.url}
                style={styles.qualityOption}
                onPress={() => {
                  setSelectedSubtitle(sub.lang);
                  setSubtitlesPickerVisible(false);
                }}
              >
                <Text style={styles.qualityOptionText}>{sub.lang}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSubtitlesPickerVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "black",
    justifyContent: "center",
  },
  video: {
    width: "100%",
    height: height * 0.4,
  },
  overlay: {
    position: "absolute",
    width: "100%",
    height: height * 0.4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 10,
  },
  titleText: {
    color: "white",
    fontSize: 16,
    marginLeft: 8,
  },
  topControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  bottomControls: {
    position: "absolute",
    top: "50%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    transform: [{ translateY: -16 }],
  },
  controlButton: {
    marginHorizontal: 15,
  },
  sliderContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  segmentsContainer: {
    alignItems: "center",
    marginBottom: 5,
   top: -55,
    right: 10,
    zIndex: 10,
    position: "absolute",
  },
  segmentText: {
    color: "yellow",
    fontSize: 14,
  },
  timestampContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  timestamp: {
    color: "red",
    fontSize: 15,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    position: "relative",
  },
  leftControls: {
    position: "absolute",
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  centerControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  rightControls: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
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
  modalContainer: {
    flex: 1,
    justifyContent: "center", 
    alignItems: "center",     
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
  },
  qualityOption: {
    backgroundColor: "blue",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginVertical: 5,
  },
  qualityOptionText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
  },
  closeButton: {
    marginTop: 10,
    alignItems: "center",
    padding: 10,
    backgroundColor: "red",
    borderRadius: 5,
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  unlockContainer: {
    position: "absolute",
    top: -35,
    left: 20,
    zIndex: 10,
  },
  iconOverlay: {
    position: "absolute",
    alignSelf: "center",
    top: "40%",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 50,
    padding: 20,
  },
  // New styles for subtitle overlay
  subtitleContainer: {
    position: "absolute",
    bottom:  80,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  subtitleText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  skipButton: {
  backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
});

export default VideoPlayer;
