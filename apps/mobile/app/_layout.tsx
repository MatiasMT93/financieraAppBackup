import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { ImageBackground, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from '../src/services/notifications';

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotifications().catch(console.error);

    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      // When user taps notification, app is already in foreground
    });
    return () => sub.remove();
  }, []);

  return (
    <ImageBackground
      source={require('../assets/images/FONDO.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="index" />
      </Stack>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
});