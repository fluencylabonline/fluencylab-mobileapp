import React from 'react';
import { StatusBar } from 'react-native';
import { useTheme } from '@/constants/useTheme';
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture, 
} from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

const tapGesture = Gesture.Tap().onEnd(() => {});

interface ContainerProps {
  children: React.ReactNode;
  style?: object;
}

const Container: React.FC<ContainerProps> = ({ children, style }) => {
  const { colors } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={tapGesture}>
        <SafeAreaView style={[style, { flex: 1, backgroundColor: colors.background.primary }]}>
          <StatusBar barStyle={colors.background.primary === '#000000' ? 'light-content' : 'dark-content'} backgroundColor={colors.background.primary} />
          {children}
        </SafeAreaView>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

export default Container;
