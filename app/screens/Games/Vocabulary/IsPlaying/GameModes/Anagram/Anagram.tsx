import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  FadeIn,
  CurvedTransition,
  Easing,
  LinearTransition,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import { db } from '@/config/firebase'; // Import Firebase db instance
import { doc, getDoc } from 'firebase/firestore'; // Import Firestore functions
import { useLocalSearchParams, router } from 'expo-router'; // Keep imports

import { useTheme } from '@/constants/useTheme';
import { TextComponent } from '@/components/TextComponent';
import { useToast } from '@/components/Toast/useToast';
import { VocabularyItem } from '@/types'; // Keep type import
import Container from '@/components/ContainerComponent'; // Keep Container

// --- Animated Components --- (Keep)
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedImage = Animated.createAnimatedComponent(Image);

interface PersistedAnagramState {
    currentIndex: number;
    currentWordBlankSpaces: string[]; // State of blanks for the current word
    currentWordIsCompleted: boolean; // Completion status of the current word
    gameFinished: boolean; // Overall game status
    fetchedVocabulary: VocabularyItem[]; // The original list from Firestore
}

// --- Component ---
const Anagram: React.FC = () => {
  // --- Hooks ---
  const { colors } = useTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams();
  const gameID = params.gameID as string; // Get gameID from navigation parameters

  // --- Core Persisted State (or reflects it) ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentWordBlankSpaces, setCurrentWordBlankSpaces] = useState<string[]>([]);
  const [currentWordIsCompleted, setCurrentWordIsCompleted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const fetchedVocabRef = useRef<VocabularyItem[]>([]); // Stores the fetched vocabulary list

  // --- Derived/Transient State (Not directly persisted) ---
  const [currentWord, setCurrentWord] = useState<string>(''); // The correct word string
  const [currentImageURL, setCurrentImageURL] = useState<string | undefined>('');
  const [scrambledWord, setScrambledWord] = useState<string[]>([]); // Scrambled letters for display
  const [wordsLeft, setWordsLeft] = useState<number>(0); // UI display count

  // --- Loading/Error State ---
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Animation ---
  const imageOpacity = useSharedValue(0);

  // --- Memoized Values ---
  const storageKey = useMemo(() => gameID ? `anagram_gameState_${gameID}` : null, [gameID]);

   const isValidPersistedState = (data: any): data is PersistedAnagramState => {
        return data && typeof data === 'object' &&
               typeof data.currentIndex === 'number' &&
               Array.isArray(data.currentWordBlankSpaces) &&
               typeof data.currentWordIsCompleted === 'boolean' &&
               typeof data.gameFinished === 'boolean' &&
               Array.isArray(data.fetchedVocabulary) &&
               (data.fetchedVocabulary.length === 0 || typeof data.fetchedVocabulary[0]?.vocab === 'string'); // Basic structure check
    };

  // Scramble word function (remains the same)
  const scrambleWordLocally = (word: string): string[] => {
    if (!word) return [];
    // Prevent single-letter words from being predictable
    const letters = word.toUpperCase().split('');
    if (letters.length <= 1) return letters;
    // Simple shuffle
    return letters.sort(() => Math.random() - 0.5);
  };

  // Initialize state for a specific word index
  const initializeWordState = useCallback((
    vocabSource: VocabularyItem[],
    index: number,
    // Optional params to restore state for this specific word
    initialBlanks?: string[],
    initialCompletion?: boolean
  ) => {
      if (!vocabSource || vocabSource.length <= index) {
          // This means we've gone past the end or the list is empty
          setGameFinished(true); // Mark game as finished
          setWordsLeft(0);
          setCurrentWord('');
          setCurrentImageURL(undefined);
          setScrambledWord([]);
          setCurrentWordBlankSpaces([]);
          setCurrentWordIsCompleted(true); // Mark as "done"
          console.log("Anagram: Fim do jogo ou índice inválido.");
          return; // Stop initialization
      }

      const currentItem = vocabSource[index];
      if (!currentItem?.vocab) {
           setError(`Erro: Item inválido no índice ${index}.`);
           setGameFinished(true); // Stop game on bad data
           return;
      }

      const word = currentItem.vocab.toUpperCase();
      const scrambled = scrambleWordLocally(word);
      const defaultBlanks = Array(word.length).fill('');

      setCurrentIndex(index); // Set core state
      setCurrentWord(word); // Set derived state
      setCurrentImageURL(currentItem.imageURL); // Set derived state
      setScrambledWord(scrambled); // Set derived state

      // Set core state: Use restoration params if provided, otherwise defaults
      setCurrentWordBlankSpaces(initialBlanks ?? defaultBlanks);
      setCurrentWordIsCompleted(initialCompletion ?? false);

      setGameFinished(false); // Ensure game isn't finished when starting a word
      setWordsLeft(vocabSource.length - index); // Update UI counter

      // Trigger image fade-in animation
      imageOpacity.value = 0;
      imageOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));

  }, [imageOpacity]); // Depends on animation shared value


  // --- Effect 1: Load Initial Game State ---
  useEffect(() => {
    const loadGame = async () => {
        if (!gameID) { setError("ID do jogo não fornecido."); setIsLoading(false); return; }
        if (!storageKey) { setError("Chave de armazenamento inválida."); setIsLoading(false); return; }

        console.log(`Anagram: Tentando carregar jogo ID: ${gameID}`);
        setIsLoading(true); setError(null);

        try {
            // 1. Try AsyncStorage
            const savedJSON = await AsyncStorage.getItem(storageKey);
            if (savedJSON) {
                const savedState = JSON.parse(savedJSON);
                if (isValidPersistedState(savedState)) {
                    console.log(`Anagram: Jogo ${gameID} carregado do AsyncStorage.`);
                    // Restore data and state
                    fetchedVocabRef.current = savedState.fetchedVocabulary;
                    setGameFinished(savedState.gameFinished);
                    // Initialize the UI based on the loaded state
                    initializeWordState(
                        savedState.fetchedVocabulary,
                        savedState.currentIndex,
                        savedState.currentWordBlankSpaces,
                        savedState.currentWordIsCompleted
                    );
                    setIsLoading(false); // Finish loading
                    return; // Exit successfully
                } else {
                    console.warn(`Anagram: Dados inválidos no AsyncStorage para ${gameID}. Removendo.`);
                    await AsyncStorage.removeItem(storageKey);
                }
            }

            // 2. Fetch from Firestore if not loaded
            console.log(`Anagram: Buscando ${gameID} do Firestore...`);
            // Assume gameID is the VocabularyGame document ID
            const vocabDocRef = doc(db, 'VocabularyGame', gameID);
            const vocabDocSnap = await getDoc(vocabDocRef);

            if (!vocabDocSnap.exists()) throw new Error(`Jogo ${gameID} não encontrado no Firestore.`);

            const vocabData = vocabDocSnap.data();
            const fetchedVocabularies = vocabData?.vocabularies;

            if (!fetchedVocabularies || !Array.isArray(fetchedVocabularies) || fetchedVocabularies.length === 0) {
                 throw new Error(`Lista de vocabulário (ID: ${gameID}) inválida ou vazia.`);
            }

            fetchedVocabRef.current = fetchedVocabularies;
            initializeWordState(fetchedVocabularies, 0);
            
            setIsLoading(false); // Finish loading

        } catch (err: any) {
            console.error(`Anagram: Erro ao carregar/inicializar ${gameID}:`, err);
            setError(`Falha ao carregar: ${err.message || 'Erro desconhecido'}`);
            setIsLoading(false);
        }
    };
    loadGame();
  }, [gameID, storageKey, initializeWordState]); // Dependencies

  useEffect(() => {
    const saveState = async () => {
        if (!isLoading && !error && storageKey && fetchedVocabRef.current.length > 0) {
            const stateToSave: PersistedAnagramState = {
                currentIndex,
                currentWordBlankSpaces,
                currentWordIsCompleted,
                gameFinished,
                fetchedVocabulary: fetchedVocabRef.current
            };
             try {
                await AsyncStorage.setItem(storageKey, JSON.stringify(stateToSave));
             } catch (err) {
                 console.error(`Anagram: Error saving state ${gameID}:`, err);
             }
        }
    };
    // Run save after loading is complete and core state changes
    if (!isLoading) {
        saveState();
    }
  }, [
      currentIndex, currentWordBlankSpaces, currentWordIsCompleted, gameFinished, // Core state
      isLoading, error, storageKey // Status and identifiers
  ]);

  const handleLetterClick = useCallback((letter: string, letterIndex: number) => {
    if (currentWordIsCompleted || gameFinished) return; // Prevent action if word/game finished

    // Find the first empty slot in the blanks
    const firstEmptyIndex = currentWordBlankSpaces.findIndex(space => space === '');

    if (firstEmptyIndex !== -1) { // If an empty slot exists
        // Update blanks
        const newBlanks = [...currentWordBlankSpaces];
        newBlanks[firstEmptyIndex] = letter;
        setCurrentWordBlankSpaces(newBlanks); // Update Core State

        // Check if the word is now complete
        const wordIsNowComplete = newBlanks.join('') === currentWord;
        if (wordIsNowComplete) {
            setCurrentWordIsCompleted(true); // Update Core State
            showToast("Boa! Palavra correta!", "success", 1500, 'bottom');
        }
    }
  }, [currentWordBlankSpaces, currentWord, currentWordIsCompleted, gameFinished, showToast]); // Dependencies


  const handlePlacedLetterClick = useCallback((indexToRemove: number) => {
    // Allow removing letters only if the word isn't marked as completed yet
    if (currentWordIsCompleted || gameFinished) return;

    const letterToRemove = currentWordBlankSpaces[indexToRemove];
    if (letterToRemove) { // Only proceed if there's a letter to remove
        const newBlanks = [...currentWordBlankSpaces];
        newBlanks[indexToRemove] = ''; // Clear the slot
        setCurrentWordBlankSpaces(newBlanks); // Update Core State
        setCurrentWordIsCompleted(false);
    }
  }, [currentWordBlankSpaces, currentWordIsCompleted, gameFinished]); // Dependencies


  const moveToNextWord = useCallback(() => {
      if (gameFinished) return; 

      const nextIndex = currentIndex + 1;
      const vocabularyList = fetchedVocabRef.current;

      if (nextIndex >= vocabularyList.length) {
           setGameFinished(true); 
      } else {
           initializeWordState(vocabularyList, nextIndex);
      }
  }, [currentIndex, gameFinished, initializeWordState]);


  const handleResetGame = useCallback(() => {
    const vocabularyList = fetchedVocabRef.current;
    if (vocabularyList.length > 0) {
        setGameFinished(false);
        initializeWordState(vocabularyList, 0);
        showToast("Jogo reiniciado!", "success");
    } else {
        setError("Não é possível reiniciar: lista de vocabulário não encontrada.");
    }
  }, [showToast, initializeWordState]); // Dependencies

  const animatedImageStyle = useAnimatedStyle(() => ({ opacity: imageOpacity.value }));

  // Style for blank letter boxes based on state
  const getBlankStyle = (letter: string) => {
      const isCorrect = currentWordIsCompleted; 
      let backgroundColor = colors.background.list; // Default background
      let borderColor = colors.background.list;   // Default border

      if (letter) { // If the slot has a letter
          backgroundColor = colors.background.listSecondary; // Filled background
          borderColor = colors.background.listSecondary;     // Filled border
      }
      if (isCorrect) { // If the whole word is correct
          backgroundColor = colors.colors.tealLight;    // Correct background
          borderColor = colors.colors.tealLight;      // Correct border
      }

      return { backgroundColor, borderColor };
  };

  if (isLoading) { 
     return ( <Container style={styles.centerContainer}><ActivityIndicator size="large" color={colors.text.primary} /><TextComponent style={{ marginTop: 10, color: colors.text.primary }}>Carregando Anagrama...</TextComponent></Container> );
  }
  if (error) {
      return ( <Container style={styles.centerContainer}><TextComponent weight="semibold" style={[styles.errorText, { color: colors.text.primary }]}>Erro no Anagrama</TextComponent><TextComponent style={[styles.errorText, { color: colors.text.secondary, textAlign: 'center' }]}>{error}</TextComponent><TouchableOpacity onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.cards.secondary, marginTop: 20 }]}><TextComponent weight='bold' style={{ color: colors.text.primary }}>Voltar</TextComponent></TouchableOpacity></Container> );
  }
  if (!isLoading && !gameFinished && !currentWord && fetchedVocabRef.current.length > 0) {
       return ( <Container style={styles.centerContainer}><TextComponent style={{color: colors.text.primary}}>Erro inesperado ao configurar palavra.</TextComponent><TouchableOpacity onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.cards.secondary, marginTop: 20 }]}><TextComponent weight='bold' style={{ color: colors.text.primary }}>Voltar</TextComponent></TouchableOpacity></Container> );
  }

  return (
    <Container style={{ flex: 1 }}>
       <View style={styles.centerContainer}>
          {!gameFinished ? (
            <Animated.View layout={LinearTransition.springify()}>
              <View style={styles.header}>
                <TextComponent weight='bold' style={{ color: colors.text.secondary }}>
                   Falta{wordsLeft !== 1 ? 'm' : ''} {wordsLeft} palavra{wordsLeft !== 1 ? 's' : ''}!
                </TextComponent>
              </View>

              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Animated.View  style={styles.imageContainer} layout={CurvedTransition.easingY(Easing.elastic(1)).duration(500)}>
                {currentImageURL ? (
                  <AnimatedImage
                    key={currentImageURL + currentIndex}
                    source={{ uri: currentImageURL }}
                    style={[styles.image, animatedImageStyle]}
                    resizeMode="contain"
                  />
                ) : (
                   <View style={[styles.imagePlaceholder, { backgroundColor: colors.cards.secondary }]}>
                     <TextComponent style={{color: colors.text.secondary}}>Sem Imagem</TextComponent>
                  </View>
                )}
              </Animated.View >

              <Animated.View style={styles.letterContainer} layout={CurvedTransition.easingY(Easing.elastic(1)).duration(500)}>
                {currentWordBlankSpaces.map((letter, index) => ( 
                  <AnimatedTouchable
                    key={`blank-${currentIndex}-${index}`} 
                    style={[styles.letterBox, styles.blankBox, getBlankStyle(letter)]}
                    onPress={() => handlePlacedLetterClick(index)}
                    disabled={currentWordIsCompleted || gameFinished} 
                    layout={LinearTransition.springify()}
                    entering={FadeIn.duration(300).delay(index * 50)}
                  >
                    <TextComponent weight='bold' style={[styles.letterText, { color: colors.colors.white }]}>
                      {letter ? letter.toUpperCase() : ''}
                    </TextComponent>
                  </AnimatedTouchable>
                ))}
              </Animated.View>
              

              <Animated.View style={styles.letterContainer} layout={LinearTransition.springify()}>
                {scrambledWord.map((letter, index) => {
                  const isUsed = false;
                  return (
                    <AnimatedTouchable
                      key={`scramble-${currentIndex}-${index}-${letter}`} 
                      style={[ styles.letterBox, styles.scrambledBox, { backgroundColor: colors.background.listSecondary }, isUsed ? styles.disabledLetter : {} ]}
                      onPress={() => handleLetterClick(letter, index)}
                      disabled={currentWordIsCompleted || gameFinished|| isUsed}
                      layout={LinearTransition.springify()}
                      entering={FadeIn.duration(300).delay(index * 50)}
                    >
                      <TextComponent weight='bold' style={[styles.letterText, { color: colors.colors.white }]}>
                        {letter.toUpperCase()}
                      </TextComponent>
                    </AnimatedTouchable>
                  );
                })}
              </Animated.View>
              

              <Animated.View  style={styles.actionButtonContainer} layout={LinearTransition.springify()}>
                 {currentWordIsCompleted && !gameFinished && (
                    <TouchableOpacity
                       style={[styles.button, { backgroundColor: colors.colors.tealLight }]}
                       onPress={moveToNextWord}
                    >
                       <TextComponent weight='bold' style={{ color: colors.background.primary }}>Próxima Palavra</TextComponent>
                    </TouchableOpacity>
                 )}
              </Animated.View >
            </View>
            </Animated.View>
          ) : (
            <View style={styles.centerContainer}>
              <TextComponent size='large' weight='bold' style={{ color: colors.text.primary, marginBottom: 20 }}>
                🎉 Parabéns! 🎉
              </TextComponent>
              <TextComponent style={{ color: colors.text.secondary, marginBottom: 30, textAlign: 'center' }}>
                Você completou todas as palavras do anagrama!
              </TextComponent>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.cards.secondary }]}
                onPress={handleResetGame}
              >
                <TextComponent weight='bold' style={{ color: colors.text.primary }}>Jogar Novamente</TextComponent>
              </TouchableOpacity>
              <TouchableOpacity
                 style={[styles.button, { backgroundColor: 'transparent', marginTop: 15, elevation: 0 }]}
                 onPress={() => router.back()}
              >
                <TextComponent style={{ color: colors.text.secondary }}>Voltar ao Menu</TextComponent>
              </TouchableOpacity>
            </View>
          )}
        </View>
    </Container>
  );
};

const screenWidth = Dimensions.get('window').width;
const containerPadding = 20;
const numBoxesPerRow = 7; 
const spacingPerBox = 6;
const totalHorizontalSpacing = (numBoxesPerRow) * spacingPerBox;
const availableWidthForBoxes = screenWidth - (containerPadding * 2) - totalHorizontalSpacing;
const letterBoxSize = Math.max(35, Math.floor(availableWidthForBoxes / numBoxesPerRow));

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: containerPadding, },
  header: { marginBottom: 15, alignItems: 'center', },
  imageContainer: { width: '65%', maxWidth: 250, aspectRatio: 1, marginBottom: 25, alignItems: 'center', justifyContent: 'center', },
  image: { width: '100%', height: '100%', borderRadius: 12, },
  imagePlaceholder: { width: '100%', height: '100%', borderRadius: 12, alignItems: 'center', justifyContent: 'center', },
  letterContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginBottom: 25, width: '100%', minHeight: letterBoxSize + spacingPerBox, }, // Ensure minHeight accommodates box + margins
  letterBox: { width: letterBoxSize, height: letterBoxSize, margin: spacingPerBox / 2, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, },
  blankBox: {/** */},
  scrambledBox: { borderColor: 'transparent', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, },
  letterText: { fontSize: Math.max(14, letterBoxSize * 0.5), textTransform: 'uppercase', },
  disabledLetter: { opacity: 0.4, }, 
  actionButtonContainer: { marginTop: 20, minHeight: 50, width: '100%', justifyContent: 'center', alignItems: 'center', },
  button: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, minWidth: 180, alignItems: 'center', },
  errorText: { marginBottom: 10, fontSize: 16 },
});

export default Anagram;