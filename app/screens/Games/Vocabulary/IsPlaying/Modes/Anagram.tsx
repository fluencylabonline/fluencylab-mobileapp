// src/components/Games/Modes/Anagram.tsx (or wherever you place game modes)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Layout,
  FadeIn,
  FadeOut,
  CurvedTransition,
  Easing, // Example transition for blanks layout
} from 'react-native-reanimated';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';

import { db } from '@/config/firebase'; // Adjust path
import { useTheme } from '@/constants/useTheme'; // Adjust path
import { TextComponent } from '@/components/TextComponent'; // Adjust path
import { useToast } from '@/components/Toast/useToast'; // Adjust path
import { VocabularyItem } from '@/types';


// Interface for the data structure stored within Firestore's vocabularydata array
interface FirestoreVocabItem extends VocabularyItem {
  scrambledWord?: string;
  blankSpaces?: string[];
  completed?: boolean;
}

interface AnagramProps {
  gameSessionId: string | null; // Can be VocabularyGame ID (single) or Games ID (multi)
  isSingleplayer: boolean;
  vocabularyList: VocabularyItem[]; // Passed directly from IsPlaying
  onGameComplete?: () => void; // Optional callback
  onCloseGame?: () => void; // Optional callback
}

// Helper to create an Animated TouchableOpacity
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedImage = Animated.createAnimatedComponent(Image);

const Anagram: React.FC<AnagramProps> = ({
  gameSessionId,
  isSingleplayer,
  vocabularyList,
  onGameComplete,
  onCloseGame,
}) => {
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true); // Loading state specific to this component/mode
  const [currentWord, setCurrentWord] = useState<string>('');
  const [currentImageURL, setCurrentImageURL] = useState<string | undefined>('');
  const [scrambledWord, setScrambledWord] = useState<string[]>([]);
  const [blankSpaces, setBlankSpaces] = useState<string[]>([]);
  const [isWordCompleted, setIsWordCompleted] = useState(false); // Local state for UI feedback
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wordsLeft, setWordsLeft] = useState<number>(0);
  const [gameFinished, setGameFinished] = useState(false);

  // Reanimated shared value for image opacity
  const imageOpacity = useSharedValue(0);

  // Firestore subcollection reference (only used in multiplayer)
  const anagramDocRef = useMemo(() => {
      if (!isSingleplayer && gameSessionId) {
          return doc(db, 'games', gameSessionId, 'modes', 'anagram');
      }
      return null;
  }, [isSingleplayer, gameSessionId]);

  // --- Local Scramble Function ---
  const scrambleWordLocally = (word: string): string[] => {
    if (!word) return [];
    return word.split('').sort(() => Math.random() - 0.5);
  };

  // --- Initialization and State Sync ---
  useEffect(() => {
    setIsLoading(true);
    setGameFinished(false);
    setIsWordCompleted(false); // Reset completion status on new word/init

    if (isSingleplayer) {
        // Singleplayer Initialization from Props
        if (vocabularyList && vocabularyList.length > 0) {
            const initialIndex = 0; // Always start at 0 for local singleplayer
            setCurrentIndex(initialIndex);
            setWordsLeft(vocabularyList.length);
            const currentItem = vocabularyList[initialIndex];

            if (currentItem && currentItem.vocab) {
                const word = currentItem.vocab;
                const scrambled = scrambleWordLocally(word);
                setCurrentWord(word);
                setCurrentImageURL(currentItem.imageURL);
                setScrambledWord(scrambled);
                setBlankSpaces(Array(word.length).fill(''));
                imageOpacity.value = withTiming(1, { duration: 500 }); // Animate image in
                setIsLoading(false);
            } else {
                showToast("Erro: Palavra inicial inválida.", "error");
                setIsLoading(false);
            }
        } else {
            showToast("Erro: Lista de vocabulário vazia.", "error");
            setIsLoading(false); // No words to play
        }
    } else {
        // Multiplayer: Listener handles initialization and sync
        // The listener useEffect below will run
    }

  }, [isSingleplayer, vocabularyList]); // Rerun if mode or base vocab changes


  // --- Multiplayer Firestore Listener ---
  useEffect(() => {
    if (isSingleplayer || !anagramDocRef) {
      return; // Don't listen in singleplayer or if ref is null
    }

    console.log("Anagram: Attaching Multiplayer Listener to:", anagramDocRef.path);
    setIsLoading(true); // Show loading while syncing

    const unsubscribe = onSnapshot(anagramDocRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("Anagram: Firestore Snapshot Received:", data);
          const firestoreVocabArray = data?.vocabularydata as FirestoreVocabItem[] | undefined;
          const syncedIndex = data?.currentIndex ?? 0;

          setCurrentIndex(syncedIndex); // Sync index

          if (firestoreVocabArray && firestoreVocabArray.length > syncedIndex) {
              const currentItem = firestoreVocabArray[syncedIndex];
              const word = currentItem.vocab; // Get the word from the FS array

              if (!word) {
                  console.error("Anagram Error: Word missing in Firestore data at index", syncedIndex);
                  setIsLoading(false);
                  return;
              }

              setCurrentWord(word);
              setCurrentImageURL(currentItem.imageURL);
              setBlankSpaces(currentItem.blankSpaces || Array(word.length).fill(''));
              setIsWordCompleted(currentItem.completed ?? false); // Sync completion status

              // Handle scrambled word sync/creation
              if (currentItem.scrambledWord) {
                  setScrambledWord(currentItem.scrambledWord.split(''));
              } else {
                  // First player here? Scramble, save, and set locally
                  console.log("Anagram: Scrambled word missing, generating...");
                  const scrambled = scrambleWordLocally(word);
                  setScrambledWord(scrambled); // Set locally immediately

                  // Update Firestore - potential race condition if multiple users hit this simultaneously
                  // Consider using a transaction or cloud function for initial scramble
                  const updatedFirestoreVocab = [...firestoreVocabArray];
                  updatedFirestoreVocab[syncedIndex] = {
                      ...currentItem,
                      scrambledWord: scrambled.join(''), // Save as string
                  };
                  try {
                      await updateDoc(anagramDocRef, { vocabularydata: updatedFirestoreVocab });
                      console.log("Anagram: Scrambled word saved to Firestore.");
                  } catch (error) {
                      console.error("Anagram: Failed to save scrambled word:", error);
                  }
              }

              setWordsLeft(firestoreVocabArray.length - syncedIndex);
              setGameFinished(syncedIndex >= firestoreVocabArray.length -1 && currentItem.completed === true);
              imageOpacity.value = withTiming(1, { duration: 500 }); // Animate image
              setIsLoading(false); // Synced successfully

          } else {
             console.log("Anagram: Firestore data structure issue or index out of bounds.");
             // Attempt to initialize if it seems empty? Requires careful handling.
             // Maybe use the passed vocabularyList to initialize the Firestore doc if needed?
             setIsLoading(false);
          }
        } else {
          // Document doesn't exist - Needs initialization (likely by game creator)
          // For simplicity, we assume the parent process initializes this document.
          console.warn("Anagram: Firestore document modes/anagram doesn't exist for game:", gameSessionId);
          showToast("Aguardando inicialização do modo Anagrama...", "info");
          setIsLoading(true); // Keep loading until doc appears
        }
      }, (error) => {
        console.error("Anagram: Error listening to Firestore:", error);
        showToast("Erro de conexão com o jogo Anagrama.", "error");
        setIsLoading(false);
      }
    );

    return () => {
      console.log("Anagram: Detaching Multiplayer Listener.");
      unsubscribe();
    };
  }, [isSingleplayer, anagramDocRef]); // Rerun only if switching modes or game ID changes


  // --- Core Game Logic Callbacks ---

  const handleLetterClick = useCallback(async (letter: string, letterIndex: number) => {
    // Prevent clicking if word is already completed
    if (isWordCompleted) return;

    const firstEmptyIndex = blankSpaces.findIndex(space => space === '');
    if (firstEmptyIndex !== -1) {
        const newBlanks = [...blankSpaces];
        newBlanks[firstEmptyIndex] = letter;
        setBlankSpaces(newBlanks); // Optimistic update

        // Remove letter from scrambled pool (visual feedback) - Handle duplicates carefully if needed
        // This basic removal assumes unique letters in scrambled pool for simplicity here
        const newScrambled = [...scrambledWord];
        // A simple approach: find first matching letter and remove it. Complexities arise with duplicate letters.
        // Maybe better: just track used indices if duplicates are common.
        // For now, let's just update blanks and check completion. Visual feedback on scrambled letters needs more logic.
        // setScrambledWord(newScrambled);

        const wordIsNowComplete = newBlanks.join('') === currentWord;
        if (wordIsNowComplete) {
            setIsWordCompleted(true);
            showToast("👏 Isso aí! Palavra correta!", "success", 1000); // Show for 1 sec
        }

        if (!isSingleplayer && anagramDocRef) {
            // Multiplayer: Update Firestore
            try {
                const fsDoc = await getDoc(anagramDocRef);
                if (fsDoc.exists()) {
                    const fsData = fsDoc.data();
                    const fsVocabArray = fsData?.vocabularydata as FirestoreVocabItem[] | undefined;
                    if (fsVocabArray && fsVocabArray.length > currentIndex) {
                        const updatedFsVocab = [...fsVocabArray];
                        updatedFsVocab[currentIndex] = {
                            ...updatedFsVocab[currentIndex],
                            blankSpaces: newBlanks,
                            completed: wordIsNowComplete,
                        };
                        await updateDoc(anagramDocRef, { vocabularydata: updatedFsVocab });
                    }
                }
            } catch (error) {
                console.error("Anagram: Error updating blanks/completion in Firestore:", error);
                showToast("Erro ao salvar progresso.", "error");
                // Consider reverting optimistic update if FS fails?
            }
        }
    }
  }, [blankSpaces, currentWord, isWordCompleted, isSingleplayer, anagramDocRef, currentIndex, showToast, scrambledWord]);


  const handlePlacedLetterClick = useCallback(async (index: number) => {
    // Prevent interaction if word is complete
    if (isWordCompleted) return;

    const letterToRemove = blankSpaces[index];
    if (letterToRemove) { // Only proceed if there's a letter to remove
        const newBlanks = [...blankSpaces];
        newBlanks[index] = '';
        setBlankSpaces(newBlanks); // Optimistic update

        // Add letter back to scrambled pool visually? Needs careful handling for duplicates/indices.

        // Always set completed to false when removing a letter
        setIsWordCompleted(false);

        if (!isSingleplayer && anagramDocRef) {
            // Multiplayer: Update Firestore
             try {
                const fsDoc = await getDoc(anagramDocRef);
                if (fsDoc.exists()) {
                    const fsData = fsDoc.data();
                    const fsVocabArray = fsData?.vocabularydata as FirestoreVocabItem[] | undefined;
                    if (fsVocabArray && fsVocabArray.length > currentIndex) {
                        const updatedFsVocab = [...fsVocabArray];
                        updatedFsVocab[currentIndex] = {
                            ...updatedFsVocab[currentIndex],
                            blankSpaces: newBlanks,
                            completed: false, // Ensure completed is false
                        };
                        await updateDoc(anagramDocRef, { vocabularydata: updatedFsVocab });
                    }
                }
            } catch (error) {
                console.error("Anagram: Error updating blanks/completion in Firestore:", error);
                showToast("Erro ao salvar progresso.", "error");
            }
        }
    }
  }, [blankSpaces, isWordCompleted, isSingleplayer, anagramDocRef, currentIndex, showToast]);


  const moveToNextWord = useCallback(async () => {
      const nextIndex = currentIndex + 1;
      const totalWords = vocabularyList.length; // Use prop length

      if (nextIndex < totalWords) {
          setCurrentIndex(nextIndex); // Update index locally first
          const nextItem = vocabularyList[nextIndex];
          const word = nextItem.vocab;
          const scrambled = scrambleWordLocally(word);

          // Reset local state for the new word
          setCurrentWord(word);
          setCurrentImageURL(nextItem.imageURL);
          setScrambledWord(scrambled);
          setBlankSpaces(Array(word.length).fill(''));
          setIsWordCompleted(false);
          setWordsLeft(totalWords - nextIndex);
          imageOpacity.value = 0; // Prepare for fade in
          imageOpacity.value = withDelay(100, withTiming(1)); // Fade in new image

          if (!isSingleplayer && anagramDocRef) {
              // Multiplayer: Update Firestore index and potentially scramble/save
               try {
                  // Check if next word needs scrambling in FS
                  const fsDoc = await getDoc(anagramDocRef);
                  let needsScrambleUpdate = false;
                  let updatedFsVocab: FirestoreVocabItem[] = [];

                  if (fsDoc.exists()) {
                     const fsData = fsDoc.data();
                     const fsVocabArray = fsData?.vocabularydata as FirestoreVocabItem[] | undefined;
                     if (fsVocabArray && fsVocabArray.length > nextIndex) {
                         updatedFsVocab = [...fsVocabArray]; // Copy FS data
                         if (!updatedFsVocab[nextIndex]?.scrambledWord) {
                             updatedFsVocab[nextIndex] = {
                                 ...updatedFsVocab[nextIndex], // Keep existing data like vocab, imageURL
                                 vocab: word, // Ensure vocab is correct
                                 imageURL: nextItem.imageURL, // Ensure image is correct
                                 scrambledWord: scrambled.join(''), // Add the scrambled word
                                 blankSpaces: Array(word.length).fill(''), // Reset blanks in FS too
                                 completed: false, // Reset completed in FS
                             };
                             needsScrambleUpdate = true;
                         }
                         // Just ensure blanks/completed are reset for the new index even if scrambled exists
                         else {
                             updatedFsVocab[nextIndex] = {
                                 ...updatedFsVocab[nextIndex],
                                 blankSpaces: Array(word.length).fill(''),
                                 completed: false,
                             };
                         }
                     }
                  }

                  // Update Firestore: Set new index and potentially the updated vocab array item
                  const updateData: any = { currentIndex: nextIndex };
                  if (needsScrambleUpdate || (updatedFsVocab.length > nextIndex)) {
                      // Only include vocabularydata if we modified it
                      updateData.vocabularydata = updatedFsVocab;
                  }
                  await updateDoc(anagramDocRef, updateData);

               } catch (error) {
                   console.error("Anagram: Error updating Firestore for next word:", error);
                   showToast("Erro ao sincronizar próximo passo.", "error");
               }
          }
      } else {
          // Game Finished
          setGameFinished(true);
          // Optionally call onGameComplete callback if passed
      }
  }, [currentIndex, vocabularyList, isSingleplayer, anagramDocRef, imageOpacity, showToast]);


  const handleResetGame = useCallback(async () => {
    if (isSingleplayer) {
        // Local Reset
        const initialIndex = 0;
        setCurrentIndex(initialIndex);
        setGameFinished(false);
        setWordsLeft(vocabularyList.length);
         if (vocabularyList.length > 0) {
            const firstItem = vocabularyList[initialIndex];
            const word = firstItem.vocab;
            const scrambled = scrambleWordLocally(word);
            setCurrentWord(word);
            setCurrentImageURL(firstItem.imageURL);
            setScrambledWord(scrambled);
            setBlankSpaces(Array(word.length).fill(''));
            setIsWordCompleted(false);
            imageOpacity.value = 0;
            imageOpacity.value = withDelay(100, withTiming(1));
        }
    } else if (anagramDocRef) {
        // Multiplayer Reset: Reset Firestore state
        try {
            const fsDoc = await getDoc(anagramDocRef);
            if (fsDoc.exists()) {
                 const fsData = fsDoc.data();
                 const fsVocabArray = fsData?.vocabularydata as FirestoreVocabItem[] | undefined;
                 if (fsVocabArray) {
                      // Reset state for ALL words in the Firestore array
                      const resetFsVocab = fsVocabArray.map(item => ({
                          vocab: item.vocab, // Keep original word/image
                          imageURL: item.imageURL,
                          // scrambledWord: '', // Optionally clear scrambled word? Or keep? Let's keep.
                          scrambledWord: item.scrambledWord, // Keep existing scrambled
                          blankSpaces: Array(item.vocab.length).fill(''),
                          completed: false,
                      }));
                      // Also reset currentIndex
                      await updateDoc(anagramDocRef, {
                          currentIndex: 0,
                          vocabularydata: resetFsVocab,
                      });
                      // State will update via the listener
                      showToast("Jogo reiniciado para todos!", "success");
                 }
            }
        } catch (error) {
            console.error("Anagram: Error resetting Firestore game:", error);
            showToast("Erro ao reiniciar o jogo.", "error");
        }
    }
  }, [isSingleplayer, vocabularyList, anagramDocRef, imageOpacity, showToast]);

  // --- Animation Styles ---
   const animatedImageStyle = useAnimatedStyle(() => {
    return {
      opacity: imageOpacity.value,
    };
  });

  // Style for blank spaces based on completion state
  const getBlankStyle = (letter: string) => {
      const isFull = blankSpaces.every(space => space !== '');
      const isCorrect = isFull && blankSpaces.join('') === currentWord;

      let backgroundColor = colors.cards.secondary; // Default/Empty color
      if (isFull) {
          backgroundColor = isCorrect ? colors.cards.primary : colors.text.primary;
      } else if (letter) {
          backgroundColor = colors.text.primary; // Color for filled but not complete/wrong
      } else {
          backgroundColor = colors.cards.secondary; // Empty slot color
      }

      return {
          backgroundColor,
          borderColor: isCorrect ? colors.cards.primary : isFull ? colors.text.primary : colors.cards.secondary,
      };
  };


  // --- Render ---
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.text.primary} />
        <TextComponent style={{ marginTop: 10, color: colors.text.primary }}>
          Carregando Anagrama...
        </TextComponent>
      </View>
    );
  }

  if (!currentWord && !gameFinished) {
      return (
          <View style={styles.centerContainer}>
              <TextComponent style={{color: colors.text.primary}}>Erro: Nenhuma palavra carregada.</TextComponent>
          </View>
      );
  }

  return (
    <Animated.View style={styles.container} layout={Layout.springify()}>
      {!gameFinished ? (
        <>
          <View style={styles.header}>
            <TextComponent style={{ color: colors.text.secondary, fontWeight: 'bold' }}>
              Faltam {wordsLeft} palavras!
            </TextComponent>
          </View>

          {/* Image */}
          <View style={styles.imageContainer}>
            {currentImageURL ? (
              <AnimatedImage
                key={currentImageURL + currentIndex} // Key change triggers animation if needed
                source={{ uri: currentImageURL }}
                style={[styles.image, animatedImageStyle]}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                 <TextComponent style={{color: colors.text.secondary}}>Sem Imagem</TextComponent>
              </View>
            )}
          </View>

          {/* Blank Spaces */}
          <Animated.View style={styles.letterContainer} layout={CurvedTransition.easingY(Easing.elastic(1)).duration(500)}>
            {blankSpaces.map((letter, index) => (
              <AnimatedTouchable
                key={`blank-${index}`}
                style={[styles.letterBox, styles.blankBox, getBlankStyle(letter)]}
                onPress={() => handlePlacedLetterClick(index)}
                disabled={isWordCompleted} // Disable removing letters when word is correct
                layout={Layout.springify()} // Animate layout changes
                entering={FadeIn.duration(300).delay(index * 50)} // Staggered fade in
                exiting={FadeOut.duration(200)}
              >
                <TextComponent style={[styles.letterText, { color: colors.text.primary }]}>
                  {/* Use a placeholder that fits the box better if empty */}
                  {letter || ''}
                </TextComponent>
              </AnimatedTouchable>
            ))}
          </Animated.View>

          {/* Scrambled Letters */}
          <Animated.View style={styles.letterContainer} layout={Layout.springify()}>
            {scrambledWord.map((letter, index) => (
              // Consider adding logic here to 'disable' or visually hide letters
              // that have already been placed in the blank spaces above, especially if handling duplicates.
              <AnimatedTouchable
                key={`scramble-${index}-${letter}`} // Key needs to be unique even with duplicate letters
                style={[styles.letterBox, styles.scrambledBox, { backgroundColor: colors.cards.secondary }]}
                onPress={() => handleLetterClick(letter, index)}
                disabled={isWordCompleted} // Disable placing letters when word is correct
                layout={Layout.springify()}
                entering={FadeIn.duration(300).delay(index * 50)}
                exiting={FadeOut.duration(200)}
              >
                <TextComponent style={[styles.letterText, { color: colors.text.primary }]}>
                  {letter}
                </TextComponent>
              </AnimatedTouchable>
            ))}
          </Animated.View>

          {/* Action Button */}
          <View style={styles.actionButtonContainer}>
             {isWordCompleted && (
                <TouchableOpacity
                   style={[styles.button, { backgroundColor: colors.cards.secondary }]}
                   onPress={moveToNextWord}
                >
                   <TextComponent style={{ color: colors.text.primary, fontWeight: 'bold' }}>Próxima</TextComponent>
                </TouchableOpacity>
             )}
          </View>
        </>
      ) : (
        // Game Finished State
        <View style={styles.centerContainer}>
          <TextComponent size='large' weight='bold' style={{ color: colors.text.primary, marginBottom: 20 }}>
            🎉 Parabéns! 🎉
          </TextComponent>
          <TextComponent style={{ color: colors.text.secondary, marginBottom: 30, textAlign: 'center' }}>
            Você completou todas as palavras!
          </TextComponent>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.cards.secondary }]}
            onPress={handleResetGame}
          >
            <TextComponent style={{ color: colors.text.primary, fontWeight: 'bold' }}>Jogar Novamente</TextComponent>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};


// --- Styles ---
const screenWidth = Dimensions.get('window').width;
const containerPadding = 20;
// Calculate box size for ~5-6 boxes per row with some spacing
const numBoxesPerRow = 6;
const totalSpacing = (numBoxesPerRow + 1) * 8; // 8px spacing between/around boxes
const letterBoxSize = (screenWidth - (containerPadding * 2) - totalSpacing) / numBoxesPerRow;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: containerPadding,
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: containerPadding,
  },
  header: {
    marginBottom: 15,
  },
  imageContainer: {
     width: '60%', // Adjust size as needed
     aspectRatio: 1, // Make it square
     marginBottom: 20,
     alignItems: 'center',
     justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
   imagePlaceholder: {
      width: '100%',
      height: '100%',
      borderRadius: 10,
      backgroundColor: '#e0e0e0', // Use theme color like colors.border
      alignItems: 'center',
      justifyContent: 'center',
   },
  letterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 25, // Spacing between blanks and scrambled
    minHeight: letterBoxSize + 10, // Ensure container has height even if empty initially
  },
  letterBox: {
    width: letterBoxSize,
    height: letterBoxSize,
    margin: 4, // Spacing between boxes
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1, // Add border to blanks
  },
  blankBox: {
     // Specific styles for blank boxes (border handled by getBlankStyle)
  },
  scrambledBox: {
     borderColor: 'transparent', // No border for scrambled letters by default
     elevation: 2,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.1,
     shadowRadius: 2,
  },
  letterText: {
    fontSize: letterBoxSize * 0.5, // Adjust font size relative to box size
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  actionButtonContainer: {
    marginTop: 10, // Space above the button
    height: 50, // Reserve space for the button to avoid layout shifts
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25, // More rounded button
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});

export default Anagram;