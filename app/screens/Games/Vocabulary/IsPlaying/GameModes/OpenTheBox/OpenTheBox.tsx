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
    useAnimatedStyle,
    withTiming,
    withSpring,
    FadeIn,
    LinearTransition
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import { db } from '@/config/firebase'; // Import Firebase db instance
import { doc, getDoc } from 'firebase/firestore'; // Import Firestore functions
import { useLocalSearchParams } from 'expo-router'; // To get gameID from navigation

import { useTheme } from '@/constants/useTheme';
import { TextComponent } from '@/components/TextComponent';
import { useToast } from '@/components/Toast/useToast';
import { VocabularyItem } from '@/types';
import externalOptions from '@/app/screens/Games/Vocabulary/Database/options.json';
import Container from '@/components/ContainerComponent';

interface BoxState extends VocabularyItem {
    status: 'pending' | 'correct' | 'wrong';
    clickedOption?: string | null;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedView = Animated.createAnimatedComponent(View);

interface BoxItemProps {
    box: BoxState;
    index: number;
    isSelectedForAnimation: boolean;
    onPress: (index: number) => void;
    colors: ReturnType<typeof useTheme>['colors'];
    boxSize: number;
}

const BoxItem: React.FC<BoxItemProps> = React.memo(({
    box, index, isSelectedForAnimation, onPress, colors, boxSize
}) => {
    // ... (BoxItem implementation remains exactly the same)
    const isAnswered = box.status !== 'pending';
    const boxColor =
        box.status === 'correct' ? colors.colors.tealLight :
        box.status === 'wrong' ? colors.colors.deepOrangeLight :
        colors.background.list;
    const textColor = isAnswered ? colors.colors.white : colors.colors.white;

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: withSpring(isSelectedForAnimation ? 1.1 : 1) },
                { rotateY: withTiming(isSelectedForAnimation ? '180deg' : '0deg', { duration: 300 }) }
            ],
            opacity: withTiming(isAnswered ? 0.6 : 1, { duration: 200 }),
        };
    }, [isSelectedForAnimation, isAnswered]);

    return (
        <AnimatedTouchable
            key={box.vocab + index}
            style={[
                styles.box,
                { width: boxSize, height: boxSize },
                { backgroundColor: boxColor },
                animatedStyle,
            ]}
            onPress={() => onPress(index)}
            disabled={isAnswered}
            layout={LinearTransition.springify()}
            entering={FadeIn.duration(400).delay(index * 50)}
        >
            <TextComponent style={[styles.boxText, { fontSize: boxSize * 0.4, color: textColor }]}>
                {index + 1}
            </TextComponent>
        </AnimatedTouchable>
    );
});


// Main Component
const OpenTheBox: React.FC = () => {
    const params = useLocalSearchParams();
    const gameID = params.gameID as string; // Make sure gameID is passed correctly in navigation

    const { colors } = useTheme();
    const { showToast } = useToast();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Start loading
    const [boxStates, setBoxStates] = useState<BoxState[]>([]); // Holds the game state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState<number | null>(null);
    const [selectedIndexForAnimation, setSelectedIndexForAnimation] = useState<number | null>(null);
    const [currentOptions, setCurrentOptions] = useState<string[]>([]);

    // Derive AsyncStorage key from gameID
    const storageKey = useMemo(() => {
        return gameID ? `openTheBox_gameState_${gameID}` : null;
    }, [gameID]);

    // --- Effect 1: Load initial game state ---
    useEffect(() => {
        const loadGame = async () => {
            if (!gameID) {
                setError("ID do jogo não fornecido na navegação.");
                setIsLoading(false);
                return;
            }
            if (!storageKey) {
                setError("Chave de armazenamento inválida."); // Should not happen if gameID exists
                setIsLoading(false);
                return;
            }

            console.log(`Tentando carregar jogo com ID: ${gameID} (Chave: ${storageKey})`);
            setIsLoading(true);
            setError(null);
            setBoxStates([]); // Clear previous state while loading

            try {
                // 1. Try loading from AsyncStorage
                const savedStateJSON = await AsyncStorage.getItem(storageKey);
                if (savedStateJSON) {
                    const savedState: BoxState[] = JSON.parse(savedStateJSON);
                    // Basic validation: check if it's an array and has items matching expected structure (optional but good)
                    if (Array.isArray(savedState) && savedState.length > 0 && 'vocab' in savedState[0] && 'status' in savedState[0]) {
                        console.log(`Jogo ${gameID} carregado do armazenamento local.`);
                        setBoxStates(savedState);
                        setIsLoading(false);
                        return; // Successfully loaded, exit
                    } else {
                        console.warn(`Dados salvos localmente para ${gameID} são inválidos ou vazios. Removendo.`);
                        await AsyncStorage.removeItem(storageKey); // Clear invalid data
                    }
                }

                console.log(`Nenhum jogo salvo encontrado para ${gameID}. Buscando do Firestore...`);

                const vocabDocRef = doc(db, 'VocabularyGame', gameID);
                const vocabDocSnap = await getDoc(vocabDocRef);

                if (!vocabDocSnap.exists()) {
                    throw new Error(`Jogo de vocabulário com ID ${gameID} não encontrado no Firestore.`);
                }

                const vocabData = vocabDocSnap.data();
                const fetchedVocabularies = vocabData?.vocabularies; // Assuming the array field is named 'vocabularies'

                if (!fetchedVocabularies || !Array.isArray(fetchedVocabularies) || fetchedVocabularies.length === 0) {
                    throw new Error(`Lista de vocabulário do Firestore (ID: ${gameID}) está vazia ou inválida.`);
                }

                // 3. Initialize state from fetched data
                const initialBoxStates: BoxState[] = fetchedVocabularies.map((item: VocabularyItem) => ({
                    // Ensure VocabularyItem has vocab, imageURL, etc.
                    vocab: item.vocab,
                    imageURL: item.imageURL,
                    status: 'pending', // Initial status
                    clickedOption: null,
                }));

                // 4. Save the newly initialized state to AsyncStorage
                await AsyncStorage.setItem(storageKey, JSON.stringify(initialBoxStates));
                console.log(`Novo jogo ${gameID} iniciado do Firestore e salvo localmente.`);
                setBoxStates(initialBoxStates); // Update component state
                setIsLoading(false);

            } catch (err: any) {
                console.error(`Erro ao carregar/inicializar o jogo ${gameID}:`, err);
                setError(`Falha ao carregar o jogo: ${err.message || 'Erro desconhecido'}`);
                setIsLoading(false);
            }
        };

        loadGame();

    }, [gameID, storageKey]);

    useEffect(() => {
        const saveState = async () => {
            if (!isLoading && boxStates.length > 0 && storageKey) {
                try {
                    await AsyncStorage.setItem(storageKey, JSON.stringify(boxStates));
                } catch (err) {
                    console.error(`Erro ao salvar o estado do jogo ${gameID} no AsyncStorage:`, err);
                }
            }
        };

        if (!isLoading) {
             saveState();
        }
    }, [boxStates, isLoading, storageKey]);

    const generateOptions = useCallback((correctVocab: string): string[] => {
        if (!correctVocab) return [];
        // Filter externalOptions correctly
        const filteredOptions = externalOptions.filter(
            (option: string) => option.toLowerCase() !== correctVocab.toLowerCase()
        );
        // Shuffle and pick 2 incorrect options
        const incorrectOptions = filteredOptions.sort(() => 0.5 - Math.random()).slice(0, 2);
        // Combine and shuffle final options
        return [correctVocab, ...incorrectOptions].sort(() => 0.5 - Math.random());
    }, []); // externalOptions is static, so no dependency needed unless it changes

    const handleBoxClick = useCallback((index: number) => {
        // No changes needed here
        if (boxStates[index]?.status !== 'pending') return;
        setSelectedIndexForAnimation(index);
        const currentItem = boxStates[index];
        if (currentItem) {
            const options = generateOptions(currentItem.vocab);
            setCurrentOptions(options);
            setCurrentIndex(index);
            setTimeout(() => {
                setIsModalOpen(true);
                setSelectedIndexForAnimation(null);
            }, 300);
        }
    }, [boxStates, generateOptions]); // Depends on current boxStates

    const handleOptionClick = useCallback((selectedOption: string) => {
        // This function updates boxStates, triggering the save effect
        if (currentIndex === null) return;

        const correctItem = boxStates[currentIndex];
        const isCorrect = selectedOption.toLowerCase() === correctItem.vocab.toLowerCase();
        const newStatus = isCorrect ? 'correct' : 'wrong';

        // Update the state - this will trigger the save useEffect
        setBoxStates(currentBoxes =>
            currentBoxes.map((box, idx) =>
                idx === currentIndex ? { ...box, status: newStatus, clickedOption: selectedOption } : box
            )
        );

        setIsModalOpen(false);
        setCurrentIndex(null);
        setCurrentOptions([]);
        showToast(isCorrect ? '👏 Isso aí!' : '✖ Ops!', isCorrect ? 'success' : 'error', 1000, 'bottom');

    }, [currentIndex, boxStates, showToast]); 

    const modalAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(isModalOpen ? 1 : 0, { duration: 250 }),
            transform: [{ scale: withTiming(isModalOpen ? 1 : 0.9, { duration: 250 }) }]
        };
    }, [isModalOpen]);

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

    if (error) {
        return (
             <View style={styles.centerContainer}>
                <TextComponent weight="semibold" style={{ color: colors.text.primary, textAlign: 'center', marginBottom: 10 }}>
                    Erro
                </TextComponent>
                <TextComponent style={{ color: colors.text.secondary, textAlign: 'center', marginBottom: 10 }}>
                    {error}
                </TextComponent>
             </View>
        )
    }

    const screenWidth = Dimensions.get('window').width;
    const containerPadding = 15;
    const numColumns = 3;
    const boxSpacing = 10;
    const totalSpacing = (numColumns - 1) * boxSpacing;
    const availableWidth = screenWidth - (containerPadding * 2) - totalSpacing;
    const boxSize = Math.max(50, Math.floor(availableWidth / numColumns));

    if(isModalOpen) {
        return (
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
                    <AnimatedView style={[styles.modalContainer, { backgroundColor: colors.background.list, borderRadius: 8 }, modalAnimatedStyle]}>
                        {currentIndex !== null && boxStates[currentIndex] ? (
                             <ScrollView contentContainerStyle={styles.modalScrollViewContent}>
                                <TextComponent size="xLarge" weight="bold" style={[styles.modalTitle, { color: colors.text.primary }]}>
                                    O que é isto?
                                </TextComponent>
                                <Image
                                    source={{ uri: boxStates[currentIndex].imageURL || undefined }}
                                    style={styles.modalImage}
                                    resizeMode="contain"
                                />
                                <View style={styles.optionsContainer}>
                                    {currentOptions.map((option, optionIndex) => (
                                        <TouchableOpacity
                                            key={optionIndex}
                                            style={[styles.optionButton, { backgroundColor: colors.background.listSecondary }]}
                                            onPress={() => handleOptionClick(option)}
                                        >
                                            <TextComponent weight="bold" style={[{ color: colors.colors.white }]}>
                                                {option}
                                            </TextComponent> 
                                        </TouchableOpacity>
                                    ))}
                                </View>
                             </ScrollView>
                        ) : (
                            <ActivityIndicator color={colors.text.primary} />
                        )}
                    </AnimatedView>
                </View>
            </Modal>
        )
    }

    return (
        <Container >
            {boxStates.length > 0 ? (
                <View style={styles.container}>
                    <View style={styles.gridContainer}>
                        {boxStates.map((box, index) => (
                            <BoxItem
                                key={`${box.vocab}-${index}-${box.status}`}
                                box={box}
                                index={index}
                                isSelectedForAnimation={selectedIndexForAnimation === index}
                                onPress={handleBoxClick}
                                colors={colors}
                                boxSize={boxSize}
                            />
                        ))}
                    </View>
                </View>
            ) : (
                <View style={styles.centerContainer}>
                    <TextComponent style={{ color: colors.text.secondary }}>
                        Nenhum item encontrado para este jogo.
                    </TextComponent>
                </View>
            )}
        </Container>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridScrollViewContainer: {
        alignItems: 'center',
        width: '100%',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '80%',
        alignItems: 'center',
    },
    box: {
        margin: 8,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
    },
    boxText: {
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        maxWidth: 500,
        maxHeight: '80%',
        paddingVertical: 25,
        paddingHorizontal: 20,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalScrollViewContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    modalTitle: {
        marginBottom: 15,
        textAlign: 'center',
    },
    modalImage: {
        width: Dimensions.get('window').width * 0.6,
        height: Dimensions.get('window').width * 0.6,
        maxHeight: 250,
        borderRadius: 10,
        marginBottom: 25,
        backgroundColor: '#eee', // Background while loading image
    },
    optionsContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionButton: {
        width: '100%',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 4,
        marginVertical: 6,
        alignItems: 'center',
        elevation: 2,
    }
});

export default OpenTheBox;