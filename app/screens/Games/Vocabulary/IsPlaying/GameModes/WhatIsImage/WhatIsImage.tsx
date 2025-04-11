// src/components/Games/Modes/WhatIsImage.tsx
// Single-Player Only Version with Persistence

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Dimensions,
    ScrollView
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    runOnJS, // Keep runOnJS for now, might be needed by Animated library internals or complex callbacks
    FadeIn,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import { db } from '@/config/firebase'; // Import Firebase db instance
import { doc, getDoc } from 'firebase/firestore'; // Import Firestore functions
import { useLocalSearchParams, router } from 'expo-router'; // Import router and params hook

import { useTheme } from '@/constants/useTheme';
import { TextComponent } from '@/components/TextComponent';
import { useToast } from '@/components/Toast/useToast';
import { VocabularyItem } from '@/types';
import externalOptions from '@/app/screens/Games/Vocabulary/Database/options.json'; // Keep for option generation

// --- Constants ---
const GRID_SIZE = 16;
const TOTAL_SQUARES = GRID_SIZE * GRID_SIZE;

// --- Interfaces ---
// Local state for each vocabulary item within the game
interface WhatIsImageStateItem extends VocabularyItem {
    options: string[]; // Generated options for this item
    clickedOption?: string | null; // Which option the user clicked
    isCorrect?: boolean | null; // Was the clicked option correct?
    isGuessMade: boolean; // Has the user made a guess for this item?
}

// Structure of the data saved to AsyncStorage
interface PersistedGameState {
    whatIsImageState: WhatIsImageStateItem[]; // The progress on each item
    currentIndex: number; // Current image index
    score: number; // Current score
    isGameOver: boolean; // Is the game finished?
    fetchedVocabulary: VocabularyItem[]; // The original list fetched from Firestore
}

// Props for the component (now empty as data is self-fetched)
interface WhatIsImageProps {
    // onGoBack?: () => void; // Keep if needed for specific parent control
}

// --- Animated Components ---
const AnimatedView = Animated.createAnimatedComponent(View);

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Grid Square Sub-Component (No changes needed)
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
interface GridSquareProps {
    isRevealed: boolean;
    size: number;
    index: number;
    colors: ReturnType<typeof useTheme>['colors'];
}

const GridSquare: React.FC<GridSquareProps> = React.memo(({ isRevealed, size, index, colors }) => {
    // ... (GridSquare implementation remains exactly the same)
    const backgroundColor = useSharedValue(isRevealed ? 'transparent' : colors.cards.primary);
    const animatedStyle = useAnimatedStyle(() => ({
        backgroundColor: withTiming(backgroundColor.value, { duration: 300, easing: Easing.inOut(Easing.ease) }),
    }), []);
    useEffect(() => {
        backgroundColor.value = isRevealed ? 'transparent' : colors.cards.primary;
    }, [isRevealed, colors.cards.primary, backgroundColor]);
    return <AnimatedView style={[styles.gridSquare, { width: size, height: size }, animatedStyle]} />;
});
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// End of GridSquare Component
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


// ===============================================================
// Main WhatIsImage Component
// ===============================================================
const WhatIsImage: React.FC<WhatIsImageProps> = (/*{ onGoBack }*/) => {
    // --- Hooks ---
    const { colors } = useTheme();
    const { showToast } = useToast();
    const params = useLocalSearchParams();
    const gameID = params.gameID as string; // Get gameID from navigation params

    // --- Core Persisted State ---
    const [whatIsImageState, setWhatIsImageState] = useState<WhatIsImageStateItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const fetchedVocabRef = useRef<VocabularyItem[]>([]); // Store the original list

    // --- Transient UI/Round State (Not persisted directly) ---
    const [gridSquaresRevealed, setGridSquaresRevealed] = useState<boolean[]>(Array(TOTAL_SQUARES).fill(false));
    const [isRevealing, setIsRevealing] = useState(false); // Start false, set true when round starts
    const [showOptions, setShowOptions] = useState(false);
    const [isRoundOver, setIsRoundOver] = useState(false); // Is the current image round finished?
    const [guessedCorrectly, setGuessedCorrectly] = useState<boolean | null>(null); // Feedback after guess

    // --- Loading/Error State ---
    const [isLoading, setIsLoading] = useState(true); // Start loading
    const [error, setError] = useState<string | null>(null);

    // --- Refs & Memos ---
    const revealIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const storageKey = useMemo(() => gameID ? `whatIsImage_gameState_${gameID}` : null, [gameID]);

    // --- Helper Functions ---

    // Validate data loaded from AsyncStorage
    const isValidPersistedState = (data: any): data is PersistedGameState => {
        return data && typeof data === 'object' &&
               Array.isArray(data.whatIsImageState) &&
               typeof data.currentIndex === 'number' &&
               typeof data.score === 'number' &&
               typeof data.isGameOver === 'boolean' &&
               Array.isArray(data.fetchedVocabulary) &&
               // Basic check on array item structure (optional but good)
               (data.whatIsImageState.length === 0 || ('vocab' in data.whatIsImageState[0] && 'isGuessMade' in data.whatIsImageState[0])) &&
               (data.fetchedVocabulary.length === 0 || ('vocab' in data.fetchedVocabulary[0]));
    };

     // Generate options for a given vocabulary item
    const generateOptions = useCallback((correctVocab: string, allVocabs: string[]): string[] => {
        if (!correctVocab) return ["", "", ""];
         let incorrectOptions: string[];

         const availableIncorrect = allVocabs.filter(v => v.toLowerCase() !== correctVocab.toLowerCase());

        if (availableIncorrect.length >= 2) {
            incorrectOptions = availableIncorrect.sort(() => 0.5 - Math.random()).slice(0, 2);
        } else {
            // Fallback if not enough unique vocabs available
            const fallbackOptions = ['cat', 'dog', 'car', 'banana', 'table', 'pen']
                .filter(option => option.toLowerCase() !== correctVocab.toLowerCase());
            incorrectOptions = fallbackOptions.sort(() => 0.5 - Math.random()).slice(0, 2);
            // Fill remaining slots if needed
            while (incorrectOptions.length < 2) {
                const placeholder = `Opção ${incorrectOptions.length + 2}${Math.random().toFixed(2)}`;
                if (!incorrectOptions.includes(placeholder) && placeholder.toLowerCase() !== correctVocab.toLowerCase()) {
                    incorrectOptions.push(placeholder);
                }
            }
        }
        const options = [correctVocab, ...incorrectOptions];
        return options.sort(() => 0.5 - Math.random());
    }, []); // Depends only on externalOptions potentially

    // Initialize state for a completely new game from fetched vocabulary
    const initializeNewGameState = useCallback((vocabList: VocabularyItem[]) => {
        fetchedVocabRef.current = vocabList; // Store base list
        const initialWhatIsImageState = vocabList.map(item => ({
            ...item,
            options: generateOptions(item.vocab, vocabList.map(v => v.vocab)),
            clickedOption: null,
            isCorrect: null,
            isGuessMade: false,
        }));
        return {
            whatIsImageState: initialWhatIsImageState,
            currentIndex: 0,
            score: 0,
            isGameOver: false,
        };
    }, [generateOptions]); // Depends on generateOptions


    // Reset transient UI state based on the current item's progress
    const resetRoundStateBasedOnLoadedData = useCallback((currentItem: WhatIsImageStateItem | undefined) => {
        if (revealIntervalRef.current) clearInterval(revealIntervalRef.current); // Clear any existing interval first

        if (!currentItem) {
            console.error("Attempted to reset round state with undefined item.");
            setIsGameOver(true); // Likely end of game or error
            setIsRevealing(false);
            setShowOptions(false);
            setIsRoundOver(true);
            return;
        }

        console.log("Resetting round UI for index:", currentIndex, "GuessMade:", currentItem.isGuessMade);
        if (currentItem.isGuessMade) {
            // Round already completed, show result
            setGridSquaresRevealed(Array(TOTAL_SQUARES).fill(true)); // Show full image
            setShowOptions(false);
            setIsRoundOver(true);
            setGuessedCorrectly(currentItem.isCorrect ?? null);
            setIsRevealing(false);
        } else {
            // Start round normally
            setGridSquaresRevealed(Array(TOTAL_SQUARES).fill(false)); // Hide image
            setShowOptions(false);
            setIsRoundOver(false);
            setGuessedCorrectly(null);
            setIsRevealing(true); // Start revealing process
        }
    }, [currentIndex]); // Depends on currentIndex to log correctly

    // --- Effect 1: Load initial game state (AsyncStorage or Firestore) ---
    useEffect(() => {
        const loadGame = async () => {
           if (!gameID) { setError("ID do jogo não fornecido."); setIsLoading(false); return; }
           if (!storageKey) { setError("Chave de armazenamento inválida."); setIsLoading(false); return; }

           console.log(`WhatIsImage: Tentando carregar jogo ID: ${gameID}`);
           setIsLoading(true); setError(null);

           try {
               // 1. Try AsyncStorage
               const savedStateJSON = await AsyncStorage.getItem(storageKey);
               if (savedStateJSON) {
                   const savedState = JSON.parse(savedStateJSON);
                   if (isValidPersistedState(savedState)) {
                       console.log(`WhatIsImage: Jogo ${gameID} carregado do AsyncStorage.`);
                       // Restore Core State
                       setWhatIsImageState(savedState.whatIsImageState);
                       setCurrentIndex(savedState.currentIndex);
                       setScore(savedState.score);
                       setIsGameOver(savedState.isGameOver);
                       fetchedVocabRef.current = savedState.fetchedVocabulary;
                       // Reset Transient UI based on loaded state
                       resetRoundStateBasedOnLoadedData(savedState.whatIsImageState[savedState.currentIndex]);
                       setIsLoading(false);
                       return; // Exit successfully
                   } else {
                        console.warn(`WhatIsImage: Dados inválidos no AsyncStorage para ${gameID}. Removendo.`);
                        await AsyncStorage.removeItem(storageKey);
                   }
               }

               // 2. Fetch from Firestore if not loaded
               console.log(`WhatIsImage: Buscando ${gameID} do Firestore...`);
               // Assume gameID is the VocabularyGame document ID
               const vocabDocRef = doc(db, 'VocabularyGame', gameID);
               const vocabDocSnap = await getDoc(vocabDocRef);

               if (!vocabDocSnap.exists()) throw new Error(`Jogo ${gameID} não encontrado no Firestore.`);

               const vocabData = vocabDocSnap.data();
               const fetchedVocabularies = vocabData?.vocabularies;

               if (!fetchedVocabularies || !Array.isArray(fetchedVocabularies) || fetchedVocabularies.length === 0) {
                   throw new Error(`Lista de vocabulário do Firestore (ID: ${gameID}) inválida.`);
               }

               // 3. Initialize new game state
               const initialCoreState = initializeNewGameState(fetchedVocabularies);
               setWhatIsImageState(initialCoreState.whatIsImageState);
               setCurrentIndex(initialCoreState.currentIndex);
               setScore(initialCoreState.score);
               setIsGameOver(initialCoreState.isGameOver);
               // Reset Transient UI for the first item
               resetRoundStateBasedOnLoadedData(initialCoreState.whatIsImageState[0]);

               // 4. Save initial state to AsyncStorage
               const stateToSave: PersistedGameState = {
                   ...initialCoreState,
                   fetchedVocabulary: fetchedVocabRef.current
               };
               await AsyncStorage.setItem(storageKey, JSON.stringify(stateToSave));
               console.log(`WhatIsImage: Novo jogo ${gameID} iniciado e salvo.`);
               setIsLoading(false);

           } catch (err: any) {
               console.error(`WhatIsImage: Erro ao carregar/inicializar ${gameID}:`, err);
               setError(`Falha ao carregar: ${err.message || 'Erro desconhecido'}`);
               setIsLoading(false);
           }
        };
        loadGame();
        // Cleanup function to clear interval if component unmounts during loading
        return () => {
             if (revealIntervalRef.current) {
                clearInterval(revealIntervalRef.current);
             }
        };
    }, [gameID, storageKey, initializeNewGameState, resetRoundStateBasedOnLoadedData]); // Add helpers to deps

    // --- Effect 2: Save state changes to AsyncStorage ---
    useEffect(() => {
        const saveState = async () => {
            // Check conditions carefully: not loading, no error, valid key, and data exists
            if (!isLoading && !error && storageKey && fetchedVocabRef.current.length > 0) {
                const gameStateToSave: PersistedGameState = {
                    whatIsImageState,
                    currentIndex,
                    score,
                    isGameOver,
                    fetchedVocabulary: fetchedVocabRef.current
                };
                try {
                   // console.log(`WhatIsImage: Saving game ${gameID} state`); // Debug log
                   await AsyncStorage.setItem(storageKey, JSON.stringify(gameStateToSave));
                } catch (err) {
                    console.error(`WhatIsImage: Error saving game state ${gameID}:`, err);
                    // Maybe show a subtle error indicator?
                }
            }
        };
        // Run save only after the initial load is complete and state is stable
         if (!isLoading) {
            saveState();
         }
    }, [whatIsImageState, currentIndex, score, isGameOver, isLoading, error, storageKey]); // Depend on core state + status/identifiers


     // --- Effect 3: Grid Reveal Interval ---
    const revealSquare = useCallback(() => { // Define revealSquare before the effect
        setGridSquaresRevealed(prevRevealed => {
            const hiddenIndices = prevRevealed
                .map((isRevealed, index) => (!isRevealed ? index : -1))
                .filter(index => index !== -1);

            if (hiddenIndices.length === 0) {
                if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
                setIsRevealing(false); // Stop revealing state locally
                // Optional: automatically trigger guess? Maybe not.
                // runOnJS(handleGuess)();
                return prevRevealed; // No change if all revealed
            }

            const randomIndex = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
            const newRevealed = [...prevRevealed];
            newRevealed[randomIndex] = true;
            return newRevealed;
        });
    }, []); // No dependencies needed if it only uses setGridSquaresRevealed

    useEffect(() => {
        // Clear previous interval just in case
        if (revealIntervalRef.current) {
            clearInterval(revealIntervalRef.current);
            revealIntervalRef.current = null;
        }

        // Start interval only if revealing is active and round isn't over/showing options
        if (isRevealing && !showOptions && !isRoundOver && !isGameOver) {
            // console.log("WhatIsImage (SP): Starting reveal interval");
            revealIntervalRef.current = setInterval(revealSquare, 300); // Adjust interval time as needed
        } else {
            // console.log("WhatIsImage (SP): Not starting reveal interval.", { isRevealing, showOptions, isRoundOver, isGameOver });
        }

        // Cleanup interval on unmount or when dependencies change
        return () => {
            if (revealIntervalRef.current) {
                // console.log("WhatIsImage (SP): Clearing reveal interval");
                clearInterval(revealIntervalRef.current);
                revealIntervalRef.current = null;
            }
        };
    }, [isRevealing, showOptions, isRoundOver, isGameOver, revealSquare]); // Dependencies control when interval runs


    // --- Event Handlers ---
    const handleGuess = useCallback(() => {
        // Only updates transient UI state, no persistence change needed directly
        console.log("WhatIsImage (SP): Guess button clicked.");
        setIsRevealing(false); // Stop the revealing process
        setShowOptions(true); // Show the multiple-choice options
    }, []); // No dependencies

    const handleOptionSelect = useCallback((selectedOption: string) => {
        // Updates Core State -> triggers save effect
        if (currentIndex >= whatIsImageState.length || !whatIsImageState[currentIndex]) return; // Safety check

        const currentItem = whatIsImageState[currentIndex];
        // Prevent re-guessing if already made
        if(currentItem.isGuessMade) return;

        const isCorrect = selectedOption.toLowerCase() === currentItem.vocab.toLowerCase();
        const hiddenSquaresCount = gridSquaresRevealed.filter(revealed => !revealed).length;
        // Score calculation: more points for fewer revealed squares
        const pointsEarned = isCorrect ? Math.max(10, Math.round(hiddenSquaresCount * (GRID_SIZE*GRID_SIZE / TOTAL_SQUARES))) : 0; // Example scoring

        // Update Transient UI State immediately for feedback
        setIsRevealing(false);
        setGridSquaresRevealed(Array(TOTAL_SQUARES).fill(true)); // Reveal full image
        setShowOptions(false); // Hide options
        setIsRoundOver(true); // Mark round as over
        setGuessedCorrectly(isCorrect); // Show correct/wrong feedback

        // Update Core Persisted State (triggers save effect)
        const newScore = score + pointsEarned;
        const isGameNowOver = currentIndex + 1 >= whatIsImageState.length;

        setScore(newScore);
        setIsGameOver(isGameNowOver);
        // Update the specific item in the state array
        setWhatIsImageState(currentFullState =>
            currentFullState.map((item, index) =>
                index === currentIndex ? {
                    ...item,
                    clickedOption: selectedOption,
                    isCorrect: isCorrect,
                    isGuessMade: true, // Mark guess as made
                } : item
            )
        );

    }, [ currentIndex, whatIsImageState, score, gridSquaresRevealed ]); // Dependencies for calculation & update

    const handleNextImage = useCallback(() => {
        // Updates Core State -> triggers save effect
        const nextIndex = currentIndex + 1;
        if (nextIndex >= whatIsImageState.length) {
            setIsGameOver(true); // Should already be set, but ensures consistency
            return;
        }
        // Update Core index first
        setCurrentIndex(nextIndex);
        // Then reset transient UI based on the *new* current item
        resetRoundStateBasedOnLoadedData(whatIsImageState[nextIndex]);

    }, [currentIndex, whatIsImageState, resetRoundStateBasedOnLoadedData]); // Depends on state and reset helper

    const handlePlayAgain = useCallback(() => {
        // Resets Core State -> triggers save effect
        if (!fetchedVocabRef.current || fetchedVocabRef.current.length === 0) {
            setError("Não é possível reiniciar: dados de vocabulário não encontrados.");
            return;
        }
        console.log("WhatIsImage (SP): Play Again clicked.");
        const initialCoreState = initializeNewGameState(fetchedVocabRef.current); // Re-initialize
        // Set Core State
        setWhatIsImageState(initialCoreState.whatIsImageState);
        setCurrentIndex(initialCoreState.currentIndex);
        setScore(initialCoreState.score);
        setIsGameOver(initialCoreState.isGameOver);
        // Reset Transient UI for the first item
        resetRoundStateBasedOnLoadedData(initialCoreState.whatIsImageState[0]);

    }, [initializeNewGameState, resetRoundStateBasedOnLoadedData]); // Depends on helpers

     const handleFinish = () => {
        // No state changes, just navigation
        console.log("WhatIsImage (SP): Finish button clicked.");
        showToast("Jogo finalizado!", "info");
        if (router.canGoBack()) {
            router.back();
        } else {
            console.warn("Cannot go back from WhatIsImage screen.");
            // router.replace('/fallback-screen'); // Optional fallback
        }
        // onGoBack?.(); // Optional prop callback
     };

    // --- UI Render ---
    const screenWidth = Dimensions.get('window').width;
    // const containerPadding = 20; // Defined in styles
    const imageContainerSize = screenWidth * 0.8; // Adjust as needed
    const gridSquareSize = imageContainerSize / GRID_SIZE;
    const currentImageData = !isLoading && !error && whatIsImageState.length > currentIndex ? whatIsImageState[currentIndex] : null; // Safely get current item


    if (isLoading) { /* ... Loading Indicator ... */
        return ( <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.text.primary} /><TextComponent style={{ marginTop: 10, color: colors.text.primary }}>Carregando...</TextComponent></View> );
    }
    if (error) { /* ... Error Display ... */
         return ( <View style={styles.centerContainer}><TextComponent weight="semibold" style={{ color: colors.text.primary }}>Erro</TextComponent><TextComponent style={{ color: colors.text.secondary, textAlign: 'center', marginVertical: 10 }}>{error}</TextComponent><TouchableOpacity onPress={handleFinish} style={[styles.button, { backgroundColor: colors.cards.secondary }]}><TextComponent weight='bold' style={{ color: colors.text.primary }}>Voltar</TextComponent></TouchableOpacity></View> );
    }
    // Handle case where loading finished but data is invalid/empty
    if (!currentImageData && !isGameOver) {
         return ( <View style={styles.centerContainer}><TextComponent style={{ color: colors.text.secondary }}>{whatIsImageState.length === 0 ? "Lista de vocabulário vazia." : "Erro ao carregar imagem atual."}</TextComponent><TouchableOpacity onPress={handleFinish} style={[styles.button, { backgroundColor: colors.cards.secondary, marginTop: 20 }]}><TextComponent weight='bold' style={{ color: colors.text.primary }}>Voltar</TextComponent></TouchableOpacity></View> );
    }

    // Main Game Render
    return (
    <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
            <TextComponent weight='bold' style={{ color: colors.text.secondary }}>
                {isGameOver ? "Fim de Jogo" : `Imagem ${currentIndex + 1} de ${whatIsImageState.length}`}
            </TextComponent>
            <TextComponent weight='bold' style={{ color: colors.text.secondary }}>Pontos: {score}</TextComponent>
        </View>

        {/* Image & Grid */}
        <View style={[styles.imageOuterContainer, { width: imageContainerSize, height: imageContainerSize }]}>
            {currentImageData?.imageURL ? (
                <Image source={{ uri: currentImageData.imageURL }} style={styles.image} resizeMode="cover"/>
            ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                    <TextComponent style={{color: colors.text.primary}}>Sem Imagem</TextComponent>
                </View>
            )}
            {/* Grid overlay only if image exists */}
            {currentImageData && (
                <View style={styles.gridOverlayContainer}>
                    {gridSquaresRevealed.map((revealed, index) => (
                        <GridSquare key={index} isRevealed={revealed} size={gridSquareSize} index={index} colors={colors}/>
                    ))}
                </View>
            )}
        </View>

        {/* Controls Area */}
        <View style={styles.controlsContainer}>
            {/* "Guess" button: Show if round not over and options not visible */}
            {!isRoundOver && !showOptions && !isGameOver && currentImageData && (
                <TouchableOpacity style={[styles.button, styles.guessButton, { backgroundColor: colors.cards.secondary }]} onPress={handleGuess}>
                    <TextComponent weight="bold" style={[{color: colors.text.primary}]}>Chutar</TextComponent>
                </TouchableOpacity>
            )}

            {/* Options: Show if triggered by 'Guess' */}
            {showOptions && currentImageData?.options && (
                <View style={styles.optionsGrid}>
                    {currentImageData.options.map((option: string, index: number) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.button, styles.optionButton, { backgroundColor: colors.cards.secondary }]}
                            onPress={() => handleOptionSelect(option)}
                        >
                            <TextComponent weight='bold' style={[{ color: colors.text.primary }]}>{option}</TextComponent>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Feedback: Show after guess is made */}
            {isRoundOver && guessedCorrectly !== null && (
                    <AnimatedView entering={FadeIn.duration(500)}>
                        <TextComponent
                            size="large"
                            weight="bold"
                            style={{ color: guessedCorrectly ? colors.colors.teal : colors.colors.deepOrange, marginTop: 15, marginBottom: 10 }}
                        >
                            {guessedCorrectly ? '👏 Isso aí!' : `✖ Ops! Era: ${currentImageData?.vocab || ''}`}
                        </TextComponent>
                    </AnimatedView>
            )}

            {/* End of Round/Game Buttons: Show when round is over */}
            {isRoundOver && (
                <View style={styles.endRoundButtons}>
                    {!isGameOver ? (
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: colors.cards.primary }]} // Use consistent button color?
                            onPress={handleNextImage}
                        >
                            <TextComponent weight="bold" style={[{ color: colors.text.primary }]}>Próxima Imagem</TextComponent>
                        </TouchableOpacity>
                    ) : (
                        // Game Over Buttons
                        <View style={styles.endGameButtonsContainer}>
                            <TouchableOpacity style={[styles.button, styles.endGameButton, { backgroundColor: colors.cards.secondary }]} onPress={handleFinish}>
                                <TextComponent weight="bold" style={[{ color: colors.text.primary }]}>Finalizar</TextComponent>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.endGameButton, { backgroundColor: colors.cards.secondary }]} onPress={handlePlayAgain}>
                                <TextComponent weight="bold" style={[{ color: colors.text.primary }]}>Jogar Novamente</TextComponent>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}
        </View>
    </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingTop: 10, width: '100%' }, // Adjusted padding
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 15, paddingHorizontal: 5 }, // Reduced padding
    imageOuterContainer: { marginBottom: 20, backgroundColor: '#ccc', position: 'relative', overflow: 'hidden', borderRadius: 8 },
    image: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
    imagePlaceholder: { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
    gridOverlayContainer: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', flexWrap: 'wrap' },
    gridSquare: { borderWidth: 0.5, borderColor: 'rgba(50,50,50,0.2)' },
    controlsContainer: { width: '100%', alignItems: 'center', marginTop: 5, minHeight: 150 }, // Reduced marginTop
    optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 10, width: '100%', gap: 10 }, // Reduced marginTop
    button: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, margin: 5, alignItems: 'center', justifyContent: 'center', minWidth: 120, elevation: 2, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, },
    guessButton: { paddingHorizontal: 35 }, // Make guess button wider?
    optionButton: { minWidth: '40%', maxWidth: '90%', },
    endRoundButtons: { marginTop: 15, width: '100%', alignItems: 'center', }, // Reduced marginTop
    endGameButtonsContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '90%', marginTop: 10, },
    endGameButton: { minWidth: '45%', paddingHorizontal: 15 }, // Adjust endGame button size
});

export default WhatIsImage;