// src/components/Games/Modes/WhatIsImage.tsx (or your chosen path)

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
    runOnJS,
    FadeIn, // Needed for triggering JS functions from worklets if required
} from 'react-native-reanimated';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';

import { db } from '@/config/firebase'; // Adjust path
import { useTheme } from '@/constants/useTheme'; // Adjust path
import { TextComponent } from '@/components/TextComponent'; // Adjust path
import { useToast } from '@/components/Toast/useToast'; // Adjust path
import { VocabularyItem } from '@/types'; // Import shared type
// Import router if needed for 'Finalizar' button functionality
// import { router } from 'expo-router';

// --- Constants ---
const GRID_SIZE = 16; // 16x16 grid
const TOTAL_SQUARES = GRID_SIZE * GRID_SIZE; // 256

// --- Interfaces ---
// State for each vocabulary item within this specific game mode
interface WhatIsImageStateItem extends VocabularyItem {
    options?: string[];
    clickedOption?: string | null;
    isCorrect?: boolean | null;
    isGuessMade?: boolean; // Tracks if a guess was made for this item
}

// Structure expected/stored in Firestore `vocabularydata` array for multiplayer
interface FirestoreWhatIsImageItem {
    vocab: string;
    imageURL?: string;
    options?: string[]; // Options might be generated once and stored
    clickedOption?: string | null;
    isCorrect?: boolean | null;
    isGuessMade?: boolean;
}

interface WhatIsImageProps {
    gameSessionId: string | null;
    isSingleplayer: boolean;
    vocabularyList: VocabularyItem[]; // Passed directly from IsPlaying
    // Prop to go back instead of handleGameModeChange?
    // onGoBack?: () => void;
}

// --- Animated Components ---
const AnimatedView = Animated.createAnimatedComponent(View);

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Grid Square Sub-Component
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
interface GridSquareProps {
    isRevealed: boolean;
    size: number;
    index: number; // For potential staggered animations
    colors: ReturnType<typeof useTheme>['colors'];
}

const GridSquare: React.FC<GridSquareProps> = React.memo(({ isRevealed, size, index, colors }) => {
    const backgroundColor = useSharedValue(isRevealed ? 'transparent' : colors.cards.primary); // Start black/theme bg

    // Animate background color change
    const animatedStyle = useAnimatedStyle(() => {
        return {
            backgroundColor: withTiming(
                backgroundColor.value,
                { duration: 300, easing: Easing.inOut(Easing.ease) }
            ),
        };
    }, []); // No dependencies needed if color changes trigger re-render or value update

    // Update shared value when prop changes
    useEffect(() => {
        backgroundColor.value = isRevealed ? 'transparent' : colors.cards.primary;
    }, [isRevealed, colors.cards.primary, backgroundColor]);

    return (
        <AnimatedView style={[
            styles.gridSquare,
            { width: size, height: size },
            animatedStyle // Apply animated background
        ]} />
    );
});
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// End of GridSquare Component
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


// ===============================================================
// Main WhatIsImage Component
// ===============================================================
const WhatIsImage: React.FC<WhatIsImageProps> = ({
    gameSessionId,
    isSingleplayer,
    vocabularyList,
    // onGoBack // Consider using a callback prop for navigation
}) => {
    const { colors } = useTheme();
    const { showToast } = useToast();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- Game State ---
    const [whatIsImageState, setWhatIsImageState] = useState<WhatIsImageStateItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [gridSquaresRevealed, setGridSquaresRevealed] = useState<boolean[]>(Array(TOTAL_SQUARES).fill(false));
    const [isRevealing, setIsRevealing] = useState(true); // Start revealing initially?
    const [showOptions, setShowOptions] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false); // Overall game finished? (All images done)
    const [isRoundOver, setIsRoundOver] = useState(false); // Current image round finished?
    const [guessedCorrectly, setGuessedCorrectly] = useState<boolean | null>(null);

    // Ref to store the interval ID for revealing squares
    const revealIntervalRef = useRef<NodeJS.Timeout | null>(null);
    // Ref to track all vocab words for option generation
    const allVocabsRef = useRef<string[]>([]);


    // Firestore Ref (Multiplayer only)
    const whatIsImageDocRef = useMemo(() => {
        if (!isSingleplayer && gameSessionId) {
            return doc(db, 'games', gameSessionId, 'modes', 'whatisimage');
        }
        return null;
    }, [isSingleplayer, gameSessionId]);


    // --- Initialization and State Sync ---

    // Effect 1: Initialize local state when props change (especially for singleplayer)
    useEffect(() => {
        console.log("WhatIsImage: Initializing state from props. Count:", vocabularyList.length);
        setIsLoading(true);
        setError(null);
        if (vocabularyList && vocabularyList.length > 0) {
            // Store all vocabs for option generation
            allVocabsRef.current = vocabularyList.map(v => v.vocab);

            // Initialize state for all items
            const initialState = vocabularyList.map(item => ({
                ...item,
                options: generateOptions(item.vocab, allVocabsRef.current), // Generate options now
                clickedOption: null,
                isCorrect: null,
                isGuessMade: false,
            }));
            setWhatIsImageState(initialState);

            // Set initial game state values
            setCurrentIndex(0);
            setScore(0);
            setIsGameOver(false);
            resetRoundState(initialState[0]); // Reset state for the first round

            if (isSingleplayer) {
                setIsLoading(false); // Singleplayer is ready
            }
            // Multiplayer loading stops when listener syncs
        } else {
            setWhatIsImageState([]);
            allVocabsRef.current = [];
            setIsLoading(false);
        }
    }, [vocabularyList, isSingleplayer]); // Rerun if base list or mode changes

    // Effect 2: Multiplayer Firestore Listener
    useEffect(() => {
        if (isSingleplayer || !whatIsImageDocRef) {
            return;
        }
        console.log("WhatIsImage: Attaching Multiplayer Listener:", whatIsImageDocRef.path);
        setIsLoading(true); // Ensure loading while potentially syncing

        const unsubscribe = onSnapshot(whatIsImageDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("WhatIsImage: Firestore Snapshot Received:", data);
                const fsStateArray = data?.vocabularydata as FirestoreWhatIsImageItem[] | undefined;
                const fsCurrentIndex = data?.currentIndex ?? 0;
                const fsScore = data?.score ?? 0;
                const fsIsRevealing = data?.isRevealing ?? false; // Default to not revealing if not set
                const fsShowOptions = data?.showOptions ?? false;
                const fsIsGameOver = data?.isGameOver ?? false; // Overall game state
                const fsGuessedCorrectly = data?.guessedCorrectly ?? null; // Last guess result

                // Basic validation
                if (!fsStateArray || fsStateArray.length !== vocabularyList.length) {
                    console.error("WhatIsImage: Firestore data mismatch or missing.");
                    setError("Erro de sincronização dos dados do jogo.");
                    setIsLoading(false);
                    return; // Don't proceed with inconsistent data
                }

                // Update local state based on Firestore
                // Note: We might not need to store the full fsStateArray locally if
                // we trust Firestore as the source of truth for completed status.
                // Let's update the necessary control states.
                setCurrentIndex(fsCurrentIndex);
                setScore(fsScore);
                setIsRevealing(fsIsRevealing);
                setShowOptions(fsShowOptions);
                setIsGameOver(fsIsGameOver);
                setGuessedCorrectly(fsGuessedCorrectly);

                // Update derived state for the current round based on Firestore
                const currentFsItem = fsStateArray[fsCurrentIndex];
                setIsRoundOver(currentFsItem?.isGuessMade ?? false); // Round is over if guess was made

                // Update grid visibility based on game state
                if (fsIsGameOver || currentFsItem?.isGuessMade) {
                     initializeCompletedGrid(); // Show whole image if game/round is over
                     if (revealIntervalRef.current) clearInterval(revealIntervalRef.current); // Stop revealing
                } else if (!fsIsRevealing && !fsShowOptions) {
                    // Game is waiting, ensure grid is NOT revealed yet (or reset if needed)
                    // This case might occur if coming back to a game in progress
                     initializeGrid();
                } else if (!fsIsRevealing && fsShowOptions) {
                    // Showing options, stop revealing
                    if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
                }
                // else: isRevealing is true, the reveal effect will handle the grid

                // Update the local full state array if necessary (e.g., if options are stored in FS)
                // This assumes options are generated locally for now. If stored/synced via FS, update here.
                setWhatIsImageState(currentFullState =>
                    currentFullState.map((item, idx) => {
                        const fsItem = fsStateArray[idx];
                        return {
                            ...item, // Keep local options generated initially
                            clickedOption: fsItem?.clickedOption ?? null,
                            isCorrect: fsItem?.isCorrect ?? null,
                            isGuessMade: fsItem?.isGuessMade ?? false,
                        };
                    })
                );

                setError(null); // Clear error on successful sync
                setIsLoading(false); // Synced

            } else {
                console.warn("WhatIsImage: Firestore document modes/whatisimage does not exist.");
                // Needs initialization - this component won't create it.
                 setError("Modo 'Qual a Imagem?' não iniciado.");
                setIsLoading(false);
            }
        }, (error) => {
            console.error("WhatIsImage: Error listening to Firestore:", error);
            setError("Erro de conexão com o jogo 'Qual a Imagem?'.");
            setIsLoading(false);
        });

        return () => {
            console.log("WhatIsImage: Detaching Multiplayer Listener.");
            unsubscribe();
            if (revealIntervalRef.current) clearInterval(revealIntervalRef.current); // Cleanup interval
        };
    }, [isSingleplayer, whatIsImageDocRef, vocabularyList.length]); // Add vocab length dependency


    // --- Grid Reveal Logic ---
    const initializeGrid = useCallback(() => {
        setGridSquaresRevealed(Array(TOTAL_SQUARES).fill(false));
    }, []);

    const initializeCompletedGrid = useCallback(() => {
        setGridSquaresRevealed(Array(TOTAL_SQUARES).fill(true)); // All true to reveal image
    }, []);

    const revealSquare = useCallback(() => {
        setGridSquaresRevealed(prevRevealed => {
            const hiddenIndices = prevRevealed
                .map((isRevealed, index) => (!isRevealed ? index : -1))
                .filter(index => index !== -1);

            if (hiddenIndices.length === 0) {
                if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
                // Optionally auto-trigger 'handleGuess' if all squares are revealed?
                // runOnJS(handleGuess)(); // Example if needed, but usually player clicks guess
                setIsRevealing(false); // Stop revealing state locally
                return prevRevealed; // No change
            }

            const randomIndex = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
            const newRevealed = [...prevRevealed];
            newRevealed[randomIndex] = true;
            return newRevealed;
        });
    }, []); // No dependencies needed here if it only modifies state

    // Effect to run the reveal interval
    useEffect(() => {
        // Clear previous interval if dependencies change
        if (revealIntervalRef.current) {
            clearInterval(revealIntervalRef.current);
            revealIntervalRef.current = null;
        }

        // Start interval only if revealing should happen
        if (isRevealing && !showOptions && !isRoundOver && !isGameOver) {
            console.log("WhatIsImage: Starting reveal interval");
            revealIntervalRef.current = setInterval(revealSquare, 300); // Adjust speed as needed
        } else {
             console.log("WhatIsImage: Not starting reveal interval.", { isRevealing, showOptions, isRoundOver, isGameOver });
        }

        // Cleanup function to clear interval on unmount or when dependencies change
        return () => {
            if (revealIntervalRef.current) {
                console.log("WhatIsImage: Clearing reveal interval");
                clearInterval(revealIntervalRef.current);
                revealIntervalRef.current = null;
            }
        };
    }, [isRevealing, showOptions, isRoundOver, isGameOver, revealSquare]); // Dependencies that control revealing


    // --- Option Generation ---
    const generateOptions = useCallback((correctVocab: string, allVocabs: string[]): string[] => {
        if (!correctVocab) return ["", "", ""]; // Return empty strings if no correct vocab
        let incorrectOptions: string[];

        if (allVocabs && allVocabs.length > 2) {
            // Filter out the correct answer and get 2 unique incorrect options
            incorrectOptions = allVocabs
                .filter(v => v.toLowerCase() !== correctVocab.toLowerCase())
                .sort(() => 0.5 - Math.random()) // Shuffle
                .slice(0, 2); // Take first 2
        } else {
            // Fallback to generic options if not enough unique vocabs provided
             const fallbackOptions = ['cat', 'dog', 'car', 'banana', 'table', 'pen']
                .filter(option => option.toLowerCase() !== correctVocab.toLowerCase());
             incorrectOptions = fallbackOptions.sort(() => 0.5 - Math.random()).slice(0, 2);
        }

        // Ensure we have exactly 2 incorrect options, even if filtering reduced possibilities
        while (incorrectOptions.length < 2) {
             // Add placeholder or generic wrong options if needed
             const placeholder = `Opção ${incorrectOptions.length + 2}`; // e.g., Opção 2, Opção 3
             if (!incorrectOptions.includes(placeholder) && placeholder.toLowerCase() !== correctVocab.toLowerCase()) {
                 incorrectOptions.push(placeholder);
             } else {
                  // Extremely unlikely fallback if even placeholder conflicts
                  incorrectOptions.push(`Errado ${Math.random().toFixed(2)}`);
             }
        }

        const options = [correctVocab, ...incorrectOptions];
        return options.sort(() => 0.5 - Math.random()); // Shuffle final options
    }, []); // No dynamic dependencies

    // --- Event Handlers ---

    const handleGuess = useCallback(async () => {
        console.log("WhatIsImage: Guess button clicked.");
        setIsRevealing(false); // Stop revealing immediately locally
        if (revealIntervalRef.current) clearInterval(revealIntervalRef.current); // Clear interval

        if (isSingleplayer) {
            setShowOptions(true);
        } else if (whatIsImageDocRef) {
            try {
                await updateDoc(whatIsImageDocRef, {
                    showOptions: true,
                    isRevealing: false, // Ensure revealing stops in FS too
                });
            } catch (error) {
                console.error('Error updating game state on guess:', error);
                showToast('Erro ao tentar chutar.', 'error');
            }
        }
    }, [isSingleplayer, whatIsImageDocRef, showToast]);

    const handleOptionSelect = useCallback(async (selectedOption: string) => {
        if (currentIndex === null || !whatIsImageState[currentIndex]) return;

        const currentItem = whatIsImageState[currentIndex];
        const isCorrect = selectedOption.toLowerCase() === currentItem.vocab.toLowerCase();
        // Calculate score based on number of *hidden* squares when guess is made
        const hiddenSquaresCount = gridSquaresRevealed.filter(revealed => !revealed).length;
        const pointsEarned = isCorrect ? Math.max(10, hiddenSquaresCount) : 0; // Example scoring, min 10 points
        const newScore = score + pointsEarned;

        // Stop revealing and show result
        setIsRevealing(false);
        if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
        initializeCompletedGrid(); // Reveal the full image
        setShowOptions(false);
        setIsRoundOver(true); // Mark current round as finished
        setGuessedCorrectly(isCorrect);
        setScore(newScore); // Update score locally

         // Update the specific item's state locally
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

        // Update Firestore for multiplayer
        if (!isSingleplayer && whatIsImageDocRef) {
            try {
                 const fsDoc = await getDoc(whatIsImageDocRef);
                 if (fsDoc.exists()) {
                     const fsData = fsDoc.data();
                     let fsVocabArray = fsData?.vocabularydata as FirestoreWhatIsImageItem[] | undefined;
                     // Safety check/init (use with caution)
                     if (!fsVocabArray || fsVocabArray.length !== vocabularyList.length) {
                          fsVocabArray = vocabularyList.map(v => ({ vocab: v.vocab, imageURL: v.imageURL, clickedOption: null, isCorrect: null, isGuessMade: false, options: generateOptions(v.vocab, allVocabsRef.current) }));
                     }

                     if (fsVocabArray && fsVocabArray.length > currentIndex) {
                          const updatedFsVocab = [...fsVocabArray];
                          updatedFsVocab[currentIndex] = {
                               ...updatedFsVocab[currentIndex],
                               vocab: currentItem.vocab, // Ensure base data
                               imageURL: currentItem.imageURL,
                               // options: currentItem.options, // Assumes options were potentially generated and stored earlier
                               clickedOption: selectedOption,
                               isCorrect: isCorrect,
                               isGuessMade: true,
                          };

                          // Determine if the overall game is over
                          const isGameNowOver = currentIndex + 1 >= vocabularyList.length;

                          await updateDoc(whatIsImageDocRef, {
                                vocabularydata: updatedFsVocab,
                                score: newScore, // Update score
                                showOptions: false, // Hide options after selection
                                isRevealing: false, // Ensure revealing stopped
                                guessedCorrectly: isCorrect, // Store result of last guess
                                isGameOver: isGameNowOver, // Update overall game over state if last item
                          });
                          console.log("WhatIsImage: Firestore updated after option select.");
                     }
                 }
            } catch (error) {
                console.error('Error saving progress to Firestore:', error);
                showToast('Erro ao salvar progresso.', 'error');
            }
        } else if (isSingleplayer) {
            // Check if single player game is over
             const isGameNowOver = currentIndex + 1 >= vocabularyList.length;
             setIsGameOver(isGameNowOver);
        }

    }, [
        currentIndex,
        whatIsImageState,
        score,
        gridSquaresRevealed,
        isSingleplayer,
        whatIsImageDocRef,
        showToast,
        initializeCompletedGrid,
        vocabularyList.length // Add length dependency
    ]);

    const handleNextImage = useCallback(async () => {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= whatIsImageState.length) {
            setIsGameOver(true); // Should already be set, but double check
            return;
        }

        // Reset state for the next round
        resetRoundState(whatIsImageState[nextIndex]); // Pass next item to reset function
        setCurrentIndex(nextIndex); // Update index

        // Update Firestore for multiplayer
        if (!isSingleplayer && whatIsImageDocRef) {
            try {
                // We only need to update the index and reset flags
                await updateDoc(whatIsImageDocRef, {
                    currentIndex: nextIndex,
                    isRevealing: true, // Start revealing next image
                    showOptions: false,
                    // isGameOver: false, // Should still be false if moving next
                    guessedCorrectly: null,
                    // We don't reset vocabularydata.isGuessMade here, listener handles that via currentIndex change
                });
                console.log("WhatIsImage: Firestore updated for next image.");
            } catch (error) {
                console.error('Error updating Firestore for next image:', error);
                showToast('Erro ao avançar imagem.', 'error');
            }
        }
    }, [currentIndex, whatIsImageState, isSingleplayer, whatIsImageDocRef, showToast]);

     // Helper function to reset state for the start of a round (new image or reset)
     const resetRoundState = useCallback((itemForRound: WhatIsImageStateItem | null) => {
        initializeGrid(); // Reset grid squares to hidden
        setShowOptions(false);
        setIsRoundOver(false);
        setGuessedCorrectly(null);
        setIsRevealing(true); // Start revealing for the new round
        if (revealIntervalRef.current) clearInterval(revealIntervalRef.current); // Clear just in case
        console.log("WhatIsImage: Round state reset.");
    }, [initializeGrid]); // Depends on initializeGrid


    const handlePlayAgain = useCallback(async () => {
        console.log("WhatIsImage: Play Again clicked.");
        // Reset local state immediately for responsiveness
        const initialState = vocabularyList.map(item => ({
            ...item,
            options: generateOptions(item.vocab, allVocabsRef.current),
            clickedOption: null,
            isCorrect: null,
            isGuessMade: false,
        }));
        setWhatIsImageState(initialState);
        setCurrentIndex(0);
        setScore(0);
        setIsGameOver(false);
        resetRoundState(initialState[0]); // Reset for the first round

        // Reset Firestore for multiplayer
        if (!isSingleplayer && whatIsImageDocRef) {
             try {
                 // Reset Firestore `vocabularydata` array statuses
                 const resetFsVocab = vocabularyList.map(item => ({
                    vocab: item.vocab,
                    imageURL: item.imageURL,
                    options: generateOptions(item.vocab, allVocabsRef.current), // Regenerate/store options if needed
                    clickedOption: null,
                    isCorrect: null,
                    isGuessMade: false,
                 }));

                 await updateDoc(whatIsImageDocRef, {
                     currentIndex: 0,
                     score: 0,
                     vocabularydata: resetFsVocab, // Overwrite with reset data
                     isRevealing: true, // Start revealing first image
                     showOptions: false,
                     isGameOver: false,
                     guessedCorrectly: null,
                 });
                 console.log("WhatIsImage: Firestore reset for Play Again.");
             } catch (error) {
                 console.error('Error resetting game in Firestore:', error);
                 showToast('Erro ao reiniciar o jogo no servidor.', 'error');
             }
        }
    }, [
        vocabularyList,
        isSingleplayer,
        whatIsImageDocRef,
        generateOptions,
        resetRoundState, // Include helper in dependencies
        showToast
    ]);

     // Placeholder for navigating back or changing mode
     const handleFinish = () => {
        console.log("WhatIsImage: Finish button clicked.");
        showToast("Jogo finalizado!", "info");
        // Option 1: Use router if available (needs import)
        // if (router.canGoBack()) router.back();
        // Option 2: Call a prop function
        // onGoBack?.();
        // Option 3: Reset gameMode in parent doc (less clean now)
        // handleGameModeChange();
     };


    // --- UI Render ---

    // Calculate grid square size based on available width
    const screenWidth = Dimensions.get('window').width;
    const containerPadding = 20;
    const imageContainerSize = screenWidth * 0.8; // Adjust image container size (e.g., 80% of width)
    const gridSquareSize = imageContainerSize / GRID_SIZE;

    // Get current image data safely
    const currentImageData = whatIsImageState[currentIndex];


    if (isLoading) { /* ... loading ... */ }
    if (error) { /* ... error ... */ }
    // Check if state is ready AFTER loading and no error
    if (!isLoading && !error && !currentImageData) {
        return (
            <View style={styles.centerContainer}>
                <TextComponent style={{ color: colors.text.primary }}>
                    {vocabularyList.length === 0 ? "Lista de vocabulário vazia." : "Erro ao carregar dados da imagem atual."}
                </TextComponent>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
            <View style={styles.container}>
                {/* Header Info */}
                <View style={styles.header}>
                    <TextComponent weight='bold' style={{ color: colors.text.primary }}>
                        Imagem {currentIndex + 1} de {whatIsImageState.length}
                    </TextComponent>
                    {/* Score display can be added if needed */}
                    {/* <TextComponent weight='bold' style={{ color: colors.secondaryText }}>Pontos: {score}</TextComponent> */}
                </View>

                {/* Image and Grid Overlay */}
                <View style={[styles.imageOuterContainer, { width: imageContainerSize, height: imageContainerSize }]}>
                    {currentImageData?.imageURL ? (
                        <Image
                            source={{ uri: currentImageData.imageURL }}
                            style={styles.image} // Absolute position fill
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.image, styles.imagePlaceholder]}>
                            <TextComponent style={{color: colors.text.primary}}>Sem Imagem</TextComponent>
                        </View>
                    )}
                    {/* Grid Overlay */}
                    <View style={styles.gridOverlayContainer}>
                        {gridSquaresRevealed.map((revealed, index) => (
                            <GridSquare
                                key={index}
                                isRevealed={revealed}
                                size={gridSquareSize}
                                index={index}
                                colors={colors}
                            />
                        ))}
                    </View>
                </View>

                {/* Buttons and Options Area */}
                <View style={styles.controlsContainer}>
                    {/* Guess Button */}
                    {!isRoundOver && !showOptions && (
                        <TouchableOpacity style={[styles.button, styles.guessButton, { backgroundColor: colors.cards.secondary }]} onPress={handleGuess}>
                            <TextComponent style={styles.buttonText}>Chutar</TextComponent>
                        </TouchableOpacity>
                    )}

                    {/* Options Buttons */}
                    {showOptions && (
                        <View style={styles.optionsGrid}>
                            {currentImageData?.options?.map((option: string, index: number) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.button, styles.optionButton, { backgroundColor: colors.cards.secondary }]}
                                    onPress={() => handleOptionSelect(option)}
                                >
                                    <TextComponent style={[styles.buttonText, { color: colors.text.primary }]}>{option}</TextComponent>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Result Message */}
                    {isRoundOver && guessedCorrectly !== null && (
                         <AnimatedView entering={FadeIn.duration(500)}>
                             <TextComponent
                                 size="large"
                                 weight="bold"
                                 style={{ color: guessedCorrectly ? colors.cards.primary : colors.text.primary, marginTop: 15 }}
                             >
                                 {guessedCorrectly ? '👏 Isso aí!' : '✖ Ops!'}
                             </TextComponent>
                         </AnimatedView>
                    )}

                    {/* Next/Finish/Play Again Buttons */}
                    {isRoundOver && (
                        <View style={styles.endRoundButtons}>
                            {currentIndex + 1 < whatIsImageState.length ? (
                                // Next Image Button
                                <TouchableOpacity
                                    style={[styles.button, { backgroundColor: guessedCorrectly ? colors.cards.primary : colors.cards.secondary }]}
                                    onPress={handleNextImage}
                                >
                                    <TextComponent style={styles.buttonText}>Próxima Imagem</TextComponent>
                                </TouchableOpacity>
                            ) : (
                                // End of Game Buttons
                                <View style={styles.endGameButtonsContainer}>
                                    <TouchableOpacity
                                        style={[styles.button, styles.endGameButton, { backgroundColor: colors.cards.secondary }]}
                                        onPress={handleFinish} // Use the finish handler
                                    >
                                        <TextComponent style={[styles.buttonText, { color: colors.text.primary }]}>Finalizar</TextComponent>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.button, styles.endGameButton, { backgroundColor: colors.cards.secondary }]}
                                        onPress={handlePlayAgain}
                                    >
                                        <TextComponent style={styles.buttonText}>Jogar Novamente</TextComponent>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </ScrollView>
    );
};


// --- Styles ---
// (Styles need significant adjustments for the grid and layout)
const styles = StyleSheet.create({
    scrollViewContent: {
        flexGrow: 1, // Ensure ScrollView content can grow
        alignItems: 'center', // Center content horizontally
    },
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 20, // Main container padding
        width: '100%',
    },
    centerContainer: { // Used for Loading/Error states
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    imageOuterContainer: {
        // width/height set dynamically
        marginBottom: 20,
        backgroundColor: '#ccc', // Placeholder bg color
        position: 'relative', // Needed for overlay positioning
        overflow: 'hidden', // Clip grid squares
        borderRadius: 8, // Optional rounding
    },
    image: {
        ...StyleSheet.absoluteFillObject, // Make image fill container
        width: undefined, // Required for absoluteFillObject
        height: undefined,
    },
    imagePlaceholder: {
       backgroundColor: '#e0e0e0',
       justifyContent: 'center',
       alignItems: 'center',
    },
    gridOverlayContainer: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    gridSquare: {
        // width/height set dynamically
        // backgroundColor set dynamically via state/animation
        borderWidth: 0.5, // Very thin border to see squares
        borderColor: 'rgba(50,50,50,0.2)', // Subtle border color
    },
    controlsContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 10, // Space below image/grid
        minHeight: 150, // Reserve space for controls area
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 15,
        width: '100%', // Take full width for wrapping
        gap: 10, // Use gap for spacing if available, otherwise use margin on buttons
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 25,
        margin: 5, // Add margin if not using gap
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 120, // Minimum button width
        elevation: 2,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
    },
    guessButton: {
        // Specific styles if needed
    },
    optionButton: {
        minWidth: '40%', // Ensure options take up reasonable space
        maxWidth: '80%',
    },
    buttonText: {
        color: '#FFFFFF', // Default button text color
        fontWeight: 'bold',
        fontSize: 16,
        textAlign: 'center',
    },
    endRoundButtons: {
        marginTop: 20,
        width: '100%',
        alignItems: 'center',
    },
    endGameButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '90%',
        marginTop: 10,
    },
    endGameButton: {
         minWidth: 140, // Wider buttons for end game
    },
});

export default WhatIsImage;