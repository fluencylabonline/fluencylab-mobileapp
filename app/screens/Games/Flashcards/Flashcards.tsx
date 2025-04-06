import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
 View,
 StyleSheet,
 FlatList,
 ImageBackground,
 TouchableOpacity,
 Modal,
} from 'react-native';
import { db } from '@/config/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { query, collection, getDocs, where, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import ReviewCard from './ReviewCard';
import { Ionicons } from '@expo/vector-icons';
import Loading from '@/components/Animation/Loading';
import { TextComponent } from '@/components/TextComponent';
import { Colors } from '@/constants/Colors'; // Fetched via content_fetcher
import { useTheme } from '@/constants/useTheme'; // Fetched via content_fetcher
import { useToast } from '@/components/Toast/useToast';
import TopBarComponent from '@/components/TopBarComponent';
import Container from '@/components/ContainerComponent';
import InputComponent from '@/components/InputComponent';
import ButtonComponent from '@/components/ButtonComponent';
import BottomSheet, { BottomSheetFlatList, BottomSheetTextInput } from '@gorhom/bottom-sheet'; // Import BottomSheet components

// Types
interface Deck {
   id: string; // Represents the document ID (deck name)
   tags?: string[]; // Optional tags
   cardsToReviewCount: number;
}

interface OtherDeck {
   id: string; // Represents the document ID (deck name)
   tags?: string[]; // Optional tags
}

interface Student {
 id: string;
 [key: string]: any;
 name: string;
}

interface FlashcardsProps {
 onClose: () => void;
}

// Main App Component
const Flashcards: React.FC<FlashcardsProps> = ({ onClose }) => {
 const { colors } = useTheme(); //
 const { showToast } = useToast();
 const [currentUser, setCurrentUser] = useState<any>(null);
 const [role, setRole] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);
 const [otherDecks, setOtherDecks] = useState<OtherDeck[]>([]);
 const [decks, setDecks] = useState<Deck[]>([]);
 const [modalVisible, setModalVisible] = useState(false); // Modal visibility for reviewing deck
 const [modalAddingVisible, setModalAddingVisible] = useState(false); // Modal visibility for adding deck to self
 const [selectedDeck, setSelectedDeck] = useState<string>('');
 const [searchQuery, setSearchQuery] = useState<string>(''); // Search query for students modal

 // BottomSheet Ref and State
 const bottomSheetRef = useRef<BottomSheet>(null);
 const snapPoints = useMemo(() => ['25%', '50%', '90%'], []); // Define snap points

 const auth = getAuth();

 // Handle authentication state
 useEffect(() => {
   const unsubscribe = onAuthStateChanged(auth, async (user) => {
     if (user) {
       setCurrentUser(user);
       const userRef = doc(db, 'users', user.uid);
       const userSnapshot = await getDoc(userRef);
       if (userSnapshot.exists()) {
         const userData = userSnapshot.data();
         setRole(userData.role);
       }
     } else {
       setCurrentUser(null);
       setRole(null);
     }
     // Initial data fetch depends on currentUser, so move setLoading(false) inside fetchDecksWithReviewCount
   });
   return unsubscribe;
 }, []);

 // State for managing students and sending deck modal
 const [isOtherConfirmModalOpen, setIsOtherConfirmModalOpen] = useState<boolean>(false);
 const [students, setStudents] = useState<Student[]>([]);
 const [selectedStudentId, setSelectedStudentId] = useState<string>('');
 const [studentSearchQuery, setStudentSearchQuery] = useState<string>(''); // Separate search for student selection modal

 // Fetch students who are assigned to the teacher
 useEffect(() => {
   const fetchStudents = async () => {
     if (currentUser?.uid && role === 'teacher') { // Only fetch if user is logged in and is a teacher
       const usersRef = collection(db, 'users');
       const q = query(usersRef, where('role', '==', 'student'), where('professorId', '==', currentUser.uid));
       const querySnapshot = await getDocs(q);
       const fetchedStudents: Student[] = [];
       querySnapshot.forEach((doc) => {
         fetchedStudents.push({ id: doc.id, name: doc.data().name, ...doc.data() });
       });
       setStudents(fetchedStudents);
     } else {
        setStudents([]); // Clear students if not a teacher or not logged in
     }
   };

   fetchStudents();
 }, [currentUser?.uid, role]); // Add role dependency

 // Back handler
 const handleBack = () => {
   onClose();
 };

 // --- BottomSheet Handlers ---
 const handleOpenBottomSheet = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(1); // Snap to the middle point initially
 }, []);

 const handleCloseBottomSheet = useCallback(() => {
    bottomSheetRef.current?.close();
 }, []);
 // --------------------------

 // Open the modal to confirm sending the deck to a student
 const openOtherConfirmModal = (deckId: string) => {
   setSelectedDeck(deckId);
   setSelectedStudentId(''); // Reset selected student
   setStudentSearchQuery(''); // Reset student search query
   setIsOtherConfirmModalOpen(true);
   handleCloseBottomSheet(); // Close bottom sheet when opening modal
 };

 // Close the confirmation modal for sending deck
 const closeOtherConfirmModal = () => {
   setIsOtherConfirmModalOpen(false);
   setSelectedDeck('');
   setSelectedStudentId('');
 };

 // Function to send the selected deck to the selected student
 const confirmOtherDeckAddition = async () => {
   const studentId = selectedStudentId;
   try {
     if (studentId && selectedDeck) {
       setLoading(true); // Show loading indicator during operation
       await addSelectDeckToStudent(selectedDeck, studentId);
       closeOtherConfirmModal();
       showToast('Deck enviado com sucesso!', 'success');
       setLoading(false);
     } else {
        showToast('Selecione um aluno para enviar o deck.', 'error'); // Inform user to select student
     }
   } catch (error) {
     console.error('Error sending deck to student:', error);
     showToast('Erro ao enviar deck', 'error');
     setLoading(false);
   }
 };

 // Firestore logic to add a deck and its cards to a student's profile
 const addSelectDeckToStudent = async (deckId: string, studentId: string) => {
   if (!deckId || !studentId) {
     console.error('Deck ID or student ID is missing.');
     throw new Error('Deck ID or student ID is missing.'); // Throw error to be caught by caller
   }

   try {
     const deckRef = doc(db, 'Flashcards', deckId);
     const deckSnapshot = await getDoc(deckRef);

     if (!deckSnapshot.exists()) {
       console.error('Deck not found.');
       throw new Error('Deck not found.');
     }

     const deckData = deckSnapshot.data() as Omit<Deck, 'cardsToReviewCount'>; // Don't copy review count

     // Add deck metadata to student's subcollection
     const studentDeckRef = doc(db, 'users', studentId, 'Decks', deckId);
     await setDoc(studentDeckRef, { ...deckData, copiedFrom: 'Flashcards/' + deckId }); // Add reference if needed

     // Fetch and copy cards
     const cardsQuery = query(collection(db, 'Flashcards', deckId, 'cards'));
     const cardsSnapshot = await getDocs(cardsQuery);
     const studentCardsCollectionRef = collection(db, 'users', studentId, 'Decks', deckId, 'cards');

     const cardPromises = cardsSnapshot.docs.map(async (cardDoc) => {
       const data = cardDoc.data();
       if (!data.front || !data.back) {
         console.warn('Invalid card data skipped:', cardDoc.id, data);
         return; // Skip invalid cards
       }
       const cardData = {
         ...data,
         interval: 1, // Initial SM-2 values
         dueDate: new Date().toISOString(),
         easeFactor: 2.5,
         reviewCount: 0,
         // id is implicitly set by Firestore when using addDoc, or explicitly using setDoc with doc(ref, cardDoc.id)
       };
       // Use setDoc with original ID to avoid duplicates if sent multiple times? Or addDoc for simplicity?
       // Using setDoc ensures if the card exists, it's updated (e.g., with new initial values).
       const studentCardRef = doc(studentCardsCollectionRef, cardDoc.id);
       await setDoc(studentCardRef, cardData);
     });

     await Promise.all(cardPromises);

   } catch (error) {
     console.error('Error adding deck and cards for the student:', error);
     throw error; // Re-throw error for the caller to handle
   }
 };

 // Fetch user's decks with review counts
 const fetchDecksWithReviewCount = async () => {
   if (!currentUser?.uid) return []; // Check if currentUser and uid exist
   setLoading(true); // Start loading
   const decksQuery = query(collection(db, 'users', currentUser.uid, 'Decks'));
   const decksSnapshot = await getDocs(decksQuery);
   const decksDataPromises = decksSnapshot.docs.map(async (deckDoc) => {
     const deckId = deckDoc.id;
     const cardsQuery = query(
       collection(db, 'users', currentUser.uid, 'Decks', deckId, 'cards'),
       where('dueDate', '<=', new Date().toISOString())
     );
     const cardsSnapshot = await getDocs(cardsQuery);
     const cardsToReviewCount = cardsSnapshot.docs.length;
     // Optionally fetch deck tags or other data from deckDoc.data() if needed
     const deckDocData = deckDoc.data();
     return { id: deckId, cardsToReviewCount, tags: deckDocData.tags };
   });

   const decksData = await Promise.all(decksDataPromises);
   setLoading(false); // Stop loading after fetching
   return decksData;
 };

 // Fetch user's decks effect
 useEffect(() => {
   const fetchData = async () => {
     if (!currentUser) return;
     try {
       const fetchedDecks = await fetchDecksWithReviewCount();
       setDecks(fetchedDecks);
     } catch (error) {
       console.error('Error fetching user decks:', error);
       setLoading(false); // Ensure loading stops on error
       showToast('Erro ao buscar seus decks', 'error');
     }
   };

   fetchData();
   // Re-fetch when modalAddingVisible becomes false (after adding a new deck)
   if (!modalAddingVisible) {
        fetchData();
   }

 }, [currentUser, modalAddingVisible]); // Add modalAddingVisible dependency

 // Fetch public decks (available decks)
 useEffect(() => {
   const fetchOtherDecks = async () => {
     // No need for loading state here as it's for the bottom sheet
     try {
       const decksQuery = query(collection(db, 'Flashcards')); // Assuming 'Flashcards' is the public collection
       const decksSnapshot = await getDocs(decksQuery);
       const fetchedOtherDecks = decksSnapshot.docs.map((doc) => ({
         id: doc.id,
         tags: doc.data().tags, // Assuming public decks also have tags
       })) as OtherDeck[];
       setOtherDecks(fetchedOtherDecks);
     } catch (error) {
       console.error('Error fetching other decks:', error);
        showToast('Erro ao buscar decks disponíveis', 'error');
     }
   };

   fetchOtherDecks();
 }, []);

 // Confirm adding a public deck to the user's own decks
 const confirmDeckAddition = async () => {
   try {
     if (currentUser?.uid && selectedDeck) {
       setLoading(true); // Show loading
       await addSelectDeck(selectedDeck, currentUser.uid);
       showToast('Deck adicionado com sucesso!', 'success');
       setModalAddingVisible(false); // Close confirmation modal
       handleCloseBottomSheet(); // Close bottom sheet
       // No need to setLoading(false) here, useEffect dependency will trigger re-fetch and set it
     } else {
        showToast('Erro: Usuário não encontrado.', 'error');
     }
   } catch (error) {
     console.error('Error adding deck to user:', error);
     showToast('Erro ao adicionar deck', 'error');
     setLoading(false); // Stop loading on error
     setModalAddingVisible(false);
   }
 };

 // Firestore logic to add a public deck and its cards to the current user's profile
 const addSelectDeck = async (deckId: string, userId: string) => {
    if (!deckId || !userId) {
        console.error('Deck ID or user ID is missing.');
        throw new Error('Deck ID or user ID is missing.');
    }

    try {
        const deckRef = doc(db, 'Flashcards', deckId);
        const deckSnapshot = await getDoc(deckRef);

        if (!deckSnapshot.exists()) {
            console.error('Public Deck not found.');
            throw new Error('Deck not found.');
        }

        const deckData = deckSnapshot.data() as Omit<Deck, 'cardsToReviewCount'>;

        // Reference to the user's deck subcollection
        const userDeckRef = doc(db, 'users', userId, 'Decks', deckId);

        // Check if deck already exists for the user
        const userDeckSnap = await getDoc(userDeckRef);
        if (userDeckSnap.exists()) {
            showToast('Deck já adicionado!', 'info');
            // Optionally: Update existing deck data? For now, just inform.
            return; // Stop execution if deck already exists
        }


        // Save deck data to user's profile
        await setDoc(userDeckRef, { ...deckData, copiedFrom: 'Flashcards/' + deckId });

        // Fetch and copy cards from the public deck
        const cardsQuery = query(collection(db, 'Flashcards', deckId, 'cards'));
        const cardsSnapshot = await getDocs(cardsQuery);

        const userCardsCollectionRef = collection(db, 'users', userId, 'Decks', deckId, 'cards');

        const cardPromises = cardsSnapshot.docs.map(async (cardDoc) => {
            const data = cardDoc.data();
            if (!data.front || !data.back) {
                console.warn('Invalid public card data skipped:', cardDoc.id, data);
                return;
            }
            const cardData = {
                ...data,
                interval: 1,
                dueDate: new Date().toISOString(),
                easeFactor: 2.5,
                reviewCount: 0,
            };
            const userCardRef = doc(userCardsCollectionRef, cardDoc.id); // Use original ID
            await setDoc(userCardRef, cardData);
        });

        await Promise.all(cardPromises);

    } catch (error) {
        console.error('Error adding public deck and cards for the user:', error);
        throw error; // Re-throw error
    }
};


 // Open review modal
 const handleDeckPress = (deckId: string) => {
   setSelectedDeck(deckId);
   setModalVisible(true);
 };

 // Open confirmation modal for adding deck to self
 const handleAddingDeckPress = (deckId: string) => {
   setSelectedDeck(deckId);
   setModalAddingVisible(true);
 };

 // Close review modal
 const closeModalGame = () =>{
   setSelectedDeck('');
   setModalVisible(false);
   // Optionally refetch decks here if review affects counts shown
   // fetchDecksWithReviewCount().then(setDecks);
 }

 // Filter students for the "send deck" modal
 const filteredStudents = students.filter((student) =>
   student.name.toLowerCase().includes(studentSearchQuery.toLowerCase())
 );

 // Filter otherDecks based on search query in BottomSheet
 const filteredOtherDecks = otherDecks.filter((deck) =>
    deck.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (deck.tags && deck.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
 );

 const headerName = 'Meus decks'; // Static title now

 if (loading && decks.length === 0) { // Show loading only on initial load or when explicitly set
   return <Loading />;
 }

 // --- Render Functions for Lists ---
 const renderMyDeckItem = ({ item }: { item: Deck }) => (
    <TouchableOpacity onPress={() => handleDeckPress(item.id)}>
      <ImageBackground
        source={require('@/assets/games/flashcards-deck-background.png')}
        style={styles.deckListItem}
        imageStyle={styles.deckListImage} // Apply borderRadius to image
      >
        <View style={[styles.overlay, { backgroundColor: colors.cardBackgroundBottomSheet }]}/>
        <View style={styles.deckListItemContent}>
          <TextComponent weight="bold" size="medium" style={styles.deckListName}>{item.id}</TextComponent>
          <TextComponent weight="regular" size="small" style={styles.cardsToReview}>
            {item.cardsToReviewCount} {item.cardsToReviewCount === 1 ? 'cartão' : 'cartões'} para revisar
          </TextComponent>
        </View>
      </ImageBackground>
    </TouchableOpacity>
 );

 const renderOtherDeckItem = ({ item }: { item: OtherDeck }) => (
    // Wrap with View, not TouchableOpacity, action buttons are inside
    <View style={[styles.otherDeckItem, { backgroundColor: colors.cardBackgroundSecodary }]}>
      <View style={styles.otherDeckTextContainer}>
        <TextComponent weight="bold" size="medium" style={[styles.otherDeckName, { color: colors.text }]}>{item.id}</TextComponent>
         {/* Optionally display tags here */}
         {item.tags && (
            <TextComponent size="small" style={[styles.tagsText, { color: colors.secondaryText }]}>
                Tags: {item.tags.join(', ')}
            </TextComponent>
          )}
      </View>
      <View style={styles.otherDeckActionsContainer}>
          {/* Button to add deck to user's own collection */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: Colors.teal.default }]} // Use Teal for Add
            onPress={() => handleAddingDeckPress(item.id)}
           >
             <Ionicons name="add" size={20} color="white" />
            {/* <TextComponent weight="bold" size="small" style={styles.actionButtonText}>Adicionar</TextComponent> */}
          </TouchableOpacity>

          {/* Button to send deck (only for teachers) */}
          {role === 'teacher' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.indigo.lighter }]} // Use Indigo for Send
              onPress={() => openOtherConfirmModal(item.id)}
            >
                <Ionicons name="person-circle-outline" size={20} color="white" />
              {/* <TextComponent weight="bold" size="small" style={styles.actionButtonText}>Enviar</TextComponent> */}
            </TouchableOpacity>
          )}
      </View>
    </View>
 );

 if (modalVisible) {
  return (
    <>
       <ReviewCard selectedDeck={selectedDeck} closeModalGame={closeModalGame}/>
    </>
  );
 }

 if (modalAddingVisible) {
  return (
    
<Modal
       visible={modalAddingVisible}
       animationType="fade"
       transparent={true}
       onRequestClose={() => setModalAddingVisible(false)}
     >
       <View style={styles.modalBackdrop}>
         <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
           <TextComponent weight="regular" size="medium" style={[styles.modalText, { color: colors.text }]}>
             Adicionar o deck "{selectedDeck}" aos seus decks?
           </TextComponent>
           <View style={styles.modalButtons}>
            <ButtonComponent
                title="Cancelar"
                onPress={() => setModalAddingVisible(false)}
                color='deepOrange'
              />
             <ButtonComponent
               title="Sim"
               onPress={confirmDeckAddition} // Changed to call the correct confirmation function
               color='teal' //
             />
           </View>
         </View>
       </View>
     </Modal>    
  );
 }

 if(isOtherConfirmModalOpen) {
  return (
       <View style={styles.modalBackdrop}>
         <View style={[styles.modalContent, { backgroundColor: colors.cardBackgroundBottomSheet }]}>
           <TextComponent weight="bold" size="medium" style={[styles.modalText, { color: colors.text }]}>
             Enviar deck "{selectedDeck}" para:
           </TextComponent>

           {/* Student Search Input */}
           <InputComponent
             placeholder="Buscar aluno..."
             placeholderTextColor={colors.secondaryText}
             value={studentSearchQuery}
             onChangeText={setStudentSearchQuery}
             style={{marginBottom: 10}} // Add some margin
           />

           {/* Student List */}
           <FlatList
             data={filteredStudents}
             style={styles.studentList} // Added style for max height and border
             contentContainerStyle={{ paddingBottom: 10 }}
             showsVerticalScrollIndicator={false}
             renderItem={({ item }) => (
               <TouchableOpacity
                 onPress={() => setSelectedStudentId(item.id)}
                 style={[
                    styles.studentItem,
                    { borderColor: colors.secondaryText }, //
                    selectedStudentId === item.id ? { backgroundColor: Colors.indigo.lightest } : {} // Highlight selected
                 ]}
               >
                 <TextComponent
                   weight="regular" // Regular weight for names
                   size="medium"
                   style={[
                     styles.studentName,
                     { color: colors.text },
                     // selectedStudentId === item.id && { color: colors.secondaryText } // Change highlight to background instead of text color
                   ]}
                 >
                   {item.name}
                 </TextComponent>
               </TouchableOpacity>
             )}
             keyExtractor={(item) => item.id}
             ListEmptyComponent={() => (
                <View style={styles.emptyListContainer}>
                    <TextComponent style={{color: colors.secondaryText}}>Nenhum aluno encontrado.</TextComponent>
                </View>
            )}
           />
           {/* Modal Buttons */}
           <View style={styles.modalButtons}>
            <ButtonComponent
               title="Cancelar"
               onPress={closeOtherConfirmModal}
               color='deepOrange'
             />
             <ButtonComponent
               title="Enviar"
               onPress={confirmOtherDeckAddition}
               disabled={!selectedStudentId} // Disable if no student is selected
               color='indigo'
             />
           </View>
         </View>
       </View>
    );
 }

 return (
   <Container>
     <TopBarComponent
        title={headerName}
        leftIcon={<Ionicons onPress={handleBack} name="arrow-back" size={28} color={colors.text} />} //
        rightIcon={<Ionicons onPress={handleOpenBottomSheet} name="flash" size={28} color={colors.text} />} // Changed icon to search
     />

     {/* My Decks List */}
     <FlatList
        data={decks}
        renderItem={renderMyDeckItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
            <View style={styles.emptyListContainer}>
                <TextComponent style={{color: colors.secondaryText}}>Nenhum deck pessoal encontrado.</TextComponent>
                <TextComponent style={{color: colors.secondaryText}}>Toque no ícone de busca para adicionar decks.</TextComponent>
            </View>
        )}
     />


     {/* Available Decks BottomSheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1} // Start closed
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backgroundStyle={{ backgroundColor: colors.cardBackgroundBottomSheet }} //
        handleIndicatorStyle={{ backgroundColor: colors.secondaryText }} //
        // onChange={handleSheetChanges} // Optional: Handle state changes
      >
        <View style={styles.bottomSheetContentContainer}>
            <TextComponent weight='bold' size='large' style={[styles.bottomSheetTitle, { color: colors.text }]}>Decks Disponíveis</TextComponent>
             {/* Search Input inside BottomSheet */}
            <BottomSheetTextInput
                placeholder="Buscar por nome ou tag..."
                placeholderTextColor={colors.secondaryText} //
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{zIndex: 1000, flex: 1}}
            />

            <BottomSheetFlatList
                data={filteredOtherDecks}
                renderItem={renderOtherDeckItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.bottomSheetListContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                     <View style={styles.emptyListContainer}>
                        <TextComponent style={{color: colors.secondaryText}}>Nenhum deck disponível encontrado.</TextComponent>
                     </View>
                )}
             />
        </View>
      </BottomSheet>
   </Container>
 );
};

const styles = StyleSheet.create({
 listContainer: {
   paddingHorizontal: 16,
   paddingTop: 10,
 },
 deckListItem: {
   width: '100%',
   // minHeight: 100, // Ensure a minimum height
   marginVertical: 8,
   borderRadius: 12,
   overflow: 'hidden', // Keep overflow hidden for ImageBackground
   justifyContent: 'center', // Center content vertically
 },
 deckListImage: {
    borderRadius: 12, // Apply border radius to the image itself
 },
 deckListItemContent: {
    padding: 20, // Add padding for content inside ImageBackground
    alignItems: 'flex-start', // Align text to the left
    zIndex: 1, // Ensure content is above overlay
  },
 overlay: {
   ...StyleSheet.absoluteFillObject,
   borderRadius: 12,
 },
 deckListName: {
   fontSize: 18,
   color: 'white', // White text for better contrast on image
   marginBottom: 4,
 },
 cardsToReview: {
   fontSize: 14,
   color: 'white', // White text for better contrast on image
 },
 emptyListContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
 },

 // BottomSheet styles
 bottomSheetContentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
 },
 bottomSheetTitle: {
    textAlign: 'center',
    marginBottom: 15,
 },
 bottomSheetListContainer:{
    paddingBottom: 30, // Padding at the bottom of the list inside bottom sheet
 },
 searchInput: {
   height: 45,
   width: '100%',
   borderWidth: 1,
   marginBottom: 15,
   paddingLeft: 15,
   borderRadius: 8,
   fontSize: 16,
 },
 otherDeckItem: {
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginVertical: 5,
    borderRadius: 10,
    flexDirection: 'row', // Arrange content and actions side-by-side
    justifyContent: 'space-between', // Space out text and buttons
    alignItems: 'center', // Vertically align items
 },
 otherDeckTextContainer: {
    flex: 1, // Allow text to take available space
    marginRight: 10, // Add space between text and buttons
 },
 otherDeckName: {
    fontSize: 17,
    marginBottom: 3,
 },
 tagsText: {
    fontSize: 13,
 },
 otherDeckActionsContainer:{
    flexDirection: 'row',
 },
 actionButton: {
    marginLeft: 8, // Space between buttons
    padding: 8,
    borderRadius: 20, // Make buttons circular or rounded
    justifyContent: 'center',
    alignItems: 'center',
 },
 actionButtonText: {
    color: 'white',
    marginLeft: 5, // Space between icon and text if used
 },

 // Modal styles
 modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(119, 119, 119, 0.49)', // Darker backdrop
 },
 modalContent: {
   width: '90%',
   maxWidth: 400, // Max width for larger screens
   padding: 25,
   borderRadius: 15,
   alignItems: 'center', // Center content horizontally
 },
 modalText: {
   fontSize: 18,
   marginBottom: 25,
   textAlign: 'center', // Center text
 },
 modalButtons: {
   flexDirection: 'row',
   justifyContent: 'space-around', // Better spacing for two buttons
   width: '100%',
   marginTop: 10, // Add margin above buttons
   gap: 10,
 },
 studentList: {
    maxHeight: 250, // Limit height of student list
    width: '100%',
    marginBottom: 15,
    borderWidth: 1,
    borderRadius: 8,
 },
 studentItem: {
   paddingVertical: 12,
   paddingHorizontal: 15,
   width: '100%',
   borderBottomWidth: 1,
 },
 studentName: {
   fontSize: 16,
 },
 // Remove unused styles like pagination, page, scrollView, headerButton etc.
});

export default Flashcards;