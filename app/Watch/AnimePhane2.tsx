import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar, Alert, ActivityIndicator, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import axios from "axios";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Anime, RootStackParamList, Episode, BackupResponse } from "../Types/types";
import { Ionicons } from "@expo/vector-icons";

import { useAnimeId } from "../context/EpisodeContext"; // adjust path as needed
import * as NavigationBar from "expo-navigation-bar";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

interface VideoSource {
  url: string;
  isM3U8: boolean;
  quality: string;
  isDub: boolean;
}

type VideoPlayerRouteProp = RouteProp<RootStackParamList, "Animepahe">;

export default function ImprovedHLSWebViewPlayer() {
  // Fix: Add proper type to webViewRef
  const webViewRef = useRef<WebView>(null);
  const { episodeid, animeId, setAnimeId, setEpisodeid } = useAnimeId();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const [controlsVisible, setControlsVisible] = useState(true);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [selectedQuality, setSelectedQuality] = useState("");
  const [videoSource, setVideoSource] = useState("");
  const [showQualityOptions, setShowQualityOptions] = useState(false);
  
  // Fix: Add proper type to controlsTimerRef and bufferingTimerRef
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bufferingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimer = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000); // Hide controls after 3 seconds of inactivity
  };
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
  
  const fetchVideoData = async () => {
    try {
      setIsReady(false);
      const response = await axios.get(`https://kangaroo-kappa.vercel.app/anime/animepahe/watch?episodeId=${episodeid}`, {
        timeout: 10000 // 10 second timeout
      });
      const json = response.data;
      
      if (json.sources && json.sources.length > 0) {
        // Add proxy URL to each source with proper URL encoding
        const proxyUrl = "https://hls.shrina.dev/proxy/";
        const modifiedSources = json.sources.map((source: VideoSource) => ({
          ...source,
          url: `${proxyUrl}${encodeURIComponent(source.url)}`
        }));
        
        // Store all sources with proxy URLs
        setSources(modifiedSources);
        
        // Find the highest quality non-dubbed source as default
        // Sort by quality (assuming higher quality has "1080p" in it)
        const sortedSources = [...modifiedSources].sort((a, b) => {
          // Prioritize BD sources
          const aHasBD = a.quality.includes("BD");
          const bHasBD = b.quality.includes("BD");
          
          if (aHasBD && !bHasBD) return -1;
          if (!aHasBD && bHasBD) return 1;
          
          // Then prioritize by resolution
          const aRes = a.quality.includes("1080p") ? 3 : 
                      a.quality.includes("720p") ? 2 : 
                      a.quality.includes("480p") ? 1 : 0;
          const bRes = b.quality.includes("1080p") ? 3 : 
                      b.quality.includes("720p") ? 2 : 
                      b.quality.includes("480p") ? 1 : 0;
          
          return bRes - aRes;
        });
        
        // Filter for non-dubbed sources only
        const nonDubbed = sortedSources.filter(src => !src.isDub);
        
        // Select the first (highest quality) non-dubbed source, or fall back to first source
        const defaultSource = nonDubbed.length > 0 ? nonDubbed[0] : sortedSources[0];
        
        setVideoSource(defaultSource.url);
        setSelectedQuality(defaultSource.quality);
      }
    } catch (error) {
      console.error("Error fetching video data: ", error);
      Alert.alert(
        "Error",
        "Failed to load video. Please check your internet connection and try again.",
        [{ text: "OK" }]
      );
    }
  };
  
  useEffect(() => {
    if (episodeid) {
      fetchVideoData();
    }
  }, [episodeid]);
  
  // HTML for WebView-based player with improved HLS.js configuration
  const webViewHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body, html { 
          margin: 0; 
          padding: 0; 
          width: 100%; 
          height: 100%; 
          background: #000; 
          overflow: hidden; 
          touch-action: none;
        }
        #player { 
          width: 100%; 
          height: 100%; 
          outline: none;
          position: absolute;
          top: 0;
          left: 0;
        }
        .hidden {
          display: none;
        }
        #loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-family: Arial, sans-serif;
          background: rgba(0,0,0,0.7);
          padding: 10px 20px;
          border-radius: 5px;
          z-index: 10;
        }
        #error {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-family: Arial, sans-serif;
          background: rgba(255,0,0,0.7);
          padding: 10px 20px;
          border-radius: 5px;
          z-index: 10;
          text-align: center;
          max-width: 80%;
        }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/hls.js@1.4.12"></script>
    </head>
    <body>
      <video id="player" webkit-playsinline playsinline></video>
      <div id="loading">Loading stream...</div>
      <div id="error" class="hidden"></div>
      
      <script>
        // Initialize variables
        let isPlayerReady = false;
        let hls = null;
        let retryCount = 0;
        const MAX_RETRIES = 3;
        let lastActivity = Date.now();
        
        document.addEventListener('DOMContentLoaded', function() {
          const video = document.getElementById('player');
          const loading = document.getElementById('loading');
          const errorDiv = document.getElementById('error');
          const hlsUrl = "${videoSource}";
          
          // Function to send message to React Native
          function sendToReactNative(message) {
            window.ReactNativeWebView.postMessage(JSON.stringify(message));
          }
          
          function setupHls() {
            if (Hls.isSupported()) {
              // Clean up existing HLS instance if any
              if (hls) {
                hls.destroy();
                hls = null;
              }
              
              // Create optimized HLS configuration
              hls = new Hls({
                debug: false,
                enableWorker: true,
                fragLoadingTimeOut: 20000,        // Increased timeout (20s)
                manifestLoadingTimeOut: 20000,    // Increased timeout (20s)
                fragLoadingMaxRetry: 4,           // More retries for fragments
                manifestLoadingMaxRetry: 4,       // More retries for manifest
                levelLoadingTimeOut: 20000,       // Increased timeout for levels
                abrEwmaDefaultEstimate: 5000000,  // Higher initial bitrate estimate (5Mbps)
                startLevel: -1,                   // Auto start level
                maxBufferLength: 30,              // Reduced buffer for faster seeking
                maxBufferSize: 15 * 1000 * 1000,  // 15MB buffer size
                maxMaxBufferLength: 60,           // Maximum 60s buffer
                liveSyncDurationCount: 3          // Sync with 3 segments
              });
              
              // Error handling
              hls.on(Hls.Events.ERROR, function(event, data) {
                console.log('HLS error:', data);
                if (data.fatal) {
                  switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                      console.log('Network error, trying to recover...');
                      if (retryCount < MAX_RETRIES) {
                        retryCount++;
                        errorDiv.textContent = 'Network error, retrying... (' + retryCount + '/' + MAX_RETRIES + ')';
                        errorDiv.classList.remove('hidden');
                        setTimeout(() => {
                          hls.startLoad();
                          errorDiv.classList.add('hidden');
                        }, 2000);
                      } else {
                        errorDiv.textContent = 'Failed to load video after multiple attempts. Please check your connection and try again.';
                        errorDiv.classList.remove('hidden');
                        sendToReactNative({
                          type: 'error',
                          message: 'Network error: Failed to load video after multiple attempts'
                        });
                      }
                      break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                      console.log('Media error, trying to recover...');
                      errorDiv.textContent = 'Media error, recovering...';
                      errorDiv.classList.remove('hidden');
                      hls.recoverMediaError();
                      setTimeout(() => {
                        errorDiv.classList.add('hidden');
                      }, 2000);
                      break;
                    default:
                      console.log('Fatal error, cannot recover');
                      errorDiv.textContent = 'Fatal error: ' + data.details;
                      errorDiv.classList.remove('hidden');
                      sendToReactNative({
                        type: 'error',
                        message: 'Fatal HLS error: ' + data.details
                      });
                      break;
                  }
                }
              });
              
              // Load the source
              errorDiv.classList.add('hidden');
              loading.classList.remove('hidden');
              hls.loadSource(hlsUrl);
              hls.attachMedia(video);
              
              // When manifest is parsed, we're ready to play
              hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
                console.log('Manifest parsed, levels:', data.levels.length);
                loading.classList.add('hidden');
                
                // Auto-select quality based on bandwidth
                hls.loadLevel = -1; // Auto level
                
                // Try to play
                video.play().then(() => {
                  console.log('Playback started successfully');
                }).catch(e => {
                  console.error('Autoplay blocked:', e);
                  // Show play button or user interaction required message
                  sendToReactNative({
                    type: 'autoplay_blocked'
                  });
                });
                
                isPlayerReady = true;
                retryCount = 0;
                
                // Tell React Native the player is ready
                sendToReactNative({
                  type: 'ready',
                  duration: video.duration || 0,
                  levels: data.levels.length
                });
                
                // Start status update interval (reduced frequency)
                setInterval(function() {
                  if (isPlayerReady) {
                    sendToReactNative({
                      type: 'status',
                      currentTime: video.currentTime || 0,
                      duration: video.duration || 0,
                      paused: video.paused,
                      buffering: video.readyState < 3,
                      buffered: video.buffered.length > 0 ? 
                        video.buffered.end(video.buffered.length - 1) : 0,
                      currentLevel: hls.currentLevel
                    });
                  }
                }, 500); // Update every 500ms instead of 250ms
              });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              // Native HLS support (iOS Safari)
              loading.classList.remove('hidden');
              video.src = hlsUrl;
              
              video.addEventListener('loadedmetadata', function() {
                loading.classList.add('hidden');
                video.play().catch(e => console.error('Autoplay blocked:', e));
                isPlayerReady = true;
                
                sendToReactNative({
                  type: 'ready',
                  duration: video.duration || 0
                });
                
                // Start status update interval
                setInterval(function() {
                  sendToReactNative({
                    type: 'status',
                    currentTime: video.currentTime || 0,
                    duration: video.duration || 0,
                    paused: video.paused,
                    buffering: video.readyState < 3,
                    buffered: video.buffered.length > 0 ? 
                      video.buffered.end(video.buffered.length - 1) : 0
                  });
                }, 500);
              });
              
              video.addEventListener('error', function(e) {
                errorDiv.textContent = 'Video error: ' + (video.error ? video.error.message : 'Unknown error');
                errorDiv.classList.remove('hidden');
                loading.classList.add('hidden');
                
                sendToReactNative({
                  type: 'error',
                  message: 'Video error: ' + (video.error ? video.error.message : 'Unknown error')
                });
              });
            } else {
              loading.classList.add('hidden');
              errorDiv.textContent = "HLS not supported on this device";
              errorDiv.classList.remove('hidden');
              
              console.error('HLS is not supported on this device');
              sendToReactNative({
                type: 'error',
                message: 'HLS not supported on this device'
              });
            }
          }
          
          // Handle buffering events with improved detection
          let bufferingTimeout;
          
          video.addEventListener('waiting', function() {
            clearTimeout(bufferingTimeout);
            bufferingTimeout = setTimeout(() => {
              sendToReactNative({
                type: 'buffering',
                isBuffering: true
              });
            }, 300); // Small delay to avoid flickering
          });
          
          video.addEventListener('canplay', function() {
            clearTimeout(bufferingTimeout);
            sendToReactNative({
              type: 'buffering',
              isBuffering: false
            });
          });
          
          video.addEventListener('playing', function() {
            clearTimeout(bufferingTimeout);
            sendToReactNative({
              type: 'buffering',
              isBuffering: false
            });
          });
          
          // Setup HLS player when URL is available
          if (hlsUrl) {
            setupHls();
          } else {
            errorDiv.textContent = "No video URL provided";
            errorDiv.classList.remove('hidden');
            loading.classList.add('hidden');
          }
          
          // Handle messages from React Native
          window.addEventListener('message', function(event) {
            try {
              const message = JSON.parse(event.data);
              
              switch(message.type) {
                case 'seek':
                  if (isPlayerReady && !isNaN(message.time)) {
                    video.currentTime = message.time;
                  }
                  break;
                  
                case 'play':
                  if (isPlayerReady) {
                    video.play().catch(e => console.error('Play blocked:', e));
                  }
                  break;
                  
                case 'pause':
                  if (isPlayerReady) {
                    video.pause();
                  }
                  break;
                  
                case 'seekForward':
                  if (isPlayerReady) {
                    video.currentTime = Math.min(video.duration, video.currentTime + message.seconds);
                  }
                  break;
                  
                case 'seekBackward':
                  if (isPlayerReady) {
                    video.currentTime = Math.max(0, video.currentTime - message.seconds);
                  }
                  break;
                  
                case 'setQuality':
                  if (isPlayerReady && hls) {
                    hls.currentLevel = message.level;
                  }
                  break;
                  
                case 'reload':
                  setupHls();
                  break;
              }
            } catch (e) {
              console.error('Invalid message:', e);
            }
          });
          
          // Handle video taps with improved detection
          let touchStartTime = 0;
          let touchStartX = 0;
          let touchStartY = 0;
          
          document.addEventListener('touchstart', function(e) {
            touchStartTime = Date.now();
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
          });
          
          document.addEventListener('touchend', function(e) {
            const touchEndTime = Date.now();
            const touchDuration = touchEndTime - touchStartTime;
            
            // Only consider it a tap if it's short (less than 300ms)
            if (touchDuration < 300) {
              sendToReactNative({
                type: 'tap'
              });
            }
          });
          
          // Handle clicks for desktop testing
          document.addEventListener('click', function() {
            sendToReactNative({
              type: 'tap'
            });
          });
        });
      </script>
    </body>
    </html>
  `;
  
  // Effect for auto-hiding controls
  useEffect(() => {
    // Reset the timer when controls are shown
    if (showControls) {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
      
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    
    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, [showControls, isReady]);
  
  // Reset buffering state if stuck
  useEffect(() => {
    if (isBuffering) {
      // If buffering persists for more than 15 seconds, try to recover
      bufferingTimerRef.current = setTimeout(() => {
        if (isBuffering && webViewRef.current) {
          console.log("Buffering persisted too long, attempting recovery...");
          sendToWebView({ type: 'reload' });
          setIsBuffering(false);
        }
      }, 15000);
    }
    
    return () => {
      if (bufferingTimerRef.current) {
        clearTimeout(bufferingTimerRef.current);
      }
    };
  }, [isBuffering]);
  
  // Clean up effect
  useEffect(() => {
    return () => {
      // Reset screen orientation when component unmounts
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(e => {
        console.error("Failed to reset orientation:", e);
      });
    };
  }, []);

  // Format time in MM:SS
  const formatTime = (seconds) => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle fullscreen mode
  const handleToggleFullScreen = async () => {
    try {
      if (isFullscreen) {
        // Exit fullscreen mode
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        
        // Show navigation bar when exiting fullscreen
        await NavigationBar.setVisibilityAsync("visible");
        setControlsVisible(true);

        // Show status bar when exiting fullscreen
        StatusBar.setHidden(false);
        
        // Show tab bar if it exists
        navigation.getParent()?.setOptions({ tabBarStyle: { display: "flex" } });
        
      } else {
        // Enter fullscreen mode
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        
        // Hide navigation bar when entering fullscreen
        await NavigationBar.setVisibilityAsync("hidden");
        setControlsVisible(true);

        // Hide status bar when entering fullscreen
        StatusBar.setHidden(true);
        
        // Hide tab bar if it exists
        navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
      }
      
      setIsFullscreen(!isFullscreen);
    } catch (error) {
      console.error("Failed to change orientation:", error);
    }
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (!webViewRef.current) return;
    
    const command = isPlaying ? { type: 'pause' } : { type: 'play' };
    sendToWebView(command);
    setIsPlaying(!isPlaying);
  };

  // Seek backward
  const seekBackward = () => {
    if (!webViewRef.current) return;
    
    sendToWebView({ type: 'seekBackward', seconds: 10 });
  };

  // Seek forward
  const seekForward = () => {
    if (!webViewRef.current) return;
    
    sendToWebView({ type: 'seekForward', seconds: 10 });
  };

  // Handle slider seeking
  const onSlidingComplete = (value) => {
    if (!webViewRef.current || !duration) return;
    
    const newPosition = value * duration;
    sendToWebView({ type: 'seek', time: newPosition });
  };

  // Send command to WebView
  const sendToWebView = (command) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.postMessage('${JSON.stringify(command)}', '*');
        true;
      `);
    }
  };
  
  // Change video quality
  const changeQuality = (source) => {
    setVideoSource(source.url);
    setSelectedQuality(source.quality);
    setShowQualityOptions(false);
    setIsReady(false);
  };
  
  // Retry playback
  const retryPlayback = () => {
    if (webViewRef.current) {
      sendToWebView({ type: 'reload' });
    }
  };

  // Handle WebView messages
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'status':
          setCurrentTime(data.currentTime || 0);
          setDuration(data.duration || 0);
          setIsPlaying(!data.paused);
          setIsBuffering(data.buffering);
          break;
          
        case 'buffering':
          setIsBuffering(data.isBuffering);
          break;
          
        case 'ready':
          setIsReady(true);
          setDuration(data.duration || 0);
          break;
          
        case 'error':
          Alert.alert(
            "Playback Error", 
            data.message, 
            [
              { text: "Retry", onPress: retryPlayback },
              { text: "OK" }
            ]
          );
          break;
          
        case 'tap':
          setShowControls(!showControls);
          break;
          
        case 'autoplay_blocked':
          // Show a message or automatically try to play again
          sendToWebView({ type: 'play' });
          break;
      }
    } catch (e) {
      console.error('Failed to parse WebView message:', e);
    }
  };

  return (
    <View style={styles.container}>
       
    <Pressable onPress={() => setShowControls(!showControls)}
style={isFullscreen ? styles.fullscreenContainer : styles.videoContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: webViewHtml }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={true}
          onMessage={handleWebViewMessage}
          originWhitelist={['*']}
          scrollEnabled={false}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="red" />
            </View>
          )}
        />
        
        {isBuffering && (
          <View style={styles.bufferingContainer}>
            <ActivityIndicator size="large" color="red" />
          </View>
        )}
        
        <View style={styles.customControls}>
          <View style={styles.topControls}>
            <TouchableOpacity 
              style={styles.qualityButton}
              onPress={() => setShowQualityOptions(!showQualityOptions)}
            >
              <Text style={styles.qualityButtonText}>
                {selectedQuality || "Auto"}
              </Text>
            </TouchableOpacity>
            <View style={styles.rightControls}>
              <TouchableOpacity onPress={() => setPickerVisible(true)}>
                <Ionicons name="settings" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.fullscreenButton}
                onPress={handleToggleFullScreen}
              >
                <MaterialIcons 
                  name={isFullscreen ? "fullscreen-exit" : "fullscreen"} 
                  size={24} 
                  color="white" 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.seekControls}>
            <TouchableOpacity onPress={seekBackward} style={styles.controlButton}>
              <MaterialIcons name="replay-10" size={32} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={togglePlayPause} style={styles.playPauseButton}>
              <MaterialIcons 
                name={isPlaying ? "pause" : "play-arrow"} 
                size={48} 
                color="white" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={seekForward} style={styles.controlButton}>
              <MaterialIcons name="forward-10" size={32} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            
            <Slider
              style={styles.progressSlider}
              minimumValue={0}
              maximumValue={1}
              value={duration > 0 ? currentTime / duration : 0}
              onSlidingComplete={onSlidingComplete}
              minimumTrackTintColor="#FFFFFF"
              maximumTrackTintColor="rgba(255, 255, 255, 0.5)"
              thumbTintColor="#FFFFFF"
            />
            
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>
        
        {showQualityOptions && (
          <View style={styles.qualityOptions}>
            <Text style={styles.qualityTitle}>Select Quality</Text>
            {sources.map((source, index) => (
              <TouchableOpacity 
                key={index}
                style={[
                  styles.qualityOption,
                  selectedQuality === source.quality && styles.selectedQuality
                ]}
                onPress={() => changeQuality(source)}
              >
                <Text style={styles.qualityText}>
                  {source.quality} {source.isDub ? '(Dub)' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.touchOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowControls(!showControls);
            setShowQualityOptions(false);
          }}
        />
      </Pressable>
      
      {!isFullscreen && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Tap video to show/hide controls
          </Text>
          <Text style={styles.infoText}>
            Current position: {formatTime(currentTime)}
          </Text>
          <Text style={styles.infoText}>
            Total duration: {formatTime(duration)}
          </Text>
          <Text style={styles.infoText}>
            Selected quality: {selectedQuality || "Auto"}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={retryPlayback}
          >
            <Text style={styles.retryButtonText}>Retry Playback</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  videoContainer: {
    width: '100%',
    height: 240,
    backgroundColor: '#000',
    position: 'relative',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 999,
  },
  webview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  touchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  bufferingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  bufferingText: {
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 4,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  loadingText: {
    color: '#ddd',
    marginTop: 10,
    fontSize: 16,
  },
  customControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
    padding: 16,
    zIndex: 10,
  },
  seekControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  controlButton: {
    padding: 10,
  },
  playPauseButton: {
    padding: 10,
    marginHorizontal: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressSlider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
  },
  fullscreenButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 4,
  },
  infoContainer: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#eaeaea',
    borderRadius: 4,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  rightControls: {
    flexDirection: "row",
    gap: 20,
  },
});