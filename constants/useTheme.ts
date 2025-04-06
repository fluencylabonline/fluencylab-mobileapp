import { useColorScheme } from 'react-native';
import { Colors } from './Colors';

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    isDark,
    colors: {
      cardBackground: isDark ? Colors.background.dark : Colors.background.light,
      cardBackgroundSecodary: isDark ? Colors.black.extraDark : Colors.background.light,
      cardBackgroundBottomSheet: isDark ? Colors.background.darker: Colors.background.lighter,
      text: isDark ? Colors.text.darker : Colors.text.lighter,
      secondaryText: isDark ? Colors.text.secondaryDark : Colors.text.secondaryLight,
      inputBackground: isDark ? Colors.black.extraDark : Colors.background.light,
    },
    theme: colorScheme,
  };
}; 