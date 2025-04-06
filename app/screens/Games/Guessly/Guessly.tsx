import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Dimensions,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Keyboard as RNKeyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';

// Import the reusable Keyboard component (ensure path is correct)
import Keyboard from '@/app/screens/Games/Keyboard/Keyboard';
import TopBarComponent from '@/components/TopBarComponent';

// Import word data - ensure pt file exists with same structure
import allWordsDataEnglish from './Database/wordsDataEnglish.json'; // Adjust path
import allWordsDataPortuguese from './Database/wordsDataPorguese.json'; // Adjust path

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Define Letter Status type
type LetterStatus = 'correct' | 'present' | 'absent' | 'default';

interface GuesslyGameScreenProps {
    onClose: () => void;
}

const GuesslyGameScreen = ({ onClose }: { onClose: () => void }) => { // Assuming navigation prop is passed
    // --- State ---
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [language, setLanguage] = useState<'en' | 'pt'>('en');
    const [wordDataSets, setWordDataSets] = useState<any[]>([]);
    const [currentSetIndex, setCurrentSetIndex] = useState(0);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [currentWordData, setCurrentWordData] = useState<{ starter: string; hint: string; answer: string } | null>(null);
    const [tempUserInput, setTempUserInput] = useState<string[]>([]);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameOver, setGameOver] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackMessageType, setFeedbackMessageType] = useState('');
    const [remainingAttempts, setRemainingAttempts] = useState(2);
    const [score, setScore] = useState(0);
    const [showInstructions, setShowInstructions] = useState(true);
    const [timerStarted, setTimerStarted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [letterStatuses, setLetterStatuses] = useState<Record<string, LetterStatus>>({}); // State for letter statuses

    const inputRefs = useRef<(TextInput | null)[]>([]);

    // --- Theme Loading/Saving ---
    useEffect(() => {
        const loadTheme = async () => {
            setIsLoading(true); // Start loading
            try {
                const storedDarkMode = await AsyncStorage.getItem('isGuesslyDarkMode');
                setIsDarkMode(storedDarkMode ? storedDarkMode === 'true' : true);
            } catch (e) {
                console.error("Failed to load theme from AsyncStorage", e);
                 setIsDarkMode(true); // Default to dark mode on error
            } finally {
                 // Don't stop loading here, let data loading finish
            }
        };
        loadTheme();
    }, []);

    useEffect(() => {
        // Save theme whenever it changes, but only after initial load is complete
        if (!isLoading) {
             const saveTheme = async () => {
                try {
                     await AsyncStorage.setItem('isGuesslyDarkMode', isDarkMode.toString());
                } catch (e) {
                     console.error("Failed to save theme to AsyncStorage", e);
                }
            };
             saveTheme();
        }
    }, [isDarkMode, isLoading]);


    // --- Language and Data Loading ---
    useEffect(() => {
        console.log(`Loading data for language: ${language}`);
        setIsLoading(true); // Ensure loading indicator shows during language switch
        const data = language === 'en' ? allWordsDataEnglish : allWordsDataPortuguese;
        if (!data || data.length === 0) {
            console.error(`Word data for language "${language}" is empty or invalid.`);
            // Handle error appropriately - maybe show a message and prevent game start
             setWordDataSets([]);
             setIsLoading(false);
             setFeedbackMessage(`Erro: Dados de palavras não encontrados para ${language}.`);
             setFeedbackMessageType('error');
             setGameOver(true); // Prevent game from starting incorrectly
             return; // Stop processing
        }
        setWordDataSets(data);
        const newSetIndex = Math.floor(Math.random() * data.length);
        console.log(`Selected Set Index: ${newSetIndex}`);
        setCurrentSetIndex(newSetIndex);
        setCurrentWordIndex(0);
        setGameOver(false);
        setScore(0);
        setTimeLeft(60);
        setRemainingAttempts(2);
        setFeedbackMessage('');
        setFeedbackMessageType('');
        setLetterStatuses({}); // Clear statuses on language change
        setTimerStarted(false);
        // setShowInstructions(true); // Optionally re-show instructions on lang change
        setIsLoading(false); // Stop loading AFTER data is processed
     }, [language]);


    // --- Current Word Setup ---
     useEffect(() => {
        // This runs when wordDataSets, currentSetIndex, or currentWordIndex changes
        if (!isLoading && wordDataSets.length > 0 && currentSetIndex < wordDataSets.length && wordDataSets[currentSetIndex]) {
            const wordSet = wordDataSets[currentSetIndex];
            if (currentWordIndex < wordSet.length) {
                const wordInfo = wordSet[currentWordIndex];
                console.log(`Setting word ${currentWordIndex}:`, wordInfo);
                 if (wordInfo && wordInfo.starter && wordInfo.hint && wordInfo.answer) {
                    setCurrentWordData(wordInfo);
                    const initialInput = Array(wordInfo.starter.length).fill('');
                    setTempUserInput(initialInput);
                    inputRefs.current = Array(wordInfo.starter.length).fill(null); // Reset refs array size
                 } else {
                     console.error(`Invalid word data at index ${currentWordIndex} in set ${currentSetIndex}.`, wordInfo);
                     setGameOver(true); // End game on invalid data
                 }
            } else {
                 // Index out of bounds - game likely finished correctly or via skip
                 console.log(`Word index ${currentWordIndex} out of bounds for set ${currentSetIndex}. Game should end.`);
                 if (!gameOver) { // Ensure gameOver is set if we ran out of words
                     setFeedbackMessage('Parabéns! Você completou!');
                     setFeedbackMessageType('correct');
                     setGameOver(true);
                 }
             }
         } else if (!isLoading && wordDataSets.length > 0) {
             // This might happen if currentSetIndex is invalid somehow after random selection
             console.error("Word data loaded, but currentSetIndex seems invalid:", currentSetIndex);
             setGameOver(true);
         }
    }, [wordDataSets, currentSetIndex, currentWordIndex, isLoading, gameOver]); // Added isLoading and gameOver


    // --- Timer ---
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        if (timerStarted && !gameOver && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prevTime) => {
                    const newTime = prevTime - 0.1;
                    if (newTime <= 0) {
                        if (timer) clearInterval(timer);
                        setGameOver(true); // Set game over when time runs out
                        setFeedbackMessage('Tempo esgotado!');
                        setFeedbackMessageType('error');
                        return 0;
                    }
                    return newTime;
                });
            }, 100);
        }
        // Cleanup
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [timerStarted, gameOver, timeLeft]);


    // --- Game Start ---
    const handleStartGame = () => {
        setShowInstructions(false);
        // Reset timer only if it wasn't already started and ran out
        if(timeLeft <= 0) setTimeLeft(60);
        // If the game was already over, we need to fully restart
        if (gameOver) {
            restartGame(); // Call restart which handles state reset and showing instructions
        } else {
             // Just starting from instructions
             setTimeLeft(60); // Ensure timer is full
             setTimerStarted(true);
             focusInput(0);
        }
    };


    // --- Focus Helper ---
    const focusInput = (index: number) => {
        // Add a slight delay to allow the UI to update, especially after state changes
        setTimeout(() => {
            if (inputRefs.current[index]) {
                inputRefs.current[index]?.focus();
            } else {
                console.warn(`Attempted to focus null input ref at index ${index}`);
            }
        }, 50); // 50ms delay
    };


    // --- Input Handling (TextInput events) ---
     const handleInputChange = (text: string, index: number) => {
        const newValue = text.trim().slice(-1).toUpperCase(); // Take last char, trim, uppercase
        const updatedInput = [...tempUserInput];
        updatedInput[index] = newValue;
        setTempUserInput(updatedInput);

        // Move focus to next input if a character was entered
        if (newValue && index < tempUserInput.length - 1) {
            focusInput(index + 1);
        }
     };

     const handleKeyPress = (event: { nativeEvent: { key: string } }, index: number) => {
         const { key } = event.nativeEvent;

         if (key === 'Backspace') {
            if (tempUserInput[index] === '' && index > 0) {
                 // If current is empty, clear previous and focus previous
                 const updatedInput = [...tempUserInput];
                 // updatedInput[index - 1] = ''; // Optionally clear previous as well? Usually no.
                 setTempUserInput(updatedInput);
                 focusInput(index - 1);
             }
             // If current is not empty, onChangeText will handle clearing it, backspace itself doesn't need extra logic here
        }
         // Other key presses (like Enter) are often not reliably caught here in RN
         // We primarily rely on onChangeText and the custom keyboard
    };


    // --- Custom Keyboard Input Handler ---
     const handleCustomKeyPress = (key: string) => {
        if (gameOver || !timerStarted) return;

        if (key === 'Enter') {
            checkAnswer();
        } else if (key === 'Backspace') {
            let targetIndex = -1;
            // Find the index of the last character entered
            for (let i = tempUserInput.length - 1; i >= 0; i--) {
                if (tempUserInput[i] !== '') {
                    targetIndex = i;
                    break;
                }
            }
            // If no character is found, do nothing, or maybe focus index 0?
            if (targetIndex !== -1) {
                const updatedInput = [...tempUserInput];
                updatedInput[targetIndex] = ''; // Clear the last entered character
                setTempUserInput(updatedInput);
                focusInput(targetIndex); // Focus the now empty input
            } else {
                // All are empty, maybe focus the first one?
                if (tempUserInput.length > 0) focusInput(0);
            }
        } else { // Regular letter key
            // Find the first empty slot
            const emptyIndex = tempUserInput.findIndex(val => val === '');
            if (emptyIndex !== -1) {
                // Use the handleInputChange logic for consistency
                handleInputChange(key, emptyIndex);
                 // Focus logic is handled within handleInputChange
            }
            // If no empty slots, do nothing
        }
    };


    // --- Game Logic (Check, Skip, Restart) ---
     const checkAnswer = () => {
        if (!currentWordData || !timerStarted) return;

        RNKeyboard.dismiss(); // Use RNKeyboard instead of Keyboard

        const answer = currentWordData.answer.toUpperCase();
        const userInputString = tempUserInput.join('').toUpperCase();

        // Find first empty input to ensure word is complete
        const firstEmptyIndex = tempUserInput.findIndex(val => val === '');
        if (firstEmptyIndex !== -1) {
             setFeedbackMessage('Complete a palavra antes de verificar.');
             setFeedbackMessageType('error');
             focusInput(firstEmptyIndex); // Focus the first empty spot
             return;
        }

        // --- Letter Status Update Logic ---
        const newStatuses = { ...letterStatuses };
        const answerLetters = answer.split('');
        const guessLetters = userInputString.split('');
        const availableAnswerLetters = [...answerLetters]; // Copy for checking presence count

        // Pass 1: Correct letters (Green)
        guessLetters.forEach((letter, index) => {
            if (answerLetters[index] === letter) {
                newStatuses[letter] = 'correct';
                // Remove letter from available pool so it's not counted for 'present' later
                const letterIndexInAvailable = availableAnswerLetters.indexOf(letter);
                if(letterIndexInAvailable > -1) availableAnswerLetters.splice(letterIndexInAvailable, 1);
            }
        });

        // Pass 2: Present (Yellow) & Absent (Gray) letters
        guessLetters.forEach((letter, index) => {
             // Only evaluate if not already correct
            if (answerLetters[index] !== letter) {
                 // Check if the letter exists elsewhere in the *remaining* available letters
                if (availableAnswerLetters.includes(letter)) {
                    // Mark as 'present' only if its status isn't already 'correct'
                    if (newStatuses[letter] !== 'correct') {
                         newStatuses[letter] = 'present';
                    }
                    // Remove letter from available pool
                    const letterIndexInAvailable = availableAnswerLetters.indexOf(letter);
                     if(letterIndexInAvailable > -1) availableAnswerLetters.splice(letterIndexInAvailable, 1);
                } else {
                     // Mark as 'absent' only if its status isn't already 'correct' or 'present'
                     if (newStatuses[letter] !== 'correct' && newStatuses[letter] !== 'present') {
                         newStatuses[letter] = 'absent';
                     }
                 }
            }
        });
        setLetterStatuses(newStatuses);
        // --- End Status Update ---

        if (userInputString === answer) {
            setScore(prevScore => prevScore + 1); // Use functional update for score
            if (currentWordIndex < wordDataSets[currentSetIndex].length - 1) {
                // Prepare for next word (state update happens in useEffect [currentWordIndex])
                setCurrentWordIndex(prevIndex => prevIndex + 1);
                setFeedbackMessage('Correto!');
                setFeedbackMessageType('correct');
                // Don't focus here, let useEffect handle it after word data updates
            } else {
                setFeedbackMessage('Parabéns! Você completou!');
                setFeedbackMessageType('correct');
                setGameOver(true); // Set game over AFTER the last word is correct
            }
        } else {
            setFeedbackMessage('Incorreto. Tente novamente.');
            setFeedbackMessageType('incorrect');
            // Optionally clear input for retry? Or allow user to edit? Current setup allows editing.
             focusInput(0); // Focus first input on incorrect guess
        }
    };

    const skipWord = () => {
        if (gameOver || !timerStarted) return;
        if (remainingAttempts > 0 && currentWordData) {
            if (currentWordIndex < wordDataSets[currentSetIndex].length - 1) {
                setCurrentWordIndex(prevIndex => prevIndex + 1);
                setRemainingAttempts(prev => prev - 1);
                setFeedbackMessage('Palavra pulada.');
                setFeedbackMessageType('skip');
                 // Don't clear letter statuses on skip
                 // Focus is handled by useEffect
            } else {
                setFeedbackMessage('Última palavra, não pode pular.');
                setFeedbackMessageType('error');
            }
        } else if (remainingAttempts <=0) {
            setFeedbackMessage('Sem pulos restantes.');
            setFeedbackMessageType('error');
        }
    };

    const restartGame = () => {
        console.log("Restarting game...");
        // Reset state, trigger data reload via language state change (even if same lang)
        setLanguage(prevLang => prevLang); // Trigger useEffect [language]
        // Explicitly reset other states not covered by language useEffect
         setCurrentWordIndex(0); // Ensure word index resets
         setGameOver(false);
         setScore(0);
         setTimeLeft(60);
         setRemainingAttempts(2);
         setFeedbackMessage('');
         setFeedbackMessageType('');
         setLetterStatuses({});
         setTimerStarted(false);
         setShowInstructions(true); // Re-show instructions on restart
         setIsLoading(true); // Show loading while data reloads
    };


    // --- Language Change & Navigation ---
     const handleChangeLanguage = () => {
        if (isLoading) return; // Prevent changing language while loading
        const nextLang = language === 'en' ? 'pt' : 'en';
        setLanguage(nextLang);
        // Game state reset happens in useEffect [language]
         // Maybe show a toast here if you have a toast system setup
         // showToast(`Idioma alterado para ${nextLang === 'en' ? 'Inglês' : 'Português'}.`, 'info');
    };

    const handleBack = () => {
        onClose();
      };

    // --- Generate keyColors prop for the Keyboard ---
    const getKeyColors = useCallback(() => {
        const keyColorMapping = {
            // Define colors precisely matching Wordle web standards if desired
            correct: isDarkMode ? '#538d4e' : '#6aaa64', // Green
            present: isDarkMode ? '#b59f3b' : '#c9b458', // Yellow
            absent: isDarkMode ? '#3a3a3c' : '#787c7e',  // Gray
        };
        const currentKeyColors: Record<string, string> = {};

        Object.keys(letterStatuses).forEach(key => {
            const status = letterStatuses[key];
            if (status && status !== 'default') {
                currentKeyColors[key.toUpperCase()] = keyColorMapping[status];
            }
        });

        return currentKeyColors;
    }, [letterStatuses, isDarkMode]);


    // --- Styles & Colors ---
    const styles = getStyles(isDarkMode);
    const topBarColor = isDarkMode ? '#FFF' : '#000';


    // --- Render Loading ---
    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={isDarkMode ? Colors.amber.default : Colors.indigo.default} />
                <Text style={{color: isDarkMode ? '#FFF' : '#000', marginTop: 10}}>Carregando...</Text>
            </View>
        );
    }


    return (
        // Use KeyboardAvoidingView to prevent keyboard overlap
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined} // Use "height" on Android if padding not enough
            style={styles.kbAvoid}
            keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0} // Adjust offset if needed, especially with custom header
        >
             {/* Use Mock or your actual TopBarComponent */}
             <TopBarComponent
                 title="Guessly"
                 leftIcon={<Ionicons onPress={handleBack} name="arrow-back" size={28} color={topBarColor} />}
                 rightIcon={<Ionicons onPress={handleChangeLanguage} name="language" size={28} color={topBarColor} />}
             />

            {/* Language Indicator */}
            <View style={styles.languageIndicator}>
                <Text style={styles.languageText}>
                    {language === 'en' ? 'English' : 'Português'}
                </Text>
            </View>

            {/* ScrollView for game content if it might exceed screen height */}
            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                 <View style={styles.gameContainer}>
                     {/* Game Over Messages */}
                     {gameOver && (
                         <View style={styles.gameOverContainer}>
                            <Text style={styles.gameOverText}>
                                 {score >= (wordDataSets[currentSetIndex]?.length ?? 0)
                                    ? 'Parabéns! Você venceu!'
                                    : timeLeft <= 0 ? 'Tempo Esgotado!' : 'Fim de Jogo!'}
                             </Text>
                             <Text style={styles.gameOverScore}>Pontuação Final: {score}</Text>
                             <TouchableOpacity style={styles.restartButton} onPress={restartGame}>
                                <Text style={styles.restartButtonText}>
                                    {score >= (wordDataSets[currentSetIndex]?.length ?? 0) ? 'Jogar Novamente' : 'Tentar Novamente'}
                                </Text>
                             </TouchableOpacity>
                         </View>
                     )}

                     {/* Active Game Area */}
                     {!gameOver && currentWordData && (
                         <>
                            {/* Progress Bar */}
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBar, { width: `${Math.max(0, timeLeft / 60) * 100}%` }]} />
                            </View>

                            <View style={styles.wordDisplayContainer}>
                                {currentWordData.starter.split('').map((letter, index) => (
                                    <View key={index} style={styles.letterBoxDisplay}>
                                         {/* Display the correct letter if user has typed it (or show starter letter) */}
                                         {/* This section seems redundant if the input below shows the progress */}
                                        <Text style={styles.letterTextDisplay}>{letter === '_' ? '' : letter}</Text>
                                     </View>
                                 ))}
                             </View>

                             {/* Input Boxes */}
                             <View style={styles.inputContainer}>
                                {tempUserInput.map((letter, index) => (
                                    <TextInput
                                        key={`${currentWordData.answer}-${index}`}
                                        ref={(el) => (inputRefs.current[index] = el)}
                                        style={styles.letterInput}
                                        value={letter}
                                        onChangeText={(text) => handleInputChange(text, index)}
                                        maxLength={1}
                                        showSoftInputOnFocus={false}
                                        caretHidden={true}
                                        textAlign="center"
                                        selectionColor={'transparent'}
                                        editable={!gameOver && timerStarted}
                                        selectTextOnFocus={false}
                                        blurOnSubmit={false}
                                    />
                                ))}
                            </View>

                            {/* Hint */}
                            <Text style={styles.hintText}>{currentWordData.hint}</Text>

                            {/* Controls Container (Skip, Help) */}
                            <View style={styles.controlsContainer}>
                                <TouchableOpacity
                                    style={[styles.skipButton, remainingAttempts <= 0 ? styles.disabledButton : {}]}
                                    onPress={skipWord}
                                    disabled={remainingAttempts <= 0 || !timerStarted}
                                >
                                    <Ionicons name="play-skip-forward-outline" size={20} color="#fff" />
                                    <Text style={styles.skipButtonText}> Pular ({remainingAttempts})</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setShowInstructions(true)}>
                                    <Ionicons name="help-circle-outline" size={30} color={isDarkMode ? '#fff' : '#000'} />
                                </TouchableOpacity>
                            </View>

                            {/* Feedback Message */}
                            {feedbackMessage && (
                                <Text style={[
                                    styles.feedbackText,
                                    feedbackMessageType === 'correct' ? styles.feedbackCorrect : {},
                                    feedbackMessageType === 'incorrect' || feedbackMessageType === 'error' ? styles.feedbackIncorrect : {},
                                    feedbackMessageType === 'skip' ? styles.feedbackSkip : {},
                                ]}>
                                    {feedbackMessage}
                                </Text>
                            )}
                         </>
                     )}

                     {/* Show message if word data failed to load */}
                      {!gameOver && !currentWordData && wordDataSets.length === 0 && (
                          <Text style={styles.feedbackIncorrect}>Erro ao carregar palavras. Tente mudar o idioma ou reiniciar.</Text>
                      )}

                 </View>
             </ScrollView>

            {/* Render the reusable Keyboard only when game is active */}
            {!gameOver && timerStarted && (
                <Keyboard
                    onKeyPress={handleCustomKeyPress}
                    keyBackgroundColors={getKeyColors()} // Pass generated colors
                    isDarkMode={isDarkMode} // Pass theme flag
                />
            )}

            {/* Instructions Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={showInstructions}
                onRequestClose={() => {
                     // Only allow closing via button if game hasn't started
                     if (!timerStarted) handleStartGame();
                     else setShowInstructions(false);
                }}
            >
                 {/* Using a wrapper allows tapping outside modal content to potentially close/start */}
                 <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    // onPressOut={() => { // Optional: Tap outside to start/close
                    //     if (!timerStarted) handleStartGame();
                    //     else setShowInstructions(false);
                    // }}
                 >
                    {/* Prevent taps inside the content area from closing */}
                    <TouchableOpacity activeOpacity={1} style={styles.modalContainer}>
                        <TouchableOpacity
                            style={styles.modalCloseButtonAbsolute}
                             // Close button always starts the game (or restarts if already over)
                            onPress={handleStartGame}
                        >
                            <Ionicons name="close-circle-outline" size={35} color={isDarkMode ? '#ddd' : '#555'} />
                        </TouchableOpacity>

                        <Text style={styles.modalTitle}>Instruções</Text>

                        <ScrollView style={styles.modalContentScrollView}>
                             <Text style={styles.modalStrongText}>Descubra a palavra levando em conta a dica.</Text>
                             <Text style={styles.modalBodyText}>A dica está em Português ({language === 'en' ? 'English' : 'Português'}), mas a palavra deve ser escrita no idioma selecionado ({language === 'en' ? 'Inglês' : 'Português'}).</Text>
                             <View style={styles.list}>
                                <Text style={styles.listItem}><Text style={styles.bullet}>•</Text> Você pode pular no máximo duas vezes.</Text>
                                <Text style={styles.listItem}><Text style={styles.bullet}>•</Text> Não há limite de tentativas erradas por palavra.</Text>
                                <Text style={styles.listItem}><Text style={styles.bullet}>•</Text> O jogo acaba quando o tempo zerar ou acertar todas as palavras.</Text>
                             </View>
                         </ScrollView>

                         <TouchableOpacity style={styles.modalStartButton} onPress={handleStartGame}>
                            <Text style={styles.modalStartButtonText}>Começar!</Text>
                         </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

        </KeyboardAvoidingView>
    );
};

// --- Mock Colors object (if not globally available) ---
const Colors = {
    amber: { default: '#FFAE00', darker: '#EA9000' },
    indigo: { default: '#341F94', darker: '#2C1A7E' },
    // Add other necessary colors if getStyles uses them
};

// --- Styles Function (getStyles) ---
// (This should be the same comprehensive getStyles function from the previous responses,
// ensure it includes all necessary styles: kbAvoid, mockTopBar, scrollContainer, gameContainer,
// centered, progressBarContainer, progressBar, inputContainer, letterInput, hintText,
// controlsContainer, skipButton, disabledButton, feedbackText, feedbackCorrect, feedbackIncorrect, feedbackSkip,
// gameOverContainer, gameOverText, gameOverScore, restartButton, restartButtonText,
// modalOverlay, modalContainer, modalCloseButtonAbsolute, modalTitle, modalContentScrollView,
// modalStrongText, modalBodyText, list, listItem, bullet, modalStartButton, modalStartButtonText)
const getStyles = (isDarkMode: boolean) => StyleSheet.create({
    kbAvoid: {
        flex: 1,
        backgroundColor: isDarkMode ? '#121212' : '#F3F3F3', // Slightly different background for contrast
    },
    mockTopBar: { // Replace with actual TopBarComponent styles
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'ios' ? 50 : 15,
        paddingBottom: 10,
        backgroundColor: isDarkMode ? '#1F1F1F' : '#FFFFFF', // Match keyboard/modal theme
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#333' : '#DDD',
    },
    mockTopBarTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: isDarkMode ? '#FFF' : '#000',
    },
    scrollContainer: {
        flexGrow: 1,
        alignItems: 'center',
        paddingBottom: 20,
    },
    gameContainer: {
        width: '95%', // Slightly wider
        maxWidth: 500, // Max width for tablets
        alignItems: 'center',
        paddingTop: 20,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#121212' : '#F3F3F3',
    },
    progressBarContainer: {
        height: 10,
        width: '100%',
        backgroundColor: isDarkMode ? '#3a3a3c' : '#e0e0e0', // Match keyboard absent color
        borderRadius: 5,
        marginBottom: 25, // More space
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#e65050', // Softer Red
        borderRadius: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        justifyContent: 'center',
    },
    letterInput: {
        width: screenWidth * 0.13, // Adjust size
        height: screenWidth * 0.13, // Keep square
        maxWidth: 55, // Max size
        maxHeight: 55, // Max size
        margin: 4,
        borderWidth: 2,
        borderColor: isDarkMode ? '#565758' : '#d3d6da', // Border color
        borderRadius: 6,
        textAlign: 'center',
        fontSize: screenWidth * 0.07, // Responsive font size
        fontWeight: 'bold',
        color: isDarkMode ? '#FFF' : '#000',
        backgroundColor: isDarkMode ? '#121212' : '#FFFFFF', // Input background matches page
    },
    hintText: {
        marginVertical: 15,
        paddingVertical: 8,
        paddingHorizontal: 12,
        // backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        borderWidth: 1,
        borderColor: isDarkMode ? '#555' : '#DDD',
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 15,
        fontWeight: isDarkMode ? '400' : '500',
        color: isDarkMode ? '#E0E0E0' : '#333',
        width: '100%' // Take full width
    },
    wordDisplayContainer: { // For showing the initial starter word letters
        flexDirection: 'row',
        marginBottom: 10,
        // justifyContent: 'center', // Center if needed
   },
   letterBoxDisplay: { // Style for the display boxes (if different from input)
        width: screenWidth * 0.12, // Adjust size based on screen width
        height: screenWidth * 0.12,
        margin: 4,
        borderRadius: 6,
        backgroundColor: isDarkMode ? '#222' : '#e0e0e0', // Slightly different background
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: isDarkMode ? '#444' : '#ccc',
   },
   letterTextDisplay: { // Text style for the display boxes
        fontSize: screenWidth * 0.06,
        fontWeight: 'bold',
        color: isDarkMode ? '#ccc' : '#555',
   },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // Space out buttons
        width: '90%', // Limit width
        marginTop: 20,
        marginBottom: 10, // Add margin below controls
    },
    skipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#B91C1C', // Red-700
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
    },
     disabledButton: {
        backgroundColor: '#999', // Grey out disabled button
        opacity: 0.6,
    },
    skipButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 5,
    },
    feedbackText: {
        marginTop: 15,
        marginBottom: 10, // Add margin below feedback
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        minHeight: 20, // Reserve space
    },
    // Use distinct colors for feedback types
    feedbackCorrect: { color: isDarkMode ? '#6aaa64' : '#538d4e' }, // Green
    feedbackIncorrect: { color: isDarkMode ? '#f87171' : '#DC2626' }, // Red
    feedbackSkip: { color: isDarkMode ? '#facc15' : '#ca8a04' }, // Yellow/Amber
    gameOverContainer: {
        flex: 1, // Take up available space if needed
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        width: '100%', // Ensure it takes width
    },
    gameOverText: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
        color: isDarkMode ? '#FFF' : '#000',
    },
    gameOverScore: {
        fontSize: 18,
        marginBottom: 25,
        color: isDarkMode ? '#DDD' : '#333',
    },
    restartButton: {
        backgroundColor: '#DC2626', // Red-600
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
    },
    restartButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darker overlay
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        maxWidth: 400, // Max width for modal
        maxHeight: '80%',
        backgroundColor: isDarkMode ? '#1F1F1F' : '#FFFFFF', // Use distinct modal background
        borderRadius: 15,
        padding: 20, // Adjust padding
        paddingTop: 45, // Extra padding at top because of close button
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalCloseButtonAbsolute: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
        padding: 5, // Add padding for easier tap target
    },
    modalTitle: {
        fontSize: 20, // Slightly smaller
        fontWeight: 'bold',
        color: isDarkMode ? '#FFF' : '#000', // Match top bar title color
        marginBottom: 15,
        textAlign: 'center',
    },
     modalContentScrollView: { // Make content scrollable if too long
        width: '100%',
        marginBottom: 20,
     },
    modalStrongText: {
        fontWeight: 'bold',
        fontSize: 16,
        color: isDarkMode ? '#EFEFEF' : '#111',
        marginBottom: 10,
        textAlign: 'left',
    },
    modalBodyText: {
        fontSize: 14,
        color: isDarkMode ? '#CCC' : '#333',
        lineHeight: 20,
        marginBottom: 15,
        textAlign: 'left',
    },
    list: {
        marginTop: 10,
        alignSelf: 'stretch',
    },
    listItem: {
        fontSize: 14,
        color: isDarkMode ? '#CCC' : '#333',
        lineHeight: 20,
        marginBottom: 8,
        flexDirection: 'row',
        textAlign: 'left', // Ensure list text aligns left
    },
     bullet: {
        marginRight: 8,
        // fontWeight: 'bold', // Not necessary for bullet
        color: isDarkMode ? '#CCC' : '#333',
     },
    modalStartButton: {
        backgroundColor: Colors.amber.darker ?? '#EA9000', // Use fallback if Colors not defined
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 8,
        marginTop: 10,
    },
    modalStartButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        textAlign: 'center',
    },
    languageIndicator: {
        width: '100%',
        paddingVertical: 8,
        backgroundColor: isDarkMode ? '#1F1F1F' : '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#333' : '#DDD',
        alignItems: 'center',
    },
    languageText: {
        fontSize: 14,
        fontWeight: '500',
        color: isDarkMode ? '#999' : '#666',
    },
});


export default GuesslyGameScreen;