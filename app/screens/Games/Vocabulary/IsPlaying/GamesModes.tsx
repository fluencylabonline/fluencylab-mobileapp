import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { VocabularyItem } from '@/types';

import { useTheme } from '@/constants/useTheme';
import { TextComponent } from '@/components/TextComponent';
import TopBarComponent from '@/components/TopBarComponent';
import Container from '@/components/ContainerComponent';
import { Ionicons } from '@expo/vector-icons';

const gameModes = [
  { name: 'Anagrama', img: require('@/assets/games/vocabulary/anagram.jpeg') },
  { name: 'Caixa surpresa', img: require('@/assets/games/vocabulary/openthebox.jpeg') },
  { name: 'Qual a imagem', img: require('@/assets/games/vocabulary/image.jpeg') },
];

export default function IsPlaying() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const [gameName, setGameName] = useState<string>('');
  const [vocabularyList, setVocabularyList] = useState<VocabularyItem[]>([]);

  const handleNavigateToGame = useCallback((modeToNavigate: string) => {
    if (!gameSessionId) {
        console.error("Cannot navigate without gameSessionId");
        setError("Erro interno: ID da sessão não encontrado para navegação.");
        return;
    }

    let pathSegment = '';
    switch (modeToNavigate) {
      case 'Anagrama':
        pathSegment = 'Anagram';
        break;
      case 'Caixa surpresa':
        pathSegment = 'OpenTheBox';
        break;
      case 'Qual a imagem':
        pathSegment = 'WhatIsImage';
        break;
      default:
        console.error(`Unknown game mode for navigation: ${modeToNavigate}`);
        setError(`Modo de jogo desconhecido: ${modeToNavigate}`);
        return;
    }

    const targetPath = `/screens/Games/Vocabulary/IsPlaying/GameModes/${pathSegment}/${pathSegment}`;
    const navigationParams = {
        gameID: gameSessionId,
        vocabularyData: JSON.stringify(vocabularyList)
      };

    console.log(`Navigating to ${targetPath} with params:`, navigationParams);
    router.push({
        pathname: targetPath as any,
        params: navigationParams
    });
  }, [gameSessionId, vocabularyList]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const currentId = params.gameID as string | undefined;
    const gameDataString = params.gameData as string | undefined;
    const vocabularyDataString = params.vocabularyData as string | undefined;

    if (!currentId) {
      setError('ID do jogo não fornecido na navegação.');
      setIsLoading(false);
      return;
    }
    if (!gameDataString || !vocabularyDataString) {
        console.error("Singleplayer mode, but gameData or vocabularyData missing!");
        setError('Dados essenciais do jogo não foram recebidos.');
        setIsLoading(false);
        return;
    }

    setGameSessionId(currentId);

    try {
      const parsedGameData = JSON.parse(gameDataString);
      const parsedVocabularyData: VocabularyItem[] = JSON.parse(vocabularyDataString);

      if (!parsedVocabularyData || parsedVocabularyData.length === 0) {
          setError('Erro: A lista de vocabulário está vazia.');
          setIsLoading(false);
          return;
      }

      setGameName(parsedGameData?.name || 'Tema Desconhecido');
      setVocabularyList(parsedVocabularyData);
      setIsLoading(false);

    } catch (e: any) {
      console.error('Error parsing singleplayer data:', e);
      setError(`Falha ao carregar dados do jogo: ${e.message}`);
      setIsLoading(false);
    }

  }, [params.gameID, params.gameData, params.vocabularyData]);

  if (isLoading) {
      return (
          <Container>
              <ActivityIndicator size="large" color={colors.text.primary} />
              <TextComponent style={{ marginTop: 10, color: colors.text.secondary }}>
                  Carregando Jogo...
              </TextComponent>
          </Container>
      );
  }

  if (error) {
    return (
      <Container>
        <TextComponent weight="semibold" style={[{ color: colors.text.primary }]}>
          Erro ao Carregar
        </TextComponent>
        <TextComponent style={[{ color: colors.text.secondary, textAlign: 'center', marginTop: 10, marginBottom: 20 }]}>
          {error}
        </TextComponent>
        <TouchableOpacity
           onPress={() => router.back()}
           style={[styles.backButton, { backgroundColor: colors.cards.primary }]}
         >
            <TextComponent style={{ color: colors.text.primary }}>Voltar</TextComponent>
        </TouchableOpacity>
      </Container>
    );
  }

  return (
    <Container>
        <TopBarComponent
            title={gameName || 'Selecione um Modo'}
            leftIcon={<Ionicons name="arrow-back" size={24} color={colors.text.primary} />}
        />

        <ScrollView contentContainerStyle={styles.scrollContentContainer}>
            <TextComponent weight="semibold" size="large" style={{ marginBottom: 20, color: colors.text.primary }}>
                Escolha o modo de jogo:
            </TextComponent>
            <View style={styles.modeGrid}>
                {gameModes.map((mode) => (
                  <TouchableOpacity
                    key={mode.name}
                    style={[styles.modeItem, { backgroundColor: colors.cards.secondary }]}
                    onPress={() => handleNavigateToGame(mode.name)}
                    disabled={isLoading} 
                  >
                     <ImageBackground source={mode.img} style={styles.modeImageBackground} imageStyle={styles.modeImage} resizeMode="cover">
                        <View style={styles.modeOverlay} />
                        <TextComponent weight="bold" size="large" style={styles.modeText}>{mode.name}</TextComponent>
                     </ImageBackground>
                  </TouchableOpacity>
                ))}
            </View>
        </ScrollView>

    </Container>
  );
}

const styles = StyleSheet.create({
    scrollContentContainer: { flexGrow: 1, padding: 20, alignItems: 'center' },
    modeGrid: {
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: '100%',
    },
    modeItem: {
        width: '95%',
        aspectRatio: 16 / 9,
        borderRadius: 15,
        marginBottom: 20,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    modeImageBackground: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modeImage: { borderRadius: 15 },
    modeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 15 },
    modeText: { color: '#FFFFFF', textAlign: 'center', paddingHorizontal: 10, position: 'relative', zIndex: 1, textShadowColor: 'rgba(0, 0, 0, 0.6)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    backButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginTop: 20,
    },
});