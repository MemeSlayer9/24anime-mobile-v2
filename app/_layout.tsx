import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StatusBar, StyleSheet } from 'react-native';
import * as Updates from 'expo-updates';
import StackNavigator from './navigation/StackNavigator';

export default function RootLayout() {
  const [isUpdating, setIsUpdating] = useState(false);

  // ✅ Automatically check, download & apply updates on app start
  useEffect(() => {
    (async () => {
      try {
        // Check if running in development mode
        if (__DEV__) {
          console.log('Skipping OTA update check in development mode');
          return;
        }

        // 1️⃣ Check for updates
        const { isAvailable } = await Updates.checkForUpdateAsync();
        
        if (isAvailable) {
          setIsUpdating(true);
          
          // 2️⃣ Automatically fetch the update
          const { isNew } = await Updates.fetchUpdateAsync();
          
          // 3️⃣ Automatically reload to apply it
          if (isNew) {
            await Updates.reloadAsync();
          }
        }
      } catch (e) {
        console.warn('Error with automatic OTA update:', e);
        // Continue loading app even if update fails
        setIsUpdating(false);
      }
    })();
  }, []);

  // Show loading screen while updating
  if (isUpdating) {
    return (
      <View style={styles.updateContainer}>
        <StatusBar backgroundColor="#161616" barStyle="light-content" />
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.updateText}>Installing update...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar backgroundColor="#161616" barStyle="light-content" />
      <StackNavigator />
    </>
  );
}

const styles = StyleSheet.create({
  updateContainer: {
    flex: 1,
    backgroundColor: '#161616',
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
});