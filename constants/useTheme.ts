import { useColorScheme } from 'react-native';
import { AppColors } from './AppColors';
import { useThemeContext } from './ThemeContext';

export const useTheme = () => {
  const { isDark, themeMode } = useThemeContext();

  const themeColors = {
    text: {
      primary: isDark ? AppColors.textPrimary.dark : AppColors.textPrimary.light,
      secondary: isDark ? AppColors.textSecondary.dark : AppColors.textSecondary.light,
      tertiary: isDark ? AppColors.textPrimary.dark : AppColors.textPrimary.dark, // Inverted for contrast in the Chat
    },
    background: {
      primary: isDark ? AppColors.backgroundPrimary.dark : AppColors.backgroundPrimary.light,
      list: isDark ? AppColors.backgroundList.dark : AppColors.backgroundList.light, //items inside cards or lists
      listSecondary: isDark ? AppColors.backgroundListSecondary.dark : AppColors.backgroundListSecondary.light, //items inside cards or lists
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
      tealLight: isDark ? AppColors.tealLight.dark : AppColors.tealLight.light,
      spaceBlue: isDark ? AppColors.spaceBlue.dark : AppColors.spaceBlue.light,
      deepOrange: isDark ? AppColors.deepOrange.dark : AppColors.deepOrange.light,
      deepOrangeLight: isDark ? AppColors.deepOrangeLight.dark : AppColors.deepOrangeLight.light,
      gray: isDark ? AppColors.gray.dark : AppColors.gray.light,
      darkGray: isDark ? AppColors.darkGray.dark : AppColors.darkGray.light,
      white: isDark ? AppColors.white.dark : AppColors.white.light,
      black: isDark ? AppColors.black.dark : AppColors.black.light,
    },
    modalOverlay: {
      primary: isDark ? AppColors.modalOverlay.dark : AppColors.modalOverlay.light,
    },
    messages: {
      primary: isDark ? AppColors.messagesPrimary.dark : AppColors.messagesPrimary.light, //normal
      secondary: isDark ? AppColors.messagesSecondary.dark : AppColors.messagesSecondary.light, //current user
    }
  };

  return {
    isDark,
    theme: themeMode,
    colors: themeColors,
  };
};