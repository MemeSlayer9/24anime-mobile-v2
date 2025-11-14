import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar, Alert, ActivityIndicator, Pressable, FlatList, Image, ScrollView, TextInput, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import axios from "axios";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Anime, RootStackParamList, Episode, BackupResponse } from "../Types/types";
import { Ionicons } from "@expo/vector-icons";

import { useAnimeId } from "../context/EpisodeContext";
import * as NavigationBar from "expo-navigation-bar";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

interface VideoSource {
  url: string;
  isM3u8: boolean;
  quality: string;
  type?: string;
  isDub?: boolean;
}

interface WebViewMessage {
  type: 'status' | 'buffering' | 'ready' | 'error' | 'tap' | 'autoplay_blocked';
  currentTime?: number;
  duration?: number;
  paused?: boolean;
  buffering?: boolean;
  isBuffering?: boolean;
  message?: string;
}

interface WebViewCommand {
  type: 'seek' | 'play' | 'pause' | 'seekForward' | 'seekBackward' | 'setQuality' | 'reload';
  time?: number;
  seconds?: number;
  level?: number;
  savedTime?: number;
}

type VideoPlayerRouteProp = RouteProp<RootStackParamList, "Animepahe">;

export default function ImprovedHLSWebViewPlayer() {
  const webViewRef = useRef<WebView>(null);
  const { episodeid, animeId, setAnimeId, setEpisodeid } = useAnimeId();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
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
  const [pickerVisible, setPickerVisible] = useState(false);
  
  // New state for dub/sub
  const [selectedVersion, setSelectedVersion] = useState<'sub' | 'dub'>('sub');
  const [availableVersions, setAvailableVersions] = useState<('sub' | 'dub')[]>(['sub']);
  
  // Episodes state
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bufferingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [filteredEpisodes, setFilteredEpisodes] = useState<Episode[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const resetControlsTimer = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
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

  const fetchVideoData = async (version: 'sub' | 'dub' = selectedVersion) => {
    try {
      setIsReady(false);
      setEpisodeLoading(true);
      
      const response = await axios.get(
        `https://kenjitsu.vercel.app/api/animepahe/sources/${episodeid}?version=${version}`,
        { timeout: 10000 }
      );
      const json = response.data;
      
      if (json.data?.sources && json.data.sources.length > 0) {
        const proxyUrl = "https://hls.shrina.dev/proxy?url=";
        
        const modifiedSources = json.data.sources.map((source: VideoSource) => ({
          ...source,
          url: `${proxyUrl}${encodeURIComponent(source.url)}`,
          isM3U8: source.isM3u8 || source.type === "hls",
          isDub: version === 'dub'
        }));

        console.log(`Fetched ${version} sources:`, modifiedSources);
        setSources(modifiedSources);
        
        // Sort sources: prioritize BD, then by resolution
        const sortedSources = [...modifiedSources].sort((a, b) => {
          const aHasBD = a.quality.includes("BD");
          const bHasBD = b.quality.includes("BD");
          
          if (aHasBD && !bHasBD) return -1;
          if (!aHasBD && bHasBD) return 1;
          
          const getResolution = (quality: string) => {
            if (quality.includes("1080p")) return 3;
            if (quality.includes("720p")) return 2;
            if (quality.includes("480p") || quality.includes("360p")) return 1;
            return 0;
          };
          
          return getResolution(b.quality) - getResolution(a.quality);
        });
        
        const defaultSource = sortedSources[0];
        
        if (defaultSource) {
          setVideoSource(defaultSource.url);
          setSelectedQuality(defaultSource.quality);
          setSelectedVersion(version);
          console.log(`Selected default quality: ${defaultSource.quality} (${version})`);
        } else {
          throw new Error("No valid video sources found");
        }
      } else {
        throw new Error("No sources available in API response");
      }
    } catch (error) {
      console.error("Error fetching video data:", error);
      
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.status === 404
          ? `Episode not found in ${version} version. Try switching to ${version === 'sub' ? 'dub' : 'sub'}.`
          : "Failed to load video. Please check your connection."
        : "An unexpected error occurred.";
      
      Alert.alert(
        "Playback Error",
        errorMessage,
        [
          { text: "Retry", onPress: () => fetchVideoData(version) },
          { text: "Cancel", style: "cancel" }
        ]
      );
    } finally {
      setEpisodeLoading(false);
    }
  };

  const checkAvailableVersions = async () => {
    const versions: ('sub' | 'dub')[] = [];
    
    // Check sub version
    try {
      await axios.get(
        `https://kenjitsu.vercel.app/api/animepahe/sources/${episodeid}?version=sub`,
        { timeout: 5000 }
      );
      versions.push('sub');
    } catch (error) {
      console.log('Sub version not available');
    }
    
    // Check dub version
    try {
      await axios.get(
        `https://kenjitsu.vercel.app/api/animepahe/sources/${episodeid}?version=dub`,
        { timeout: 5000 }
      );
      versions.push('dub');
    } catch (error) {
      console.log('Dub version not available');
    }
    
    setAvailableVersions(versions);
    
    // If current version is not available, switch to available one
    if (versions.length > 0 && !versions.includes(selectedVersion)) {
      setSelectedVersion(versions[0]);
    }
  };

  const handleVersionToggle = (version: 'sub' | 'dub') => {
    if (availableVersions.includes(version)) {
      fetchVideoData(version);
    } else {
      Alert.alert(
        "Not Available",
        `${version.toUpperCase()} version is not available for this episode.`
      );
    }
  };

  const fetchAnimeDetails = async () => {
    try {
      const response = await axios.get(
        `https://kenjitsu.vercel.app/api/anilist/episodes/${animeId}?provider=animepahe`
      );
      
      if (response.data?.providerEpisodes) {
        const mappedEpisodes = response.data.providerEpisodes.map((episode: any) => ({
          id: episode.episodeId,
          episodeid: episode.episodeId,
          number: episode.episodeNumber,
          title: episode.title || `Episode ${episode.episodeNumber}`,
          image: episode.thumbnail || '',
          createdAt: episode.airDate || '',
          rating: episode.rating || '',
          overview: episode.overview || '',
          aired: episode.aired,
        }));
        
        setEpisodes(mappedEpisodes);
        console.log(`Loaded ${mappedEpisodes.length} episodes from provider`);
      } else {
        console.warn('No providerEpisodes found in response');
        setEpisodes([]);
      }
    } catch (err) {
      console.error("Error fetching anime details:", err);
      Alert.alert(
        "Error",
        "Failed to load episodes. Please try again.",
        [{ text: "OK" }]
      );
    }
  };
  
  useEffect(() => {
    if (episodeid) {
      checkAvailableVersions();
      fetchVideoData();
    }
  }, [episodeid]);

  useEffect(() => {
    if (animeId) {
      fetchAnimeDetails();
    }
  }, [animeId]);
  
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
          color: red;
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
          
          function sendToReactNative(message) {
            window.ReactNativeWebView.postMessage(JSON.stringify(message));
          }
          
          function setupHls() {
            if (Hls.isSupported()) {
              if (hls) {
                hls.destroy();
                hls = null;
              }
              
              hls = new Hls({
                debug: false,
                enableWorker: true,
                fragLoadingTimeOut: 20000,
                manifestLoadingTimeOut: 20000,
                fragLoadingMaxRetry: 4,
                manifestLoadingMaxRetry: 4,
                levelLoadingTimeOut: 20000,
                abrEwmaDefaultEstimate: 5000000,
                startLevel: -1,
                maxBufferLength: 30,
                maxBufferSize: 15 * 1000 * 1000,
                maxMaxBufferLength: 60,
                liveSyncDurationCount: 3
              });
              
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
              
              errorDiv.classList.add('hidden');
              loading.classList.remove('hidden');
              hls.loadSource(hlsUrl);
              hls.attachMedia(video);
              
              hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
                console.log('Manifest parsed, levels:', data.levels.length);
                loading.classList.add('hidden');
                
                hls.loadLevel = -1;
                
                video.play().then(() => {
                  console.log('Playback started successfully');
                }).catch(e => {
                  console.error('Autoplay blocked:', e);
                  sendToReactNative({
                    type: 'autoplay_blocked'
                  });
                });
                
                isPlayerReady = true;
                retryCount = 0;
                
                sendToReactNative({
                  type: 'ready',
                  duration: video.duration || 0,
                  levels: data.levels.length
                });
                
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
                }, 500);
              });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
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
          
          let bufferingTimeout;
          
          video.addEventListener('waiting', function() {
            clearTimeout(bufferingTimeout);
            bufferingTimeout = setTimeout(() => {
              sendToReactNative({
                type: 'buffering',
                isBuffering: true
              });
            }, 300);
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
          
          if (hlsUrl) {
            setupHls();
          } else {
            errorDiv.textContent = "No video URL provided";
            errorDiv.classList.remove('hidden');
            loading.classList.add('hidden');
          }
          
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
                  const savedTime = message.savedTime || video.currentTime || 0;
                  setupHls();
                  // Wait for HLS to be ready, then seek to saved position
                  const seekInterval = setInterval(() => {
                    if (isPlayerReady && video.readyState >= 2) {
                      clearInterval(seekInterval);
                      video.currentTime = savedTime;
                      video.play().catch(e => console.error('Play after reload failed:', e));
                    }
                  }, 100);
                  // Clear interval after 5 seconds if not ready
                  setTimeout(() => clearInterval(seekInterval), 5000);
                  break;
              }
            } catch (e) {
              console.error('Invalid message:', e);
            }
          });
          
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
            
            if (touchDuration < 300) {
              sendToReactNative({
                type: 'tap'
              });
            }
          });
          
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

  useEffect(() => {
    if (episodes.length > 0 && episodeid) {
      const episode = episodes.find(ep => ep.episodeid === episodeid);
      setCurrentEpisode(episode || null);
      
      setFilteredEpisodes(episodes);
      
      const index = episodes.findIndex(ep => ep.episodeid === episodeid);
      setCurrentIndex(index >= 0 ? index : 0);
    }
  }, [episodeid, episodes]);

  const handlePreviousEpisode = () => {
    if (currentIndex > 0 && episodes.length > 0) {
      const previousEpisode = episodes[currentIndex - 1];
      if (previousEpisode) {
        setEpisodeLoading(true);
        setEpisodeid(previousEpisode.episodeid);
      }
    }
  };

  const handleNextEpisode = () => {
    if (currentIndex < episodes.length - 1 && episodes.length > 0) {
      const nextEpisode = episodes[currentIndex + 1];
      if (nextEpisode) {
        setEpisodeLoading(true);
        setEpisodeid(nextEpisode.episodeid);
      }
    }
  };

  useEffect(() => {
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
  
  useEffect(() => {
    if (isBuffering) {
      bufferingTimerRef.current = setTimeout(() => {
        if (isBuffering && webViewRef.current) {
          console.log("Buffering persisted too long, attempting recovery...");
          // Save current time before reloading
          const savedTime = currentTime;
          sendToWebView({ type: 'reload', savedTime });
          setIsBuffering(false);
        }
      }, 15000);
    }
    
    return () => {
      if (bufferingTimerRef.current) {
        clearTimeout(bufferingTimerRef.current);
      }
    };
  }, [isBuffering, currentTime]);
  
  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(e => {
        console.error("Failed to reset orientation:", e);
      });
    };
  }, []);

  const formatTime = (seconds: number): string => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleFullScreen = async () => {
    try {
      if (isFullscreen) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        await NavigationBar.setVisibilityAsync("visible");
        setControlsVisible(true);
        StatusBar.setHidden(false);
        navigation.getParent()?.setOptions({ tabBarStyle: { display: "flex" } });
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        await NavigationBar.setVisibilityAsync("hidden");
        setControlsVisible(true);
        StatusBar.setHidden(true);
        navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
      }
      
      setIsFullscreen(!isFullscreen);
    } catch (error) {
      console.error("Failed to change orientation:", error);
    }
  };

  const togglePlayPause = (): void => {
    if (!webViewRef.current) return;
    
    const command: WebViewCommand = isPlaying ? { type: 'pause' } : { type: 'play' };
    sendToWebView(command);
    setIsPlaying(!isPlaying);
  };

  const seekBackward = () => {
    if (!webViewRef.current) return;
    sendToWebView({ type: 'seekBackward', seconds: 10 });
  };

  const seekForward = () => {
    if (!webViewRef.current) return;
    sendToWebView({ type: 'seekForward', seconds: 10 });
  };

  const onSlidingComplete = (value: number): void => {
    if (!webViewRef.current || !duration) return;
    const newPosition = value * duration;
    sendToWebView({ type: 'seek', time: newPosition });
  };

  const sendToWebView = (command: WebViewCommand): void => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.postMessage('${JSON.stringify(command)}', '*');
        true;
      `);
    }
  };
  
  const getFilteredEpisodes = () => {
    if (!searchQuery.trim()) {
      return episodes;
    }
    
    return episodes.filter(episode => {
      const episodeNumber = episode.number.toString();
      return episodeNumber.includes(searchQuery);
    });
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

  const changeQuality = (source: VideoSource): void => {
    setVideoSource(source.url);
    setSelectedQuality(source.quality);
    setPickerVisible(false);
    setIsReady(false);
  };
  
  const retryPlayback = () => {
    if (webViewRef.current) {
      sendToWebView({ type: 'reload', savedTime: currentTime });
    }
  };

  const handleWebViewMessage = (event: { nativeEvent: { data: string } }): void => {
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
          sendToWebView({ type: 'play' });
          break;
      }
    } catch (e) {
      console.error('Failed to parse WebView message:', e);
    }
  };

  const renderEpisodeItem = ({ item }: { item: Episode }) => {
    const isCurrentEpisode = item.episodeid === episodeid;
    
    return (
      <TouchableOpacity
        style={[styles.episodeContainer, isCurrentEpisode && styles.currentEpisode]}
        onPress={() => {
          setEpisodeLoading(true);
          setEpisodeid(item.episodeid);
        }}
        disabled={episodeLoading || isCurrentEpisode}
      >
        <Image source={{ uri: item.image }} style={styles.episodeThumbnail} />
        <View style={styles.episodeTextContainer}>
          <Text style={styles.episodeTitle}>Episode {item.number}</Text>
          <Text style={styles.episodeTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.episodeMeta}>{item.createdAt}</Text>
        </View>
        {isCurrentEpisode && (
          <View style={styles.playingIndicator}>
            <MaterialIcons name="play-arrow" size={20} color="#e50914" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Pressable 
        onPress={() => setShowControls(!showControls)}
        style={isFullscreen ? styles.fullscreenContainer : styles.videoContainer}
      >
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
        
        {showControls && (
          <View style={styles.customControls}>
            <View style={styles.topControls}>
              <TouchableOpacity onPress={async () => {
                await returnToPortraitMode();
                navigation.goBack();
              }}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              
              <Text style={styles.episodeNumberText}>
                Episode {currentEpisode?.number}
              </Text>
              
            
              
              <View style={styles.rightControls}>
                <TouchableOpacity 
                  style={styles.qualityButton}
                  onPress={() => setPickerVisible(!pickerVisible)}
                >
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
        )}
        
        <TouchableOpacity 
          style={styles.touchOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowControls(!showControls);
            setPickerVisible(false);
          }}
        />
      </Pressable>

      <Modal visible={pickerVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[
            styles.modalContent, 
            isFullscreen && styles.modalContentFullscreen
          ]}>
            <Text style={styles.modalTitle}>Select Quality</Text>
            <ScrollView style={styles.qualityScrollView}>
              {sources.map((source, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.qualityItem,
                    selectedQuality === source.quality && styles.selectedQuality
                  ]}
                  onPress={() => changeQuality(source)}
                >
                  <Text style={styles.qualityText}>
                    {source.quality} {source.isDub ? '(Dub)' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setPickerVisible(false)}
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
             <View style={styles.versionSelector}>
                <TouchableOpacity
                  style={[
                    styles.versionButton,
                    selectedVersion === 'sub' && styles.versionButtonActive,
                    !availableVersions.includes('sub') && styles.versionButtonDisabled
                  ]}
                  onPress={() => handleVersionToggle('sub')}
                  disabled={!availableVersions.includes('sub')}
                >
                  <Text style={[
                    styles.versionButtonText,
                    selectedVersion === 'sub' && styles.versionButtonTextActive
                  ]}>SUB</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.versionButton,
                    selectedVersion === 'dub' && styles.versionButtonActive,
                    !availableVersions.includes('dub') && styles.versionButtonDisabled
                  ]}
                  onPress={() => handleVersionToggle('dub')}
                  disabled={!availableVersions.includes('dub')}
                >
                  <Text style={[
                    styles.versionButtonText,
                    selectedVersion === 'dub' && styles.versionButtonTextActive
                  ]}>DUB</Text>
                </TouchableOpacity>
               </View>
           <View style={styles.headerControls}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by number"
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              keyboardType="numeric"
            />
         </View>
      </View>

      {!isFullscreen && episodes.length > 0 && (
        <View style={styles.episodesSection}>
          <FlatList
            data={getFilteredEpisodes()}
            renderItem={renderEpisodeItem}
            keyExtractor={(item) => item.episodeid}
            contentContainerStyle={styles.episodesList}
          />
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
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
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
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  versionSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 6,
    overflow: 'hidden',
   },
  versionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  versionButtonActive: {
    backgroundColor: '#e50914',
    borderColor: '#e50914',
  },
  versionButtonDisabled: {
    opacity: 0.3,
  },
  versionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  versionButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  qualityButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 4,
  },
  qualityButtonText: {
    color: 'white',
    fontSize: 14,
  },
  rightControls: {
    flexDirection: "row",
    gap: 20,
  },
  fullscreenButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 4,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentFullscreen: {
    width: '80%',
    maxWidth: 300,
    maxHeight: '80%',
  },
  qualityScrollView: {
    maxHeight: 300,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  qualityItem: {
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#2a2a2a',
  },
  selectedQuality: {
    backgroundColor: '#e50914',
  },
  qualityText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#333',
    padding: 14,
    borderRadius: 8,
    marginTop: 10,
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  infoContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    margin: 16,
  },
  infoText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#e50914',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  episodesSection: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 16,
  },
  episodesHeader: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  episodesList: {
    paddingBottom: 16,
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
  currentEpisode: {
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#e50914',
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
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  episodeMeta: {
    fontSize: 14,
    color: "#BBBBBB",
    marginTop: 4,
  },
  playingIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  nextEpisodesHeader: {
    marginBottom: 12,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  searchInput: {
    backgroundColor: "#333",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    color: "#fff",
    minWidth: 120,
  },
  nextEpisodesText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  disabledButton: {
    backgroundColor: "#555",
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
  episodeNumberText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 15,
  },
  headerRight: {
    flex: 0.4,
    alignItems: 'flex-end',
  },
});