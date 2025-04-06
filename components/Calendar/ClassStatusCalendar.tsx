import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ToastAndroid } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import ClassDateItem from './ClassesItem';
import { TextComponent } from '../TextComponent';
import { useToast } from '@/components/Toast/useToast';

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

const AlunosAulas: React.FC<AlunosAulasProps> = ({ studentID }) => {
  const [classDatesWithStatus, setClassDatesWithStatus] = useState<ClassDate[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(monthMap[new Date().toLocaleString('en-US', { month: 'long' })]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAllDates, setShowAllDates] = useState(false);
  const { showToast } = useToast();

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

  const handleClassStatus = async (date: Date, action: string) => {
    try {
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
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <View>
      <TextComponent size='medium' weight='bold' style={{ marginBottom: 10, textAlign: 'center' }}>
        Aulas de {selectedMonth} de {selectedYear}
      </TextComponent>
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
            />
          ))}
      </ScrollView>
    </View>
  );
};

export default AlunosAulas;
