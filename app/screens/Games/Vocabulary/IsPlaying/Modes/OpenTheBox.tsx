// src/components/Games/Modes/OpenTheBox.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Dimensions,
    Modal,
    ScrollView
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withDelay,
    Layout,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';

import { db } from '@/config/firebase'; // Adjust path
import { useTheme } from '@/constants/useTheme'; // Adjust path
import { TextComponent } from '@/components/TextComponent'; // Adjust path
import { useToast } from '@/components/Toast/useToast'; // Adjust path
import { VocabularyItem } from '@/types'; // Import shared type
import externalOptions from '@/app/screens/Games/Vocabulary/Database/options.json'; // Adjust path as needed

// --- Interfaces ---
interface BoxState extends VocabularyItem {
    status: 'pending' | 'correct' | 'wrong';
    clickedOption?: string | null;
}

interface FirestoreBoxDataItem {
    vocab: string;
    imageURL?: string;
    clickedOption?: string | null;
    isCorrect?: boolean | null;
}

interface OpenTheBoxProps {
    gameSessionId: string | null;
    isSingleplayer: boolean;
    vocabularyList: VocabularyItem[];
}

// --- Animated Components ---
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedView = Animated.createAnimatedComponent(View);

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Definition for the individual BoxItem component
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
interface BoxItemProps {
    box: BoxState;
    index: number;
    isSelectedForAnimation: boolean;
    onPress: (index: number) => void;
    colors: ReturnType<typeof useTheme>['colors'];
    boxSize: number;
}

const BoxItem: React.FC<BoxItemProps> = React.memo(({
    box,
    index,
    isSelectedForAnimation,
    onPress,
    colors,
    boxSize
}) => {
    const isAnswered = box.status !== 'pending';
    // Determine colors based on state
    const boxColor =
        box.status === 'correct' ? colors.cards.primary : // Use success color for correct
        box.status === 'wrong' ? colors.cards.secondary : // Use error color for wrong
        colors.cards.secondary; // Default pending color
    const textColor = isAnswered ? colors.cards.primary : colors.text.primary; // Text color contrast

    // useAnimatedStyle hook is now safely at the top level of BoxItem
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: withSpring(isSelectedForAnimation ? 1.1 : 1) },
                { rotateY: withTiming(isSelectedForAnimation ? '180deg' : '0deg', { duration: 300 }) }
            ],
        };
    }, [isSelectedForAnimation]);

    return (
        <AnimatedTouchable
            key={box.vocab + index} // Consider using a more unique ID from box if available
            style={[
                styles.box, // Use styles defined below in the main styles object
                { width: boxSize, height: boxSize },
                { backgroundColor: boxColor },
                animatedStyle,
                isAnswered && styles.answeredBox // Apply answered style if needed
            ]}
            onPress={() => onPress(index)}
            disabled={isAnswered}
            layout={Layout.springify()} // Animate layout changes
            entering={FadeIn.duration(400).delay(index * 50)} // Staggered entry animation
        >
            <TextComponent style={[styles.boxText, { fontSize: boxSize * 0.4, color: textColor }]}>
                {index + 1}
            </TextComponent>
        </AnimatedTouchable>
    );
});
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// End of BoxItem component definition
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


// ===============================================================
// Main OpenTheBox Component
// ===============================================================
const OpenTheBox: React.FC<OpenTheBoxProps> = ({
    gameSessionId,
    isSingleplayer,
    vocabularyList,
}) => {
    const { colors } = useTheme();
    const { showToast } = useToast();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [boxStates, setBoxStates] = useState<BoxState[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState<number | null>(null);
    const [selectedIndexForAnimation, setSelectedIndexForAnimation] = useState<number | null>(null);
    const [currentOptions, setCurrentOptions] = useState<string[]>([]);

    // Firestore Ref Memoization
    const openTheBoxDocRef = useMemo(() => {
        if (!isSingleplayer && gameSessionId) {
            return doc(db, 'games', gameSessionId, 'modes', 'openthebox');
        }
        return null;
    }, [isSingleplayer, gameSessionId]);

    // Effect to Initialize/Reset boxStates based on props
    useEffect(() => {
        console.log("OpenTheBox: Initializing/Updating state from props. Count:", vocabularyList.length);
        setIsLoading(true);
        setError(null); // Reset error on init
        if (vocabularyList && vocabularyList.length > 0) {
            setBoxStates(
                vocabularyList.map(item => ({
                    ...item,
                    status: 'pending',
                    clickedOption: null,
                }))
            );
            if (isSingleplayer) {
                setIsLoading(false); // Singleplayer loads instantly from props
            }
            // For multiplayer, loading stops when listener provides data
        } else {
            setBoxStates([]);
            setIsLoading(false);
            // Only show warning if list is empty *after* initial mount potentially
            // Avoid showing it if just switching modes briefly
            // if (gameSessionId) { // Check if game context is active
            //    showToast("Lista de vocabulário vazia.", "warning");
            // }
        }
    }, [vocabularyList, isSingleplayer, gameSessionId]); // Rerun if base list or mode changes


    // Effect for Multiplayer Firestore Listener
    useEffect(() => {
        if (isSingleplayer || !openTheBoxDocRef) {
            return;
        }
        console.log("OpenTheBox: Attaching Multiplayer Listener:", openTheBoxDocRef.path);
        // Don't necessarily set isLoading=true here unless we know we need fresh data
        // Let the initialization effect handle initial loading state.

        const unsubscribe = onSnapshot(openTheBoxDocRef, (docSnap) => {
            setIsLoading(true); // Set loading true when processing snapshot
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("OpenTheBox: Firestore Snapshot Received:", data);
                const firestoreVocabArray = data?.vocabularydata as FirestoreBoxDataItem[] | undefined;

                // Compare Firestore data length with prop length for safety
                if (firestoreVocabArray && firestoreVocabArray.length === vocabularyList.length) {
                    setBoxStates(currentStates =>
                        currentStates.map((localState, index) => {
                            const firestoreState = firestoreVocabArray[index];
                            if (!firestoreState) return localState;

                            const newStatus =
                                firestoreState.isCorrect === true ? 'correct' :
                                firestoreState.isCorrect === false ? 'wrong' :
                                'pending';

                            if (localState.status !== newStatus || localState.clickedOption !== firestoreState.clickedOption) {
                                return { ...localState, status: newStatus, clickedOption: firestoreState.clickedOption ?? null };
                            }
                            return localState;
                        })
                    );
                    setError(null); // Clear previous errors on successful sync
                } else if (firestoreVocabArray) {
                     console.error("OpenTheBox Error: Firestore data length mismatch!");
                     setError("Erro de sincronização (tamanho dos dados).");
                } else {
                    console.log("OpenTheBox: Firestore 'vocabularydata' missing/empty.");
                    // If vocab list from props exists, assume Firestore needs init
                    if (vocabularyList.length > 0) {
                         showToast("Aguardando inicialização do jogo no servidor...", "info");
                         // Consider setting an error or specific state? For now, just toast.
                    }
                }
            } else {
                console.warn("OpenTheBox: Firestore document modes/openthebox does not exist.");
                setError("Modo 'Caixa Surpresa' não iniciado."); // Set error state
            }
            setIsLoading(false); // Stop loading after processing snapshot or finding it doesn't exist
        }, (error) => {
            console.error("OpenTheBox: Error listening to Firestore:", error);
            setError("Erro de conexão com o jogo.");
            setIsLoading(false);
        });

        return () => {
            console.log("OpenTheBox: Detaching Multiplayer Listener.");
            unsubscribe();
        };
        // Depend on ref and base vocab list length to potentially re-attach/re-validate if base structure changes
    }, [isSingleplayer, openTheBoxDocRef, vocabularyList.length]);

    // Callback to generate options
    const generateOptions = useCallback((correctVocab: string): string[] => {
        if (!correctVocab) return [];
        const filteredOptions = externalOptions.filter(
            (option: string) => option.toLowerCase() !== correctVocab.toLowerCase()
        );
        const incorrectOptions = filteredOptions.sort(() => 0.5 - Math.random()).slice(0, 2);
        return [correctVocab, ...incorrectOptions].sort(() => 0.5 - Math.random());
    }, [externalOptions]); // No dynamic dependencies needed if externalOptions is static import

    // Callback for clicking a box
    const handleBoxClick = useCallback((index: number) => {
        if (boxStates[index]?.status !== 'pending') return;

        setSelectedIndexForAnimation(index); // Trigger animation

        const currentItem = boxStates[index];
        if (currentItem) {
            const options = generateOptions(currentItem.vocab);
            setCurrentOptions(options);
            setCurrentIndex(index);

            setTimeout(() => {
                setIsModalOpen(true);
                setSelectedIndexForAnimation(null); // Reset animation state
            }, 300);
        }
    }, [boxStates, generateOptions]);

    // Callback for clicking an option in the modal
    const handleOptionClick = useCallback(async (selectedOption: string) => {
        if (currentIndex === null) return;

        const correctItem = boxStates[currentIndex];
        // Ensure case-insensitive comparison for correctness
        const isCorrect = selectedOption.toLowerCase() === correctItem.vocab.toLowerCase();
        const newStatus = isCorrect ? 'correct' : 'wrong';

        // Optimistic UI Update
        setBoxStates(currentBoxes =>
            currentBoxes.map((box, index) =>
                index === currentIndex ? { ...box, status: newStatus, clickedOption: selectedOption } : box
            )
        );
        setIsModalOpen(false);
        setCurrentIndex(null);
        setCurrentOptions([]);

        showToast(isCorrect ? '👏 Isso aí!' : '✖ Ops!', isCorrect ? 'success' : 'error', 1000);

        // Update Firestore (Multiplayer only)
        if (!isSingleplayer && openTheBoxDocRef) {
            try {
                const fsDoc = await getDoc(openTheBoxDocRef);
                if (fsDoc.exists()) {
                    const fsData = fsDoc.data();
                    let fsVocabArray = fsData?.vocabularydata as FirestoreBoxDataItem[] | undefined;

                    // Safety check / potential re-initialization (use with caution)
                    if (!fsVocabArray || fsVocabArray.length !== vocabularyList.length) {
                         console.warn("OpenTheBox: Firestore data mismatch, attempting to use structure from props.");
                         fsVocabArray = vocabularyList.map(v => ({ vocab: v.vocab, imageURL: v.imageURL, clickedOption: null, isCorrect: null }));
                         // This part is risky, better handled by an explicit initialization step
                    }

                    if (fsVocabArray && fsVocabArray.length > currentIndex) {
                        const updatedFsVocab = [...fsVocabArray];
                        // Update the specific item
                        updatedFsVocab[currentIndex] = {
                            ...(updatedFsVocab[currentIndex] || {}), // Keep potential other fields if they exist
                            vocab: correctItem.vocab, // Ensure base data is present
                            imageURL: correctItem.imageURL,
                            clickedOption: selectedOption,
                            isCorrect: isCorrect,
                        };
                        await updateDoc(openTheBoxDocRef, { vocabularydata: updatedFsVocab });
                        console.log("OpenTheBox: Firestore updated for index", currentIndex);
                    }
                } else {
                     console.error("OpenTheBox: Firestore doc missing on update attempt.");
                }
            } catch (error) {
                console.error("OpenTheBox: Error updating Firestore:", error);
                showToast("Erro ao salvar resposta no servidor.", "error");
            }
        }
    }, [currentIndex, boxStates, isSingleplayer, openTheBoxDocRef, showToast, vocabularyList]);

    // --- UI Render ---

    // Animated style for Modal container
    const modalAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(isModalOpen ? 1 : 0, { duration: 250 }),
            transform: [
                { scale: withTiming(isModalOpen ? 1 : 0.9, { duration: 250 }) }
            ]
        };
    }, [isModalOpen]); // Dependency array includes isModalOpen

    // Loading State
    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.text.primary} />
                <TextComponent style={{ marginTop: 10, color: colors.text.primary }}>
                    Carregando Caixa Surpresa...
                </TextComponent>
            </View>
        );
    }

    // Error State
    if (error) {
        return (
             <View style={styles.centerContainer}>
                <TextComponent style={{ color: colors.cards.primary, textAlign: 'center', marginBottom: 10 }}>{error}</TextComponent>
                 {/* Optionally add a retry button */}
             </View>
        )
    }

    // Empty State
     if (boxStates.length === 0) {
        return (
             <View style={styles.centerContainer}>
                <TextComponent style={{ color: colors.text.primary }}>Nenhum item encontrado para este jogo.</TextComponent>
             </View>
        )
    }

    // Calculate boxSize here based on current dimensions
    const screenWidth = Dimensions.get('window').width;
    const containerPadding = 15;
    const numColumns = 3; // Or make dynamic based on screen size / number of boxes
    const boxSpacing = 10;
    const totalSpacing = (numColumns - 1) * boxSpacing;
    const availableWidth = screenWidth - (containerPadding * 2) - totalSpacing;
    const boxSize = Math.max(50, availableWidth / numColumns); // Ensure minimum size


    // Main Game Render
    return (
        <View style={styles.container}>
            {/* Box Grid */}
            <ScrollView contentContainerStyle={styles.gridScrollViewContainer}>
                <View style={styles.gridContainer}>
                    {boxStates.map((box, index) => (
                        <BoxItem
                            key={box.vocab + '-' + index} // Key needs to be unique
                            box={box}
                            index={index}
                            isSelectedForAnimation={selectedIndexForAnimation === index}
                            onPress={handleBoxClick}
                            colors={colors}
                            boxSize={boxSize}
                        />
                    ))}
                </View>
            </ScrollView>

            {/* Modal */}
            <Modal
                transparent={true}
                visible={isModalOpen}
                animationType="none"
                onRequestClose={() => {
                    setIsModalOpen(false);
                    setCurrentIndex(null);
                    setCurrentOptions([]);
                }}
            >
                <View style={styles.modalOverlay}>
                    <AnimatedView style={[styles.modalContainer, { backgroundColor: colors.cards.primary }, modalAnimatedStyle]}>
                        {/* Check if data for modal is ready */}
                        {currentIndex !== null && boxStates[currentIndex] ? (
                             <ScrollView contentContainerStyle={styles.modalScrollViewContent}>
                                <TextComponent size="xLarge" weight="bold" style={[styles.modalTitle, { color: colors.text.primary }]}>
                                    O que é isto?
                                </TextComponent>
                                <Image
                                    source={{ uri: boxStates[currentIndex].imageURL || undefined }} // Handle potentially missing URL
                                    style={styles.modalImage}
                                    resizeMode="contain"
                                    // Add a placeholder or error style for Image
                                />
                                <View style={styles.optionsContainer}>
                                    {currentOptions.map((option, optionIndex) => (
                                        <TouchableOpacity
                                            key={optionIndex}
                                            style={[styles.optionButton, { backgroundColor: colors.cards.secondary }]}
                                            onPress={() => handleOptionClick(option)}
                                        >
                                            <TextComponent style={[styles.optionText, { color: colors.text.primary }]}>
                                                {option}
                                            </TextComponent>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                             </ScrollView>
                        ) : (
                             // Optional: Show loading or placeholder inside modal if index selected but data not ready
                            <ActivityIndicator color={colors.text.primary} />
                        )}
                    </AnimatedView>
                </View>
            </Modal>
        </View>
    );
};

// --- Styles ---
// (Styles object remains largely the same as previously provided,
// ensure styles.box, styles.answeredBox, styles.boxText are defined for BoxItem)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 15, // Horizontal padding only for container
        paddingTop: 10, // Add some top padding
        alignItems: 'center',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 15,
    },
    gridScrollViewContainer: {
        alignItems: 'center', // Center the grid container if it's narrower than ScrollView
        paddingBottom: 20, // Space at the bottom
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start', // Align boxes to the start, rely on margin/gap for spacing
        width: '100%', // Take full width for wrapping calculation
    },
    box: {
        // width/height set via props now
        marginRight: 10, // boxSpacing
        marginBottom: 10, // boxSpacing
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        borderWidth: 1, // Add a subtle border
        borderColor: 'rgba(0,0,0,0.1)', // Subtle border color
    },
    // Remove nth-child logic - handle spacing via marginRight/marginBottom on all items
    answeredBox: {
        opacity: 0.6, // Fade answered boxes more
        elevation: 1, // Reduce elevation for answered
    },
    boxText: {
        // fontSize set via props now
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)', // Darker overlay
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        maxWidth: 500,
        maxHeight: '80%',
        borderRadius: 20, // More rounded modal
        paddingVertical: 25, // Adjust padding
        paddingHorizontal: 20,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalScrollViewContent: {
        alignItems: 'center',
        width: '100%', // Ensure content takes width for alignment
        paddingBottom: 20,
    },
    modalTitle: {
        marginBottom: 15,
        textAlign: 'center',
    },
    modalImage: {
        width: Dimensions.get('window').width * 0.6,
        height: Dimensions.get('window').width * 0.6,
        maxHeight: 250, // Slightly smaller max height
        borderRadius: 10,
        marginBottom: 25, // More space below image
        backgroundColor: '#eee', // Background for image loading/placeholder area
    },
    optionsContainer: {
        width: '100%',
        alignItems: 'center',
    },
    optionButton: {
        width: '95%', // Slightly wider buttons
        paddingVertical: 14, // Taller buttons
        paddingHorizontal: 15,
        borderRadius: 10, // More rounded buttons
        marginVertical: 6, // Adjust spacing
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)', // Subtle border
    },
    optionText: {
        fontSize: 17, // Slightly larger font
        fontWeight: '500',
    },
});

export default OpenTheBox;