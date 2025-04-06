import Container from "@/components/ContainerComponent";
import { TextComponent } from "@/components/TextComponent";
import TopBarComponent from "@/components/TopBarComponent";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from 'expo-router';
import { TouchableOpacity, View, StyleSheet, ScrollView, useColorScheme } from "react-native";
import { Colors } from '@/constants/Colors';
import ClassStatusCalendar from "@/components/Calendar/ClassStatusCalendar";
import { useState } from "react";
import TasksIcon from '@/assets/icons/TasksIcon';
import ReportIcon from '@/assets/icons/ReportIcon';
import PlacementIcon from '@/assets/icons/PlacementIcon';
import NotebookVariationIcon from '@/assets/icons/NotebookVariationIcon';
import TasksComponent from "@/components/Tasks/TaskComponent";
import ReportsComponent from "@/components/Report/ReportComponent";
import PlacementComponent from "@/components/Placement/PlacementComponent";
import MaterialsComponent from "@/components/Material/MaterialsComponent";

export default function Painel(){
  const { studentID, studentName } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeModal, setActiveModal] = useState<'reports' | 'tasks' | 'placement' | null>(null);

  const cardStyle = {
    ...styles.card,
    backgroundColor: isDark ? Colors.background.dark : Colors.background.light,
    shadowColor: isDark ? "#000" : "#666",
  };

  const subCardContainerStyle = {
    ...styles.subCardContainer,
    backgroundColor: isDark ? Colors.background.dark : Colors.background.light,
    shadowColor: isDark ? "#000" : "#666",
  };

  return(
    <Container>
        <TopBarComponent
            title={studentName as string}
            leftIcon={<TouchableOpacity onPress={router.back}><Ionicons name="arrow-back-sharp" size={26} color={isDark ? Colors.text.dark : Colors.text.light} /></TouchableOpacity>}
            rightIcon={<TouchableOpacity onPress={() => setActiveModal('tasks')}><TasksIcon /></TouchableOpacity>}
        />
        <View style={styles.scrollView}>
            <View style={styles.subCardContent}>
              
              <TouchableOpacity style={subCardContainerStyle} onPress={() => router.push(`/screens/Aulas/Aulas?studentID=${studentID}&studentName=${studentName}`)}>
                <NotebookVariationIcon />
                <TextComponent weight="bold" style={[styles.cardText, { color: isDark ? Colors.text.dark : Colors.text.light }]}>
                  Caderno
                </TextComponent>
              </TouchableOpacity>

              <TouchableOpacity style={subCardContainerStyle} onPress={() => setActiveModal('reports')}>
                <ReportIcon />
                <TextComponent weight="bold" style={[styles.cardText, { color: isDark ? Colors.text.dark : Colors.text.light }]}>
                  Relatório
                </TextComponent>
              </TouchableOpacity>

              <TouchableOpacity style={subCardContainerStyle} onPress={() => setActiveModal('placement')}>
                <PlacementIcon />
                <TextComponent weight="bold" style={[styles.cardText, { color: isDark ? Colors.text.dark : Colors.text.light }]}>
                  Nivelamento
                </TextComponent>
              </TouchableOpacity>

            </View>

          <TouchableOpacity style={cardStyle}>
            <ClassStatusCalendar studentID={studentID as string} />
          </TouchableOpacity>

          <TouchableOpacity style={cardStyle}>
            <MaterialsComponent studentID={studentID as string} />
          </TouchableOpacity>
        </View>

      {activeModal === 'reports' && (
        <ReportsComponent studentID={studentID as string} onClose={() => setActiveModal(null)} />
      )}
      
      {activeModal === 'tasks' && (
        <TasksComponent studentID={studentID as string} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'placement' && (
        <PlacementComponent studentID={studentID as string} onClose={() => setActiveModal(null)} />
      )}

    </Container>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    padding: 10,
    paddingHorizontal: 14,
  },
  card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  cardText: {
    fontSize: 16,
  },
  subCardContent: {
    flexDirection: 'row',
    justifyContent:  'space-between',
    gap: 8,
    marginBottom: 10,
  },
  subCardContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    padding: 18,
    borderRadius: 8,
  }
});
