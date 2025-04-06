import React from 'react';
import { TextInput, View, StyleSheet, TextInputProps, useColorScheme, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../constants/Colors';
import {
  useFonts,
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';

interface InputComponentProps extends TextInputProps {
  iconName?: keyof typeof Ionicons.glyphMap; // Optional Ionicons name
  iconSize?: number;
  ref?: any;
  button?: React.ReactNode;
  onRightPress?: () => void;
}

const InputComponent: React.FC<InputComponentProps> = ({
  iconName,
  iconSize = 20,
  style,
  button,
  onRightPress,
  ...textInputProps
}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const backgroundColor = isDarkMode ? Colors.background.dark : Colors.background.light;
  const textColor = isDarkMode ? Colors.text.darker : Colors.text.lighter;
  const placeholderColor = isDarkMode ? Colors.text.darker : Colors.text.secondaryDark;
  const iconColor = textColor;

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
  
  return (
    <View style={[styles.container, { backgroundColor }]}>
      {iconName && (
        <Ionicons name={iconName} size={iconSize} color={iconColor} style={styles.icon} />
      )}
      <TextInput
        style={[styles.input, { color: textColor }, style]}
        placeholderTextColor={placeholderColor}
        {...textInputProps}
      />
      {button ? (
        <TouchableOpacity onPress={onRightPress} style={styles.icon}>
          {button}
        </TouchableOpacity>
      ) : (
        <View style={styles.icon} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 50,
    margin: 3,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Quicksand_500Medium'
  },
});

export default InputComponent;
