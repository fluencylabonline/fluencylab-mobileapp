import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { collection, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { Link, router, useLocalSearchParams } from 'expo-router';
import Container from '@/components/ContainerComponent';
import InputComponent from '@/components/InputComponent';
import { TextComponent } from '@/components/TextComponent';
import { useTheme } from '@/constants/useTheme';
import TopBarComponent from '@/components/TopBarComponent';
import { Ionicons } from '@expo/vector-icons';
import Loading from '@/components/Animation/Loading';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useToast } from '@/components/Toast/useToast';
import ButtonComponent from '@/components/ButtonComponent';
import { fetchUserData } from '@/hooks/fetchUserData';

interface Notebook {
  studentName: string;
  id: string;
  title: string;
  description: string;
  createdAt: any;
  student: string;
  content: any;
  classReport?: string;
}

const Aulas: React.FC = () => {
  const { studentID } = useLocalSearchParams();
  const [user, setUser] = useState<any>(undefined);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNotebooks, setFilteredNotebooks] = useState<Notebook[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [loading, setLoading] = useState(true);
  
  // State for report bottom sheet
  const [modalNoteId, setModalNoteId] = useState<string>('');
  const [reportContent, setReportContent] = useState('');
  
  // Toast hook
  const { showToast } = useToast();
  
  // BottomSheet ref and snap points
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%'], []);

  useEffect(() => {
          const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
          if (authUser) {
          try {
              const data = await fetchUserData(authUser.uid);
              setUser(data);
          } catch (error) {
              console.error("Error fetching basic user data:", error);
          } finally {
              //
              }
          } else {
              setUser(null);
          }});
  
          return () => unsubscribe();
  }, []);

  // Real-time subscription to the notebooks collection
  useEffect(() => {
    const notebookRef = collection(db, `users/${studentID}/Notebooks`);
    const unsubscribe = onSnapshot(notebookRef, (snapshot) => {
      const notebookList: Notebook[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const notebook: Notebook = {
          id: docSnap.id,
          title: data.title || '',
          description: data.description || '',
          createdAt: data.createdAt || '',
          studentName: data.studentName || '',
          student: data.student || '',
          content: data.content || '',
          classReport: data.classReport || '',
        };
        notebookList.push(notebook);
      });
      setNotebooks(notebookList);
      setFilteredNotebooks(notebookList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [studentID]);

  // Optionally, onRefresh can force a re-fetch if needed
  const onRefresh = async () => {
    setRefreshing(true);
    // In real-time mode, the subscription updates automatically.
    setRefreshing(false);
  };

  // Filter notebooks by search query
  useEffect(() => {
    const filtered = notebooks.filter((notebook) =>
      notebook.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredNotebooks(filtered);
  }, [searchQuery, notebooks]);

  const notebookItemStyle = {
    ...styles.notebookItem,
    backgroundColor: colors.cards.primary,
  };

  // Open the bottom sheet and set the active notebook id, preserving saved report if it exists
  const handleOpenReportSheet = (noteId: string) => {
    setModalNoteId(noteId);
    const notebook = notebooks.find((item) => item.id === noteId);
    setReportContent(notebook?.classReport || '');
    bottomSheetRef.current?.expand();
  };

  // Close the bottom sheet and reset values
  const handleCloseReportSheet = () => {
    bottomSheetRef.current?.close();
    setModalNoteId('');
    setReportContent('');
  };

  // Save report to Firestore and show toast notification
  const handleSaveReport = async () => {
    try {
      const notebookRef = doc(db, `users/${studentID}/Notebooks/${modalNoteId}`);
      await updateDoc(notebookRef, {
        classReport: reportContent,
      });
      handleCloseReportSheet();
      showToast('Tarefa adicionada!', 'success', 3000, 'bottom');
    } catch (error) {
      console.error('Error saving report:', error);
    }
  };

  if (loading || user === undefined) {
    return (
      <Container>
        <Loading />
      </Container>
    );
  }

  return (
    <Container>
      <TopBarComponent
        title="Cadernos"
        leftIcon={
          <TouchableOpacity onPress={router.back}>
            <Ionicons name="arrow-back-sharp" size={26} color={colors.text.primary} />
          </TouchableOpacity>
        }
      />

      <View style={{ paddingHorizontal: 10 }}>
        <View style={{ marginBottom: 12 }}>
          <InputComponent
            placeholder="Procurar aula..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredNotebooks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={notebookItemStyle}>
              <Link
                href={{
                  pathname: '/screens/TipTap/Editor',
                  params: {
                    notebookID: item.id,
                    studentID: item.student,
                    role: user?.role === 'teacher' ? 'teacher' : 'student',
                    darkMode: isDarkMode.toString(),
                  },
                }}
              >
                <View>
                  <TextComponent
                    weight="regular"
                    size="small"
                    style={[{ color: colors.text.secondary }]}
                  >
                    {item.title}
                  </TextComponent>
                  <TextComponent
                    weight="bold"
                    size="medium"
                    style={[{ color: colors.text.primary }]}
                  >
                    {item.description}
                  </TextComponent>
                </View>
              </Link>
              {user?.role === 'teacher' && (
              <TouchableOpacity
                onPress={() => handleOpenReportSheet(item.id)}
              >
                <Ionicons name="document-text-outline" size={24} color={colors.text.primary} />
              </TouchableOpacity>)}
            </View>
          )}
          ListEmptyComponent={<TextComponent>Nenhuma aula encontrada</TextComponent>}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#341F94']} />
          }
        />
      </View>

      {/* Bottom Sheet for Report */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        handleIndicatorStyle={{ backgroundColor: colors.colors.white, width: 70, height: 5, borderRadius: 2.5 }}
        backgroundStyle={{
            ...styles.bottomSheetShadow,
            backgroundColor: colors.bottomSheet.background,
        }}
      >
        <BottomSheetView style={[styles.sheetContainer, { backgroundColor: colors.bottomSheet.background }]}>
          <TextComponent weight="bold" size="large" color={colors.colors.indigo} style={styles.sheetTitle}>Criar Relatório de Aula</TextComponent>
          <InputComponent
            placeholder="Digite o relatório..."
            value={reportContent}
            onChangeText={setReportContent}
            multiline
          />
          <View style={styles.buttonContainer}>
              <ButtonComponent color='deepOrangeLight' title="Cancelar" onPress={handleCloseReportSheet} />
              <ButtonComponent color='tealLight' title="Salvar" onPress={handleSaveReport} />
          </View>
        </BottomSheetView>
      </BottomSheet>
    </Container>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
   bottomSheetShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 35,
    borderRadius: 16,
    },
  notebookItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',   
    alignItems: 'center',
  },
  sheetContainer: {
    padding: 16,
  },
  sheetTitle: {
    marginBottom: 18,
    textAlign: 'center',
  },
  input: {
    height: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    backgroundColor: '#ccc',
    borderRadius: 8,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.colors.indigo,
    borderRadius: 8,
  },
});

export default Aulas;
