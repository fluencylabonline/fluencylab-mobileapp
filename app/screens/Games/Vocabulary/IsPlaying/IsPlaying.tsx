// src/app/screens/Games/Vocabulary/IsPlaying/IsPlaying.tsx
// (Adjust path as needed)

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  ImageBackground,
  Image,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { db } from '@/config/firebase';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { VocabularyItem } from '@/types'; // Adjust path if needed

import { useTheme } from '@/constants/useTheme';
import { TextComponent } from '@/components/TextComponent';
import { useToast } from '@/components/Toast/useToast';

import Anagram from './Modes/Anagram';
import OpenTheBox from './Modes/OpenTheBox';
import WhatIsImage from './Modes/WhatIsImage';

import TopBarComponent from '@/components/TopBarComponent';
import { Ionicons } from '@expo/vector-icons';
import Container from '@/components/ContainerComponent';
// --- Game Mode Components (Placeholders - Replace with actual components) ---
// -----------------------------------------


interface Player {
  id: string;
  name?: string;
}

interface GameData { // For multiplayer game state from 'games' collection
  players: string[];
  gameMode: string | null;
  VocabularyGameID: string;
  // Add other fields from your 'games' document structure
}

// --- Game Mode Definitions (Adjust require paths) ---
const gameModes = [
  { name: 'Anagrama', img: require('@/assets/games/vocabulary/anagram.jpeg') },
  { name: 'Caixa surpresa', img: require('@/assets/games/vocabulary/openthebox.jpeg') },
  { name: 'Qual a imagem', img: require('@/assets/games/vocabulary/image.jpeg') },
];
// ----------------------------

export default function IsPlaying() {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams();

  // --- State ---
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [gameSessionId, setGameSessionId] = useState<string | null>(null); // Holds the Firestore doc ID passed as 'gameID'
  const [isSingleplayer, setIsSingleplayer] = useState(false);
  const [gameName, setGameName] = useState<string>('');

  const [gameMode, setGameMode] = useState<string | null>(null);
  const [isGameModeSelected, setIsGameModeSelected] = useState(false);

  const [vocabularyList, setVocabularyList] = useState<VocabularyItem[]>([]);

  // Multiplayer specific state
  const [multiplayerGameData, setMultiplayerGameData] = useState<GameData | null>(null);
  const [playersInfo, setPlayersInfo] = useState<Player[]>([]);

  // --- Effects ---

  // Initial setup: Determine mode and ID using the simpler logic structure
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Extract parameters based on the simpler example's expected names
    const currentId = params.gameID as string | undefined;
    const singleplayerParam = params.isSingleplayer as string;
    const gameDataString = params.gameData as string | undefined;
    const vocabularyDataString = params.vocabularyData as string | undefined;

    console.log("--- IsPlaying Params Received ---");
    console.log("gameID:", currentId);
    console.log("isSingleplayer:", singleplayerParam);
    console.log("gameData:", gameDataString ? 'Exists' : 'Missing');
    console.log("vocabularyData:", vocabularyDataString ? 'Exists' : 'Missing');
    console.log("-------------------------------");


    if (!currentId) {
      // If 'gameID' param itself is missing
      setError('ID do jogo não fornecido na navegação.');
      setIsLoading(false);
      return;
    }

    const isSingle = singleplayerParam === 'true';
    setGameSessionId(currentId); // Use the passed 'gameID' as the session ID
    setIsSingleplayer(isSingle);

    if (isSingle) {
      // Singleplayer: Expect 'gameData' and 'vocabularyData' to also be present
      if (!gameDataString || !vocabularyDataString) {
         console.error("Singleplayer mode, but gameData or vocabularyData missing!");
         setError('Dados incompletos para jogo singleplayer (gameData ou vocabularyData ausente).');
         setIsLoading(false);
         return;
      }
      try {
        const parsedGameData = JSON.parse(gameDataString);
        const parsedVocabularyData: VocabularyItem[] = JSON.parse(vocabularyDataString);

        setGameName(parsedGameData?.name || 'Tema Desconhecido');
        setVocabularyList(parsedVocabularyData);
        setIsGameModeSelected(false); // Always start by selecting mode in singleplayer
        setGameMode(null);
        setIsLoading(false); // Loading finished for singleplayer setup
      } catch (e: any) {
        console.error('Error parsing singleplayer data:', e);
        setError(`Falha ao carregar dados do jogo singleplayer: ${e.message}`);
        setIsLoading(false);
      }
    } else {
      // Multiplayer: We have the 'gameID' (which is the multiplayer session ID).
      // The listener in the next effect will handle fetching data.
      // Keep loading = true until listener provides data.
      console.log(`Multiplayer mode detected. Game session ID: ${currentId}. Waiting for listener...`);
    }
    // **Important**: Ensure dependencies cover all params used
  }, [params.gameID, params.isSingleplayer, params.gameData, params.vocabularyData]);


  // Effect for Multiplayer: Listen to game document changes
  useEffect(() => {
    // This effect only runs for MULTIPLAYER mode when gameSessionId is set
    if (isSingleplayer || !gameSessionId) {
      setMultiplayerGameData(null);
      setPlayersInfo([]);
      return; // Exit if not in multiplayer or no ID yet
    }

    console.log(`Attaching MULTIPLAYER listener to games/${gameSessionId}`);
    // Ensure loading is true when listener starts for multiplayer
    // Note: setIsLoading(true) was moved here from the previous effect for multiplayer case
    // to ensure it stays true until this listener gets data.
    // If the previous effect already set loading=false for singleplayer, this won't run.
    setIsLoading(true);

    const gameRef = doc(db, 'games', gameSessionId); // Assumes gameSessionId is the multiplayer ID here
    const unsubscribe = onSnapshot(gameRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as GameData;
          console.log('Multiplayer Snapshot Data:', data);
          setMultiplayerGameData(data);
          setGameMode(data.gameMode);
          setIsGameModeSelected(!!data.gameMode);

          // Fetch Vocabulary if needed
          if (data.VocabularyGameID && (!vocabularyList.length || multiplayerGameData?.VocabularyGameID !== data.VocabularyGameID)) {
              try {
                  // ... (Vocabulary fetching logic remains the same)
                  const vocabRef = doc(db, 'VocabularyGame', data.VocabularyGameID);
                  const vocabDoc = await getDoc(vocabRef);
                  if (vocabDoc.exists()) {
                      const vocabData = vocabDoc.data();
                      setVocabularyList(vocabData?.vocabularies || []);
                      setGameName(vocabData?.name || 'Tema Desconhecido'); // Set game name from vocab theme
                      console.log(`Vocabulary loaded for multiplayer game from ${data.VocabularyGameID}`);
                  } else {
                      setError('Tema de vocabulário associado não encontrado.');
                      setVocabularyList([]);
                  }
              } catch(e) {
                  console.error("Error fetching vocabulary for multiplayer:", e);
                  setError('Erro ao buscar vocabulário do jogo.');
                  setVocabularyList([]);
              }
          } else if (!data.VocabularyGameID) {
              console.warn("Multiplayer game data missing VocabularyGameID!");
              // Decide how to handle this - maybe clear vocab list?
              // setVocabularyList([]);
          }

          // Fetch Player Names if needed
          const currentPlayerIds = playersInfo.map(p => p.id).sort().join(',');
          const newPlayerIds = data.players?.sort().join(',') || '';
          if (data.players && newPlayerIds !== currentPlayerIds) {
             try {
                // ... (Player name fetching logic remains the same)
                const playerPromises = data.players.map(playerId => getDoc(doc(db, 'users', playerId)));
                const playerDocs = await Promise.all(playerPromises);
                const fetchedPlayersInfo = playerDocs.map((playerDoc, index) => ({
                    id: data.players[index],
                    name: playerDoc.exists() ? playerDoc.data()?.name || `Jogador ${index + 1}` : `Jogador ${index + 1}`
                }));
                setPlayersInfo(fetchedPlayersInfo);
                console.log("Player info updated:", fetchedPlayersInfo);
             } catch(e) {
                 console.error("Error fetching player names:", e);
                 setError('Erro ao buscar nomes dos jogadores.');
                 setPlayersInfo(data.players.map((id, index) => ({ id, name: `Jogador ${index + 1}` })));
             }
          }
          // Only set loading to false once essential multiplayer data is processed
          setIsLoading(false);
        } else {
          console.error(`Multiplayer game document games/${gameSessionId} not found.`);
          setError('Sessão de jogo multiplayer não encontrada.');
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('Error listening to multiplayer game:', error);
        setError('Erro ao conectar com o jogo multiplayer.');
        setIsLoading(false);
      }
    );

    return () => {
      console.log(`Detaching MULTIPLAYER listener from games/${gameSessionId}`);
      unsubscribe();
    };
  }, [gameSessionId, isSingleplayer]); // Rerun ONLY if gameSessionId or isSingleplayer changes

  // --- Callbacks (handleGameModeChange, handleChangeMode) remain the same ---
  const handleGameModeChange = useCallback(async (mode: string) => {
    // ... (no changes needed here)
    if (!isSingleplayer && gameSessionId) {
      try {
        const gameRef = doc(db, 'games', gameSessionId);
        await updateDoc(gameRef, { gameMode: mode });
        showToast(`Modo de jogo definido para: ${mode}`, 'success');
      } catch (error) {
        console.error('Error updating game mode:', error);
        showToast('Erro ao mudar o modo de jogo no servidor.', 'error');
      }
    } else {
      setGameMode(mode);
      setIsGameModeSelected(true);
      showToast(`Modo de jogo selecionado: ${mode}`, 'success');
    }
  }, [isSingleplayer, gameSessionId, showToast]);

  const handleChangeMode = useCallback(() => {
    // ... (no changes needed here)
    setIsGameModeSelected(false);
    setGameMode(null);
    showToast('Selecione um novo modo de jogo.', 'info');
  }, []);

  // --- Render Logic (Loading, Error, Fallback) remains the same ---

  if (isLoading) {
    // ... Loading UI ...
     return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.cards.primary }]}>
        <ActivityIndicator size="large" color={colors.text.primary} />
        <TextComponent style={{ color: colors.text.secondary, marginTop: 10 }}>
          {isSingleplayer ? 'Carregando jogo...' : 'Conectando ao jogo multiplayer...'}
        </TextComponent>
      </View>
    );
  }

  if (error) {
    // ... Error UI ...
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.cards.primary }]}>
        <TextComponent weight="semibold" style={[styles.errorText, { color: colors.text.primary }]}>
          Erro
        </TextComponent>
        <TextComponent style={[styles.errorText, { color: colors.text.secondary, textAlign: 'center' }]}>
          {error}
        </TextComponent>
        <TouchableOpacity onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.cards.secondary, marginTop: 20 }]}>
            <TextComponent style={{ color: colors.text.primary }}>Voltar</TextComponent>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Main Render Content (renderGameContent function and main return) remains the same ---
  const renderGameContent = () => {
    // ... (Mode Selection UI or Game Component logic remains the same) ...
    if (!isGameModeSelected) {
      // Render Game Mode Selection Grid...
       return (
        <View style={styles.modeSelectionContainer}>
           {/* ... Mode Selection Title ... */}
          <TextComponent weight="bold" size="large" style={[styles.modeSelectionTitle, { color: colors.text.primary }]}>
            Escolha um modo de jogo
          </TextComponent>
          {/* ... Mode Selection Grid ... */}
          <View style={styles.modeGrid}>
            {gameModes.map((mode) => (
              <TouchableOpacity
                key={mode.name}
                style={[styles.modeItem, { backgroundColor: colors.cards.secondary }]}
                onPress={() => handleGameModeChange(mode.name)}
              >
                 {/* ... ImageBackground with Overlay and Text ... */}
                 <ImageBackground source={mode.img} style={styles.modeImageBackground} imageStyle={styles.modeImage} resizeMode="cover">
                    <View style={styles.modeOverlay} />
                    <TextComponent weight="bold" size="large" style={styles.modeText}>{mode.name}</TextComponent>
                 </ImageBackground>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    } else if (gameMode && vocabularyList.length > 0) {
       // Render Selected Game Mode Component based on gameMode...
       switch (gameMode) {
        case 'Anagrama': return <Anagram
        gameSessionId={gameSessionId}
        isSingleplayer={isSingleplayer}
        vocabularyList={vocabularyList}
      />
        case 'Caixa surpresa': return <OpenTheBox
        gameSessionId={gameSessionId}
        isSingleplayer={isSingleplayer}
        vocabularyList={vocabularyList}
        />;
        case 'Qual a imagem': return <WhatIsImage
        gameSessionId={gameSessionId}
        isSingleplayer={isSingleplayer}
        vocabularyList={vocabularyList}
        />;
        default:
          return (
            <View style={styles.centerContent}>
              <TextComponent style={{ color: colors.text.secondary }}>Componente para '{gameMode}' não implementado.</TextComponent>
            </View>
          );
      }
    } else if (gameMode && vocabularyList.length === 0 && !isSingleplayer) {
        // Handle case where multiplayer game started but vocabulary isn't loaded yet or failed
        return (
            <View style={styles.centerContent}>
              <ActivityIndicator color={colors.text.primary} />
              <TextComponent style={{ color: colors.text.secondary, marginTop: 10 }}>Carregando vocabulário...</TextComponent>
            </View>
          );
    } else if (gameMode && vocabularyList.length === 0 && isSingleplayer) {
         // This case shouldn't happen with the validation, but as a fallback
         return (
            <View style={styles.centerContent}>
               <TextComponent style={{ color: colors.text.secondary }}>Erro: Vocabulário vazio para jogo singleplayer.</TextComponent>
            </View>
         );
    }
    return null; // Should not happen in normal flow
  };

  // --- Main return structure with Top Bar and Game Area ---
  return (
    <Container
    >
      <View style={styles.topBar}>
            {/* ... Player 1 Info / Singleplayer indicator ... */}
            <View style={styles.playerInfo}>
              {!isSingleplayer && playersInfo.length > 0 && (<TextComponent size="small" style={{ color: colors.text.secondary }}>{playersInfo[0]?.name || '...'}</TextComponent>)}
               {isSingleplayer && (<TextComponent size="small" style={{ color: colors.text.secondary }}>Um Jogador</TextComponent>)}
            </View>
            {/* ... Game Mode / Title / Change Button ... */}
            <View style={styles.gameModeDisplay}>
                <TextComponent weight="bold" size="medium" style={{ color: colors.text.primary }} numberOfLines={1} ellipsizeMode="tail">
                  {isGameModeSelected ? gameMode : gameName || 'Carregando...'}
                </TextComponent>
                 {isGameModeSelected && (
                     <TouchableOpacity onPress={handleChangeMode} style={styles.changeModeButton}>
                         <TextComponent size="small" style={{ color: colors.cards.secondary }}>Trocar modo</TextComponent>
                     </TouchableOpacity>
                 )}
            </View>
            {/* ... Player 2 Info ... */}
            <View style={styles.playerInfo}>
                 {!isSingleplayer && playersInfo.length > 1 && (<TextComponent size="small" style={{ color: colors.text.secondary, textAlign: 'right' }}>{playersInfo[1]?.name || '...'}</TextComponent>)}
            </View>
      </View>

      {/* --- Main Game Area --- */}
      <View style={styles.gameArea}>
        {renderGameContent()}
      </View>

    </Container>
  );
}

// --- Styles (remain the same) ---
const screenWidth = Dimensions.get('window').width;
const modeItemSize = (screenWidth - 60) / 2;

const styles = StyleSheet.create({
  // ... (Styles are unchanged from the previous version)
    container: { flex: 1 },
    scrollContentContainer: { flexGrow: 1, padding: 20 },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
    playerInfo: { flex: 1 },
    gameModeDisplay: { flex: 2, alignItems: 'center', paddingHorizontal: 5 /* Added padding */ },
    changeModeButton: { marginTop: 2 },
    gameArea: { flex: 1 },
    modeSelectionContainer: { alignItems: 'center', width: '100%' },
    modeSelectionTitle: { marginBottom: 20 },
    modeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' },
    modeItem: { width: modeItemSize, height: modeItemSize * 1.1, borderRadius: 15, marginBottom: 15, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    modeImageBackground: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modeImage: { borderRadius: 15, opacity: 0.8 },
    modeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 15 },
    modeText: { color: '#FFFFFF', textAlign: 'center', paddingHorizontal: 5, position: 'relative', zIndex: 1 },
    errorText: { marginBottom: 10, fontSize: 16 },
    button: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' }
});