import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { auth, db } from "@/config/firebase"; // Adjust path as needed
import { onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { useNavigation } from "@react-navigation/native"; // Assuming you use react-navigation
import Clipboard from "expo-clipboard"; // For clipboard functionality
import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetView,
} from "@gorhom/bottom-sheet";

import { useToast } from "@/components/Toast/useToast"; // Adjust path as needed
import { useTheme } from "@/constants/useTheme"; // Adjust path as needed
import { fetchUserData } from "@/hooks/fetchUserData"; // Adjust path as needed

//We won't implement import CriarJogo from '@/components/Games/Vocabulary/Components/CriarJogo';

import words_options from "@/app/screens/Games/Vocabulary/Database/options.json";
import ShowGames from "@/app/screens/Games/Vocabulary/Components/ShowGames";
import TopBarComponent from "@/components/TopBarComponent";
import { Ionicons } from "@expo/vector-icons";
import Container from "@/components/ContainerComponent";
import InputComponent from "@/components/InputComponent";
import ButtonComponent from "@/components/ButtonComponent";
import { TextComponent } from "@/components/TextComponent";

type VocabularyNavigationProp = {
  navigate: (screen: string, params?: object) => void;
};

interface VocabularyProps {
  onClose: () => void;
}

export default function Vocabulary({ onClose }: VocabularyProps) {
  const { colors } = useTheme();

  const { showToast } = useToast();
  const navigation = useNavigation<VocabularyNavigationProp>(); // Hook for navigation

  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false); // For Firestore operations
  const [gameId, setGameId] = useState<string | null>(null); // ID of the game *created* by this user
  const [joinGameCode, setJoinGameCode] = useState("");
  const [availableGames, setAvailableGames] = useState<any[]>([]); // Games available to base a new game on
  const [isModalOpen, setIsModalOpen] = useState(false);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["80%"], []);

  // --- Authentication ---
  useEffect(() => {
    setIsLoadingAuth(true);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userData = await fetchUserData(currentUser.uid);
          setUserRole(userData?.role || null);
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole(null);
          showToast("Erro ao buscar dados do usuário.", "error");
        }
      } else {
        setUserRole(null); // No user logged in
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe(); // Cleanup subscription
  }, [showToast]);

  const userId = user?.uid || "";

  // --- Game Logic Functions ---
  const generateGameId = () => {
    // Simple random ID generator
    return Math.random().toString(36).substring(2, 11); // 9 chars
  };

  const fetchAvailableGames = useCallback(async () => {
    setIsLoadingData(true);
    try {
      // Fetching games from 'VocabularyGame' collection (templates to create from)
      const querySnapshot = await getDocs(collection(db, "VocabularyGame"));
      const games = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAvailableGames(games);
    } catch (error) {
      console.error("Error fetching available games:", error);
      showToast("Erro ao carregar jogos disponíveis.", "error");
      setAvailableGames([]); // Clear games on error
    } finally {
      setIsLoadingData(false);
    }
  }, [showToast]);

  const openModal = () => {
    fetchAvailableGames(); // Fetch games when opening the modal
    bottomSheetRef.current?.snapToIndex(0);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    bottomSheetRef.current?.close();
    setIsModalOpen(false);
  };

  // Use externalOptions to generate options in open-the-box mode
  const generateOpenTheBoxMode = (vocabularyData: any[]) => {
    return vocabularyData.map((item) => {
      const correctOption = item.vocab.toLowerCase();
      const randomOptions = words_options.filter(
        (word: string) => word.toLowerCase() !== correctOption
      );
      const shuffledOptions = [
        correctOption,
        ...randomOptions.sort(() => 0.5 - Math.random()).slice(0, 2), // Get 2 random wrong options
      ].sort(() => 0.5 - Math.random()); // Shuffle correct + wrong

      return {
        imageURL: item.imageURL,
        vocab: correctOption, // Store the correct answer
        options: shuffledOptions, // Store the shuffled options
        clickedOption: null,
        isCorrect: null,
      };
    });
  };

  // Use externalOptions to generate options in what-is-image mode
  const generateWhatIsImageMode = (vocabularyData: any[]) => {
    return vocabularyData.map((item) => {
      const correctOption = item.vocab.toLowerCase();
      const randomOptions = words_options.filter(
        (word: string) => word.toLowerCase() !== correctOption
      );
      const shuffledOptions = [
        correctOption,
        ...randomOptions.sort(() => 0.5 - Math.random()).slice(0, 2),
      ].sort(() => 0.5 - Math.random());

      return {
        imageURL: item.imageURL,
        vocab: correctOption, // The word corresponding to the image
        options: shuffledOptions, // Options to display
        clickedOption: null,
        isCorrect: null,
        isGuess: null, // Or needs clarification on its purpose in RN context
      };
    });
  };

  const createGame = async (vocabGameId: string) => {
    if (!userId) {
      showToast("Você precisa estar logado para criar um jogo.", "error");
      return;
    }
    setIsLoadingData(true);
    const newGameId = generateGameId();

    try {
      // 1. Fetch the VocabularyGame template data
      const vocabGameRef = doc(db, "VocabularyGame", vocabGameId);
      const vocabGameSnapshot = await getDoc(vocabGameRef);

      if (!vocabGameSnapshot.exists()) {
        showToast("Jogo de vocabulário base não encontrado.", "error");
        setIsLoadingData(false);
        return;
      }

      const vocabGameData = vocabGameSnapshot.data();
      const vocabularyData = vocabGameData?.vocabularies || []; // Array of { vocab: 'word', imageURL: '...' }

      if (!Array.isArray(vocabularyData) || vocabularyData.length === 0) {
        showToast("Dados de vocabulário inválidos no jogo base.", "error");
        setIsLoadingData(false);
        return;
      }

      // 2. Create the new game document in 'games' collection
      const gameDocRef = doc(db, "games", newGameId);
      await setDoc(gameDocRef, {
        creatorId: userId,
        createdAt: serverTimestamp(), // Use server timestamp
        players: [userId], // Start with the creator
        status: "waiting", // Initial status
        gameMode: "", // Maybe set later or based on selection?
        VocabularyGameID: vocabGameId, // Link to the template game used
        gameName: vocabGameData?.name || "Vocabulary Game", // Use template name or default
      });

      // 3. Create sub-collections for different modes within the new game
      const modesColRef = collection(db, "games", newGameId, "modes");

      // Create the 'anagram' mode
      await setDoc(doc(modesColRef, "anagram"), {
        vocabularydata: vocabularyData, // Direct copy for anagram? Needs review based on anagram logic.
      });

      // Create the 'openthebox' mode
      const opentheboxData = generateOpenTheBoxMode(vocabularyData);
      await setDoc(doc(modesColRef, "openthebox"), {
        vocabularydata: opentheboxData,
        // Add other mode-specific state if needed (e.g., score, currentIndex)
      });

      // Create the 'whatisimage' mode
      const whatisimageData = generateWhatIsImageMode(vocabularyData);
      await setDoc(doc(modesColRef, "whatisimage"), {
        currentIndex: 0,
        score: 0,
        vocabularydata: whatisimageData,
      });

      setGameId(newGameId); // Store the ID of the created game locally if needed
      closeModal(); // Close the modal after selection

      // Copy to clipboard
      Clipboard.setString(newGameId);
      showToast(`Jogo criado! Código copiado: ${newGameId}`, "success");

      // Optional: Navigate to the created game lobby/waiting screen immediately
      // navigation.navigate('JogandoScreen', { gameID: newGameId });
    } catch (error) {
      console.error("Error creating game:", error);
      showToast("Erro ao criar o jogo. Tente novamente.", "error");
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleJoinGame = async () => {
    if (!userId) {
      showToast("Você precisa estar logado para entrar em um jogo.", "error");
      return;
    }
    if (!joinGameCode.trim()) {
      showToast("Por favor, insira um código de jogo.", "error");
      return;
    }
    setIsLoadingData(true);
    const gameCodeToJoin = joinGameCode.trim();

    try {
      const gameRef = doc(db, "games", gameCodeToJoin);
      const gameSnapshot = await getDoc(gameRef);

      if (!gameSnapshot.exists()) {
        showToast("Jogo não encontrado.", "error");
        setIsLoadingData(false);
        return;
      }

      const gameData = gameSnapshot.data();
      const players = gameData.players || [];

      if (players.includes(userId)) {
        // Already in the game, navigate directly
        showToast("Você já está no jogo.", "info");
        navigation.navigate("JogandoScreen", { gameID: gameCodeToJoin }); // Adjust screen name
      } else {
        // Add the current user to the players array
        await updateDoc(gameRef, {
          players: arrayUnion(userId), // Atomically add user ID
        });
        showToast("Você entrou no jogo com sucesso!", "success");
        navigation.navigate("JogandoScreen", { gameID: gameCodeToJoin }); // Adjust screen name
      }
      setJoinGameCode(""); // Clear input after joining
    } catch (error) {
      console.error("Error joining game:", error);
      showToast(
        "Erro ao entrar no jogo. Verifique o código e tente novamente.",
        "error"
      );
    } finally {
      setIsLoadingData(false);
    }
  };

  // --- Render ---
  const getStyles = (colors: any) => StyleSheet.create({
    inputContainer: {
      marginHorizontal: 40,
      gap: 20,
    },
    buttonRow: {
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },
    buttonConfirm: {
      backgroundColor: colors.colors.teal, // Example color
    },
    buttonOrange: {
      backgroundColor: colors.colors.amber, // Example color
    },
    buttonGray: {
      backgroundColor: colors.colors.black, // Example color
    },
    buttonText: {
      color: colors.colors.white, // White text usually works well
      fontSize: 16,
      fontWeight: "bold",
    },
    buttonTextGray: {
      color: colors.colors.black, // Darker text for gray button
      fontSize: 16,
      fontWeight: "bold",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)", // Semi-transparent background
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: colors.cardBackground, // Use theme color
      borderRadius: 10,
      padding: 20,
      width: "90%",
      maxHeight: "80%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text, // Use theme color
      marginBottom: 15,
      textAlign: "center",
    },
    gameItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: colors.cardBackgroundSecodary, // Use theme color
      borderRadius: 6,
      marginBottom: 10,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
    },
    activityIndicator: {
      marginVertical: 20, // Add some space around indicators
    },
    bottomSheetContent: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    bottomSheetTitle: {
      textAlign: "center",
      marginBottom: 15,
    },
    selectButton: {
      minWidth: 100,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
    },
  });
  
  const styles = getStyles(colors);

  if (isLoadingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.text.secondary} />
        <Text style={{ color: colors.text.primary, marginTop: 10 }}>
          Verificando autenticação...
        </Text>
      </View>
    );
  }

  const handleBack = () => {
    onClose();
  };

  const openInstructionsSheet = () => {
    console.log("openInstructionsSheet");
  };

  
  return (
    <Container>
      <TopBarComponent
        title="Vocabulary"
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
            name="help-circle-outline"
            size={24}
            color={colors.text.primary}
            onPress={openInstructionsSheet}
          />
        }
      />

      {/* Join Game Section */}
      <View style={styles.inputContainer}>
        <InputComponent
          placeholder="Coloque o ID da sala aqui"
          placeholderTextColor={colors.text.secondary} // Use theme color
          value={joinGameCode}
          onChangeText={setJoinGameCode}
          autoCapitalize="none"
        />
        <View style={styles.buttonRow}>
          <ButtonComponent
            onPress={handleJoinGame}
            disabled={isLoadingData}
            title={
              isLoadingData && joinGameCode ? (
                <ActivityIndicator color={colors.colors.teal} />
              ) : (
                "Entrar na Sala"
              )
            }
          />

          <TextComponent weight="bold" size="medium">
            ou
          </TextComponent>

          <ButtonComponent
            onPress={openModal}
            disabled={isLoadingData}
            title="Criar uma Sala"
            color="amber"
          />
        </View>
      </View>

      {/* Show Existing/Public Games (Placeholder) */}
      <ShowGames />

      {/* Bottom Sheet for Game Selection */}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={-1}
        enablePanDownToClose={true}
        onChange={(index) => {
          if (index === -1) {
            setIsModalOpen(false);
          }
        }}
        handleIndicatorStyle={{
          backgroundColor: colors.colors.indigo,
          width: 65,
        }}
        backgroundStyle={{
          backgroundColor: colors.cards.primary,
        }}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <TextComponent
            weight="bold"
            size="large"
            style={styles.bottomSheetTitle}
          >
            Escolha um tema
          </TextComponent>
          {isLoadingData && !availableGames.length ? (
            <ActivityIndicator
              style={styles.activityIndicator}
              size="large"
              color={colors.text.secondary}
            />
          ) : (
            <BottomSheetFlatList
              data={availableGames}
              keyExtractor={(item) => item.id}
              renderItem={({ item: game }) => (
                <View style={styles.gameItem}>
                  <TextComponent weight="bold" size="medium" numberOfLines={1}>
                    {game.name || game.id}
                  </TextComponent>
                  <ButtonComponent
                    onPress={() => createGame(game.id)}
                    disabled={isLoadingData}
                    title={
                      isLoadingData ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.colors.white}
                        />
                      ) : (
                        "Selecionar"
                      )
                    }
                  />
                </View>
              )}
              ListEmptyComponent={
                <TextComponent
                  weight="bold"
                  size="medium"
                  style={{
                    color: colors.text.secondary,
                    textAlign: "center",
                    marginTop: 20,
                  }}
                >
                  Nenhum tema disponível.
                </TextComponent>
              }
            />
          )}
        </BottomSheetView>
      </BottomSheet>
    </Container>
  );
}
