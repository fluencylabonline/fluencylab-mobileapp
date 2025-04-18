import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
    useMemo,
  } from "react";
  import {
    View,
    StyleSheet,
    ScrollView,
    FlatList,
    ActivityIndicator, // Import ActivityIndicator if needed for loading states
  } from "react-native";
  
  import * as Clipboard from "expo-clipboard";
  
  // Firebase Imports (assuming same setup as TicTacToe)
  import { getAuth, onAuthStateChanged, User } from "firebase/auth";
  import { db } from "@/config/firebase"; // Adjust path if needed
  import { doc, setDoc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
  
  // Custom Components & Hooks (assuming paths relative to this file or aliased)
  import { useToast } from "@/components/Toast/useToast"; // Assuming path
  import Container from "@/components/ContainerComponent"; // Assuming path
  import { TextComponent } from "@/components/TextComponent"; // Assuming path
  import TopBarComponent from "@/components/TopBarComponent"; // Assuming path
  import { Ionicons } from "@expo/vector-icons";
  import { useTheme } from "@/constants/useTheme"; // Assuming path
  import InputComponent from "@/components/InputComponent"; // Assuming path
  import ButtonComponent from "@/components/ButtonComponent"; // Assuming path
  
  // Game Data
  import { wordClues } from "./Database/wordClues"; // Adjust path as needed
  
  // Define props if needed, similar to TicTacToe
  interface WhatAmIGameProps {
    onClose: () => void; // For navigation back
  }
  
  // Define the structure for a guess
  interface Guess {
    playerId: string;
    guess: string;
  }
  
  // Define the structure for game data in Firestore (optional but good practice)
  interface GameData {
    word: string;
    clues: string[];
    currentTurn: 'player1' | 'player2'; // Track turn by player role
    player1Id: string | null;
    player1Name: string | null;
    player2Id: string | null;
    player2Name: string | null;
    guesses: Guess[];
    currentClueIndex: number;
    winner: string | null; // Stores the ID of the winner or null
    isGameOver: boolean; // Explicit flag for game over state
    createdAt: any; // Firestore Timestamp or Date
    updatedAt?: any; // Firestore Timestamp or Date
  }
  
  
  const WhatAmIGame: React.FC<WhatAmIGameProps> = ({ onClose }) => {
    const { colors } = useTheme();
    const { showToast } = useToast();
  
    // User State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("Player");
  
    // Game State
    const [gameId, setGameId] = useState<string | null>(null);
    const [word, setWord] = useState<string>('');
    const [clues, setClues] = useState<string[]>([]);
    const [currentClueIndex, setCurrentClueIndex] = useState<number>(0);
    const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null); // Whose turn is it (by ID)
    const [player1Id, setPlayer1Id] = useState<string | null>(null);
    const [player2Id, setPlayer2Id] = useState<string | null>(null);
    const [player1Name, setPlayer1Name] = useState<string>(""); // Default to empty string
    const [player2Name, setPlayer2Name] = useState<string>(""); // Default to empty string
    const [guesses, setGuesses] = useState<Guess[]>([]);
    const [winner, setWinner] = useState<string | null>(null); // Winner's User ID
    const [isGameOverState, setIsGameOverState] = useState<boolean>(false); // Local game over state
  
    // Input State
    const [guessInput, setGuessInput] = useState('');
    const [joinGameCodeInput, setJoinGameCodeInput] = useState('');
  
    // Loading State (optional, e.g., while creating/joining)
    const [isLoading, setIsLoading] = useState(false);
  
    // Firestore listener cleanup function
    const unsubscribeRef = useRef<(() => void) | null>(null);
  
    // --- Authentication Effect ---
    useEffect(() => {
      const auth = getAuth();
      const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setCurrentUser(user);
          setUserId(user.uid);
          // Attempt to fetch profile name, fallback to display name or generated name
          try {
              const userRef = doc(db, "users", user.uid);
              const userDoc = await getDoc(userRef);
              const profileName = userDoc.exists() ? userDoc.data()?.name || userDoc.data()?.displayName : null;
              setUserName(profileName || user.displayName || `Player_${user.uid.substring(0, 4)}`);
          } catch (error) {
              console.error("Error fetching user name:", error);
              setUserName(user.displayName || `Player_${user.uid.substring(0, 4)}`); // Fallback
          }
        } else {
          setCurrentUser(null);
          setUserId(null);
          setUserName("Player");
          showToast("Você não está logado.", "error");
          // Reset game state if user logs out
          resetLocalGameState();
          if (unsubscribeRef.current) {
              unsubscribeRef.current();
              unsubscribeRef.current = null;
          }
        }
      });
      return () => unsubscribeAuth();
    }, [showToast]); // Add showToast dependency
  
    // --- Firestore Listener Effect ---
    useEffect(() => {
      // Clean up previous listener if gameId changes or component unmounts
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
  
      if (gameId && userId) { // Only listen if we have a game ID and a logged-in user
        setIsLoading(true); // Indicate loading game data
        const gameRef = doc(db, "games", gameId);
  
        unsubscribeRef.current = onSnapshot(gameRef, async (snapshot) => {
          setIsLoading(false); // Stop loading once data arrives
          const data = snapshot.data() as GameData | undefined; // Type assertion
  
          if (snapshot.exists() && data) {
            // Update local state from Firestore
            setWord(data.word);
            setClues(data.clues);
            setCurrentClueIndex(data.currentClueIndex);
            setPlayer1Id(data.player1Id);
            setPlayer2Id(data.player2Id);
            setGuesses(data.guesses || []); // Ensure guesses is always an array
            setWinner(data.winner);
            setIsGameOverState(data.isGameOver ?? false); // Use local game over state flag
  
            // Fetch names if they are missing in DB (or update if needed)
            setPlayer1Name(data.player1Name || (data.player1Id ? await fetchPlayerName(data.player1Id) : "Player 1"));
            setPlayer2Name(data.player2Name || (data.player2Id ? await fetchPlayerName(data.player2Id) : "Player 2"));
  
            // Assign player 2 if slot is empty and current user is not player 1
            if (!data.player2Id && data.player1Id !== userId) {
              const p2Name = userName || `Player_${userId.substring(0,4)}`;
               await updateDoc(gameRef, {
                player2Id: userId,
                player2Name: p2Name, // Store current user's name
               });
               setPlayer2Id(userId); // Optimistic update
               setPlayer2Name(p2Name); // Optimistic update
               showToast("Você entrou como Jogador 2!", "success");
            } else if (data.player1Id !== userId && data.player2Id !== userId) {
                // If game exists but user is not part of it (e.g., joined via old link)
                showToast("Você não faz parte deste jogo.", "error");
                resetLocalGameState(); // Kick user out
                return; // Stop processing snapshot
            }
  
            // Determine whose turn it is based on Firestore data
            setCurrentTurnPlayerId(data.currentTurn === 'player1' ? data.player1Id : data.player2Id);
  
          } else {
            // Game document doesn't exist
            showToast("Jogo não encontrado.", "error");
            resetLocalGameState(); // Reset state if game disappears
          }
        }, (error) => {
          console.error("Error listening to game:", error);
          showToast("Erro ao conectar ao jogo.", "error");
          setIsLoading(false);
          resetLocalGameState();
        });
      } else {
          // No gameId, ensure everything is reset
          resetLocalGameState();
      }
  
      // Cleanup function for when component unmounts or gameId changes
      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    }, [gameId, userId, userName, showToast]); // Dependencies for the listener effect
  
  
    // --- Helper Functions ---
  
    const fetchPlayerName = useCallback(async (pUserId: string): Promise<string> => {
          if (!pUserId) return "Jogador";
          try {
              const userRef = doc(db, "users", pUserId);
              const userDoc = await getDoc(userRef);
              return userDoc.exists()
              ? userDoc.data()?.name || userDoc.data()?.displayName || `Jogador_${pUserId.substring(0,4)}`
              : `Jogador_${pUserId.substring(0,4)}`;
          } catch (error) {
              console.error("Error fetching player name:", error);
              return `Jogador_${pUserId.substring(0,4)}`;
          }
    }, []); // No dependencies as `db` is constant
  
    const resetLocalGameState = () => {
      setGameId(null);
      setWord('');
      setClues([]);
      setCurrentClueIndex(0);
      setCurrentTurnPlayerId(null);
      setPlayer1Id(null);
      setPlayer2Id(null);
      setPlayer1Name("");
      setPlayer2Name("");
      setGuesses([]);
      setWinner(null);
      setIsGameOverState(false);
      setGuessInput('');
      setJoinGameCodeInput(''); // Clear input field as well
      setIsLoading(false);
       // Ensure listener is cleaned up
       if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
      }
    };
  
    const generateGameId = (): string => {
      return Math.random().toString(36).substr(2, 9);
    };
  
    // --- Game Actions ---
  
    const createGame = useCallback(async () => {
      if (!userId || !userName) {
        showToast("Você precisa estar logado para criar um jogo.", "error");
        return;
      }
      setIsLoading(true);
      const id = generateGameId();
  
      // Select a random word and clues
      const randomIndex = Math.floor(Math.random() * wordClues.length);
      const { word: selectedWord, clues: selectedClues } = wordClues[randomIndex];
  
      const gameData: GameData = {
        word: selectedWord,
        clues: selectedClues,
        currentTurn: 'player1', // Player 1 starts
        player1Id: userId,
        player1Name: userName,
        player2Id: null,
        player2Name: null,
        guesses: [],
        currentClueIndex: 0,
        winner: null,
        isGameOver: false,
        createdAt: new Date(), // Use server timestamp ideally, but Date is ok
      };
  
      try {
        await setDoc(doc(db, "games", id), gameData);
        setGameId(id); // This triggers the useEffect listener
        setJoinGameCodeInput(id); // Pre-fill for easy sharing display
  
        await Clipboard.setStringAsync(id);
        showToast(`Jogo criado! ID copiado: ${id}`, "success", 4000);
      } catch (error) {
        console.error("Error creating game:", error);
        showToast("Falha ao criar o jogo.", "error");
        setIsLoading(false); // Stop loading on error
      }
      // setIsLoading(false); // Loading stops when listener gets data
    }, [userId, userName, showToast]); // Dependencies
  
    const handleJoinGame = useCallback(() => {
        const codeToJoin = joinGameCodeInput.trim();
      if (!userId) {
        showToast("Você precisa estar logado para entrar em um jogo.", "error");
        return;
      }
       if (!codeToJoin) {
        showToast("Por favor, insira um ID de jogo.", "info");
        return;
      }
      if (codeToJoin === gameId) {
          showToast("Você já está neste jogo.", "info");
          return;
      }
      // Setting gameId triggers the useEffect listener to connect
      setGameId(codeToJoin);
    }, [userId, gameId, joinGameCodeInput, showToast]);
  
    const handleGuess = useCallback(async () => {
      if (!gameId || !currentTurnPlayerId || winner !== null || isGameOverState) {
          showToast("Não é possível chutar agora.", "info");
          return; // Cannot guess if game hasn't started, is over, or it's not your turn
      }
  
      if (currentTurnPlayerId !== userId) {
          showToast("Não é sua vez.", "error");
          return;
      }
  
      const trimmedGuess = guessInput.trim();
      if (trimmedGuess === '') {
        showToast("Por favor, insira um chute.", "info");
        return;
      }
  
      setIsLoading(true); // Indicate processing guess
      const normalizedGuess = trimmedGuess.toLowerCase();
      const normalizedWord = word.toLowerCase();
  
      const newGuess: Guess = { playerId: userId, guess: normalizedGuess };
      const currentGuesses = guesses || []; // Ensure guesses is an array
      const updatedGuesses = [...currentGuesses, newGuess];
  
      const isCorrect = normalizedGuess === normalizedWord;
      const nextTurnPlayer = currentTurnPlayerId === player1Id ? 'player2' : 'player1';
      const nextClueIndex = isCorrect ? currentClueIndex : (currentClueIndex + 1); // Only advance clue on incorrect guess
      const isLastClue = nextClueIndex >= clues.length;
      const isOutOfGuesses = updatedGuesses.length >= 6; // Max 6 guesses
      const shouldEndGame = isCorrect || isOutOfGuesses || isLastClue;
  
      const gameRef = doc(db, "games", gameId);
      try {
         await updateDoc(gameRef, {
          guesses: updatedGuesses,
          currentTurn: shouldEndGame ? (currentTurnPlayerId === player1Id ? 'player1' : 'player2') : nextTurnPlayer, // Don't change turn if game ends
          currentClueIndex: shouldEndGame ? currentClueIndex : nextClueIndex, // Don't advance clue if game ends now
          winner: isCorrect ? userId : (shouldEndGame ? null : null), // Set winner if correct, null otherwise (explicitly null if game ends without correct guess)
          isGameOver: shouldEndGame, // Mark game as over
          updatedAt: new Date(), // Timestamp the move
        });
  
        // Clear input after successful submission
        setGuessInput('');
  
        // Show feedback (Firestore listener will update state, but immediate feedback is good)
        if (isCorrect) {
           showToast(`Correto! ${userName} venceu!`, "success", 4000);
        } else if (shouldEndGame) {
           showToast("Fim de jogo! Ninguém acertou.", "info", 4000);
        } else {
           showToast("Incorreto. Próxima dica!", "error");
        }
  
      } catch (error) {
          console.error("Error submitting guess:", error);
          showToast("Erro ao enviar chute.", "error");
      } finally {
          setIsLoading(false); // Stop loading indicator
      }
  
    }, [gameId, userId, userName, guessInput, word, clues, currentClueIndex, guesses, player1Id, player2Id, currentTurnPlayerId, winner, isGameOverState, showToast]);
  
  
    const handleStartNewGame = useCallback(() => {
      // Simply reset the local state, which disconnects the listener
      resetLocalGameState();
      showToast("Novo jogo iniciado.", "info");
    }, [showToast]);
  
    // --- UI Rendering Logic ---
  
    const getStatusText = useMemo(() => {
      if (!gameId) return "Crie ou entre em um jogo.";
      if (!player2Id && player1Id === userId) return `Aguardando Jogador 2... (ID: ${gameId})`;
      if (!player2Id && player1Id !== userId) return `Entrando no jogo... (ID: ${gameId})`; // Should be brief
      if (isLoading) return "Carregando..."; // Loading state
  
      if (winner) {
          const winnerName = winner === player1Id ? player1Name : player2Name;
          return `Fim de Jogo! ${winnerName || 'Vencedor'} ganhou!`;
      }
      if (isGameOverState) { // Check local game over state
          return `Fim de Jogo! Ninguém acertou. A palavra era: ${word}`;
      }
      if (currentTurnPlayerId) {
          const turnPlayerName = currentTurnPlayerId === player1Id ? player1Name : player2Name;
          return `Vez de: ${turnPlayerName || 'Jogador...'}`;
      }
      return "Carregando estado do jogo..."; // Default/fallback status
    }, [gameId, player1Id, player2Id, userId, winner, isGameOverState, currentTurnPlayerId, player1Name, player2Name, isLoading, word]);
  
    const renderGuessItem = ({ item }: { item: Guess }) => {
        const playerName = item.playerId === player1Id ? player1Name : player2Name;
        return (
          <View style={styles.guessItem}>
              <TextComponent style={styles.guessText}>
                  <TextComponent weight="bold">{playerName || 'Jogador'}: </TextComponent>
                  {item.guess}
              </TextComponent>
          </View>
        );
    };
  
    return (
      <Container>
        <TopBarComponent
          title="O Que Sou Eu?"
          leftIcon={
            <Ionicons
              onPress={onClose} // Use onClose prop
              name="arrow-back"
              size={28}
              color={colors.text.primary}
            />
          }
          // Optional: Add instructions button like TicTacToe if needed
          // rightIcon={<Ionicons name="information-circle-outline" ... />}
        />
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled" // Dismiss keyboard on tap outside input
        >
          <TextComponent weight="bold" size="large" style={styles.statusText}>
              {getStatusText}
          </TextComponent>
  
          {/* --- Initial State: Create / Join --- */}
          {!gameId && (
            <View style={styles.controlsContainer}>
              <InputComponent
                placeholder="Cole o ID do jogo aqui"
                value={joinGameCodeInput}
                onChangeText={setJoinGameCodeInput}
                maxLength={15} // Keep reasonable length
                editable={!isLoading}
              />
              <View style={styles.buttonRow}>
                <ButtonComponent
                  title="Entrar no Jogo"
                  onPress={handleJoinGame}
                  disabled={isLoading || !joinGameCodeInput}
                  color="amber" // Example color
                  style={styles.buttonStyle}
                />
                 <TextComponent style={styles.orText}>ou</TextComponent>
                <ButtonComponent
                  title="Criar Jogo"
                  onPress={createGame}
                  disabled={isLoading}
                  color="tealLight" // Example color
                  style={styles.buttonStyle}
                />
              </View>
               {isLoading && <ActivityIndicator size="large" color={colors.text.primary} style={{marginTop: 10}} />}
  
               {/* Instructions Box */}
              <View style={[styles.instructionsBox, { backgroundColor: colors.cards.primary }]}>
                  <TextComponent weight="bold" size="medium" style={styles.instructionsTitle}>
                      Como Jogar:
                  </TextComponent>
                   <TextComponent style={styles.instructionItem}>1. <TextComponent weight="bold">Criar:</TextComponent> Clique "Criar Jogo". ID será copiado. Compartilhe.</TextComponent>
                   <TextComponent style={styles.instructionItem}>2. <TextComponent weight="bold">Entrar:</TextComponent> Cole o ID recebido e clique "Entrar no Jogo".</TextComponent>
                   <TextComponent style={styles.instructionItem}>3. <TextComponent weight="bold">Chutar:</TextComponent> Veja a dica, digite seu chute (não diferencia maiúsculas/minúsculas) e clique "Enviar".</TextComponent>
                   <TextComponent style={styles.instructionItem}>4. <TextComponent weight="bold">Regras:</TextComponent> Adivinhe em até 6 tentativas. O jogo acaba se alguém acertar, se usarem 6 tentativas, ou se todas as dicas forem usadas sem acerto.</TextComponent>
                   <TextComponent style={styles.instructionItem}>5. <TextComponent weight="bold">Vencer:</TextComponent> O primeiro a acertar a palavra vence.</TextComponent>
                   <TextComponent style={styles.instructionItem}>6. <TextComponent weight="bold">Reiniciar:</TextComponent> Clique "Jogar Novamente" após o fim.</TextComponent>
              </View>
            </View>
          )}
  
          {/* --- Game Active State --- */}
          {gameId && player1Id && player2Id && ( // Only show game area when both players are in
            <View style={styles.gameAreaContainer}>
              {/* Clue Display */}
               {!winner && !isGameOverState && clues.length > 0 && (
                   <View style={[styles.clueBox, { backgroundColor: colors.cards.secondary || colors.cards.primary }]}>
                      <TextComponent weight="bold" size="medium" style={styles.clueText}>
                          Dica #{currentClueIndex + 1}: <TextComponent style={{color: colors.colors.teal}}>{clues[currentClueIndex]}</TextComponent>
                      </TextComponent>
                   </View>
               )}
  
              {/* Guess Input Area */}
              {!winner && !isGameOverState && (
                <View style={styles.guessInputContainer}>
                  <InputComponent
                    placeholder="Digite seu chute..."
                    value={guessInput}
                    onChangeText={setGuessInput}
                    editable={currentTurnPlayerId === userId && !isLoading} // Editable only on your turn & not loading
                  />
                  <ButtonComponent
                    title={isLoading ? <ActivityIndicator size="small" color={colors.text.primary} /> : "Enviar Chute"}
                    onPress={handleGuess}
                    disabled={currentTurnPlayerId !== userId || isLoading || !guessInput}
                    color="tealLight" // Example color
                  />
                </View>
              )}
  
              {/* Guesses List */}
              <View style={[styles.guessesContainer, { backgroundColor: colors.cards.primary }]}>
                  <TextComponent weight="bold" size="medium" style={styles.guessesTitle}>
                      Chutes ({guesses.length}/6):
                  </TextComponent>
                   <FlatList
                      data={guesses}
                      renderItem={renderGuessItem}
                      keyExtractor={(item, index) => `${item.playerId}-${index}`}
                      style={styles.guessesList}
                      ListEmptyComponent={<TextComponent style={styles.emptyListText}>Nenhum chute ainda.</TextComponent>}
                   />
              </View>
            </View>
          )}
  
          {/* --- Game Over State --- */}
          {(winner !== null || isGameOverState) && gameId && ( // Show only if game was active and is now over
              <View style={styles.gameOverContainer}>
                  <ButtonComponent
                      title="Jogar Novamente"
                      onPress={handleStartNewGame}
                      color="tealLight" // Example color
                  />
              </View>
          )}
  
           {/* Loading indicator for initial game load */}
           {gameId && isLoading && (!player1Id || !player2Id) && (
              <ActivityIndicator size="large" color={colors.text.primary} style={{ marginTop: 30 }} />
           )}
  
        </ScrollView>
      </Container>
    );
  };
  
  // --- Styles --- (Mimicking TicTacToe structure, adapt as needed)
  const styles = StyleSheet.create({
    scrollContainer: {
      flexGrow: 1,
      alignItems: 'center',
      padding: 20,
    },
    statusText: {
      textAlign: 'center',
      marginBottom: 20,
      paddingHorizontal: 10, // Prevent text touching edges
    },
    controlsContainer: {
      width: '90%',
      alignItems: 'center',
      gap: 15, // Spacing between elements
    },
    buttonRow: {
      flexDirection: 'row',
      alignItems: 'center', // Align items vertically
      justifyContent: 'center', // Center buttons horizontally
      width: '100%',
    },
     buttonStyle: {
        marginHorizontal: 5, // Add some space between buttons and 'or' text
        flex: 1, // Allow buttons to take available space
     },
     orText: {
       marginHorizontal: 10,
       fontWeight: 'bold',
     },
    instructionsBox: {
        width: '100%',
        marginTop: 20,
        padding: 15,
        borderRadius: 8,
        gap: 8, // Space between instruction lines
    },
    instructionsTitle: {
        marginBottom: 5,
        textAlign: 'center',
    },
    instructionItem: {
      fontSize: 14,
      lineHeight: 20, // Adjust for readability
    },
    gameAreaContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 20,
        marginTop: 10, // Add space below status text
    },
    clueBox: {
      width: '100%',
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
    },
    clueText: {
      textAlign: 'center',
    },
    guessInputContainer: {
      width: '100%',
      gap: 10,
    },
    guessesContainer: {
        width: '100%',
        padding: 15,
        borderRadius: 8,
        minHeight: 150, // Give it some minimum height
    },
    guessesTitle: {
      marginBottom: 10,
    },
    guessesList: {
        flexGrow: 0, // Prevent FlatList from taking all height in ScrollView
    },
    guessItem: {
        marginBottom: 5,
        paddingLeft: 5,
    },
    guessText: {
        fontSize: 15,
    },
     emptyListText: {
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 10,
     },
    gameOverContainer: {
      marginTop: 30,
      alignItems: 'center',
    },
  });
  
  export default WhatAmIGame;