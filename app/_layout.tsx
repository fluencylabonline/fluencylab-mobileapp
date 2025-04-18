import { Stack, useRouter, useSegments } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { ToastProvider } from '@/components/Toast/useToast';
import { fetchUserData } from '@/hooks/fetchUserData';

import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, createNotificationListener, createNotificationResponseListener } from '@/utils/notificationUtils';
import useFetchUserID from '@/hooks/fetchUserID';
import { ThemeProvider } from '@/constants/ThemeContext';


export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();
  const { userID } = useFetchUserID();
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Register for push notifications when user ID is available
    if (userID) {
      registerForPushNotificationsAsync(userID);
    }

    // Listen for incoming notifications when app is in foreground
    notificationListener.current = createNotificationListener(notification => {
      // You can handle foreground notifications here if needed
      console.log('Notification received in foreground:', notification);
    });

    // Listen for user tapping on a notification
    responseListener.current = createNotificationResponseListener(response => {
      const data = response.notification.request.content.data;
      
      // Check if it's a chat notification and navigate accordingly
      if (data.type === 'chat' && data.chatRoomId) {
        if (data.studentData) {
          // Navigate to the chat screen with the student data
          router.push({
            pathname: '/screens/Chat/TeacherChatScreen',
            params: { student: data.studentData }
          });
        } else if (data.teacherData) {
          // For student view navigating to teacher chat
          router.push({
            pathname: '/screens/Chat/StudentChatScreen',
            params: { teacher: data.teacherData }
          });
        }
      }
    });

    // Clean up the listeners on unmount
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [userID, router]);
  
  /*
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
    if (authUser) {
      const data = await fetchUserData(authUser.uid);
      if(data.role !== 'teacher') {
        signOut(auth);
      }
      } else {
        //if the user is not authenticated, sign out
        signOut(auth);
    }});

    return () => unsubscribe();
  }, []);
*/
  useEffect(() => {
    const protectedRoutes = ['/admin', '/student', '/teacher'];
    const currentRoute = segments.join('/');

    if (isAuthenticated === false && protectedRoutes.some(route => currentRoute.startsWith(route))) {
      router.replace('/');
    } else if (isAuthenticated === true && currentRoute === '/') {
      router.replace('/')
    }
  }, [isAuthenticated, segments]);

  if (isAuthenticated === null) {
    return null;
  }

return (
  <ThemeProvider>
    <ToastProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" translucent={true} />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
          <Stack.Screen
            name="student"
            options={{ animation: 'slide_from_left' }}
          />
          <Stack.Screen
            name="teacher"
            options={{ animation: 'slide_from_left' }}
          />
          <Stack.Screen
            name="admin"
            options={{ animation: 'slide_from_left' }}
          />
        </Stack>
      </GestureHandlerRootView>
    </ToastProvider>
  </ThemeProvider>
  );
}
