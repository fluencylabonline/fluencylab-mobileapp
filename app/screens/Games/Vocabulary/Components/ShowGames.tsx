import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { db } from '@/config/firebase'; 
import { collection, onSnapshot } from 'firebase/firestore';

import { useTheme } from '@/constants/useTheme'; 
import { useToast } from '@/components/Toast/useToast'; 
import { TextComponent } from '@/components/TextComponent';
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

  useEffect(() => {
    setLoading(true); 
    const unsubscribe = onSnapshot(collection(db, 'VocabularyGame'),
      (snapshot) => {
        const gamesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Game));
        setGames(gamesList);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching games:', error);
        showToast('Erro ao carregar os temas de vocabulário.', 'error');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [showToast]);

  const handleNavigateToGame = (game: Game) => {
    const params = {
      gameID: game.id,
      gameData: JSON.stringify(game),
      vocabularyData: JSON.stringify(game.vocabularies)
    };
  
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
  
    router.push(`/screens/Games/Vocabulary/IsPlaying/GamesModes?${queryString}`);
  };

  const renderGameItem = ({ item }: { item: Game }) => {
    const wordCount = Array.isArray(item.vocabularies) ? item.vocabularies.length : 0;
    return (
      <TouchableOpacity
        style={[styles.gameItemContainer, { backgroundColor: colors.cards.primary }]}
        onPress={() => handleNavigateToGame(item)}
      >
        <View style={styles.gameInfo}>
          <TextComponent weight="semibold" size="medium" style={{ color: colors.text.primary }}>
            {item.name || 'Nome Indefinido'}
          </TextComponent>
          <TextComponent size="small" style={{ color: colors.text.secondary }}>
            Total de palavras: {wordCount}
          </TextComponent>
        </View>
      </TouchableOpacity>
    );
  };

  const showLoadingIndicator = loading;

  return (
    <View style={styles.container}>
      {showLoadingIndicator ? (
         <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text.primary} />
            <TextComponent style={[styles.loadingText, { color: colors.text.primary }]}>
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
            <TextComponent style={[styles.emptyText, { color: colors.text.secondary }]}>
              Nenhum tema encontrado.
            </TextComponent>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    paddingVertical: 15,
    marginTop: 15, 
  },
  title: {
    marginBottom: 15,
    marginHorizontal: 10, 
    textAlign: 'center',
  },
   loadingContainer: {
       flex: 1, 
       justifyContent: 'center',
       alignItems: 'center',
       padding: 20,
   },
  loadingText: {
     marginTop: 10,
     fontSize: 16,
  },
  listContentContainer: {
    paddingHorizontal: 10, 
    paddingBottom: 20, 
  },
  gameItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  gameInfo: {
    flex: 1, 
    marginRight: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
  }
});