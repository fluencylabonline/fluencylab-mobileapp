import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, StatusBar, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/constants/useTheme';
const EditorPage: React.FC = () => {
  const { notebookID, studentID, role } = useLocalSearchParams();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  useEffect(() => {
    const loadParams = async () => {
      try {
        const baseUrl = 'https://www.fluencylab.me/mobile/notebook';
        const fullUrl = `${baseUrl}?notebook=${notebookID}&student=${studentID}&role=${role}&theme=light`;
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
    <View style={{ flex: 1 }}>
      <StatusBar hidden={true} />
      <WebView
        source={{ uri: url }}
        style={{ flex: 1 }}
        originWhitelist={['*']}
      />
    </View>
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
