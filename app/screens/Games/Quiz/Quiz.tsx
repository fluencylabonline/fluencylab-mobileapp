// screens/QuizScreen.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions
} from "react-native";

// Firebase
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  arrayUnion, // Import arrayUnion for adding tasks
  Timestamp,   // Import Timestamp if needed for task creation time
} from "firebase/firestore";
// Adjust this path if your firebase config is elsewhere
import { db } from "@/config/firebase";

// Custom Components & Hooks - Adjust paths as needed for your project structure
import Container from "@/components/ContainerComponent";
import { TextComponent } from "@/components/TextComponent";
import InputComponent from "@/components/InputComponent";
import ButtonComponent from "@/components/ButtonComponent"; // Your provided ButtonComponent
import { useTheme } from "@/constants/useTheme";
import QuizTimer from '@/app/screens/Games/Quiz/QuizTimer';

// Icons
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import TopBarComponent from "@/components/TopBarComponent";
import LoadingComponent from "@/components/Animation/Loading";

// --- Interfaces ---
interface Option { option: string; isCorrect: boolean; }
interface Question { questionTitle: string; options: Option[]; }
interface Deck { id: string; deckTitle: string; deckDescription?: string; questions: Question[]; }
interface Student { id: string; name?: string; email?: string; }
interface UserScore { [deckTitle: string]: number; }
interface TaskItem { task: string; link: string; done: boolean; createdAt?: Timestamp; deckId?: string; } // Added fields to TaskItem
interface UserData {
    role?: 'student' | 'teacher';
    tasks?: TaskItem[]; // Changed structure slightly for easier updates
    quizzes?: UserScore;
    professorId?: string;
    name?: string;
}

// --- Component ---
const QuizScreen: React.FC<{ navigation?: any, onClose?: () => void }> = ({ navigation, onClose }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  // --- State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'teacher' | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [userScores, setUserScores] = useState<UserScore>({});
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [isPlayModalVisible, setIsPlayModalVisible] = useState(false);
  const [isStudentModalVisible, setIsStudentModalVisible] = useState(false);
  const [playQuestions, setPlayQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('');
  const [score, setScore] = useState(0);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [showNextButton, setShowNextButton] = useState(false); // *** ADDED: State for Next button visibility ***
  const [isQuizFinished, setIsQuizFinished] = useState(false); // *** ADDED: Flag to prevent double finish ***

  const isMountedRef = useRef(true);
  // const timeoutIdRef = useRef<NodeJS.Timeout | null>(null); // *** ADDED: Ref for potential timeout (though we removed the main one) ***

  // --- Lifecycle Effect for Mount Status ---
  useEffect(() => {
      isMountedRef.current = true;
      return () => {
          isMountedRef.current = false;
          // Clear any pending timeout on unmount
          // if (timeoutIdRef.current) {
          //   clearTimeout(timeoutIdRef.current);
          // }
      };
  }, []);

  // --- Authentication Listener ---
  useEffect(() => {
    const auth = getAuth();
    setIsLoadingAuth(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMountedRef.current) return; // Prevent state updates if unmounted

      if (user) {
        setCurrentUser(user);
        const uid = user.uid;
        setUserId(uid);

        try {
          const userDocRef = doc(db, 'users', uid);
          const userDocSnapshot = await getDoc(userDocRef);
          if (userDocSnapshot.exists()) {
            const userData = userDocSnapshot.data() as UserData;
            if (isMountedRef.current) {
              setUserRole(userData.role || null);
              setUserScores(userData.quizzes || {});
            }
          } else { /* Handle missing doc */ if (isMountedRef.current) { setUserRole(null); setUserScores({}); } }
        } catch (error) { /* Handle error */ if (isMountedRef.current) { setUserRole(null); setUserScores({}); } console.error("Auth Error fetching user data:", error); }
      } else {
        // Clear state if logged out
        if (isMountedRef.current) {
            setCurrentUser(null); setUserId(null); setUserRole(null);
            setUserScores({}); setDecks([]); setStudents([]);
            setSelectedDeck(null); setIsPlayModalVisible(false); setIsStudentModalVisible(false);
            resetPlayState(); // Ensure quiz state is fully reset
        }
        if (navigation) { /* Handle navigation if needed */ } else if (onClose) { onClose(); }
      }
      if (isMountedRef.current) setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [navigation, onClose]);


  // --- Data Fetching Effects ---
  const fetchDecks = useCallback(async () => {
    if (!isMountedRef.current) return; // Check mount status
    setIsLoadingData(true);
    try {
      const decksCollection = collection(db, "Quizzes");
      const snapshot = await getDocs(decksCollection);
      const decksData = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
              id: docSnap.id,
              deckTitle: data.deckTitle || "Deck Sem Título",
              deckDescription: data.deckDescription || "",
              // Ensure questions is always an array, handle potential undefined/null
              questions: Array.isArray(data.questions) ? data.questions.map((q: any) => ({
                ...q,
                // Ensure options is always an array
                options: Array.isArray(q.options) ? q.options : []
              })) : [],
          } as Deck;
      }).filter(deck => deck.questions && deck.questions.length > 0); // Filter out decks with no questions early
      if (isMountedRef.current) setDecks(decksData);
    } catch (error) { console.error("Error fetching decks:", error); console.log("Log: Erro ao buscar decks."); if (isMountedRef.current) setDecks([]); } // Clear decks on error
    finally { if (isMountedRef.current) setIsLoadingData(false); }
  }, []); // Empty deps, relies on outer effect

  useEffect(() => {
    if (userId) { fetchDecks(); }
    else { if (isMountedRef.current) setDecks([]); }
  }, [userId, fetchDecks]);

  useEffect(() => {
    const fetchStudents = async () => {
        if (!userId || !isMountedRef.current) return; // Ensure userId exists and component is mounted
        // No need for setIsLoadingData here unless it's a critical blocking load
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('role', '==', 'student'), where('professorId', '==', userId));
            const querySnapshot = await getDocs(q);
            const fetchedStudents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
            if (isMountedRef.current) setStudents(fetchedStudents);
        } catch (error) { console.error("Error fetching students:", error); if (isMountedRef.current) setStudents([]); }
    };
    if (userRole === 'teacher') { fetchStudents(); }
    else { if (isMountedRef.current) setStudents([]); }
  }, [userRole, userId]); // Re-fetch if role or userId changes


   // --- Quiz Logic ---

    // Memoized handleFinishQuiz
    const handleFinishQuiz = useCallback(async () => {
        // *** ADDED: Check if already finished or unmounted ***
        if (!isMountedRef.current || isQuizFinished) {
            console.log("Log: handleFinishQuiz called but already finished or unmounted.");
            return;
        }
        console.log("Log: Finalizando quiz. Pontuação:", score);
        setIsQuizFinished(true); // *** ADDED: Set finished flag immediately ***

        if (userId && selectedDeck) {
          try {
            const userDocRef = doc(db, 'users', userId);
            // Use dot notation for nested fields in updateDoc
            const scoreFieldName = `quizzes.${selectedDeck.deckTitle}`;
            await updateDoc(userDocRef, { [scoreFieldName]: score });
            console.log('Log: Pontuação salva com sucesso!');
            if (isMountedRef.current) {
                // Update local state optimistically
                setUserScores(prevScores => ({...prevScores, [selectedDeck.deckTitle]: score}));
                // Ensure we show the final score screen
                // Setting index beyond length signals completion in the UI rendering logic
                setCurrentQuestionIndex(playQuestions.length);
                setShowNextButton(false); // Hide next button on finish screen
            }
          } catch (error) {
             console.error("Error saving score:", error);
             console.log("Log: Erro ao salvar pontuação.");
             // Optionally: Inform user score wasn't saved
             if (isMountedRef.current) {
                // Still move to finish screen even if save fails
                setCurrentQuestionIndex(playQuestions.length);
                setShowNextButton(false);
             }
          }
        } else {
             console.log("Log: Cannot save score - userId or selectedDeck missing.");
             if (isMountedRef.current) {
                // Still move to finish screen
                setCurrentQuestionIndex(playQuestions.length);
                setShowNextButton(false);
             }
        }
    }, [userId, selectedDeck, score, playQuestions?.length, isQuizFinished]); // *** ADDED: isQuizFinished dependency ***

    // Memoized goToNextQuestion
    const goToNextQuestion = useCallback(() => {
        if (!isMountedRef.current) return;

        // // Clear any pending timeout (though we removed the primary one)
        // if (timeoutIdRef.current) {
        //     clearTimeout(timeoutIdRef.current);
        //     timeoutIdRef.current = null;
        // }

        // Check if the quiz should finish *before* resetting state for the next question
        if (currentQuestionIndex >= playQuestions.length - 1) {
            handleFinishQuiz();
        } else {
             // Reset for the *next* question
            setFeedback('');
            setUserAnswer(null);
            setShowNextButton(false); // *** ADDED: Hide Next button for the new question ***
            setCurrentQuestionIndex(prevIndex => prevIndex + 1);
            // Timer will restart automatically due to key change and isPlaying prop update
        }
    }, [currentQuestionIndex, playQuestions, handleFinishQuiz]);

   // --- State Reset Functions ---
   const resetPlayState = useCallback(() => {
       if (isMountedRef.current) {
           setSelectedDeck(null);
           setPlayQuestions([]);
           setCurrentQuestionIndex(0);
           setUserAnswer(null);
           setFeedback('');
           setFeedbackColor('');
           setScore(0);
           setShowNextButton(false); // *** ADDED: Reset Next button ***
           setIsQuizFinished(false); // *** ADDED: Reset finished flag ***
           // // Clear any lingering timeout
           // if (timeoutIdRef.current) {
           //   clearTimeout(timeoutIdRef.current);
           //   timeoutIdRef.current = null;
           // }
       }
   }, []); // No dependencies needed if it only uses setters

  const handleAddDeckAsTask = useCallback(async () => {
    if (!selectedStudentId || !selectedDeck || !isMountedRef.current) {
      Alert.alert("Erro", "Selecione um aluno e um deck para atribuir a tarefa.");
      return;
    }
    setIsLoadingData(true); // Show loading indicator
    try {
      const studentDocRef = doc(db, 'users', selectedStudentId);
      const newTask: TaskItem = {
        task: `Quiz: ${selectedDeck.deckTitle}`,
        link: `quiz/${selectedDeck.id}`, // Example link structure, adjust as needed
        done: false,
        createdAt: Timestamp.now(), // Add a timestamp
        deckId: selectedDeck.id // Store deck ID for reference
      };

      // Atomically add the new task to the 'tasks' array
      await updateDoc(studentDocRef, {
        tasks: arrayUnion(newTask)
      });

      if (isMountedRef.current) {
        Alert.alert("Sucesso", `Quiz "${selectedDeck.deckTitle}" adicionado como tarefa para o aluno selecionado.`);
        setIsStudentModalVisible(false);
        setSelectedStudentId(''); // Reset selection
      }
    } catch (error) {
      console.error("Error adding deck as task:", error);
      if (isMountedRef.current) {
        Alert.alert("Erro", "Não foi possível adicionar a tarefa. Verifique o console para mais detalhes.");
      }
    } finally {
      if (isMountedRef.current) setIsLoadingData(false); // Hide loading indicator
    }
  }, [selectedStudentId, selectedDeck]); // Dependencies

  // --- Quiz Play Functions ---
  const openPlayQuiz = useCallback((deck: Deck) => {
      console.log("Log: Abrindo quiz:", deck.deckTitle, "Questões:", deck.questions?.length || 0);
      // Ensure questions exist and are valid before opening
      if (!deck || !Array.isArray(deck.questions) || deck.questions.length === 0) {
          Alert.alert("Erro", "Este deck não contém perguntas válidas.");
          console.log("Log: Tentativa de abrir quiz inválido ou sem perguntas.");
          return;
      }
      if (!isMountedRef.current) return;

      resetPlayState(); // Reset all quiz state variables first
      setSelectedDeck(deck);
      // Shuffle questions here if desired:
      // setPlayQuestions([...deck.questions].sort(() => Math.random() - 0.5));
      setPlayQuestions(deck.questions); // Keep original order for now
      setCurrentQuestionIndex(0); // Start at the first question
      setIsPlayModalVisible(true);
      // Timer will start via useEffect in QuizTimer based on isPlaying prop change
  }, [resetPlayState]); // Dependency on resetPlayState

  const closePlayQuiz = useCallback(() => {
    // No need to clear timer here, it stops when isPlaying becomes false
    if (isMountedRef.current) {
        setIsPlayModalVisible(false);
        resetPlayState(); // Ensure full reset on close
    }
  }, [resetPlayState]);

  const handleAnswerSelect = useCallback((selectedOption: string) => {
    // Prevent selecting another answer if one is already chosen for this question
    if (userAnswer !== null || !isMountedRef.current) return;

    if (!playQuestions || !playQuestions[currentQuestionIndex]) {
        console.error("Error: Tentando responder mas questão atual inválida.");
        closePlayQuiz(); // Close if state is invalid
        return;
    }

    const currentQuestion = playQuestions[currentQuestionIndex];
    // Ensure options exist before finding the correct one
    const correctOption = Array.isArray(currentQuestion.options)
        ? currentQuestion.options.find(opt => opt.isCorrect)
        : null;

    const isCorrect = correctOption ? selectedOption === correctOption.option : false;

    setUserAnswer(selectedOption); // Mark answer as selected
    setFeedback(isCorrect ? "Correto!" : `Errado! Resposta: ${correctOption?.option || 'N/A'}`);
    setFeedbackColor(isCorrect ? colors.colors.black : colors.colors.black);
    if (isCorrect) setScore((prevScore) => prevScore + 1);
    setShowNextButton(true);

  }, [userAnswer, playQuestions, currentQuestionIndex, closePlayQuiz]); // Removed goToNextQuestion from deps


   // --- UI Rendering ---

   // Filtered Decks
   const filteredDecks = decks.filter((deck) =>
       deck.deckTitle.toLowerCase().includes(searchQuery.toLowerCase())
   );

   const renderDeckItem = useCallback(({ item }: { item: Deck }) => (
       <View style={[styles.deckItemContainer, { backgroundColor: colors.background.list, borderColor: colors.background.listSecondary || colors.colors.black }]}>
           <TouchableOpacity onPress={() => openPlayQuiz(item)} style={styles.deckTouchable} disabled={!item.questions || item.questions.length === 0}>
               <View style={styles.deckInfo}>
                   <Ionicons name="layers-outline" size={24} color={(!item.questions || item.questions.length === 0) ? colors.text.secondary : colors.text.primary} />
                   <TextComponent style={[styles.deckTitleText, { color: (!item.questions || item.questions.length === 0) ? colors.text.secondary : colors.text.primary }]} weight="bold" numberOfLines={1}>{item.deckTitle}</TextComponent>
               </View>
               {(!item.questions || item.questions.length === 0) && <TextComponent style={styles.noQuestionsText}>(Vazio)</TextComponent>}
               <TextComponent style={[styles.deckScoreText, { color: colors.text.secondary }]}>Pontos: {userScores[item.deckTitle] ?? 'N/A'}</TextComponent>
           </TouchableOpacity>
       </View>
   ), [colors.cards.primary, colors.text.secondary, colors.text.primary, userScores, userRole, openPlayQuiz]); // Memoization deps

    const renderPlayOption = useCallback(({ item }: { item: Option }) => {
        const isSelected = userAnswer === item.option;
        let dynamicBackgroundColor = colors.background.list;
        let iconName: keyof typeof Ionicons.glyphMap | null = "ellipse-outline";
        let iconColor = colors.text.secondary;
        let textColor = colors.text.primary;
        const hasAnswered = userAnswer !== null;

        if (hasAnswered) { // Feedback phase
            if (item.isCorrect) {
                dynamicBackgroundColor = colors.colors.tealLight; iconName = "checkmark-circle"; // Solid checkmark
                iconColor = colors.colors.white; textColor = colors.colors.white;
            } else if (isSelected) { // Incorrectly selected
                dynamicBackgroundColor = colors.colors.deepOrangeLight; iconName = "close-circle"; // Solid X
                iconColor = colors.colors.white; textColor = colors.colors.white;
            } else { // Incorrect, not selected
                dynamicBackgroundColor = colors.cards.secondary; iconName = "ellipse-outline"; // Faded/disabled look
                iconColor = colors.text.secondary; textColor = colors.colors.white;
            }
        } else { // Selection phase (no answer yet)
             // Style for selectable options (could add hover effect if needed)
             dynamicBackgroundColor = colors.cards.secondary; // Default background
             iconName = "ellipse-outline";
             iconColor = colors.background.list; // Use primary text color for selection icons
             textColor = colors.colors.white;
        }

        return (
            <TouchableOpacity
                style={[
                    styles.playOptionButton,
                    {
                        backgroundColor: dynamicBackgroundColor,
                        borderColor: iconColor,
                        opacity: hasAnswered && !isSelected && !item.isCorrect ? 0.6 : 1 // Dim unselected wrong answers
                    }
                ]}
                onPress={() => handleAnswerSelect(item.option)}
                disabled={hasAnswered} // Disable button after an answer is selected
            >
                {iconName && <Ionicons name={iconName} size={24} color={iconColor} style={styles.optionIcon} />}
                <TextComponent style={[styles.playOptionText, { color: textColor }]}>{item.option}</TextComponent>
            </TouchableOpacity>
        );
    }, [userAnswer, colors.cards.primary, colors.text.secondary, colors.text.primary, handleAnswerSelect]); // Memoization deps

    const DismissKeyboard = ({ children }: { children: React.ReactNode }) => (
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()} accessible={false}>
          {children}
        </TouchableWithoutFeedback>
    );

    if (isLoadingAuth) {
        return (
            <Container style={styles.centered}>
                <LoadingComponent />    
            </Container>
        );
    }

  return (
    <DismissKeyboard>
    <Container>
        <TopBarComponent
            title="Quiz"
            leftIcon={<Ionicons name="arrow-back-outline" size={24} color={colors.text.primary} onPress={() => router.back()} />}
        />  
        
        <InputComponent
            placeholder="Procurar por deck..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.text.secondary}
        />
        
        {isLoadingData && decks.length === 0 && !searchQuery && (
             <ActivityIndicator size="large" color={colors.text.primary} style={styles.loadingIndicator} />
        )}

        <FlatList
            data={filteredDecks}
            renderItem={renderDeckItem}
            keyExtractor={(item) => item.id}
            style={styles.deckList}
            ListEmptyComponent={
                !isLoadingData ? ( // Only show "No decks" if not loading
                    <TextComponent style={[styles.emptyListText, {color: colors.background.list}]}>
                        {searchQuery ? 'Nenhum deck encontrado.' : 'Nenhum quiz disponível.'}
                    </TextComponent>
                ) : null
            }
            contentContainerStyle={filteredDecks.length === 0 ? styles.centered : {paddingBottom: 20}}
            keyboardShouldPersistTaps="handled" // Keep keyboard open if needed after tap
        />

         <Modal
             visible={isPlayModalVisible}
             animationType="slide"
             onRequestClose={closePlayQuiz} // Use callback for hardware back button
             transparent={true}
             statusBarTranslucent={true}
         >
             <View style={styles.modalOverlay}>
                 <View style={[styles.modalContainer, { backgroundColor: colors.cards.primary }]}>
                     <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                           {selectedDeck && playQuestions && playQuestions.length > 0 ? (
                             <>
                             <View style={[styles.modalHeader, {borderColor: colors.text.secondary || colors.colors.black}]}>
                                 <TextComponent weight="bold" size="large" style={{ color: colors.text.primary, flex: 1, marginRight: 10 }} numberOfLines={1}>{selectedDeck.deckTitle}</TextComponent>
                                 <TouchableOpacity onPress={closePlayQuiz}>
                                     <Ionicons name="close-circle-outline" size={30} color={colors.text.primary} />
                                 </TouchableOpacity>
                             </View>

                              {currentQuestionIndex < playQuestions.length && (
                                 <QuizTimer
                                     key={currentQuestionIndex} // Force re-mount on question change to reset timer state
                                     duration={60} // Or make this dynamic per deck/question
                                     isPlaying={isPlayModalVisible && currentQuestionIndex < playQuestions.length && userAnswer === null}
                                     onFinish={goToNextQuestion} // Timer expiration moves to next question/finish
                                     resetKey={currentQuestionIndex} // Use index to signal reset
                                 />
                              )}

                               {currentQuestionIndex < playQuestions.length ? (
                                   <View style={styles.playArea}>
                                       <TextComponent style={[styles.questionCountText, { color: colors.text.secondary }]}>
                                           Pergunta {currentQuestionIndex + 1} de {playQuestions.length}
                                       </TextComponent>
                                       <TextComponent weight="bold" size="medium" style={[styles.playQuestionTitle, { color: colors.text.primary }]}>
                                           {playQuestions[currentQuestionIndex]?.questionTitle || "Carregando pergunta..."}
                                       </TextComponent>
                                       {playQuestions[currentQuestionIndex]?.options ? (
                                           <FlatList
                                                data={playQuestions[currentQuestionIndex].options}
                                                renderItem={renderPlayOption}
                                                keyExtractor={(item, index) => `play-opt-${currentQuestionIndex}-${item.option}-${index}`}
                                                style={styles.playOptionsList}
                                                scrollEnabled={false} // Usually not needed for 4-5 options
                                                extraData={userAnswer} // Ensure re-render when userAnswer changes
                                            />
                                       ) : (
                                           <ActivityIndicator color={colors.text.primary} style={{marginTop: 20}}/>
                                       )}

                                       {showNextButton && (
                                           <ButtonComponent
                                               title={currentQuestionIndex >= playQuestions.length - 1 ? "Finalizar Quiz" : "Próxima Pergunta"}
                                               onPress={goToNextQuestion}
                                               style={{ marginTop: 20, width: '90%' }}
                                               color="indigo"
                                           />
                                       )}
                                   </View>
                               ) : (
                                   <View style={styles.playArea}>
                                       <Ionicons name="trophy-outline" size={60} color={colors.colors.amber} style={{marginBottom: 15}}/>
                                       <TextComponent weight="bold" size="large" style={[styles.finalScoreTitle, { color: colors.text.primary }]}>Quiz Completo!</TextComponent>
                                       <TextComponent size="medium" style={[styles.finalScoreText, { color: colors.text.primary }]}>Sua pontuação: {score} / {playQuestions.length}</TextComponent>
                                       <ButtonComponent title="Fechar" onPress={closePlayQuiz} style={{ marginTop: 20 }} color="teal" />
                                   </View>
                               )}
                               </>
                           ) : (
                               <View style={styles.centered}>
                                   <ActivityIndicator size="large" color={colors.text.primary} />
                                   <TextComponent style={{color: colors.text.primary, marginTop: 10}}>Carregando Quiz...</TextComponent>
                                   <ButtonComponent title="Cancelar" onPress={closePlayQuiz} style={{marginTop: 20}} color="amber"/>
                               </View>
                           )}
                     </ScrollView>
                 </View>
             </View>
         </Modal>

        <Modal
            visible={isStudentModalVisible}
            animationType="fade"
            onRequestClose={() => setIsStudentModalVisible(false)}
            transparent={true}
            statusBarTranslucent={true}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { backgroundColor: colors.cards.primary, maxHeight: '70%' }]}>
                        <View style={[styles.modalHeader, {borderColor: colors.text.secondary || colors.colors.black}]}>
                            <TextComponent weight="bold" size="large" style={{color: colors.text.primary, flex: 1, marginRight: 10}}>Atribuir Tarefa de Quiz</TextComponent>
                            <TouchableOpacity onPress={() => setIsStudentModalVisible(false)}>
                                <Ionicons name="close-circle-outline" size={30} color={colors.text.primary} />
                            </TouchableOpacity>
                        </View>
                        <TextComponent style={{marginBottom: 10, color: colors.text.secondary, paddingHorizontal: 20}}>Atribuir "{selectedDeck?.deckTitle || 'Deck selecionado'}" para:</TextComponent>

                        {isLoadingData && students.length === 0 && ( <ActivityIndicator size="small" color={colors.text.primary} style={{marginVertical: 20}}/> )}

                        {students.length > 0 ? (
                            <FlatList
                                data={students}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[ styles.studentSelectItem, { backgroundColor: selectedStudentId === item.id ? colors.colors.indigo : colors.background.list, borderColor: selectedStudentId === item.id ? colors.colors.indigo : colors.text.secondary } ]}
                                        onPress={() => setSelectedStudentId(item.id)}
                                    >
                                        <Ionicons name={selectedStudentId === item.id ? "radio-button-on" : "ellipse-outline"} size={20} color={selectedStudentId === item.id ? colors.colors.indigo : colors.text.primary} />
                                        <TextComponent style={{marginLeft: 10, color: colors.text.primary, flex: 1}} numberOfLines={1}>{item.name || item.email || `ID: ${item.id.substring(0, 8)}...`}</TextComponent>
                                    </TouchableOpacity>
                                )}
                                style={styles.studentList}
                                contentContainerStyle={{paddingHorizontal: 15, paddingBottom: 10}}
                                extraData={selectedStudentId} // Ensure re-render on selection
                            />
                        ) : (
                           !isLoadingData && <TextComponent style={[styles.emptyListText, {color: colors.text.secondary, marginVertical: 20}]}>Nenhum aluno encontrado.</TextComponent>
                        )}

                        <View style={[styles.modalFooter, {borderColor: colors.text.secondary || '#ccc'}]}>
                            <ButtonComponent title="Cancelar" onPress={() => setIsStudentModalVisible(false)} color="amber" />
                            <ButtonComponent
                                title={isLoadingData ? "Atribuindo..." : "Atribuir Tarefa"} // Better loading text
                                onPress={handleAddDeckAsTask}
                                disabled={!selectedStudentId || isLoadingData} // Disable if no student selected or if loading
                                color="teal"
                             />
                        </View>
                </View>
            </View>
          </Modal>

    </Container>
    </DismissKeyboard>
  );
};

const { width: screenWidth, height: screenHeight} = Dimensions.get('window');
const modalMaxWidth = 500; // Max width for modals on larger screens

const getStyles = (colors: any) => StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    header: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 1, gap: 10, /* borderColor set in component */ },
    searchInput: { flex: 1, height: 45 },
    deckList: { flex: 1, width: '100%', marginTop: 30 },
    deckItemContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, marginVertical: 5, marginHorizontal: 10, borderRadius: 8, borderWidth: 1, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1.5, /* bgColor/borderColor set in component */ },
    deckTouchable: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: 10 },
    deckInfo: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: 8, gap: 10 },
    deckTitleText: { fontSize: 16, flexShrink: 1 },
    deckScoreText: { fontSize: 14, textAlign: 'right', marginLeft: 'auto', paddingLeft: 8 }, // Use auto margin for push, add padding
    noQuestionsText: { fontSize: 12, color: colors.colors.deepOrange, fontStyle: 'italic', marginLeft: 5 }, // Style for (Vazio) text
    teacherActions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginLeft: 10 }, // Add margin if score pushes too close
    iconStyle: { padding: 3 },
    emptyListText: { textAlign: 'center', marginTop: 30, fontSize: 16 },
    loadingIndicator: { paddingVertical: 30 },
    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 20 },
    modalContainer: { width: '100%', maxWidth: modalMaxWidth, maxHeight: screenHeight * 0.9, borderRadius: 15, padding: 0, overflow: 'hidden', elevation: 7, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, paddingBottom: 12, paddingHorizontal: 20, paddingTop: 15, marginBottom: 15, /* borderColor set in component */ },
    modalFooter: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 'auto', paddingTop: 15, paddingBottom: 15, paddingHorizontal: 20, borderTopWidth: 1, /* borderColor set in component */ },
    // Play Modal Specific (Timer styles removed - handled in QuizTimer component)
    playArea: { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
    questionCountText: { fontSize: 14, marginBottom: 8, opacity: 0.8 },
    playQuestionTitle: { textAlign: 'center', marginBottom: 25, fontSize: 18, lineHeight: 25 },
    playOptionsList: { width: '100%', marginBottom: 15 },
    playOptionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 15, marginVertical: 7, borderRadius: 10, borderWidth: 1.5 },
    optionIcon: { marginRight: 12 },
    playOptionText: { fontSize: 16, flex: 1 },
    feedbackBox: { marginTop: 15, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8, width: '100%', minHeight: 45, alignItems: 'center', justifyContent: 'center' },
    feedbackText: { color: '#FFFFFF', textAlign: 'center', fontSize: 16, fontWeight: '600' },
    finalScoreTitle: { marginBottom: 15, textAlign: 'center' },
    finalScoreText: { marginBottom: 25, textAlign: 'center' },
    // Student Select Modal Specific
    studentList: { maxHeight: screenHeight * 0.4, marginBottom: 15 },
    studentSelectItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, marginVertical: 5, borderRadius: 8, borderWidth: 1, marginHorizontal: 5, /* bgColor/borderColor set in component */ },
});


export default QuizScreen;