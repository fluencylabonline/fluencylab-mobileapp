import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    PermissionsAndroid, // For Android permissions
} from 'react-native';

// Firebase imports (ensure configured for React Native)
import { db } from '@/config/firebase'; // Adjust path if needed
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

// Custom Components & Hooks
import InputComponent from '@/components/InputComponent'; // Adjust path
import ButtonComponent from '@/components/ButtonComponent'; // Adjust path
import { useTheme } from '@/constants/useTheme'; // Adjust path
import { useToast } from '@/components/Toast/useToast'; // Adjust path
import { Colors } from '@/constants/Colors'; // Adjust path

// Speech Recognition Library
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

// Navigation Hook (if using React Navigation)
import { useRoute, RouteProp } from '@react-navigation/native';

// Define Param List if using React Navigation with TypeScript
type ParamList = {
    SpeakingScreen: { id?: string }; // Name your screen appropriately
};

type SpeakingScreenRouteProp = RouteProp<ParamList, 'SpeakingScreen'>;

interface NivelamentoDocument {
    id: string;
    transcript: string;
    url: string; // URL for audio playback (playback not implemented here)
    name: string;
}

export default function SpeakingScreen({ onClose }: { onClose: () => void }) { // Renamed component for clarity
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();
    const route = useRoute<SpeakingScreenRouteProp>(); // Get route params

    const [nivelamentoData, setNivelamentoData] = useState<NivelamentoDocument[]>([]);
    const [filteredData, setFilteredData] = useState<NivelamentoDocument[]>([]);
    const [selectedAudio, setSelectedAudio] = useState<NivelamentoDocument | null>(null);
    const [spokenText, setSpokenText] = useState<string>('');
    const [score, setScore] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [finalTranscript, setFinalTranscript] = useState<string>(''); // Keep track of final transcript pieces

    // --- Permission Handling ---
    const requestMicrophonePermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    {
                        title: "Microphone Permission",
                        message: "App needs access to your microphone for speech recognition.",
                        buttonNeutral: "Ask Me Later",
                        buttonNegative: "Cancel",
                        buttonPositive: "OK"
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.warn(err);
                return false;
            }
        } else {
             // iOS permissions are typically handled via Info.plist
             // You might use a library like react-native-permissions for more control
            return true; // Assume granted for simplicity, check library docs
        }
    };

    useEffect(() => {
        requestMicrophonePermission(); // Request permission on mount
    }, []);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchNivelamentoData = async () => {
            setIsLoading(true);
            setScore(null); // Reset score when data changes
            setSpokenText(''); // Reset spoken text
            try {
                const nivelamentoCollectionRef = collection(db, 'Nivelamento');
                const nivelamentoSnapshot = await getDocs(nivelamentoCollectionRef);
                const nivelamentoDocuments: NivelamentoDocument[] = nivelamentoSnapshot.docs.map(docSnapshot => {
                    const data = docSnapshot.data() as Omit<NivelamentoDocument, 'id'>;
                    return {
                        id: docSnapshot.id,
                        transcript: data.transcript,
                        url: data.url,
                        name: data.name,
                    };
                });
                setNivelamentoData(nivelamentoDocuments);
                setFilteredData(nivelamentoDocuments); // Set filtered data initially

                const idFromParams = route.params?.id; // Get ID from navigation params

                if (idFromParams) {
                    const docRef = doc(db, 'Nivelamento', idFromParams);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data() as Omit<NivelamentoDocument, 'id'>;
                        setSelectedAudio({ id: docSnap.id, ...data });
                    } else {
                        console.error('Document does not exist.');
                        showToast('Document not found.', 'error');
                        // Select a random one if the specific ID wasn't found
                        if (nivelamentoDocuments.length > 0) {
                             const randomIndex = Math.floor(Math.random() * nivelamentoDocuments.length);
                             setSelectedAudio(nivelamentoDocuments[randomIndex]);
                        }
                    }
                } else if (nivelamentoDocuments.length > 0) {
                    // Select a random document if no ID is provided
                    const randomIndex = Math.floor(Math.random() * nivelamentoDocuments.length);
                    setSelectedAudio(nivelamentoDocuments[randomIndex]);
                }
            } catch (error) {
                console.error('Error fetching documents:', error);
                showToast('Error fetching documents.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchNivelamentoData();
    }, [route.params?.id]); // Re-fetch if the ID parameter changes

    // --- Speech Recognition Setup ---
    useEffect(() => {
        const onSpeechStart = (e: any) => {
            console.log('onSpeechStart: ', e);
            setIsRecording(true);
            setSpokenText('');
            setFinalTranscript('');
            setScore(null);
        };
        const onSpeechEnd = (e: any) => {
            console.log('onSpeechEnd: ', e);
            setIsRecording(false);
             // Calculate score after speech ends using the accumulated final transcript
             if (selectedAudio && finalTranscript) {
                calculateScore(finalTranscript, selectedAudio.transcript);
            }
        };
        const onSpeechError = (e: SpeechErrorEvent) => {
            console.error('onSpeechError: ', e);
            showToast(`Speech recognition error: ${e.error?.message || 'Unknown error'}`, 'error');
            setIsRecording(false); // Ensure recording state is reset on error
        };
        const onSpeechResults = (e: SpeechResultsEvent) => {
            console.log('onSpeechResults: ', e);
             if (e.value) {
                // react-native-voice might give the full result each time
                // Or sometimes partial results. The first value is often the most likely.
                const currentTranscript = e.value[0] || '';
                setSpokenText(currentTranscript); // Show the latest result
                setFinalTranscript(currentTranscript); // Assume final for now, adjust if needed based on library behavior
            }
        };

        Voice.onSpeechStart = onSpeechStart;
        Voice.onSpeechEnd = onSpeechEnd;
        Voice.onSpeechError = onSpeechError;
        Voice.onSpeechResults = onSpeechResults;

        // Cleanup function
        return () => {
            console.log("Cleaning up Voice listeners...");
            try {
                // 1. Stop Voice explicitly if it might be running
                if (Voice) {
                    Voice.stop().catch(e => console.error("Error stopping voice during cleanup:", e));

                    // 2. Reset handlers to empty functions with proper types
                    Voice.onSpeechStart = (_: any) => {};
                    Voice.onSpeechEnd = (_: any) => {};
                    Voice.onSpeechError = (_: SpeechErrorEvent) => {};
                    Voice.onSpeechResults = (_: SpeechResultsEvent) => {};
                    Voice.onSpeechPartialResults = (_: SpeechResultsEvent) => {};

                    // 3. Clean up listeners and destroy
                    const cleanup = async () => {
                        try {
                            await Voice.removeAllListeners();
                            console.log("Voice listeners removed.");
                            await Voice.destroy();
                            console.log("Voice instance destroyed.");
                        } catch (error: unknown) {
                            console.error("Error during Voice cleanup (removeAllListeners/destroy):", error);
                        }
                    };
                    void cleanup(); // Use void operator to handle the promise
                }
            } catch (error: unknown) {
                console.error("Error during Voice cleanup:", error);
            }
        };
    }, [selectedAudio]); // Re-attach listeners if selectedAudio changes (needed for calculateScore)

    // --- Filtering Logic ---
    useEffect(() => {
        const filtered = nivelamentoData.filter(doc =>
            doc.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredData(filtered);
    }, [searchQuery, nivelamentoData]);

    // --- Recognition Control ---
    const startRecognition = async () => {
        try {
            await Voice.start('en-US'); // Set the language
            setIsRecording(true); // Ensure state is true immediately
            setSpokenText('');
            setFinalTranscript('');
            setScore(null);
        } catch (e) {
            console.error(e);
            showToast('Failed to start recognition.', 'error');
        }
    };

    const stopRecognition = async () => {
        try {
            await Voice.stop();
             setIsRecording(false); // State update might slightly lag behind native event
             // Score calculation is now primarily handled in onSpeechEnd
        } catch (e) {
            console.error(e);
             showToast('Failed to stop recognition.', 'error');
        }
    };

    const toggleRecognition = () => {
        if (isRecording) {
            stopRecognition();
        } else {
            startRecognition();
        }
    };

    // --- Score Calculation ---
     const cleanText = (text: string): string => {
        if (!text) return '';
        return text
            .replace(/[.,!?]/g, '') // Remove punctuation
            // Basic attempt to remove common contractions/helper verbs (adjust as needed)
            .replace(/\b(i'm|you're|he's|she's|it's|we're|they're|i am|you are|he is|she is|it is|we are|they are|is|am|are|has|have|had|do|does|did)\b/gi, ' ')
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .toLowerCase()
            .trim();
    };

    const calculateScore = (spoken: string, original: string) => {
        const cleanedSpoken = cleanText(spoken);
        const cleanedOriginal = cleanText(original);

        if (!cleanedOriginal) {
            setScore(0); // Avoid division by zero
            return;
        }

        const spokenWords = cleanedSpoken.split(' ').filter(Boolean); // Filter out empty strings
        const originalWords = cleanedOriginal.split(' ').filter(Boolean);

        if (originalWords.length === 0) {
             setScore(spokenWords.length === 0 ? 100 : 0); // Handle empty original text
             return;
        }

        // Simple matching: count words from spoken that exist in original
        let matchCount = 0;
        const originalWordSet = new Set(originalWords); // Use a Set for efficient lookup

        for (const word of spokenWords) {
            if (originalWordSet.has(word)) {
                matchCount++;
                // Optional: Remove the word from the set to prevent double counting
                // if you want to match word occurrences more strictly.
                // originalWordSet.delete(word);
            }
        }

        // Calculate score based on matched words relative to the original text length
        const calculatedScore = (matchCount / originalWords.length) * 100;
        setScore(Math.round(Math.min(calculatedScore, 100))); // Cap score at 100
    };

    // --- Event Handlers ---
    const handlePlayAudio = (doc: NivelamentoDocument) => {
        setSelectedAudio(doc);
        setScore(null); // Reset score when changing audio
        setSpokenText('');
        setFinalTranscript('');
        if (isRecording) { // Stop recording if user selects new audio while recording
            stopRecognition();
        }
        // In React Navigation, you might update params if needed, but often
        // just updating state is enough if you fetched based on initial params.
        // navigation.setParams({ id: doc.id });
    };

    const renderAudioItem = ({ item }: { item: NivelamentoDocument }) => {
        const isSelected = selectedAudio?.id === item.id;
        return (
            <TouchableOpacity
                style={[
                    styles.listItem,
                    { backgroundColor: isSelected ? Colors.amber.default : colors.cardBackground },
                ]}
                onPress={() => handlePlayAudio(item)}
            >
                <Text style={[
                    styles.listText,
                    { color: isSelected ? Colors.black.darkest : colors.text } ,
                    isSelected && styles.listTextSelected // Apply bold font weight if selected
                ]}
                >
                    {item.name}
                </Text>
            </TouchableOpacity>
        );
    };

    // --- Render ---
    if (isLoading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber.default} /></View>;
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? Colors.background.darkMode : Colors.background.lightMode }]}>
            {/* Left Column: Search and List */}
            <View style={[styles.listContainer, { backgroundColor: colors.cardBackground }]}>
                <InputComponent
                    placeholder='Procure aqui...'
                    value={searchQuery}
                    onChangeText={setSearchQuery} // Use onChangeText for React Native TextInput
                    style={styles.searchInput} // Add specific styles if needed
                    iconName="search-outline" // Example icon
                />
                {filteredData.length === 0 && !isLoading ? (
                     <View style={styles.centered}>
                         <Text style={[styles.infoText, { color: colors.text }]}>Nenhum áudio encontrado.</Text>
                     </View>
                 ) : (
                    <FlatList
                        data={filteredData}
                        renderItem={renderAudioItem}
                        keyExtractor={item => item.id}
                        style={styles.flatList}
                        contentContainerStyle={styles.flatListContent} // Allows padding at the bottom
                    />
                 )}
            </View>

            {/* Right Column: Details and Recording */}
            {selectedAudio ? (
                <View style={styles.detailsContainer}>
                    {/* Instructions */}
                    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Instruções:</Text>
                        <Text style={[styles.cardText, { color: colors.secondaryText }]}>
                            Quando estiver pronto, aperte o botão <Text style={styles.bold}>Falar</Text> e leia o texto abaixo em voz alta. Quando terminar, clique em <Text style={styles.bold}>Parar</Text> e veja sua pontuação.
                        </Text>
                        <Text style={[styles.warningText, { color: Colors.amber.darker }]}>
                            Este recurso está em fase de testes. Talvez precise tentar mais de uma vez para ter uma pontuação realista.
                        </Text>
                    </View>

                    {/* Transcript and Record Button */}
                    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{selectedAudio.name}</Text>
                        <Text style={[styles.transcriptText, { color: colors.secondaryText }]}>{selectedAudio.transcript}</Text>
                        <ButtonComponent
                            title={isRecording ? 'Parar' : 'Falar'}
                            // Map variants to your ButtonComponent color props
                            color={isRecording ? 'deepOrange' : 'amber'}
                            onPress={toggleRecognition}
                            style={styles.recordButton}
                            iconName={isRecording ? "mic-off-outline" : "mic-outline"} // Example icons
                        />
                         {isRecording && <ActivityIndicator style={styles.recordingIndicator} size="small" color={Colors.deepOrange.default} />}
                    </View>

                    {/* Spoken Text and Score */}
                    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Texto Falado:</Text>
                        <Text style={[styles.spokenText, { color: colors.secondaryText }]}>{spokenText || (isRecording ? 'Ouvindo...' : 'Nenhuma fala detectada.')}</Text>
                        {score !== null && (
                             <Text style={[styles.scoreText, { color: colors.text }]}>
                                Pontuação: <Text style={styles.bold}>{score}%</Text>
                            </Text>
                        )}
                    </View>
                </View>
            ) : (
                 <View style={[styles.detailsContainer, styles.centered]}>
                      <Text style={[styles.infoText, { color: colors.text }]}>Selecione um áudio da lista.</Text>
                  </View>
             )}
        </View>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row', // Arrange list and details side-by-side
        padding: 8, // Use numerical values for padding/margin
    },
    listContainer: {
        flex: 1, // Take up 1 part of the space
        marginRight: 8,
        borderRadius: 8,
        padding: 8,
        maxWidth: 300, // Limit width of the list column
    },
    detailsContainer: {
        flex: 2, // Take up 2 parts of the space
        gap: 10, // Spacing between cards in the details view
    },
    searchInput: {
        marginBottom: 8,
         // backgroundColor might be handled by InputComponent based on theme
    },
    flatList: {
        flex: 1, // Ensure FlatList takes available space
    },
     flatListContent: {
        paddingBottom: 10, // Add padding at the bottom of the scrollable content
    },
    listItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 6,
        marginVertical: 4, // Add vertical spacing between items
        borderWidth: 1,
        borderColor: Colors.black.lighter, // Subtle border
    },
    listText: {
        fontSize: 15,
        fontFamily: 'Quicksand_600SemiBold', // Match your Button/Input font
    },
    listTextSelected: {
       fontFamily: 'Quicksand_700Bold', // Make selected item bold
    },
    card: {
        borderRadius: 8,
        padding: 16,
        width: '100%',
    },
    cardTitle: {
        fontSize: 18,
        fontFamily: 'Quicksand_700Bold',
        marginBottom: 8,
    },
    cardText: {
        fontSize: 14,
        fontFamily: 'Quicksand_400Regular',
        lineHeight: 20,
        marginBottom: 5,
    },
    warningText: {
        fontSize: 13,
        fontFamily: 'Quicksand_600SemiBold',
        marginTop: 8,
    },
    transcriptText: {
        fontSize: 15,
        fontFamily: 'Quicksand_500Medium',
        lineHeight: 22,
        marginBottom: 16,
    },
    recordButton: {
        marginTop: 10,
        alignSelf: 'flex-start', // Don't stretch full width unless needed
    },
     recordingIndicator: {
        position: 'absolute',
        top: 16,
        right: 16,
    },
    spokenText: {
        fontSize: 15,
        fontFamily: 'Quicksand_500Medium',
        fontStyle: 'italic',
        marginBottom: 8,
        minHeight: 22, // Prevent layout jumps when text appears
    },
    scoreText: {
        fontSize: 18,
        fontFamily: 'Quicksand_600SemiBold',
        marginTop: 8,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 16,
        fontFamily: 'Quicksand_500Medium',
    },
     bold: {
        fontFamily: 'Quicksand_700Bold',
    },
});