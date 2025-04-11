import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import BottomSheet, {
  BottomSheetView,
  BottomSheetScrollView, // Use for scrollable content like instructions
  BottomSheetBackdrop,
  BottomSheetTextInput, // Optional: for dimming background
} from "@gorhom/bottom-sheet";

import * as Clipboard from "expo-clipboard";

// Firebase Imports (using standard JS SDK)
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { db } from "@/config/firebase"; // Adjust this path to your firebase config
import { doc, setDoc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";

// Your Provided Toast Hook
import { useToast } from "@/components/Toast/useToast"; 

// Gemini AI
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { verbs } from "./Database/Verbs";
import Container from "@/components/ContainerComponent";
import { TextComponent } from "@/components/TextComponent";
import TopBarComponent from "@/components/TopBarComponent";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/constants/useTheme";
import InputComponent from "@/components/InputComponent";
import ButtonComponent from "@/components/ButtonComponent";
import { router } from "expo-router";

const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY as string;
const modelName = process.env.EXPO_PUBLIC_GEMINI_MODEL_NAME as string;


interface TicTacToeProps {
  onClose: () => void;
}

const TicTacToe: React.FC<TicTacToeProps> = ({ onClose }) => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [board, setBoard] = useState<string[]>(Array(9).fill(""));
  const [isXNext, setIsXNext] = useState(true);
  const [gameCodeInput, setGameCodeInput] = useState<string>(""); // Separate state for input
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Player");
  const [playerXId, setPlayerXId] = useState<string | null>(null);
  const [playerOId, setPlayerOId] = useState<string | null>(null);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [sentence, setSentence] = useState("");
  const [randomVerb, setRandomVerb] = useState("");
  const [loading, setLoading] = useState(false); // Loading state for AI check
  const [playerXName, setPlayerXName] = useState<string>("");
  const [playerOName, setPlayerOName] = useState<string>("");
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { showToast } = useToast();

  const sentenceSheetRef = useRef<BottomSheet>(null);
  const instructionsSheetRef = useRef<BottomSheet>(null);

  const sentenceSnapPoints = useMemo(() => ["40%"], []); // Adjust as needed
  const instructionsSnapPoints = useMemo(() => ["75%"], []); // Adjust as needed

  const openSentenceSheet = useCallback(() => {
    sentenceSheetRef.current?.snapToIndex(0); // Snap to the first point ('50%')
  }, []);

  const closeSentenceSheet = useCallback(() => {
    sentenceSheetRef.current?.close();
  }, []);

  const openInstructionsSheet = useCallback(() => {
    instructionsSheetRef.current?.snapToIndex(0); // Snap to the first point ('75%')
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1} // Disappears when closed
        appearsOnIndex={0} // Appears when first snap point is reached
        opacity={0.5} // Adjust dimming effect
      />
    ),
    []
  );

  const handleSentenceSheetChange = useCallback((index: number) => {
    if (index === -1) {
      setSelectedSquare(null);
      setSentence("");
      setLoading(false); // Ensure loading is reset
    }
  }, []);

  const handleInstructionsSheetChange = useCallback((index: number) => {
    // No specific state to reset here when instructions close, but good for debugging
  }, []);

  useEffect(() => {
    const auth = getAuth(); // Get auth instance
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setUserId(user.uid);
        setUserName(user.displayName || `Player_${user.uid.substring(0, 4)}`);
      } else {
        setCurrentUser(null);
        setUserId(null);
        setUserName("Player");
        // Handle logged out state if necessary (e.g., disable game)
        showToast("Você não está logado.", "error");
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [showToast]); // Added showToast dependency

  // --- Game Logic Functions ---

  // Function to generate a unique game ID
  const generateGameId = (): string => {
    return Math.random().toString(36).substr(2, 9);
  };

  // Select a random verb from the verbs array
  const getRandomVerb = useCallback((): string => {
    if (verbs && verbs.length > 0) {
      const randomIndex = Math.floor(Math.random() * verbs.length);
      return verbs[randomIndex];
    }
    return "play"; // Fallback verb
  }, []); // Empty dependency array as 'verbs' is static

  const fetchUserName = useCallback(
    async (pUserId: string): Promise<string> => {
      if (!pUserId) return "Unknown Player";
      try {
        // Assuming you store user profiles in a 'users' collection
        const userRef = doc(db, "users", pUserId);
        const userDoc = await getDoc(userRef);
        // Use 'name' or 'displayName' field, adjust as per your Firestore structure
        return userDoc.exists()
          ? userDoc.data()?.name ||
              userDoc.data()?.displayName ||
              "Unknown Player"
          : "Unknown Player";
      } catch (error) {
        console.error("Error fetching user name:", error);
        return "Unknown Player";
      }
    },
    []
  ); // db dependency

  // Function to create a new game
  const createGame = useCallback(async () => {
    if (!userId) {
      showToast("Você precisa estar logado para criar um jogo.", "error");
      return;
    }
    const id = generateGameId();
    const verb = getRandomVerb();
    setRandomVerb(verb);
    try {
      await setDoc(doc(db, "games", id), {
        board: Array(9).fill(""),
        isXNext: true,
        playerXId: userId,
        playerXName: userName, // Store creator's name
        playerOId: null,
        playerOName: "",
        isStarted: false,
        randomVerb: verb,
        winner: null,
        createdAt: new Date(), // Good practice to timestamp
      });
      setGameId(id); // Set gameId only after successful creation
      setGameCodeInput(id); // Pre-fill the input with the new code

      // Copy game code to clipboard
      try {
        await Clipboard.setStringAsync(id); // Use setStringAsync
        showToast(`Jogo criado! ID copiado: ${id}`, "success", 4000);
      } catch (e) {
        console.error("Failed to copy to clipboard", e);
        showToast("Falha ao copiar o ID.", "error");
      }

      setBoard(Array(9).fill(""));
      setIsXNext(true);
      setPlayerXId(userId);
      setPlayerXName(userName);
      setPlayerOId(null);
      setPlayerOName("");
      setIsGameStarted(false);
    } catch (error) {
      console.error("Error creating game:", error);
      showToast("Falha ao criar o jogo.", "error");
    }
  }, [userId, userName, getRandomVerb, showToast]); // Dependencies

  // Function to join an existing game
  const joinGame = useCallback(
    (id: string) => {
      if (!id) {
        showToast("Por favor, insira um ID de jogo.", "info");
        return;
      }
      if (!userId) {
        showToast("Você precisa estar logado para entrar em um jogo.", "error");
        return;
      }
      if (id === gameId) {
        showToast("Você já está neste jogo.", "info");
        return;
      }

      setGameId(null); // Reset current game before joining new one
      const gameRef = doc(db, "games", id);
      const unsubscribe = onSnapshot(
        gameRef,
        async (snapshot) => {
          const data = snapshot.data();
          if (snapshot.exists() && data) {
            // Only set game ID if successfully joined/listening
            setGameId(id);
            setBoard(data.board);
            setIsXNext(data.isXNext);
            setRandomVerb(data.randomVerb); // Get the random verb

            let currentPXP = data.playerXId;
            let currentPOP = data.playerOId;
            let currentPXName = data.playerXName || "";
            let currentPOName = data.playerOName || "";

            if (!currentPXP) {
              // If no player X (shouldn't happen if created correctly, but handle defensively)
              console.warn(
                "Game found with no Player X, assigning current user."
              );
              currentPXP = userId;
              currentPXName = userName;
              await updateDoc(gameRef, {
                playerXId: userId,
                playerXName: userName,
              });
            } else if (!currentPOP && currentPXP !== userId) {
              // If no player O and current user is not player X, assign as player O
              currentPOP = userId;
              currentPOName = userName;
              await updateDoc(gameRef, {
                playerOId: userId,
                playerOName: userName,
              });
            } else if (currentPXP !== userId && currentPOP !== userId) {
              // Game is full and user is not part of it
              showToast("Este jogo já está cheio.", "error");
              setGameId(null); // User can't join, reset gameId
              unsubscribe(); // Stop listening
              return; // Exit snapshot handler
            }

            setPlayerXId(currentPXP);
            setPlayerOId(currentPOP);

            if (currentPXP && !currentPXName) {
              currentPXName = await fetchUserName(currentPXP);
            }
            if (currentPOP && !currentPOName) {
              currentPOName = await fetchUserName(currentPOP);
            }
            setPlayerXName(currentPXName);
            setPlayerOName(currentPOName);

            const canStart = !!(currentPXP && currentPOP);
            setIsGameStarted(data.isStarted || canStart);

            if (canStart && !data.isStarted) {
              await updateDoc(gameRef, { isStarted: true });
              setIsGameStarted(true); // Ensure local state reflects this
              showToast("Ambos jogadores entraram. Jogo iniciado!", "success");
            } else if (data.isStarted) {
              setIsGameStarted(true); // Sync with DB if already started
            }

            const winner = checkWinner(data.board);
            if (winner) {
              // Optionally display winner message from here as well
              // showToast(`${getWinnerName(winner, currentPXName, currentPOName)} ganhou!`, 'success');
            } else if (isDraw(data.board)) {
              // showToast("Empate!", 'info');
            }
          } else {
            showToast("Jogo não encontrado.", "error");
            setGameId(null); // Reset game ID if not found
          }
        },
        (error) => {
          console.error("Error listening to game:", error);
          showToast("Erro ao conectar ao jogo.", "error");
          setGameId(null);
        }
      );
      return unsubscribe;
    },
    [userId, userName, gameId, fetchUserName, showToast]
  ); // Dependencies

  // Function to validate the sentence using AI
  const runChat = useCallback(
    async (prompt: string): Promise<"correct" | "incorrect" | "unknown"> => {
      setLoading(true);
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: modelName });

      const generationConfig = {
        temperature: 0.9,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      };

      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ];

      try {
        const chat = await model.startChat({
          generationConfig,
          safetySettings,
          history: [
            {
              role: "user",
              parts: [{ text: "HELLO" }],
            },
            {
              role: "model",
              parts: [{ text: "Hello there! How can I assist you today?" }],
            },
          ],
        });

        const instruction = `Check if a whole sentence with more than one word is provided using the verb "${randomVerb}" in the correct tense and form. The sentence must be grammatically plausible in English. If it matches all criteria return only the word "correct". If it does not match the criteria then return only the word "incorrect".`;
        const fullPrompt = `${instruction}\n\nSentence: ${prompt}`;
        const result = await chat.sendMessage(fullPrompt);
        const responseText = result.response.text().trim().toLowerCase();

        setLoading(false);

        if (responseText.includes("correct")) {
          // More robust check
          return "correct";
        } else if (responseText.includes("incorrect")) {
          // More robust check
          return "incorrect";
        } else {
          console.warn(
            "AI response not 'correct' or 'incorrect':",
            responseText
          );
          return "unknown"; // Handle unexpected AI response
        }
      } catch (error) {
        setLoading(false);
        console.error("Error during AI verification:", error);
        showToast("Erro na verificação da IA.", "error");
        return "unknown"; // Handle error case
      }
    },
    [randomVerb, showToast]
  ); // Dependencies: randomVerb, showToast

  // Function to handle player moves
  const handleMove = useCallback(async () => {
    if (selectedSquare === null || sentence.trim() === "") {
      showToast("Selecione um quadrado e escreva uma frase válida.", "info");
      return;
    }
    if (!gameId) {
      showToast("Nenhum jogo ativo.", "error");
      return;
    }
    if (board[selectedSquare] !== "") {
      showToast("Este quadrado já está ocupado.", "info", 2000, "top");
      // Keep modal open? Or close it? Decide UX.
      // setSentenceModalVisible(false);
      return;
    }
    if (checkWinner(board) || isDraw(board)) {
      showToast("O jogo já terminou.", "info", 2000, "top");
      return;
    }
    if (!isGameStarted) {
      showToast("O jogo ainda não começou. Aguarde o outro jogador.", "info", 2000, "top");
      return;
    }

    const isMyTurn =
      (isXNext && userId === playerXId) || (!isXNext && userId === playerOId);
    if (!isMyTurn) {
      showToast("Não é sua vez!", "error", 2000, "top");
      return; // Don't close modal if it's not their turn
    }

    const validationResult = await runChat(sentence);
    if (validationResult === "correct") {
      const nextVerb = getRandomVerb(); // Get the *next* verb before updating DB
      const newBoard = [...board];
      newBoard[selectedSquare] = isXNext ? "X" : "O";

      try {
        // Prepare update data
        const updateData: any = {
          board: newBoard,
          isXNext: !isXNext,
          randomVerb: nextVerb, // Update with the next verb
          lastMoveBy: userId, // Optional: track last mover
          updatedAt: new Date(), // Good practice
        };

        // Check for winner *after* making the move locally
        const winner = checkWinner(newBoard);
        if (winner) {
          updateData.winner = winner; // Add winner to the update payload
          updateData.isStarted = false; // Game ends
          showToast(
            `${getWinnerName(winner, playerXName, playerOName)} ganhou!`,
            "success",
            4000
          );
        } else if (isDraw(newBoard)) {
          updateData.winner = "draw"; // Explicitly mark draws if needed
          updateData.isStarted = false; // Game ends
          showToast("Empate!", "info");
        }

        // Update Firestore
        await updateDoc(doc(db, "games", gameId), updateData);

        // Update local state (Firestore listener will also update, but this is faster UI feedback)
        // setBoard(newBoard); // Let onSnapshot handle board updates primarily
        // setIsXNext(!isXNext); // Let onSnapshot handle turn updates
        // setRandomVerb(nextVerb); // Let onSnapshot handle verb updates

        // Close modal and clear input
        closeSentenceSheet();
        setSelectedSquare(null);
        setSentence("");
      } catch (error) {
        console.error("Error updating game state:", error);
        showToast("Erro ao registrar jogada.", "error");
      }
    } else if (validationResult === "incorrect") {
      showToast("Frase incorreta. Tente novamente.", "error");
      // Keep modal open for user to retry
    } else {
      // 'unknown' or error during check
      showToast(
        "Não foi possível verificar a frase. Tente novamente.",
        "error"
      );
      // Keep modal open
    }
  }, [
    selectedSquare,
    sentence,
    gameId,
    board,
    isGameStarted,
    isXNext,
    userId,
    playerXId,
    playerOId,
    runChat,
    getRandomVerb,
    showToast,
    playerXName,
    playerOName,
  ]); // Extensive dependencies

  // Function to check for a winner
  const checkWinner = (currentBoard: string[]): "X" | "O" | null => {
    const winningCombinations = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // Rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // Columns
      [0, 4, 8],
      [2, 4, 6], // Diagonals
    ];
    for (let combination of winningCombinations) {
      const [a, b, c] = combination;
      if (
        currentBoard[a] &&
        currentBoard[a] === currentBoard[b] &&
        currentBoard[a] === currentBoard[c]
      ) {
        return currentBoard[a] as "X" | "O";
      }
    }
    return null;
  };

  // Function to check for a draw
  const isDraw = (currentBoard: string[]): boolean => {
    return (
      currentBoard.every((cell) => cell !== "") && !checkWinner(currentBoard)
    );
  };

  // Get Winner Name Helper
  const getWinnerName = (
    winnerMark: "X" | "O" | null | "draw",
    pXName: string,
    pOName: string
  ): string => {
    if (winnerMark === "X") return pXName || "Jogador X";
    if (winnerMark === "O") return pOName || "Jogador O";
    return "";
  };

  // Function to render each square of the Tic Tac Toe board
  const renderSquare = (index: number) => {
    const isDisabled =
      board[index] !== "" ||
      !!checkWinner(board) ||
      isDraw(board) ||
      !isGameStarted;
    const isMyTurn =
      (isXNext && userId === playerXId) || (!isXNext && userId === playerOId);

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.square,
          isDisabled ? styles.squareDisabled : null,
          { backgroundColor: colors.cards.primary },
        ]}
        disabled={isDisabled || !isMyTurn} // Disable if filled, game over, not started, or not my turn
        onPress={() => {
          if (!userId) {
            showToast("Faça login para jogar.", "error", 2000, "top");
            return;
          }
          if (!isGameStarted) {
            showToast("Aguarde o início do jogo.", "info", 2000, "top");
            return;
          }
          if (!isMyTurn) {
            showToast("Não é sua vez.", "error", 2000, "top");
            return;
          }
          // Only open modal if it's a valid move attempt
          setSelectedSquare(index);
          openSentenceSheet();
          setSentence(""); // Clear previous sentence
        }}
      >
        <Text style={styles.squareText}>{board[index]}</Text>
      </TouchableOpacity>
    );
  };

  // Determine status text
  const getStatusText = () => {
    const winnerMark = checkWinner(board);
    if (winnerMark) {
      return `Fim de Jogo! ${getWinnerName(
        winnerMark,
        playerXName,
        playerOName
      )} ganhou!`;
    }
    if (isDraw(board)) {
      return "Empate!";
    }
    if (!gameId || !isGameStarted) {
      return "Aguardando jogadores...";
    }
    return `Vez de: ${
      isXNext ? playerXName || "Jogador X" : playerOName || "Jogador O"
    }`;
  };

  const handleBack = () => {
    router.back();  
  };

  return (
    <Container>
      <TopBarComponent
        title="Tic Tac Toe"
        leftIcon={
          <Ionicons
            onPress={handleBack}
            name="arrow-back"
            size={28}
            color={colors.text.primary}
          />
        }
        rightIcon={
          <Ionicons
            name="information-circle-outline"
            size={24}
            color={colors.text.primary}
            onPress={openInstructionsSheet}
          />
        }
      />
      <View style={styles.container}>
        <TextComponent
          weight="bold"
          size="xLarge"
          style={[styles.statusText, { color: colors.text.primary }]}
        >
          {getStatusText()}
        </TextComponent>

        

        {/* Game Controls */}
        <View style={styles.controlsContainer}>
        {!gameId ? (
          <>
            <TextComponent size="small" weight="bold" style={styles.infoHint}>
              {gameId ? `ID do Jogo: ${gameId}` : "Crie ou entre em um jogo."}
            </TextComponent>
            <InputComponent
              placeholder="Cole o ID do jogo aqui"
              value={gameCodeInput}
              onChangeText={setGameCodeInput}
              maxLength={15}
              editable={!gameId}
            />
            <View style={styles.buttonRow}>
              <ButtonComponent
                title="Entrar no Jogo"
                onPress={() => joinGame(gameCodeInput.trim())}
                disabled={!!gameId} // Disable if already in a game
                color="indigo"
              />
              <ButtonComponent
                title="Criar Jogo"
                onPress={createGame}
                disabled={!!gameId} // Disable if already in a game
                color="teal"
              />
            </View>
          </>
          ) : (
          <View>
            {/* Game Board */}
            <View
              style={[styles.board, { backgroundColor: colors.cards.primary }]}
            >
              {board.map((_, index) => renderSquare(index))}
            </View>
            <ButtonComponent
                title="Sair do Jogo"
                onPress={() => {
                  // Reset game state
                  setGameId(null);
                  setGameCodeInput("");
                  setBoard(Array(9).fill(""));
                  setIsGameStarted(false);
                  setPlayerXId(null);
                  setPlayerOId(null);
                  setPlayerXName("");
                  setPlayerOName("");
                  showToast("Você saiu do jogo.", "info");
                }}
                color="teal"
                style={{ position: "relative", bottom: -200 }}
              />
            </View>
          )}
        </View>

        <BottomSheet
          ref={sentenceSheetRef}
          index={-1}
          snapPoints={sentenceSnapPoints}
          onChange={handleSentenceSheetChange}
          enablePanDownToClose={true}
          backdropComponent={renderBackdrop}
          handleIndicatorStyle={{
            backgroundColor: colors.colors.teal,
            width: 65,
          }}
          backgroundStyle={{
            backgroundColor: colors.background.primary,
          }}
        >
          <BottomSheetView style={styles.bottomSheetContentContainer}>
            <TextComponent style={[styles.modalTitle, { color: colors.text.primary }]}>
              Escreva uma frase com:{" "}
              <TextComponent
                weight="bold"
                size="large"
                style={{ color: colors.text.primary }}
              >
                {randomVerb}
              </TextComponent>
            </TextComponent>
            <BottomSheetTextInput
              placeholder="Escreva sua frase aqui..."
              value={sentence}
              onChangeText={setSentence}
              editable={!loading}
            />
            <View style={styles.modalButtonRow}>
              <ButtonComponent
                title="Cancelar"
                onPress={closeSentenceSheet} // Use handler to close
                disabled={loading}
                color="teal"
              />
              <ButtonComponent
                title={
                  loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <TextComponent
                      weight="bold"
                      size="medium"
                      color={colors.text.primary}
                    >
                      Checar
                    </TextComponent>
                  )
                }
                onPress={handleMove}
                disabled={loading}
                color="teal"
              />
            </View>
          </BottomSheetView>
        </BottomSheet>

        <BottomSheet
          ref={instructionsSheetRef}
          index={-1} // Start closed
          snapPoints={instructionsSnapPoints}
          onChange={handleInstructionsSheetChange}
          enablePanDownToClose={true}
          backdropComponent={renderBackdrop}
          // Apply theme background
          handleIndicatorStyle={{
            backgroundColor: colors.colors.teal,
            width: 65,
          }}
          backgroundStyle={{
            backgroundColor: colors.background.primary,
          }}
        >
          {/* Use BottomSheetScrollView for scrollable content */}
          <BottomSheetScrollView
            contentContainerStyle={styles.bottomSheetContentContainer}
          >
            <TextComponent
              weight="bold"
              size="large"
              style={[styles.modalTitle, { color: colors.text.primary }]}
            >
              Instruções
            </TextComponent>
            <TextComponent
              weight="bold"
              size="medium"
              style={[{ color: colors.text.primary }]}
            >
              Como Jogar:
            </TextComponent>
            <TextComponent style={[{ color: colors.text.primary }]}>
              1. <TextComponent weight="bold">Criar Jogo:</TextComponent> Clique
              em "Criar Jogo". O ID será copiado. Compartilhe com seu amigo.
            </TextComponent>
            <TextComponent style={[{ color: colors.text.primary }]}>
              2. <TextComponent weight="bold">Entrar Jogo:</TextComponent> Cole
              o ID recebido no campo e clique "Entrar no Jogo".
            </TextComponent>
            <TextComponent style={[{ color: colors.text.primary }]}>
              3. <TextComponent weight="bold">Jogar:</TextComponent> Quando for
              sua vez, clique em um quadrado vazio.
            </TextComponent>
            <TextComponent style={[{ color: colors.text.primary }]}>
              4. <TextComponent weight="bold">Frase:</TextComponent> Uma janela
              aparecerá. Escreva uma frase *em inglês* usando o verbo indicado.
            </TextComponent>
            <TextComponent style={[{ color: colors.text.primary }]}>
              5. <TextComponent weight="bold">Checar:</TextComponent> Clique
              "Checar". Se a frase estiver correta (gramática e verbo), sua
              marca ('X' ou 'O') aparecerá. Se incorreta, tente de novo.
            </TextComponent>
            <TextComponent style={[{ color: colors.text.primary }]}>
              6. <TextComponent weight="bold">Ganhar:</TextComponent> Faça uma
              linha de 3 (horizontal, vertical ou diagonal).
            </TextComponent>
            <TextComponent style={[{ color: colors.text.primary }]}>
              7. <TextComponent weight="bold">Empate:</TextComponent> Se todos
              os quadrados forem preenchidos sem um vencedor.
            </TextComponent>
            <TextComponent style={[{ color: colors.text.primary }]}>
              8. <TextComponent weight="bold">Sair:</TextComponent> Clique "Sair
              do Jogo" para terminar a partida atual.
            </TextComponent>

            <View style={{ height: 50 }} />
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </Container>
  );
};

// --- Styles ---
const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flexGrow: 1, // Allows scrolling if content exceeds screen height
    alignItems: "center",
    padding: 20,
  },
  statusText: {
    textAlign: "center",
    marginBottom: 24,
  },
  infoButton: {
    backgroundColor: colors.colors.indigo,
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  infoButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  board: {
    width: 300, // Adjust size as needed
    height: 300, // Adjust size as needed
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  square: {
    width: "33.33%", // 1/3 of the board width
    height: "33.33%", // 1/3 of the board height
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  squareDisabled: {
    backgroundColor: colors.background.list, // Slightly different background for disabled squares
  },
  squareText: {
    fontSize: 40, // Large X and O
    fontWeight: "bold",
    color: colors.text.primary,
  },
  controlsContainer: {
    marginTop: 20,
    width: "90%",
    alignItems: "center",
    gap: 10,
  },
  infoHint: {
    marginBottom: 5,
    textAlign: "center",
    paddingHorizontal: 10, // Prevent text touching edges
  },
  input: {
    width: "100%",
    height: 45,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 15,
    marginBottom: 10,
    backgroundColor: colors.background.list,
    color: colors.text.primary, // Text color inside input
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around", // Distribute buttons evenly
    width: "100%",
    marginBottom: 10,
  },
  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)", // Darker overlay
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheetContentContainer: {
    padding: 20,
    flex: 1, // Allow content to expand, important for KAV
    gap: 6,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: "center",
  },
  modalInput: {
    marginBottom: 20, // More space below input in modal
    width: "100%", // Input takes full width of modal content area
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
});

export default TicTacToe;
