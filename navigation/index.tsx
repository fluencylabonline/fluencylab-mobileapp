import { ThemeProvider } from '@/constants/ThemeContext';
import React from 'react';
import AppNavigator from './AppNavigator';

export default function App() {
  return (
    <ThemeProvider>
        <AppNavigator />
    </ThemeProvider>
  );
}