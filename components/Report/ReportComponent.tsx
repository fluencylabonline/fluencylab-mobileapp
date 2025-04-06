import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, FlatList, StyleSheet, useColorScheme } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { TextComponent } from '@/components/TextComponent';
import { Colors } from '@/constants/Colors';
import { db } from '@/config/firebase'; // Assuming you have a Firebase setup
import { collection, query, where, getDocs } from 'firebase/firestore';

interface ReportsComponentProps {
  studentID: string;
  onClose?: () => void;
}

const ReportsComponent: React.FC<ReportsComponentProps> = ({ studentID, onClose }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = ['50%', '85%'];
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const reportsRef = collection(db, 'reports');
        const q = query(reportsRef, where('studentID', '==', studentID));
        const querySnapshot = await getDocs(q);

        const fetchedReports = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setReports(fetchedReports);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [studentID]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      index={0}
      enablePanDownToClose={true}
      onChange={(index) => {
        if (index === -1) onClose?.();
      }}
      handleIndicatorStyle={{ backgroundColor: Colors.indigo.default, width: 65 }}
      backgroundStyle={{
        ...styles.bottomSheetShadow,
        backgroundColor: isDark ? Colors.background.darker : Colors.background.lighter,
      }}
    >
      <BottomSheetView style={styles.container}>
        <TextComponent weight="bold" size="large" color={isDark ? Colors.indigo.default : Colors.indigo.default} style={styles.title}>
          Relatórios
        </TextComponent>

        {loading ? (
          <ActivityIndicator size="large" color="white" />
        ) : reports.length > 0 ? (
          <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.reportCard}>
                <TextComponent weight="bold" style={styles.reportTitle}>
                  {item.title || 'Sem título'}
                </TextComponent>
                <TextComponent style={styles.reportText}>
                  {item.content || 'Sem conteúdo'}
                </TextComponent>
              </View>
            )}
          />
        ) : (
          <TextComponent color={isDark ? Colors.text.secondaryDark : Colors.text.secondaryLight} style={{ textAlign: 'center', marginTop: 20 }}>
            Nenhum relatório encontrado.
          </TextComponent>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  bottomSheetShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 35,
    borderRadius: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  reportCard: {
    backgroundColor: Colors.spaceBlue.lighter,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  reportTitle: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
  },
  reportText: {
    color: 'white',
    fontSize: 14,
  },
});

export default ReportsComponent;
