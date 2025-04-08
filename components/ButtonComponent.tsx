import React from 'react';
import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle, TextStyle, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';

import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold
} from '@expo-google-fonts/quicksand';

interface ButtonProps {
  title: any;
  onPress: () => void;
  color?: 'indigo' | 'amber' | 'teal' | 'spaceBlue' | 'deepOrange';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  iconColor?: string;
  disabled?: boolean;
}

const ButtonComponent: React.FC<ButtonProps> = ({
  title,
  disabled,
  onPress,
  color = 'indigo',
  style,
  textStyle,
  iconName,
  iconSize = 20,
  iconColor = '#FFFFFF',
}) => {
  const { colors } = useTheme();
  const buttonColor = colors.colors[color as keyof typeof colors.colors] || colors.colors.indigo;

  let [fontsLoaded] = useFonts({
    Quicksand_300Light,
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: buttonColor }, style]}
      onPress={onPress}
    >
      <View style={styles.content}>
        {iconName && <Ionicons name={iconName} size={iconSize} color={iconColor} />}
        <Text style={[styles.text, textStyle, {color: colors.text.primary}]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // Spacing between icon and text
  },
  text: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: 16,
  },
});

export default ButtonComponent;
