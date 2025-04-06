import React from 'react';
import { Text, useColorScheme, TextProps } from 'react-native';

import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';
import { Colors } from '../constants/Colors';

// Font weight options
type FontWeight = 'light' | 'regular' | 'medium' | 'semibold' | 'bold';

// Font size pattern (easy-to-use names)
type FontSize = 'small' | 'medium' | 'large' | 'xLarge' | 'xxLarge';

interface CustomTextProps extends TextProps {
  children: React.ReactNode;
  weight?: FontWeight; // Optional weight prop
  size?: FontSize; // Optional size prop with predefined names
  color?: string; // Optional color override
}

export const TextComponent: React.FC<CustomTextProps> = ({
  children,
  weight = 'regular', // Default weight
  size = 'medium', // Default size
  color,
  style,
  ...props
}) => {
  const colorScheme = useColorScheme();
  // Use passed color if available; otherwise, use theme-based default
  const textColor = color ?? (colorScheme === 'dark' ? Colors.text.darker : Colors.text.lighter);

  const [fontsLoaded] = useFonts({
    Quicksand_300Light,
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  // Map weight prop to actual font family
  const fontFamily = {
    light: 'Quicksand_300Light',
    regular: 'Quicksand_400Regular',
    medium: 'Quicksand_500Medium',
    semibold: 'Quicksand_600SemiBold',
    bold: 'Quicksand_700Bold',
  }[weight];

  // Font size pattern
  const fontSize = {
    small: 12,    // Small text (12px)
    medium: 16,   // Regular text (16px)
    large: 20,    // Larger text (20px)
    xLarge: 24,   // Extra large text (24px)
    xxLarge: 30,  // Double extra large text (30px)
  }[size];

  return (
    <Text style={[{ fontSize, fontFamily, color: textColor }, style]} {...props}>
      {children}
    </Text>
  );
};
