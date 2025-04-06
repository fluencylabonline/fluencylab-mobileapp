import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ImageBackground, // Use ImageBackground for modes
} from 'react-native';
import { db } from '@/config/firebase'; // Adjust path
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { useLocalSearchParams } from 'expo-router'; // Use expo-router hook for params

// Import Custom Components & Hooks
import { useTheme } from '@/constants/useTheme'; // Adjust path
import { useToast } from '@/components/Toast/useToast'; // Adjust path
import { TextComponent } from '@/components/TextComponent'; // Adjust path
import ButtonComponent from '@/components/ButtonComponent'; // Adjust path
import Container from '@/components/ContainerComponent'; // Adjust path
import { Colors } from '@/constants/Colors'; // Import Colors directly if needed elsewhere

// Import Game Mode Components (Make sure these are React Native components)
import Anagram from './Modes/Anagram'; // Adjust path
import OpenTheBox from './Modes/OpenTheBox'; // Adjust path
import WhatIsImage from './Modes/WhatIsImage'; // Adjust path

// Import images using require (Adjust paths as needed)
const AnagramImg = require('@/assets/games/vocabulary/anagram.jpeg');
const OpenTheBoxImg = require('@/assets/games/vocabulary/openthebox.jpeg');
const WhatIsImageImg = require('@/assets/games/vocabulary/image.jpeg');
// If other images were used, require them here too
// const MatchUpImg = require('@/assets/images/games/match.jpeg');
// const QuizImg = require('@/assets/images/games/quiz.jpeg');
// const WordsearchImg = require('@/assets/images/games/wordsearch.jpeg');

// Define Game Modes available in RN version
const gameModes = [
  { name: 'Anagrama', img: AnagramImg, modeKey: 'anagram' }, // Add modeKey if needed later
  { name: 'Caixa surpresa', img: OpenTheBoxImg, modeKey: 'openthebox' },
  { name: 'Qual a imagem', img: WhatIsImageImg, modeKey: 'whatisimage' },
];

export default function IsPlayingScreen() { // Changed name slightly to indicate it's a screen
  const { colors } = useTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ gameID?: string; aloneGameID?: string; gameName?: string, isSingleplayer?: string }>(); // Type the params

  const [gameID, setGameID] = useState<any | null>(null); // Actual game instance ID (multiplayer) or template ID (singleplayer)
  const [gameMode, setGameMode] = useState<string | null>(null); // e.g., 'Anagrama'
  const [isGameModeSelected, setIsGameModeSelected] = useState(false);
  const [gameData, setGameData] = useState<any>(null); // Multiplayer game document data
  const [vocabularyData, setVocabularyData] = useState<any[]>([]); // Words/images for the game
  const [gameName, setGameName] = useState('');
  const [isSingleplayer, setIsSingleplayer] = useState(false);
  const [firstPlayerName, setFirstPlayerName] = useState<string | null>(null);
  const [secondPlayerName, setSecondPlayerName] = useState<string | null>(null);

  // Loading states
  const [isLoadingParams, setIsLoadingParams] = useState(true);
  const [isLoadingGameData, setIsLoadingGameData] = useState(true); // Combined loading for game/vocab
  const [isLoadingPlayerNames, setIsLoadingPlayerNames] = useState(false);

  // --- Effect 1: Process Route Parameters ---
  useEffect(() => {
    setIsLoadingParams(true);
    setIsLoadingGameData(true); // Reset game data loading too
    // console.log("Route Params:", params); // Log params for debugging

    const multiplayerGameId = params.gameID;
    const singleplayerGameId = params.aloneGameID;
    const singleplayerParam = params.isSingleplayer === 'true'; // Expo Router params are strings

    if (multiplayerGameId) {
      // console.log("Setting up Multiplayer:", multiplayerGameId);
      setGameID(multiplayerGameId);
      setIsSingleplayer(false);
      setGameName(params.gameName || ''); // Get name if passed for multiplayer lobby
      setIsLoadingParams(false);
      // Game data loading will be handled by Effect 2
    } else if (singleplayerGameId) {
      // console.log("Setting up Single Player:", singleplayerGameId);
      setGameID(singleplayerGameId); // Use the template ID as the 'gameID' for single player context
      setIsSingleplayer(true); // <<<--- Set isSingleplayer here
      setIsLoadingParams(false);

      // Fetch vocabulary game template data for singleplayer immediately
      const vocabRef = doc(db, 'VocabularyGame', singleplayerGameId);
      getDoc(vocabRef).then((vocabDoc) => {
        if (vocabDoc.exists()) {
          const vocabData = vocabDoc.data();
          setVocabularyData(vocabData?.vocabularies || []);
          setGameName(vocabData?.name || params.gameName || 'Jogo Solo'); // Use fetched name, fallback to param or default
          setIsGameModeSelected(false); // User needs to select the game mode
          // console.log("Single Player Vocab Loaded:", vocabData?.name);
        } else {
          showToast('Tema de vocabulário não encontrado.', 'error');
          console.error('Vocabulary game not found for ID:', singleplayerGameId);
        }
      }).catch(error => {
        showToast('Erro ao buscar dados do tema.', 'error');
        console.error('Error fetching single player vocab:', error);
      }).finally(() => {
        setIsLoadingGameData(false); // Finished loading game data attempt for single player
      });
    } else {
      // No valid ID found
      console.error("No gameID or aloneGameID found in route parameters.");
      setIsLoadingParams(false);
      setIsLoadingGameData(false);
    }

  }, [params]); // Rerun when params change

  // --- Effect 2: Multiplayer Game Listener & Vocab Fetch ---
  useEffect(() => {
    // Log values immediately upon entry for debugging
    // console.log(`Effect 2 ENTRY: isLoadingParams=${isLoadingParams}, gameID=${gameID}, isSingleplayer=${isSingleplayer}`);

    // --->>> FIX: Robust Check for Single Player <<<---
    // If it's determined to be single player, DO NOT proceed with multiplayer logic.
    if (isSingleplayer) {
      // console.log("Effect 2 returning early: isSingleplayer is true.");
      // Ensure loading is false since single player data is handled in Effect 1
      if (!isLoadingParams) { // Only set loading false if params are also done processing
          setIsLoadingGameData(false);
      }
      return; // <<<--- Exit the effect entirely
    }
    // --->>> END OF FIX <<<---

    // If it's still loading parameters or doesn't have a gameID yet (for multiplayer setup)
    if (isLoadingParams || !gameID) {
        // console.log(`Effect 2 returning: isLoadingParams=${isLoadingParams}, !gameID=${!gameID}`);
        // Don't set loading false here yet for multiplayer, wait for listener setup or failure
        return;
    }

    // --- This part should now ONLY execute for MULTIPLAYER games ---
    // console.log("Effect 2 Setting up listener for Multiplayer Game:", gameID); // Log confirms it's multiplayer
    setIsLoadingGameData(true); // Start loading for multiplayer data

    const gameRef = doc(db, 'games', gameID); // This is now safe, gameID refers to 'games' collection
    const unsubscribeGame = onSnapshot(gameRef, async (docSnap) => { // Make async to await getDoc inside
        const data = docSnap.data();
        if (data) {
            // console.log("Multiplayer Game Data Received:", data);
            setGameData(data); // Store the whole game document
            const currentMode = data.gameMode || null;
            setGameMode(currentMode);
            setIsGameModeSelected(!!currentMode);

            // Fetch associated VocabularyGame data if needed (logic remains the same)
            if (data.VocabularyGameID && (!vocabularyData.length || gameData?.VocabularyGameID !== data.VocabularyGameID)) {
                try {
                    const vocabRef = doc(db, 'VocabularyGame', data.VocabularyGameID);
                    const vocabDoc = await getDoc(vocabRef);
                    if (vocabDoc.exists()) {
                        const vocabGameDetails = vocabDoc.data();
                        setVocabularyData(vocabGameDetails?.vocabularies || []);
                        setGameName(currentGameName => currentGameName || vocabGameDetails?.name || 'Jogo Multiplayer');
                        // console.log("Multiplayer Associated Vocab Loaded:", vocabGameDetails?.name);
                    } else {
                        showToast('Tema de vocabulário associado não encontrado.', 'error');
                        setVocabularyData([]);
                    }
                } catch(error) {
                    showToast('Erro ao buscar tema de vocabulário.', 'error');
                    console.error("Error fetching associated vocab:", error);
                    setVocabularyData([]);
                } finally {
                    // Set loading false only after potential async vocab fetch is done
                    setIsLoadingGameData(false);
                }
            } else if (!data.VocabularyGameID) {
                // Handle case where multiplayer game exists but has no VocabularyGameID link
                showToast('Configuração de tema inválida para este jogo.', 'error')
                setVocabularyData([]);
                setIsLoadingGameData(false);
            }
             else {
                // No vocab fetch needed or already have data
                setIsLoadingGameData(false);
            }
        } else {
            // Game document *actually* not found for this multiplayer ID
            showToast('Instância do jogo não encontrada.', 'error');
            console.error('Multiplayer game document not found for ID:', gameID);
            setIsLoadingGameData(false);
            setGameData(null); // Clear game data
        }
    }, (error) => {
        showToast('Erro ao ouvir atualizações do jogo.', 'error');
        console.error('Error in game snapshot listener:', error);
        setIsLoadingGameData(false);
        setGameData(null);
    });

    // Cleanup function
    return () => {
        // console.log("Unsubscribing from Multiplayer Game:", gameID);
        unsubscribeGame();
    }
  }, [gameID, isSingleplayer, isLoadingParams, showToast]); // Added showToast to dependency array


  // --- Effect 3: Fetch Player Names (Multiplayer) ---
  useEffect(() => {
    // Only run if multiplayer, gameData is loaded, and players array exists
    if (!gameData || !Array.isArray(gameData.players) || gameData.players.length === 0 || isSingleplayer) {
      setFirstPlayerName(null);
      setSecondPlayerName(null);
      return;
    }

    setIsLoadingPlayerNames(true);
    const playerIds = gameData.players;

    const fetchName = async (playerId: string): Promise<string | null> => {
      if (!playerId) return null;
      try {
        const userRef = doc(db, 'users', playerId);
        const userDoc = await getDoc(userRef);
        // Use a fallback if name is missing
        return userDoc.exists() ? userDoc.data()?.name || `Jogador (${playerId.substring(0, 4)})` : `Jogador (${playerId.substring(0, 4)})`;
      } catch (error) {
        console.error(`Error fetching name for player ${playerId}:`, error);
        return `Erro (${playerId.substring(0, 4)})`; // Indicate error but don't crash
      }
    };

    // Fetch names concurrently
    Promise.all(playerIds.map(fetchName))
      .then(names => {
         // console.log("Fetched player names:", names);
         setFirstPlayerName(names[0] || 'Jogador 1');
         setSecondPlayerName(names[1] || (playerIds.length > 1 ? 'Jogador 2' : null)); // Handle case with only one player initially
      })
      .catch(error => {
         console.error("Error fetching player names:", error);
         showToast('Erro ao buscar nomes dos jogadores.', 'error');
         // Set defaults even on error
         setFirstPlayerName('Jogador 1');
         setSecondPlayerName(playerIds.length > 1 ? 'Jogador 2' : null);
      })
      .finally(() => {
         setIsLoadingPlayerNames(false);
      });

  }, [gameData, isSingleplayer]); // Rerun only when gameData changes (and it's multiplayer)

  // --- Handlers ---
  const handleGameModeChange = async (modeName: string) => {
    try {
      if (!isSingleplayer && gameID) {
        // Update gameMode in Firestore only for multiplayer games
        const gameRef = doc(db, 'games', gameID);
        await updateDoc(gameRef, { gameMode: modeName });
        // No need to set local state here, the onSnapshot listener will do it
        showToast(`Modo de jogo definido para: ${modeName}`, 'success');
      } else {
        // For single player, just set local state
        setGameMode(modeName);
        setIsGameModeSelected(true);
        showToast(`Modo de jogo selecionado: ${modeName}`, 'success');
      }
    } catch (error) {
      showToast('Erro ao mudar o modo de jogo', 'error');
      console.error("Error updating game mode:", error);
    }
  };

  const handleChangeMode = () => {
     if(!isSingleplayer && gameID){
        // Optionally reset the mode in Firestore for multiplayer
         const gameRef = doc(db, 'games', gameID);
         updateDoc(gameRef, { gameMode: null }).catch(err => console.error("Error resetting game mode:", err));
         // Let the listener reset local state for multiplayer
     } else {
        // Reset local state directly for single player
        setIsGameModeSelected(false);
        setGameMode(null);
     }
  };

  // --- Render Logic ---
  const renderGameModeComponent = () => {
    // Ensure vocab data is loaded before attempting to render game mode
    if (vocabularyData.length === 0) {
       return (
            <View style={styles.centerContent}>
                <ActivityIndicator color={colors.secondaryText}/>
                <TextComponent style={{marginTop: 10, color: colors.secondaryText}}>Carregando dados do vocabulário...</TextComponent>
            </View>
       );
    }

    // Render based on selected mode
    switch (gameMode) {
      case 'Anagrama':
        // Pass only necessary props, maybe simplify what gets passed down
        return <Anagram gameID={gameID} vocabularyData={vocabularyData} isSinglePlayer={isSingleplayer} />;
      default:
        return <TextComponent style={{color: colors.text}}>Modo de jogo '{gameMode}' não implementado.</TextComponent>;
    }
  };

  // Initial Loading State (Params or initial game data fetch)
  if (isLoadingParams || isLoadingGameData) {
     return (
         <Container style={styles.centerContent}>
             <ActivityIndicator size="large" color={colors.secondaryText} />
             <TextComponent style={{ color: colors.secondaryText, marginTop: 10 }}>
                 Carregando jogo...
                 {gameID}
             </TextComponent>
         </Container>
     );
  }

  // Invalid State (No ID or Multiplayer data failed to load)
  if (!gameID || (!isSingleplayer && !gameData)) {
    return (
      <Container style={styles.centerContent}>
        <TextComponent style={{ color: colors.secondaryText }}>
          Código de jogo inválido ou não encontrado.
        </TextComponent>
      </Container>
    );
  }

  // Main Render
  return (
    <Container style={styles.outerContainer}>
        {/* Header Section */}
        <View style={styles.header}>
             {(!isSingleplayer && firstPlayerName) && (
                <TextComponent style={styles.playerName} numberOfLines={1}>
                    J1: {isLoadingPlayerNames ? '...' : firstPlayerName}
                </TextComponent>
            )}
             <TextComponent weight="bold" size="large" style={styles.gameModeTitle} numberOfLines={1}>
                 {/* Show selected mode, fallback to game name */}
                 {isGameModeSelected ? gameMode : (gameName || 'Selecionar Modo')}
             </TextComponent>
            {isGameModeSelected && (
                 <ButtonComponent
                    title="Mudar Modo" // Shorter title
                    onPress={handleChangeMode}
                    color="amber"
                    style={styles.changeModeButton} // Add specific style if needed
                 />
            )}
             {(!isSingleplayer && secondPlayerName) && (
                <TextComponent style={styles.playerName} numberOfLines={1}>
                    J2: {isLoadingPlayerNames ? '...' : secondPlayerName}
                </TextComponent>
            )}
            {/* Placeholder if only one name/button visible to help balance layout */}
             {isSingleplayer && !isGameModeSelected && <View style={{width: 50}}/> /* Adjust width as needed */}
             {!isGameModeSelected && !secondPlayerName && firstPlayerName && <View style={{width: 50}}/>}
        </View>

        {/* Content Area */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
            {!isGameModeSelected ? (
            // --- Game Mode Selection ---
            <View style={styles.modeSelectionContainer}>
                <TextComponent weight="bold" size="xLarge" style={[styles.selectModeTitle, {color: colors.text}]}>
                Escolha um modo de jogo
                </TextComponent>
                <View style={styles.modesGrid}>
                {gameModes.map((mode) => (
                    <TouchableOpacity
                        key={mode.name}
                        style={styles.modeCardTouchable}
                        onPress={() => handleGameModeChange(mode.name)}
                        activeOpacity={0.7} // Standard touch feedback
                    >
                        <ImageBackground
                            source={mode.img}
                            style={styles.modeCardBackground}
                            imageStyle={styles.modeCardImageStyle} // Apply borderRadius to image
                            resizeMode="cover"
                        >
                            {/* Dark overlay for better text visibility */}
                            <View style={styles.modeCardOverlay} />
                            <TextComponent weight="bold" size="xLarge" style={styles.modeCardText}>
                                {mode.name}
                            </TextComponent>
                        </ImageBackground>
                    </TouchableOpacity>
                ))}
                </View>
            </View>
            ) : (
             // --- Render Selected Game Mode Component ---
             renderGameModeComponent()
            )}
        </ScrollView>
    </Container>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  centerContent: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12, // Adjust padding
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.indigo.lightest, // Use a theme color
    minHeight: 50, // Ensure header has minimum height
  },
   playerName: {
       fontSize: 14,
       fontWeight: '500',
       flex: 1, // Allow names to take space
       textAlign: 'center', // Center text within their space
   },
  gameModeTitle: {
    fontSize: 18,
    textAlign: 'center',
    marginHorizontal: 8,
    flex: 2, // Give title more space than names/button
    fontWeight: 'bold',
  },
  changeModeButton: {
      // Add specific styles if ButtonComponent doesn't support size="small" well
      // e.g., paddingVertical: 6, paddingHorizontal: 10
      flex: 1, // Allow button to take space
      minWidth: 100, // Prevent button from becoming too small
      alignItems: 'center', // Center content if ButtonComponent needs it
  },
  scrollContent: {
    flexGrow: 1, // Ensure content can grow to fill ScrollView
    padding: 15,
  },
  modeSelectionContainer: {
    alignItems: 'center',
  },
  selectModeTitle: {
    marginBottom: 25,
    // color: Colors.indigo.darkest, // Applied dynamically using colors.text
    fontSize: 24, // Larger title
  },
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20, // Use gap for spacing between items
  },
  modeCardTouchable: {
    width: 150, // Fixed width for cards
    height: 160, // Fixed height for cards
    borderRadius: 12,
    overflow: 'hidden', // Clip the ImageBackground
    elevation: 4, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    backgroundColor: Colors.indigo.lightest, // Background behind image
  },
  modeCardBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeCardImageStyle: {
     borderRadius: 12, // Match parent's borderRadius
     opacity: 0.6, // Make image slightly transparent
  },
  modeCardOverlay: {
      ...StyleSheet.absoluteFillObject, // Cover the entire background
      backgroundColor: 'rgba(0,0,0,0.4)', // Darker overlay
      borderRadius: 12,
  },
  modeCardText: {
    color: '#FFFFFF', // White text
    textAlign: 'center',
    paddingHorizontal: 5, // Add some padding
    fontSize: 20, // Adjust text size
    // zIndex: 1, // Ensure text is above overlay (usually default behavior)
  },
});