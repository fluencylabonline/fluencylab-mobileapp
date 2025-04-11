import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Modal } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import ClassDateItem from './ClassesItem';
import { TextComponent } from '../TextComponent';
import { useToast } from '@/components/Toast/useToast';
import { useTheme } from '@/constants/useTheme';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

interface ClassDate {
  date: Date;
  status: string;
}

const monthMap: Record<string, string> = {
  January: 'Janeiro', February: 'Fevereiro', March: 'Março', April: 'Abril', May: 'Maio',
  June: 'Junho', July: 'Julho', August: 'Agosto', September: 'Setembro', October: 'Outubro',
  November: 'Novembro', December: 'Dezembro'
};

const monthMapReverse: Record<string, string> = Object.fromEntries(
  Object.entries(monthMap).map(([en, pt]) => [pt, en])
);

const monthsPT = Object.values(monthMap);

interface AlunosAulasProps {
  studentID: string;
}

interface ClassDateWithStatus {
  date: Date;
  status: string;
}

const AlunosAulas: React.FC<AlunosAulasProps> = ({ studentID }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [classDatesWithStatus, setClassDatesWithStatus] = useState<ClassDate[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(monthMap[new Date().toLocaleString('en-US', { month: 'long' })]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAllDates, setShowAllDates] = useState(false);
  const [overdueClasses, setOverdueClasses] = useState<ClassDateWithStatus[]>([]);
  const [isOverdueModalVisible, setOverdueModalVisible] = useState(false);
  const [loadingDate, setLoadingDate] = useState<Date | null>(null);

  const [isMonthModalVisible, setMonthModalVisible] = useState(false);
  const [isYearModalVisible, setYearModalVisible] = useState(false);

  const { showToast } = useToast();

  const toggleMonthModal = () => setMonthModalVisible(!isMonthModalVisible);
  const toggleYearModal = () => setYearModalVisible(!isYearModalVisible);

  const fetchData = useCallback(async () => {
    try {
      const userRef = doc(db, `users/${studentID}`);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const classesData = userData.Classes || {};
        const classDates: ClassDate[] = [];

        for (const yearKey in classesData) {
          for (const monthKey in classesData[yearKey]) {
            const monthIndex = monthsPT.indexOf(monthMap[monthKey]);
            for (const dayKey in classesData[yearKey][monthKey]) {
              const date = new Date(parseInt(yearKey), monthIndex, parseInt(dayKey));
              const status = classesData[yearKey][monthKey][dayKey];
              classDates.push({ date, status });
            }
          }
        }
        setClassDatesWithStatus(classDates);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [studentID]);

  useEffect(() => {
    const fetchOverdueClasses = async () => {
      try {
        const studentRef = doc(db, 'users', studentID);
        const studentDoc = await getDoc(studentRef);

        if (studentDoc.exists()) {
          const studentData = studentDoc.data();
          const classesData = studentData?.Classes || {};

          let allOverdueClasses: ClassDateWithStatus[] = [];
          for (const yearKey of Object.keys(classesData)) {
            for (const monthKey of Object.keys(classesData[yearKey])) {
              const monthClasses = classesData[yearKey][monthKey];
              for (const dayKey of Object.keys(monthClasses)) {
                if (monthClasses[dayKey] === 'Atrasada') {
                  const classDate = new Date(parseInt(yearKey), monthsPT.indexOf(monthMap[monthKey]), parseInt(dayKey));
                  allOverdueClasses.push({ date: classDate, status: 'Atrasada' });
                }
              }
            }
          }

          allOverdueClasses.sort((a, b) => b.date.getTime() - a.date.getTime());
          setOverdueClasses(allOverdueClasses);
        }
      } catch (error) {
        console.error('Error fetching overdue classes:', error);
      }
    };

    fetchOverdueClasses();
  }, [studentID]);

  const groupOverdueClasses = (classes: ClassDateWithStatus[]): [string, ClassDateWithStatus[]][] => {
    const grouped: { [key: string]: ClassDateWithStatus[] } = {};
  
    classes.forEach((item) => {
      const key = format(item.date, "MMMM yyyy", { locale: ptBR });
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
  
    return Object.entries(grouped).sort((a, b) => {
      const dateA = new Date(a[1][0].date);
      const dateB = new Date(b[1][0].date);
      return dateB.getTime() - dateA.getTime(); // newest first
    });
  };
  

  const handleClassStatus = async (date: Date, action: string) => {
    try {
      setLoadingDate(date);

      const year = date.getFullYear();
      const month = monthMapReverse[selectedMonth];
      const day = date.getDate().toString();

      const userRef = doc(db, `users/${studentID}`);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const classes = userDoc.data()?.Classes || {};
        classes[year] = classes[year] || {};
        classes[year][month] = classes[year][month] || {};
        classes[year][month][day] = action;

        await updateDoc(userRef, { Classes: classes });

        setClassDatesWithStatus((prevDates) =>
          prevDates.map((classDate) =>
            classDate.date.getTime() === date.getTime()
              ? { ...classDate, status: action }
              : classDate
          )
        );

        showToast('Status atualizado com sucesso!', 'success', 3000, 'bottom');
      }
    } catch (error) {
      console.error('Erro ao atualizar status da aula:', error);
      showToast('Falha ao atualizar status.', 'error');
    } finally {
      setLoadingDate(null);
    }
  };

  const updateClassStatus = async (date: Date, newStatus: string) => {
    try {
      const studentRef = doc(db, 'users', studentID);
      const studentDoc = await getDoc(studentRef);
  
      if (studentDoc.exists()) {
        const studentData = studentDoc.data();
        const classesData = studentData?.Classes || {};
  
        for (const yearKey of Object.keys(classesData)) {
          for (const monthKey of Object.keys(classesData[yearKey])) {
            const monthClasses = classesData[yearKey][monthKey];
            for (const dayKey of Object.keys(monthClasses)) {
              const classDate = new Date(parseInt(yearKey), monthsPT.indexOf(monthMap[monthKey]), parseInt(dayKey));
              if (classDate.getTime() === date.getTime()) {
                // Update in Firestore
                await updateDoc(studentRef, {
                  [`Classes.${yearKey}.${monthKey}.${dayKey}`]: newStatus,
                });
  
                // Update UI
                setOverdueClasses((prev) =>
                  prev.filter((item) => item.date.getTime() !== date.getTime())
                );
  
                setClassDatesWithStatus((prevDates) =>
                  prevDates.map((classDate) =>
                    classDate.date.getTime() === date.getTime()
                      ? { ...classDate, status: newStatus }
                      : classDate
                  )
                );
  
                showToast('Atualizado!', 'success');
                return;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar status da aula:', error);
      showToast('Erro ao atualizar status', 'error');
    }
  };  

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <View>
      <TextComponent size="medium" weight="bold" style={{ marginBottom: 20, textAlign: 'center' }}>
        Aulas de {selectedMonth} de {selectedYear}
      </TextComponent>
      {/* Month and Year Selectors */}
      <View style={styles.container}>
        <Pressable onPress={toggleMonthModal} style={styles.pickerButton}>
          <TextComponent weight='bold' size='medium' style={styles.pickerButtonText}>{selectedMonth}</TextComponent>
        </Pressable>
        <Pressable onPress={toggleYearModal} style={styles.pickerButton}>
          <TextComponent weight='bold' size='medium' style={styles.pickerButtonText}>{selectedYear}</TextComponent>
        </Pressable>
        <Pressable
          onPress={() => overdueClasses.length > 0 && setOverdueModalVisible(true)}
          style={[
            styles.pickerButton,
            {
              backgroundColor:
                overdueClasses.length === 0 ? '#4CAF50' : '#F44336',
            },
          ]}
        >
          <TextComponent weight='bold' size='medium' style={[styles.pickerButtonText, { color: 'white' }]}>
            {overdueClasses.length === 0
              ? 'Sem atraso'
              : `Atrasadas (${overdueClasses.length})`}
          </TextComponent>
        </Pressable>
      </View>

      {/* Month Modal */}
      <Modal 
        visible={isMonthModalVisible} 
        animationType="slide"
        transparent
        onRequestClose={toggleMonthModal}>
        <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView>
            {monthsPT.map((month) => (
              <Pressable key={month} onPress={() => {
                setSelectedMonth(month);
                toggleMonthModal();
              }}>
                <TextComponent size='medium' weight='bold' style={styles.modalItem}>{month}</TextComponent>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        </View>
      </Modal>

      {/* Year Modal */}
      <Modal 
        visible={isYearModalVisible} 
        animationType="slide"
        transparent
        onRequestClose={toggleYearModal}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView>
            {Array.from({ length: 10 }, (_, i) => {
              const year = new Date().getFullYear() - 5 + i;
              return (
                <Pressable key={year} onPress={() => {
                  setSelectedYear(year);
                  toggleYearModal();
                }}>
                  <TextComponent size='medium' weight='bold' style={styles.modalItem}>{year}</TextComponent>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
      </Modal>

      <Modal 
        visible={isOverdueModalVisible} 
        animationType="slide"
        transparent
        onRequestClose={() => setOverdueModalVisible(false)}>
        <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TextComponent size='medium' weight='bold' style={[styles.modalItem, { marginTop: 10 }]}>Aulas Atrasadas</TextComponent>
          <ScrollView>
            {groupOverdueClasses(overdueClasses).map(([monthYear, dates]) => (
              <View key={monthYear}>
                {dates.map((item, index) => (
                  <View key={index} style={[styles.overdueItemRow, { borderRadius: 14, marginTop: 25, marginBottom: 25, backgroundColor: colors.background.listSecondary }]}>
                    <TextComponent size='small' style={styles.modalItem}>
                      {format(item.date, "dd 'de' MMMM yyyy", { locale: ptBR })}
                    </TextComponent>
                    <View style={styles.statusButtons}>
                      <Pressable
                        onPress={() => updateClassStatus(item.date, 'Feita')}
                        style={[styles.statusButton, { backgroundColor: '#4CAF50' }]}
                      >
                        <TextComponent weight='bold' size='small' style={styles.statusButtonText}>Feita</TextComponent>
                      </Pressable>
                      <Pressable
                        onPress={() => updateClassStatus(item.date, 'Cancelada')}
                        style={[styles.statusButton, { backgroundColor: '#F44336' }]}
                      >
                        <TextComponent weight='bold' size='small' style={styles.statusButtonText}>Cancelada</TextComponent>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
        </View>
      </Modal>

      <ScrollView style={{ maxHeight: 300 }}>
        {classDatesWithStatus
          .filter((classDate) => {
            const dateMonthPT = monthMap[classDate.date.toLocaleString('en-US', { month: 'long' })];
            const dateYear = classDate.date.getFullYear();
            return dateMonthPT === selectedMonth && dateYear === selectedYear && classDate.status !== 'Modificada';
          })
          .slice(0, showAllDates ? classDatesWithStatus.length : 10)
          .map((classDate, index) => (
            <ClassDateItem
              key={index}
              date={classDate.date}
              status={classDate.status}
              onDone={() => handleClassStatus(classDate.date, 'Feita')}
              onCancel={() => handleClassStatus(classDate.date, 'Cancelada')}
              onDelete={() => handleClassStatus(classDate.date, 'Modificada')}
              loading={loadingDate?.getTime() === classDate.date.getTime()}
            />
          ))}
      </ScrollView>
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pickerButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 5,
    backgroundColor: colors.background.listSecondary,
  },
  pickerButtonText: {
    color: colors.text.primary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.modalOverlay.primary,
  },
  modalContent: {
    backgroundColor: colors.bottomSheet.background,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    maxHeight: 300,
    margin: 10
  },
  modalItem: {
    textAlign: 'center',
    marginVertical: 10,
  },
  overdueItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 30,
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  statusButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusButtonText: {
    color: 'white',
  },
  
});

export default AlunosAulas;
