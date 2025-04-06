import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Colors } from '../constants/Colors'; // Adjust the path if necessary
import { useColorScheme } from 'react-native';
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture, 
} from 'react-native-gesture-handler'; // Import GestureHandler hooks and components
import { SafeAreaView } from 'react-native-safe-area-context';

// Define a tap gesture handler
const tapGesture = Gesture.Tap().onEnd(() => {
  console.log("Tapped!");
});

interface ContainerProps {
  children: React.ReactNode;
  style?: object;
}

const Container: React.FC<ContainerProps> = ({ children, style }) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const containerStyle = isDarkMode
    ? styles.darkContainer
    : styles.lightContainer;

  const bgBar = isDarkMode
    ? Colors.background.darkMode
    : Colors.background.lightMode

  const styleBar = isDarkMode
    ? 'light-content'
    : 'dark-content';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={tapGesture}>
        <SafeAreaView style={[containerStyle, style]}>
          <StatusBar barStyle={styleBar} backgroundColor={bgBar} />
          {children}
        </SafeAreaView>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  lightContainer: {
    backgroundColor: Colors.background.lightMode, // Light theme background color
    flex: 1,
  },
  darkContainer: {
    backgroundColor: Colors.background.darkMode, // Dark theme background color
    flex: 1,
  },
});

export default Container;
