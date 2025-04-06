import React, { useEffect } from 'react';
import { Animated, StyleSheet, Text, View, Dimensions } from 'react-native';
import { useTheme } from '@/constants/useTheme';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  position?: 'top' | 'bottom';
  onHide?: () => void;
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  duration = 3000,
  position = 'top',
  onHide 
}) => {
  const { colors, isDark } = useTheme();
  const opacity = new Animated.Value(0);
  const translateY = new Animated.Value(position === 'top' ? -20 : 20);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return isDark ? '#2D5A27' : '#4CAF50';
      case 'error':
        return isDark ? '#8B2E2E' : '#F44336';
      default:
        return isDark ? '#1E293B' : '#64748B';
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: position === 'top' ? -20 : 20,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onHide) onHide();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const containerStyle = [
    styles.container,
    position === 'top' ? styles.topPosition : styles.bottomPosition,
    {
      opacity,
      transform: [{ translateY }],
      backgroundColor: getBackgroundColor(),
    },
  ];

  return (
    <Animated.View style={containerStyle}>
      <Text style={[styles.text, { color: '#FFFFFF' }]}>{message}</Text>
    </Animated.View>
  );
};

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  topPosition: {
    top: 60,
  },
  bottomPosition: {
    bottom: height * 0.1, // 10% from bottom
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Toast; 