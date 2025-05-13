import React, { useEffect, useState } from 'react';
import { View, Text, Button, StatusBar, StyleSheet } from 'react-native';
import * as Updates from 'expo-updates';
import StackNavigator from './navigation/StackNavigator';

export default function RootLayout() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // 1️⃣ Check for updates on app start
  useEffect(() => {
    (async () => {
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync(); // checks server for a new JS bundle :contentReference[oaicite:0]{index=0}
        if (isAvailable) {
          setUpdateAvailable(true);
        }
      } catch (e) {
        console.warn('Error checking for OTA update:', e);
      }
    })();
  }, []);

  // 2️⃣ Fetch & apply update when user taps
  const handleUpdate = async () => {
    setIsFetching(true);
    try {
      const { isNew } = await Updates.fetchUpdateAsync();   // downloads the new bundle :contentReference[oaicite:1]{index=1}
      if (isNew) {
        await Updates.reloadAsync();                        // restarts app to apply it :contentReference[oaicite:2]{index=2}
      }
    } catch (e) {
      console.error('Failed to fetch/apply update:', e);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <>
      <StatusBar backgroundColor="#161616" barStyle="light-content" />

      {/* OTA Update Banner */}
      {updateAvailable && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>A new update is available!</Text>
          <Button
            title={isFetching ? 'Updating…' : 'Update Now'}
            onPress={handleUpdate}
          />
        </View>
      )}

      {/* Your app’s main navigation */}
      <StackNavigator />
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fffae6',
    padding: 12,
    alignItems: 'center',
  },
  bannerText: {
    marginBottom: 8,
    fontSize: 16,
  },
});
