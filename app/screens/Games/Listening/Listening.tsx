// ListeningPractice.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Keyboard,
    Platform,
    KeyboardAvoidingView, // Import Keyboard
} from 'react-native';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase'; // Adjust import path
import AudioPlayer from '@/components/Player/Player'; // Import the new component
import { useToast } from '@/components/Toast/useToast';
import TopBarComponent from '@/components/TopBarComponent';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import Container from '@/components/ContainerComponent';
import { TextComponent } from '@/components/TextComponent';
import { useTheme } from '@/constants/useTheme';
import { Colors } from '@/constants/Colors';
import InputComponent from '@/components/InputComponent';
import Loading from '@/components/Animation/Loading';

interface WordInput {
    word: string;
    isInput: boolean;
    userAnswer: string;
    isCorrect: boolean | null;
}

interface NivelamentoDocument {
    id: string;
    transcript: string;
    url: string;
    name: string;
    language: string;
}

interface AudiosGroupedByLanguage {
    [language: string]: NivelamentoDocument[];
}

// Define available playback rates
const PLAYBACK_RATES = [0.5, 1.0, 1.5, 2.0];

interface ListeningPracticeProps {
    onClose: () => void;
}

export default function ListeningPractice({ onClose }: ListeningPracticeProps) {
    const [audiosByLanguage, setAudiosByLanguage] = useState<AudiosGroupedByLanguage>({});
    const [selectedAudio, setSelectedAudio] = useState<NivelamentoDocument | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [wordInputs, setWordInputs] = useState<WordInput[]>([]);
    const [inputsDisabled, setInputsDisabled] = useState(false);
    const { showToast } = useToast();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const { colors, isDark } = useTheme();
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    // Bottom Sheet state
    const [searchText, setSearchText] = useState('');
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

    // Player state
    const [playbackRate, setPlaybackRate] = useState(1.0);

    // Bottom sheet snap points
    const snapPoints = useMemo(() => ['40%', '60%', '90%'], []); // Adjusted snap points

    // Get unique languages for filtering
    const availableLanguages = useMemo(() => {
        return Object.keys(audiosByLanguage).sort();
    }, [audiosByLanguage]);

    // Flatten audio list for original data source
    const allAudiosList = useMemo(() => {
        return Object.entries(audiosByLanguage).reduce<NivelamentoDocument[]>((acc, [, audios]) => {
            return [...acc, ...audios];
        }, []);
    }, [audiosByLanguage]);

    // Filtered audio list based on search and language selection
    const filteredAudiosList = useMemo(() => {
        return allAudiosList.filter(audio => {
            const searchLower = searchText.toLowerCase();
            const nameMatch = audio.name.toLowerCase().includes(searchLower);
            const transcriptMatch = audio.transcript.toLowerCase().includes(searchLower);
            const languageMatch = selectedLanguages.length === 0 || selectedLanguages.includes(audio.language);

            return (nameMatch || transcriptMatch) && languageMatch;
        });
    }, [allAudiosList, searchText, selectedLanguages]);

    // Handle right icon click to open bottom sheet
    const handleRightIconPress = useCallback(() => {
        Keyboard.dismiss(); // Dismiss keyboard if open
        bottomSheetRef.current?.snapToIndex(1);
    }, []);

    // Handle audio selection from bottom sheet
    const handleAudioSelect = useCallback((audio: NivelamentoDocument) => {
        setSelectedAudio(audio);
        prepareWordInputs(audio.transcript);
        setPlaybackRate(1.0); // Reset playback rate on new audio select
        bottomSheetRef.current?.close();
    }, []);

    // Toggle language selection
    const toggleLanguage = (language: string) => {
        setSelectedLanguages(prev =>
            prev.includes(language)
                ? prev.filter(lang => lang !== language)
                : [...prev, language]
        );
    };

    // --- NEW useEffect for Keyboard Events ---
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setKeyboardVisible(true); // Keyboard is visible
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardVisible(false); // Keyboard is hidden
            }
        );

        // Cleanup function
        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);
    
    // Render item for the bottom sheet list
    const renderBottomSheetItem = useCallback(({ item }: { item: NivelamentoDocument }) => (
        <TouchableOpacity
            style={[
                styles.audioItem,
                {backgroundColor: colors.cardBackgroundBottomSheet},
                selectedAudio?.id === item.id && styles.audioItemSelected
            ]}
            onPress={() => handleAudioSelect(item)}
        >
            <Text style={styles.languageLabel}>{item.language}</Text>
            <Text
                style={[
                    styles.audioItemText,
                    {color: colors.text},
                    selectedAudio?.id === item.id && styles.audioItemTextSelected
                ]}
            >
                {item.name}
            </Text>
            <TextComponent color={colors.text} size="small" style={styles.transcriptSnippet}>{item.transcript.substring(0, 50)}...</TextComponent>
        </TouchableOpacity>
    ), [selectedAudio, handleAudioSelect]);

    // Update handleBack to use onClose prop
    const handleBack = () => {
        onClose();
    };

    useEffect(() => {
        const fetchAllAudios = async () => {
            setIsLoading(true);
            setAudiosByLanguage({}); // Clear previous data
            setSelectedAudio(null); // Clear selection
            setSelectedLanguages([]); // Clear filters
            setSearchText(''); // Clear search

            try {
                const nivelamentoCollectionRef = collection(db, 'Nivelamento');
                // Optional: Order by name or another field if desired
                const q = query(nivelamentoCollectionRef, orderBy('name'));
                const nivelamentoSnapshot = await getDocs(q);

                const grouped: AudiosGroupedByLanguage = {};
                const fetchedAudios: NivelamentoDocument[] = [];

                nivelamentoSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    // Basic validation
                    if (data.transcript && data.url && data.name && data.language) {
                        const docData: NivelamentoDocument = {
                            id: doc.id,
                            transcript: data.transcript,
                            url: data.url,
                            name: data.name,
                            language: data.language,
                        };

                        if (!grouped[docData.language]) {
                            grouped[docData.language] = [];
                        }
                        grouped[docData.language].push(docData);
                        fetchedAudios.push(docData); // Add to flat list as well
                    } else {
                        console.warn(`Document ${doc.id} is missing required fields.`);
                    }
                });

                setAudiosByLanguage(grouped);

                // Select the first audio overall by default if available
                if (fetchedAudios.length > 0) {
                    // Sort fetched audios if necessary (e.g., alphabetically by name)
                     fetchedAudios.sort((a, b) => a.name.localeCompare(b.name));
                     setSelectedAudio(fetchedAudios[0]);
                     prepareWordInputs(fetchedAudios[0].transcript);
                } else {
                    showToast("Nenhum áudio encontrado.", "info");
                }

            } catch (error) {
                console.error('Error fetching all audios: ', error);
                showToast('Falha ao carregar áudios.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllAudios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only on mount

    const prepareWordInputs = (transcript: string) => {
        if (!transcript) {
            setWordInputs([]);
            return;
        }
        const words = transcript.split(' ');
        const inputIndicesSet = new Set<number>();
        const targetInputCount = Math.max(1, Math.floor(words.length * 0.2)); // Ensure at least 1 input if possible

        // Ensure we don't try to add more inputs than words available
        const maxInputs = Math.min(targetInputCount, words.length);

        while (inputIndicesSet.size < maxInputs && inputIndicesSet.size < words.length) {
            inputIndicesSet.add(Math.floor(Math.random() * words.length));
        }

        const inputs = words.map((word: string, index: number) => ({
            word,
            isInput: inputIndicesSet.has(index),
            userAnswer: '',
            isCorrect: null
        }));

        setWordInputs(inputs);
        setInputsDisabled(false);
    };

    const checkAnswers = () => {
        const inputsToCheck = wordInputs.filter(input => input.isInput);
        if (inputsToCheck.length === 0) {
            showToast('Não há campos para verificar.', 'info');
            return;
        }
        const emptyFields = inputsToCheck.filter(input => input.userAnswer.trim() === '').length;

        if (emptyFields === inputsToCheck.length) {
            showToast('Preencha pelo menos uma palavra!', 'error');
            return;
        }

        const updatedWordInputs = wordInputs.map(input => {
            if (input.isInput) {
                // More robust cleaning: remove punctuation and convert to lower case
                const cleanWord = input.word.replace(/[.,!?;:]/g, '').toLowerCase();
                const cleanUserAnswer = input.userAnswer.trim().replace(/[.,!?;:]/g, '').toLowerCase();
                const isCorrect = cleanWord === cleanUserAnswer;
                return { ...input, isCorrect };
            }
            return input;
        });

        setWordInputs(updatedWordInputs);
        setInputsDisabled(true);
    };

    const handleInputChange = (index: number, value: string) => {
        const updatedWordInputs = [...wordInputs];
        updatedWordInputs[index].userAnswer = value;
        setWordInputs(updatedWordInputs);
    };

    if (isLoading) {
        return (
            <Container>
                <Loading />
            </Container>
        );
    }

    return (
        <Container style={styles.mainContent}>
            <TopBarComponent
                title="Listening Practice"
                leftIcon={<Ionicons onPress={handleBack} name="arrow-back" size={28} color={colors.text} />}
                rightIcon={<Ionicons onPress={handleRightIconPress} name="musical-notes-outline" size={28} color={colors.text} />}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingContainer}
                keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
            >
                 {/* Transcript Section */}
                 <View style={styles.transcriptSection}>
                    {selectedAudio ? (
                        <>
                            <TextComponent weight="bold" size="medium" style={styles.transcriptTitle}>Complete a Transcrição:</TextComponent>
                            <ScrollView
                                style={styles.transcriptScrollView}
                                contentContainerStyle={styles.transcriptContentContainer}
                                keyboardShouldPersistTaps="handled"
                            >
                                <View style={styles.wordInputsContainer}>
                                    {wordInputs.map((input, index) => (
                                        <View key={index} style={styles.wordContainer}>
                                            {input.isInput ? (
                                                <TextInput
                                                    style={[
                                                        styles.wordInput,
                                                        { color: isDark ? 'white' : 'black' },
                                                        input.isCorrect === true && {
                                                            borderColor: Colors.teal.default,
                                                            backgroundColor: isDark ? Colors.teal.darker : Colors.teal.lighter,
                                                        },
                                                        input.isCorrect === false && {
                                                            borderColor: Colors.deepOrange.default,
                                                            backgroundColor: isDark ? Colors.deepOrange.darker : Colors.deepOrange.lighter,
                                                        },
                                                    ]}
                                                    value={input.userAnswer}
                                                    onChangeText={(value) => handleInputChange(index, value)}
                                                    editable={!inputsDisabled}
                                                    placeholder="____"
                                                    placeholderTextColor={colors.secondaryText} // Use theme secondary text
                                                    autoCapitalize="none"
                                                    returnKeyType="next"
                                                />
                                            ) : (
                                                <TextComponent size="small" style={styles.wordText}>{input.word}</TextComponent>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                             {!inputsDisabled && ( // Only show check button if not verified
                                <TouchableOpacity
                                    style={[styles.checkButton, {backgroundColor: Colors.spaceBlue.default}]}
                                    onPress={checkAnswers}
                                >
                                    <TextComponent size="medium" weight="bold" color="white">
                                        Verificar Respostas
                                    </TextComponent>
                                </TouchableOpacity>
                             )}
                              {inputsDisabled && ( // Show reset button after verifying
                                <TouchableOpacity
                                    style={[styles.checkButton, {backgroundColor: Colors.spaceBlue.default, marginTop: 10}]} // Different color/margin
                                    onPress={() => prepareWordInputs(selectedAudio.transcript)} // Reset action
                                >
                                    <TextComponent size="medium" weight="bold" color="white">
                                        Tentar Novamente
                                    </TextComponent>
                                </TouchableOpacity>
                            )}
                        </>
                    ) : (
                        <View style={styles.centered}>
                            <TextComponent size="small" style={[styles.emptyTranscriptText, {color: colors.secondaryText}]}>
                                Selecione um áudio no menu <Ionicons name="menu" size={18} color={Colors.indigo.default} />
                            </TextComponent>
                        </View>
                    )}
                 </View>

                {/* --- CONDITIONAL Player Rendering (Keyboard UP) --- */}
                {isKeyboardVisible && selectedAudio && (
                    <View style={[styles.keyboardPlayerSection, { backgroundColor: colors.cardBackgroundBottomSheet }]}>
                        <AudioPlayer
                            sourceUrl={selectedAudio.url}
                            playbackRate={playbackRate}
                            minimal={true} // Use minimal version
                        />
                    </View>
                )}
                 {/* --- END CONDITIONAL Player --- */}

            </KeyboardAvoidingView>


            {/* --- CONDITIONAL Player Rendering (Keyboard DOWN - Original Position) --- */}
            {!isKeyboardVisible && (
                <View style={[styles.playerSection, { backgroundColor: colors.cardBackgroundBottomSheet }]}>
                    {selectedAudio ? (
                        <>
                            <TextComponent size="medium" weight="bold" style={styles.selectedAudioTitle} numberOfLines={1}>
                                {selectedAudio.name}
                            </TextComponent>
                            <AudioPlayer
                                sourceUrl={selectedAudio.url}
                                playbackRate={playbackRate}
                                minimal={false} // Use full version
                            />
                            {/* Playback Speed Controls */}
                            <View style={styles.playbackRateContainer}>
                                <TextComponent size="small" style={styles.playbackRateLabel}>Velocidade:</TextComponent>
                                {PLAYBACK_RATES.map((rate) => (
                                    <TouchableOpacity
                                        key={rate}
                                        style={[
                                            styles.playbackRateButton,
                                            {backgroundColor: isDark ? Colors.background.darkMode : Colors.background.lightMode}, // Theme background
                                            playbackRate === rate && styles.playbackRateButtonSelected, // Selected style
                                        ]}
                                        onPress={() => setPlaybackRate(rate)}
                                    >
                                        <TextComponent
                                            size="small"
                                            style={[
                                                styles.playbackRateText,
                                                // Use theme text color
                                                playbackRate === rate && styles.playbackRateTextSelected // Selected text style
                                            ]}
                                        >
                                            {rate}x
                                        </TextComponent>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    ) : (
                         <View style={styles.centered}>
                             <TextComponent color={colors.secondaryText} size="small">Nenhum áudio selecionado</TextComponent>
                        </View>
                    )}
                </View>
            )}
            

            {/* Bottom Sheet for Audio Selection */}
            <BottomSheet
                ref={bottomSheetRef}
                snapPoints={snapPoints}
                enablePanDownToClose={true}
                index={-1}
                keyboardBehavior="extend"
                handleIndicatorStyle={{ backgroundColor: Colors.spaceBlue.default, width: 65 }}
                backgroundStyle={{
                    ...styles.bottomSheetContainer,
                    backgroundColor: isDark
                    ? Colors.background.dark
                    : Colors.background.light,
                }}
            >
                <View style={styles.bottomSheetContainer}>
                    {/* Search Input */}
                    <InputComponent
                        placeholder="Buscar por título ou transcrição..."
                        value={searchText}
                        onChangeText={setSearchText}
                        iconName={"search-outline"}
                        style={{zIndex: 1000, flex: 1}}
                    />

                    {/* Language Filters */}
                    <View style={styles.filterSection}>
                        <TextComponent size="small" weight="bold" style={styles.filterTitle}>Filtrar por Idioma:</TextComponent>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollView}>
                            {availableLanguages.map(lang => (
                                <TouchableOpacity
                                    key={lang}
                                    style={[
                                        styles.filterChip,
                                        selectedLanguages.includes(lang) && styles.filterChipSelected,
                                        {backgroundColor: colors.cardBackgroundBottomSheet}
                                    ]}
                                    onPress={() => toggleLanguage(lang)}
                                >
                                    <TextComponent color={colors.text} size="small" style={[
                                        styles.filterChipText,
                                        selectedLanguages.includes(lang) && styles.filterChipTextSelected
                                    ]}>{lang}
                                    </TextComponent>
                                </TouchableOpacity>
                            ))}
                             {selectedLanguages.length > 0 && (
                                <TouchableOpacity
                                    style={styles.clearFilterButton}
                                    onPress={() => setSelectedLanguages([])}
                                >
                                    <TextComponent color={colors.secondaryText} size="small" style={styles.clearFilterText}>Limpar</TextComponent>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>

                    {/* Audio List */}
                    <BottomSheetFlatList
                        data={filteredAudiosList}
                        keyExtractor={(item) => item.id}
                        renderItem={renderBottomSheetItem}
                        contentContainerStyle={styles.bottomSheetContent}
                        ListEmptyComponent={
                            <Text style={styles.emptyListText}>Nenhum áudio encontrado com os filtros atuais.</Text>
                        }
                    />
                </View>
            </BottomSheet>
        </Container>
    );
}

const styles = StyleSheet.create({
    // Main Layout
    mainContent: {
        flex: 1,
    },
    keyboardAvoidingContainer: { // Style for the KAV itself
        flex: 1, // Allow KAV to take up space
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f4f4f4',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
    },
    emptyTranscriptText: {
         fontSize: 16,
         textAlign: 'center',
         fontStyle: 'italic',
    },

    keyboardPlayerSection: {
        paddingVertical: 4,
        paddingHorizontal: 15,
        borderTopRightRadius: 12,
        borderTopLeftRadius: 12,
    },

    // Transcript Section (Takes most space)
    transcriptSection: {
        flex: 1,
        marginHorizontal: 10,
        marginTop: 5,
        marginBottom: 5, // Add margin to not touch player section directly
        borderRadius: 8,
        overflow: 'hidden', // Ensure children don't overflow rounded corners
    },
    transcriptTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
    },
    transcriptScrollView: {
        flex: 1, // Allows ScrollView to expand within its parent
    },
    transcriptContentContainer: {
        paddingBottom: 1,
        paddingHorizontal: 10,
    },
    wordInputsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center', 
        // justifyContent: 'center', // Optional: center words
    },
    wordContainer: {
        marginRight: 6, // Space between words/inputs
        marginBottom: 8, // Space between lines
    },
    wordInput: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderColor: '#ccc',
        borderRadius: 5,
        minWidth: 50, // Ensure input is not too small
        textAlign: 'center',
        fontSize: 15,
    },
    wordText: {
        paddingVertical: 9, // Match input padding roughly
        paddingHorizontal: 5,
        fontSize: 15,
        lineHeight: 22, // Ensure text aligns nicely with inputs
    },
    correctInput: {
        borderColor: Colors.teal.default,
        backgroundColor: Colors.teal.lightest,
    },
    incorrectInput: {
        borderColor: Colors.deepOrange.default,
        backgroundColor: Colors.deepOrange.lightest,
    },
    checkButton: {
        marginTop: 15, // Space above the button
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#E64E17',
        borderRadius: 8,
        alignItems: 'center',
    },
    checkButtonDisabled: {
        backgroundColor: '#aaa', // Gray out when disabled
    },
    // Player Section (Fixed at bottom)
    playerSection: {
        backgroundColor: '#ffffff',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        // --- FIX START ---
        // Ensure this section renders below the BottomSheet
        // zIndex works on iOS and sometimes Android depending on context
        // elevation forces rendering order on Android (lower is further back)
        zIndex: 0,
         // If zIndex: 0 isn't enough on Android, explicitly set elevation low
         // (BottomSheet usually has a high elevation internally)
         ...(Platform.OS === 'android' && { elevation: 0 }),
        // --- FIX END ---
    },
    selectedAudioTitle: {
        textAlign: 'center',
        marginBottom: 8,
    },
    playbackRateContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10, // Space between player controls and speed buttons
        marginBottom: 5,
    },
    playbackRateLabel: {
        fontSize: 14,
        marginRight: 8,
    },
    playbackRateButton: {
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 15,
        backgroundColor: '#eee',
        marginHorizontal: 4,
    },
    playbackRateButtonSelected: {
        backgroundColor: Colors.spaceBlue.default,
    },
    playbackRateText: {
        fontSize: 13,
        color: '#333',
        fontWeight: '500',
    },
    playbackRateTextSelected: {
        color: '#fff',
        fontWeight: 'bold',
    },

    // Bottom Sheet Styles
    bottomSheetContainer: {
        flex: 1,
    },
     clearSearchButton: {
        padding: 5, // Make it easier to tap
        marginLeft: 5,
    },
    filterSection: {
        paddingVertical: 10,
        paddingLeft: 16, // Start padding from left
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    filterTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
        marginBottom: 8,
    },
    filterScrollView: {
        paddingRight: 16, // Add padding to the end of the horizontal scroll
    },
    filterChip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginRight: 8,
    },
    filterChipSelected: {
        backgroundColor: '#fff3e0', // Light orange
        borderColor: '#E64E17',
    },
    filterChipText: {
        fontSize: 14,
    },
    filterChipTextSelected: {
        color: Colors.spaceBlue.default, // Darker orange
        fontWeight: 'bold',
    },
    clearFilterButton: {
         paddingVertical: 6,
         paddingHorizontal: 12,
         marginLeft: 8,
         justifyContent: 'center', // Center text vertically
    },
    clearFilterText: {
        fontSize: 14,
    },
    bottomSheetContent: {
        marginTop: 14,
        paddingHorizontal: 16,
        paddingBottom: 20, // Padding at the very bottom of the list
    },
    audioItem: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 6,
        marginBottom: 10,
    },
    audioItemSelected: {
        backgroundColor: Colors.spaceBlue.lighter,
        borderColor: Colors.spaceBlue.darker,
    },
    languageLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 3,
        fontWeight: '500',
    },
    audioItemText: {
        fontSize: 16,
    },
    audioItemTextSelected: {
        fontWeight: 'bold',
    },
    transcriptSnippet: {
        marginTop: 4,
    },
    emptyListText: {
        fontSize: 15,
        textAlign: 'center',
        marginTop: 30, // More margin when empty
        paddingHorizontal: 20,
        fontStyle: 'italic',
    },
});