import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, StatusBar, Platform, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/constants/useTheme';
import TopBarComponent from '@/components/TopBarComponent';
import { Ionicons } from '@expo/vector-icons';

const EditorPage: React.FC = () => {
  const { notebookID, studentID, role, darkMode } = useLocalSearchParams();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  useEffect(() => {
    const loadParams = async () => {
      try {
        const baseUrl = 'https://www.fluencylab.me/mobile/notebook';
        const fullUrl = `${baseUrl}?notebookID=${notebookID}&studentID=${studentID}&role=${role}&darkMode=${darkMode}`;
        setUrl(fullUrl);
      } catch (error) {
        console.error('Error fetching params:', error);
      } finally {
        setLoading(false);
      }
    };

    loadParams();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.colors.indigo} />
      </View>
    );
  }

  if (!url) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading the page. Please try again later.</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1 }}>
        <iframe
          src={url}
          style={{ border: 'none', height: '100vh', width: '100vw' }}
          title="Notebook Editor"
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
        <StatusBar hidden={false} backgroundColor={'transparent'} />
        <TopBarComponent 
            title="Caderno"
            leftIcon={
              <TouchableOpacity onPress={router.back}>
                <Ionicons name="arrow-back-sharp" size={26} color={colors.text.primary} />
              </TouchableOpacity>
            } 
          />
          <WebView
            source={{ uri: url }}
            style={{ flex: 1 }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            automaticallyAdjustContentInsets={false}
            keyboardDisplayRequiresUserAction={false}
            androidHardwareAccelerationDisabled={false}
            setSupportMultipleWindows={false}
          />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
});

export default EditorPage;
