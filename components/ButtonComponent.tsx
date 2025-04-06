import React from 'react';
import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle, TextStyle, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold
} from '@expo-google-fonts/quicksand';
import { useTheme } from '@/constants/useTheme';

interface ButtonProps {
  title: any;
  onPress: () => void;
  color?: keyof typeof Colors;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  iconName?: keyof typeof Ionicons.glyphMap; // Optional icon
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
  const buttonColor = Colors[color]?.darker || Colors.indigo.darker;
  const { colors, isDark } = useTheme();

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
        <Text style={[styles.text, textStyle, {color: isDark ? Colors.text.darker : Colors.text.darker}]}>{title}</Text>
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
