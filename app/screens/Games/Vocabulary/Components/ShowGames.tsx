import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { db } from '@/config/firebase'; // Adjust path as needed
import { collection, onSnapshot } from 'firebase/firestore';

import { useTheme } from '@/constants/useTheme'; // Adjust path as needed
import { useToast } from '@/components/Toast/useToast'; // Adjust path as needed
import { TextComponent } from '@/components/TextComponent'; // Use custom TextComponent
import { Colors } from '@/constants/Colors'; // Import Colors for direct use if needed
import { router } from 'expo-router';

interface Game {
  id: string;
  name?: string;
  vocabularies?: any[];
}

export default function ShowGames() {
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Fetch Games ---
  useEffect(() => {
    setLoading(true); // Start loading when component mounts or auth changes (if user needed for query)
    const unsubscribe = onSnapshot(collection(db, 'VocabularyGame'),
      (snapshot) => {
        const gamesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Game)); // Cast to Game type
        setGames(gamesList);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching games:', error);
        showToast('Erro ao carregar os temas de vocabulário.', 'error');
        setLoading(false);
      }
    );
    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, [showToast]); // Dependency on showToast


  // --- Navigation ---
  const handleNavigateToGame = (game: Game) => {
    router.push(`/screens/Games/Vocabulary/IsPlaying/IsPlaying?gameID=${game.id}`);
  };

  // --- Render Item for FlatList ---
  const renderGameItem = ({ item }: { item: Game }) => {
    const wordCount = Array.isArray(item.vocabularies) ? item.vocabularies.length : 0;

    return (
      <TouchableOpacity
        style={[styles.gameItemContainer, { backgroundColor: colors.cardBackground }]}
        onPress={() => handleNavigateToGame(item)}
      >
        <View style={styles.gameInfo}>
          <TextComponent weight="semibold" size="medium" style={{ color: colors.text }}>
            {item.name || 'Nome Indefinido'}
          </TextComponent>
          <TextComponent size="small" style={{ color: colors.secondaryText }}>
            Total de palavras: {wordCount}
          </TextComponent>
        </View>
      </TouchableOpacity>
    );
  };


  // --- Render Component ---
  // Display loading indicator until both auth check and initial data fetch are done
  const showLoadingIndicator = loading;

  return (
    <View style={styles.container}>
      <TextComponent weight="bold" size="large" style={[styles.title, { color: colors.text }]}>
         Temas para Jogar Sozinho
      </TextComponent>

      {showLoadingIndicator ? (
         <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.secondaryText} />
            <TextComponent style={[styles.loadingText, { color: colors.secondaryText }]}>
                Carregando temas...
            </TextComponent>
         </View>
      ) : (
        <FlatList
          data={games}
          renderItem={renderGameItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContentContainer}
          ListEmptyComponent={
            <TextComponent style={[styles.emptyText, { color: colors.secondaryText }]}>
              Nenhum tema de vocabulário encontrado.
            </TextComponent>
          }
        />
      )}
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1, // Make container fill available space if needed within its parent
    paddingVertical: 15,
    marginTop: 15, // Add some space above the list
  },
  title: {
    marginBottom: 15,
    marginHorizontal: 10, // Add some horizontal margin to the title
    textAlign: 'center',
  },
   loadingContainer: {
       flex: 1, // Center loading indicator in available space
       justifyContent: 'center',
       alignItems: 'center',
       padding: 20,
   },
  loadingText: {
     marginTop: 10,
     fontSize: 16,
  },
  listContentContainer: {
    paddingHorizontal: 10, // Padding for the list items
    paddingBottom: 20, // Padding at the bottom of the list
  },
  gameItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8, // Space between items
    // Add background color from theme if needed: backgroundColor: colors.cardBackgroundSecodary
  },
  gameInfo: {
    flex: 1, // Allow text content to take up available space
    marginRight: 10, // Add space between text and delete button
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
  }
});