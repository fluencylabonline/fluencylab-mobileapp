import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, FlatList, StyleSheet, useColorScheme } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { TextComponent } from '@/components/TextComponent';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useTheme } from '@/constants/useTheme';

interface ReportsComponentProps {
  studentID: string;
  onClose?: () => void;
}

const ReportsComponent: React.FC<ReportsComponentProps> = ({ studentID, onClose }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = ['50%', '85%'];
  const { colors } = useTheme();
  const styles = getStyles(colors);
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
      handleIndicatorStyle={{ backgroundColor: colors.colors.indigo, width: 65 }}
      backgroundStyle={{
        ...styles.bottomSheetShadow,
        backgroundColor: colors.background.primary,
      }}
    >
      <BottomSheetView style={styles.container}>
        <TextComponent weight="bold" size="large" color={colors.colors.indigo} style={styles.title}>
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
          <TextComponent color={colors.text.secondary} style={{ textAlign: 'center', marginTop: 20 }}>
            Nenhum relatório encontrado.
          </TextComponent>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
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
    backgroundColor: colors.colors.spaceBlue,
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
