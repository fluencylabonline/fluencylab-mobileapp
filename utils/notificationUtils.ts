import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register for push notifications
export async function registerForPushNotificationsAsync(userId: string) {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // Get the token that uniquely identifies this device
    token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    // Save the token to the user's document in Firestore
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        expoPushToken: token.data,
      });
      console.log('Push token saved to user profile:', token.data);
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token?.data;
}

// Schedule a local notification
export async function scheduleLocalNotification(title: string, body: string, data = {}) {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // null means show immediately
  });
}

// Create a notification listener
export function createNotificationListener(callback: (notification: Notifications.Notification) => void) {
  return Notifications.addNotificationReceivedListener(callback);
}

// Create a notification response listener (for when user taps notification)
export function createNotificationResponseListener(callback: (response: Notifications.NotificationResponse) => void) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// Check notification permissions
export async function checkNotificationPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// Request notification permissions
export async function requestNotificationPermissions() {
  return await Notifications.requestPermissionsAsync();
}

// Get notification badge count
export async function getBadgeCount() {
  return await Notifications.getBadgeCountAsync();
}

// Set notification badge count
export async function setBadgeCount(count: number) {
  return await Notifications.setBadgeCountAsync(count);
}