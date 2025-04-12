import { Stack, useRouter, useSegments } from 'expo-router';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { ToastProvider } from '@/components/Toast/useToast';
import { fetchUserData } from '@/hooks/fetchUserData';

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();
  const [userID, setUserID] = useState<any | 'null'>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setUserID(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

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
  );
}
