import { useColorScheme } from 'react-native';
import { AppColors } from './AppColors';

export const useTheme = () => {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const themeColors = {
    text: {
      primary: isDark ? AppColors.textPrimary.dark : AppColors.textPrimary.light,
      secondary: isDark ? AppColors.textSecondary.dark : AppColors.textSecondary.light,
    },
    background: {
      primary: isDark ? AppColors.backgroundPrimary.dark : AppColors.backgroundPrimary.light,
      list: isDark ? AppColors.backgroundList.dark : AppColors.backgroundList.light, //items inside cards or lists
    },
    cards: {
      primary: isDark ? AppColors.cardsPrimary.dark : AppColors.cardsPrimary.light,
      secondary: isDark ? AppColors.cardsSecondary.dark : AppColors.cardsSecondary.light,
    },
    bottomSheet: {
      background: isDark ? AppColors.bottomSheet.dark : AppColors.bottomSheet.light,
    },
    colors: {
      indigo: isDark ? AppColors.indigo.dark : AppColors.indigo.light,
      amber: isDark ? AppColors.amber.dark : AppColors.amber.light,
      teal: isDark ? AppColors.teal.dark : AppColors.teal.light,
      spaceBlue: isDark ? AppColors.spaceBlue.dark : AppColors.spaceBlue.light,
      deepOrange: isDark ? AppColors.deepOrange.dark : AppColors.deepOrange.light,
      white: isDark ? AppColors.white.dark : AppColors.white.light,
      black: isDark ? AppColors.black.dark : AppColors.black.light,
    },
  };

  return {
    isDark,
    theme: colorScheme,
    colors: themeColors,
  };
  
};
