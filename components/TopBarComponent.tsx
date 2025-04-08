import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
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
  const { colors } = useTheme();
  const backgroundColor = colors.background.primary;
  const textColor = colors.text.primary;

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
