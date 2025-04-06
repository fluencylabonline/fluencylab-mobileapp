import React from 'react';
import { View, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { TextComponent } from './TextComponent';
import { useTheme } from '@/constants/useTheme';
interface TopBarProps {
  title: string;
  leftIcon?: React.ReactNode;
  onLeftPress?: () => void;
  rightIcon?: React.ReactNode;
  onRightPress?: () => void;
}

const TopBarComponent: React.FC<TopBarProps> = ({
  title,
  leftIcon,
  onLeftPress,
  rightIcon,
  onRightPress,
}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const backgroundColor = isDarkMode ? Colors.background.darkMode : Colors.background.lightMode;
  const textColor = isDarkMode ? Colors.text.darker : Colors.text.lighter;
  const colors = useTheme();

  return (
    <View style={[styles.container, { backgroundColor }]}>      
      {leftIcon ? (
        <TouchableOpacity onPress={onLeftPress} style={[styles.iconButton]}>
          {leftIcon}
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}

      <TextComponent weight='bold' size='large' style={[styles.title, { color: textColor }]} numberOfLines={1}>
        {title}
      </TextComponent>

      {rightIcon ? (
        <TouchableOpacity onPress={onRightPress} style={[styles.iconButton]}>
          {rightIcon}
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    textAlign: 'center',
    flex: 1,
  },
  iconButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
});

export default TopBarComponent;
