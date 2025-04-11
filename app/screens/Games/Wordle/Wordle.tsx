import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import the reusable Keyboard (adjust path if necessary)
import Keyboard from '@/app/screens/Games/Keyboard/Keyboard';

// Import language-specific word lists (adjust paths if necessary)
// Ensure these files contain arrays of strings (lowercase recommended)
import WORDS_EN from './Database/words.json';    // Assuming this is English
import WORDS_PT from './Database/palavras.json'; // Assuming this is Portuguese

// Import theme and components (adjust paths if necessary)
import TopBarComponent from '@/components/TopBarComponent';
import Container from '@/components/ContainerComponent';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { router } from 'expo-router';
import { TextComponent } from '@/components/TextComponent';
// --- Constants ---
const { width } = Dimensions.get('window');
const WORD_LENGTH = 5; // Standard Wordle length
const MAX_GUESSES = 6;
const ASYNC_STORAGE_GAME_STATE_KEY = 'wordleGameState';
const ASYNC_STORAGE_LANGUAGE_KEY = 'wordleLanguagePreference';

// --- Accent Removal Utility ---
const removeAccents = (str: string): string => {
    if (!str) return '';
    return str
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/Ç/g, 'C');
};

// ---

// --- Wordle Component ---
const Wordle = () => {
    // --- Hooks ---
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors, isDark);
    // --- State ---
    const [language, setLanguage] = useState<'en' | 'pt'>('en');
    const [currentWordList, setCurrentWordList] = useState<string[]>(WORDS_EN);
    const [word, setWord] = useState(''); // Original target word (can have accents)
    const [normalizedWord, setNormalizedWord] = useState(''); // Accent-stripped, uppercase version
    const [guesses, setGuesses] = useState(() => Array(MAX_GUESSES).fill(Array(WORD_LENGTH).fill('')));
    const [currentRow, setCurrentRow] = useState(0);
    const [currentTileIndex, setCurrentTileIndex] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [resultMessage, setResultMessage] = useState('');
    const [showColors, setShowColors] = useState(() => Array(MAX_GUESSES).fill(false));
    const [keyColors, setKeyColors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isInvalidWord, setIsInvalidWord] = useState(false); // For feedback/animation

    // --- Effects ---

    // Load Language Preference on Mount
    useEffect(() => {
        const loadLanguagePreference = async () => {
            setIsLoading(true);
            try {
                const savedLang = await AsyncStorage.getItem(ASYNC_STORAGE_LANGUAGE_KEY);
                const langToSet = (savedLang === 'en' || savedLang === 'pt') ? savedLang : 'en';
                setLanguage(langToSet);
                console.log(`Loaded language preference: ${langToSet}`);
            } catch (error) {
                console.error('Failed to load language preference:', error);
                setLanguage('en'); // Default on error
            }
            // Loading continues in the next effect which depends on language
        };
        loadLanguagePreference();
    }, []); // Run only once on mount

    // Initialize/Reset Game Based on Language
    useEffect(() => {
        console.log(`Language is: ${language}. Initializing game...`);
        const wordList = language === 'en' ? WORDS_EN : WORDS_PT;
        if (!wordList || wordList.length === 0) {
            console.error(`Word list for ${language} is empty!`);
            Alert.alert("Erro", `Lista de palavras para ${language === 'en' ? 'Inglês' : 'Português'} não encontrada ou vazia.`);
            setIsLoading(false);
            setGameOver(true); // Prevent playing
            setResultMessage("Erro ao carregar palavras.");
            return;
        }
        setCurrentWordList(wordList);
        loadGameState(wordList); // Load saved state or start new game for this language list
    }, [language]); // Rerun when language changes

    // Derive Normalized Word whenever 'word' or 'language' changes
    useEffect(() => {
        if (word) { // Ensure word is set before normalizing
            const normalized = (language === 'pt') ? removeAccents(word) : word.toUpperCase();
            setNormalizedWord(normalized);
            console.log(`Word set: ${word}, Normalized: ${normalized}`);
        }
    }, [word, language]);

    // Save Game State whenever relevant parts change
    useEffect(() => {
        if (!isLoading) {
            saveGameState();
        }
    }, [word, guesses, currentRow, currentTileIndex, gameOver, resultMessage, showColors, keyColors, language, isLoading]);

    // --- Handlers ---

    const handleChangeLanguage = async () => {
        if (isLoading) return;
        const nextLang = language === 'en' ? 'pt' : 'en';
        // Update language state (triggers useEffect[language] for game reset)
        setLanguage(nextLang);
        // Save preference
        try {
            await AsyncStorage.setItem(ASYNC_STORAGE_LANGUAGE_KEY, nextLang);
            console.log(`Language preference saved: ${nextLang}`);
        } catch (error) {
            console.error('Failed to save language preference:', error);
        }
        setIsInvalidWord(false); // Clear validation feedback
    };

    const handleKeyboardKeyPress = (key: string) => {
        if (gameOver || isLoading) return;
        if (isInvalidWord) setIsInvalidWord(false);

        if (key === 'Enter') {
            if (guesses[currentRow].filter((tile: string) => tile !== '').length === WORD_LENGTH) {
                handleGuess();
            } else {
                console.log("Not enough letters");
                // Optionally add shake animation or temporary message
            }
        } else if (key === 'Backspace') {
            if (currentTileIndex > 0) {
                const targetIndex = currentTileIndex - 1;
                setGuesses((prevGuesses) => {
                    const newGuesses = prevGuesses.map(row => [...row]);
                    newGuesses[currentRow][targetIndex] = '';
                    return newGuesses;
                });
                setCurrentTileIndex(targetIndex);
            }
        } else { // Letter key
            if (currentTileIndex < WORD_LENGTH) {
                setGuesses((prevGuesses) => {
                    const newGuesses = prevGuesses.map(row => [...row]);
                    newGuesses[currentRow][currentTileIndex] = key.toUpperCase(); // Keyboard provides uppercase
                    return newGuesses;
                });
                setCurrentTileIndex((prev) => prev + 1);
            }
        }
    };

    const handleGuess = () => {
        const guessedWord = guesses[currentRow].join('').toUpperCase(); // Accent-free from keyboard

        // --- Validation (Handles Accents for PT) ---
        let isValidWord = false;
        const wordListForValidation = language === 'en' ? WORDS_EN : WORDS_PT; // Use the correct source list
        if (language === 'pt') {
            isValidWord = wordListForValidation.some(w => removeAccents(w) === guessedWord);
        } else {
            isValidWord = wordListForValidation.includes(guessedWord.toLowerCase()); // Assume EN list is lowercase
        }

        if (!isValidWord) {
            Alert.alert('Palavra Inválida', 'Esta palavra não está na lista.');
            setIsInvalidWord(true);
            return;
        }
        // --- End Validation ---

        updateKeyColors(guesses[currentRow], normalizedWord); // Pass normalized word

        setShowColors((prev) => {
            const newShowColors = [...prev];
            newShowColors[currentRow] = true;
            return newShowColors;
        });

        // --- Win/Loss Check (Handles Accents for PT) ---
        if (guessedWord === normalizedWord) { // Compare accent-free guess with normalized target
            setResultMessage(`Parabéns! Você acertou: ${word}`); // Show original word with accents
            setGameOver(true);
        } else if (currentRow === MAX_GUESSES - 1) {
            setResultMessage(`Fim de jogo! A palavra era ${word}.`); // Show original word with accents
            setGameOver(true);
        } else {
            setCurrentRow((prev) => prev + 1);
            setCurrentTileIndex(0);
        }
        // --- End Check ---
    };

    // --- Keyboard Color Update Logic (Handles Accents via normalizedWord) ---
    const updateKeyColors = useCallback((guess: string[], wordToCompare: string) => {
        // wordToCompare is the normalizedWord (accent-free, uppercase)
        const newColors = { ...keyColors };
        const wordLetters = wordToCompare.split('');

        // Define theme-aware colors (using fixed standard Wordle colors here)
        const correctColor = colors.colors.tealLight; // Green
        const presentColor = colors.colors.amber; // Yellow
        const absentColor = colors.colors.darkGray; // Dark/Light Gray

        guess.forEach((letter) => {
            if (!letter) return;

            let color = absentColor; // Default to absent
            if (wordLetters.includes(letter)) {
                color = presentColor; // It's present
            }
            // Check for correct position *after* checking presence
            // This ensures correct check overrides present if a letter appears multiple times
            for (let i = 0; i < wordLetters.length; i++) {
                if (wordLetters[i] === letter && guess[i] === letter) {
                     color = correctColor; // It's in the correct position
                     break; // Found correct position, no need to check further for this letter instance
                 }
            }

            // Prioritize Green > Yellow > Gray when updating
            const existingColor = newColors[letter];
            if (!existingColor || existingColor === absentColor || (existingColor === presentColor && color === correctColor)) {
                // Update if no color, or current is absent, or current is yellow and new is green
                newColors[letter] = color;
            }
        });
        setKeyColors(newColors);
    }, [keyColors]); // Depend on keyColors and isDark for absent color


    // --- Game State Persistence ---
    const saveGameState = async () => {
        try {
            const gameState = { language, word, guesses, currentRow, currentTileIndex, gameOver, resultMessage, showColors, keyColors };
            await AsyncStorage.setItem(ASYNC_STORAGE_GAME_STATE_KEY, JSON.stringify(gameState));
        } catch (error) { console.error('Failed to save game state:', error); }
    };

    const loadGameState = async (wordListForValidation: string[]) => {
        console.log(`Attempting to load game state for language: ${language}`);
        try {
            const savedState = await AsyncStorage.getItem(ASYNC_STORAGE_GAME_STATE_KEY);
            let stateLoaded = false;
            if (savedState) {
                const loadedState = JSON.parse(savedState);
                console.log("Saved state found:", { ...loadedState, guesses: "..." }); // Avoid logging large arrays

                // Normalize the saved word for validation based on the SAVED language
                const savedWordOriginal = loadedState.word || '';
                const savedWordNormalized = (loadedState.language === 'pt')
                    ? removeAccents(savedWordOriginal)
                    : savedWordOriginal.toUpperCase();

                // Validate: saved language must match current language state,
                // AND saved word (normalized) must exist in the current word list (normalized if PT)
                const wordExistsInCurrentList = (loadedState.language === 'pt')
                    ? wordListForValidation.some(w => removeAccents(w) === savedWordNormalized)
                    : wordListForValidation.includes(savedWordOriginal?.toLowerCase()); // Assume EN list is lowercase

                if (loadedState.language === language && wordExistsInCurrentList) {
                    console.log("Saved state matches current language and word is valid. Loading.");
                    setWord(savedWordOriginal); // Set original word (useEffect will set normalizedWord)
                    // Validate and set guesses, rows, etc.
                    const validGuesses = Array.isArray(loadedState.guesses) && loadedState.guesses.length === MAX_GUESSES && loadedState.guesses.every((g: string | any[]) => Array.isArray(g) && g.length === WORD_LENGTH)
                        ? loadedState.guesses : Array(MAX_GUESSES).fill(Array(WORD_LENGTH).fill(''));
                    setGuesses(validGuesses);
                    setCurrentRow(loadedState.currentRow ?? 0);
                    setCurrentTileIndex(loadedState.currentTileIndex ?? 0);
                    setGameOver(loadedState.gameOver ?? false);
                    setResultMessage(loadedState.resultMessage ?? '');
                    const validShowColors = Array.isArray(loadedState.showColors) && loadedState.showColors.length === MAX_GUESSES
                        ? loadedState.showColors : Array(MAX_GUESSES).fill(false);
                    setShowColors(validShowColors);
                    setKeyColors(loadedState.keyColors ?? {});
                    stateLoaded = true;
                } else {
                    console.log("Saved state language/word mismatch or invalid word. Clearing saved state.");
                    await AsyncStorage.removeItem(ASYNC_STORAGE_GAME_STATE_KEY);
                }
            }

            if (!stateLoaded) {
                console.log("Starting new game.");
                startNewGame(wordListForValidation); // Start new if no valid state loaded
            }
        } catch (error) {
            console.error('Failed to load game state:', error);
            startNewGame(wordListForValidation); // Start new on error
        } finally {
            setIsLoading(false); // Finish loading
        }
    };

    // --- Start New / Play Again ---
    const startNewGame = (wordList: string[]) => {
        if (!wordList || wordList.length === 0) { /* ... error handling ... */ return; }
        const randomIndex = Math.floor(Math.random() * wordList.length);
        const newOriginalWord = wordList[randomIndex].toUpperCase();
        setWord(newOriginalWord); // Triggers useEffect for normalizedWord
        console.log(`New game word: ${newOriginalWord}, Lang: ${language}`);
        setGuesses(Array(MAX_GUESSES).fill(Array(WORD_LENGTH).fill('')));
        setCurrentRow(0);
        setCurrentTileIndex(0);
        setGameOver(false);
        setResultMessage('');
        setShowColors(Array(MAX_GUESSES).fill(false));
        setKeyColors({});
        setIsInvalidWord(false);
    };

    const handlePlayAgain = async () => {
        console.log("Play Again clicked");
        setIsLoading(true);
        await AsyncStorage.removeItem(ASYNC_STORAGE_GAME_STATE_KEY);
        startNewGame(currentWordList);
        setIsLoading(false);
    };

    // --- Rendering ---

    // Tile Rendering (Handles Accents via normalizedWord)
    const renderTile = (row: number, index: number) => {
        const letter = guesses[row][index] || ''; // User input (accent-free)
        const isEvaluated = showColors[row];
        const isCurrentRow = row === currentRow;

        // Default styles based on theme
        let tileBgColor = colors.colors.gray;
        let tileBorderColor = colors.colors.gray; // Use absent color for border
        let textColor = colors.colors.white;

        if (isEvaluated && letter) {
             // Use normalizedWord (accent-free, uppercase) for comparison
            const wordToCompare = normalizedWord; // Already derived in state
            const correctLetter = wordToCompare[index];

            if (correctLetter === letter) {
                tileBgColor = colors.colors.tealLight; // Green
                tileBorderColor = colors.colors.tealLight;
                textColor = colors.colors.white;
            } else if (wordToCompare.includes(letter)) {
                tileBgColor = colors.colors.amber; // Yellow
                tileBorderColor = colors.colors.amber;
                textColor = colors.colors.white;
            } else {
                tileBgColor = colors.colors.darkGray; // Gray (Absent)
                tileBorderColor = colors.colors.darkGray;
                textColor = colors.colors.white;
            }
        } else if (isCurrentRow && letter) {
            // Tile in current row being typed
            tileBorderColor = colors.colors.gray; // Slightly lighter gray border
        } else if (!isCurrentRow && !letter) {
             // Keep default empty style for rows above current with no letter
             tileBorderColor = colors.colors.gray;
        }

        const currentTileStyle = isCurrentRow && index === currentTileIndex && !gameOver
            ? styles.currentTileIndicator
            : {};

        return (
            <View
                key={`${row}-${index}`}
                style={[
                    styles.tile,
                    { backgroundColor: tileBgColor, borderColor: tileBorderColor },
                    currentTileStyle,
                 ]}
            >
                <Text style={[styles.tileText, { color: textColor }]}>{letter}</Text>
            </View>
        );
    };

    // Row Rendering
    const renderRow = (row: number) => (
        <View key={row} style={styles.row}>
            {Array.from({ length: WORD_LENGTH }).map((_, index) => renderTile(row, index))}
        </View>
    );

    // Loading State UI
    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.cards.primary }]}>
                <ActivityIndicator size="large" color={colors.text.primary} />
            </View>
        );
    }

    const handleGoBack = () => {
        router.back();
    };


    // Main Game UI
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined} // "height" might be needed on Android
            style={[styles.container, { backgroundColor: colors.cards.primary }]} // Use themed background
            keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0} // Adjust if header height differs
        >
            <Container style={{ flex: 1 }}>
                 <TopBarComponent
                     title="Wordle"
                     leftIcon={<Ionicons onPress={handleGoBack} name="arrow-back" size={28} color={colors.text.primary} />}
                     rightIcon={<Ionicons onPress={handleChangeLanguage} name="language" size={28} color={colors.text.primary} />}
                 />
            <View style={styles.languageIndicator}>
                <TextComponent weight="bold" size="small" style={styles.languageText}>
                    {language === 'en' ? 'English' : 'Português'}
                </TextComponent>
            </View>
                <View style={styles.gameArea}>
                    <View style={styles.rowsContainer}>
                        {guesses.map((_, row) => renderRow(row))}
                    </View>

                    {gameOver && (
                        <View style={styles.resultContainer}>
                            <TextComponent weight="bold" size="medium" style={[styles.resultMessage, { color: colors.text.secondary }]}>{resultMessage}</TextComponent>
                            <TouchableOpacity style={styles.playAgainButton} onPress={handlePlayAgain}>
                                <TextComponent weight="bold" size="medium" style={styles.playAgainText}>Jogar Novamente</TextComponent>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {!gameOver && (
                    <View style={styles.keyboardWrapper}>
                        <Keyboard
                            onKeyPress={handleKeyboardKeyPress}
                            keyBackgroundColors={keyColors}
                        />
                    </View>
                )}
            </Container>
        </KeyboardAvoidingView>
    );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
        flex: 1,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    gameArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    rowsContainer: {
        marginVertical: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 5,
    },
    tile: {
        width: Math.min(width / 7, 60),
        height: Math.min(width / 7, 60),
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 3,
        borderRadius: 4,
    },
    currentTileIndicator: {
        borderColor: colors.colors.white,
    },
    tileText: {
        fontSize: Math.min(width / 12, 30),
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    resultContainer: {
        marginTop: 20,
        alignItems: 'center',
        padding: 10,
    },
    resultMessage: {
        textAlign: 'center',
        marginBottom: 16,
    },
    playAgainButton: {
        backgroundColor: colors.colors.indigo || colors.colors.amber,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    playAgainText: {
        color: colors.colors.white,
    },
    keyboardWrapper: {
        width: '100%',
    },
    languageIndicator: {
      width: '100%',
      paddingVertical: 8,
      backgroundColor: colors.background.list,
      borderBottomWidth: 1,
      borderBottomColor: colors.background.listSecondary,
      alignItems: 'center',
  },
  languageText: {
      color: colors.colors.white,
  },
});

export default Wordle;