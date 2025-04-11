import Container from "@/components/ContainerComponent";
import { TextComponent } from "@/components/TextComponent";
import TopBarComponent from "@/components/TopBarComponent";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from 'expo-router';
import { TouchableOpacity, View, StyleSheet } from "react-native";
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
import { useTheme } from "@/constants/useTheme";

export default function Painel(){
  const { studentID, studentName } = useLocalSearchParams();
  const [activeModal, setActiveModal] = useState<'reports' | 'tasks' | 'placement' | null>(null);
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const cardStyle = {
    ...styles.card,
    backgroundColor: colors.background.list,
    shadowColor: colors.colors.black,
  };

  const subCardContainerStyle = {
    ...styles.subCardContainer,
    backgroundColor: colors.background.list,
    shadowColor: colors.colors.black,
  };

  return(
    <Container>
        <TopBarComponent
            title={studentName as string}
            leftIcon={<TouchableOpacity onPress={router.back}><Ionicons name="arrow-back-sharp" size={26} color={colors.text.primary} /></TouchableOpacity>}
            rightIcon={<TouchableOpacity onPress={() => setActiveModal('tasks')}><TasksIcon /></TouchableOpacity>}
        />
        <View style={styles.scrollView}>
            <View style={styles.subCardContent}>
              
              <TouchableOpacity style={subCardContainerStyle} onPress={() => router.push(`/screens/Aulas/Aulas?studentID=${studentID}&studentName=${studentName}`)}>
                <NotebookVariationIcon />
                <TextComponent weight="bold" style={[styles.cardText, { color: colors.text.primary }]}>
                  Caderno
                </TextComponent>
              </TouchableOpacity>

              <TouchableOpacity style={subCardContainerStyle} onPress={() => setActiveModal('reports')}>
                <ReportIcon />
                <TextComponent weight="bold" style={[styles.cardText, { color: colors.text.primary }]}>
                  Relatório
                </TextComponent>
              </TouchableOpacity>

              <TouchableOpacity style={subCardContainerStyle} onPress={() => setActiveModal('placement')}>
                <PlacementIcon />
                <TextComponent weight="bold" style={[styles.cardText, { color: colors.text.primary }]}>
                  Nivelamento
                </TextComponent>
              </TouchableOpacity>

            </View>

          <View style={cardStyle}>
            <ClassStatusCalendar studentID={studentID as string} />
          </View>

          <View style={cardStyle}>
            <MaterialsComponent studentID={studentID as string} />
          </View>
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

const getStyles = (colors: any) => StyleSheet.create({
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
