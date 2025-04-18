import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore'; 
import { db } from '@/config/firebase';
import { useToast } from '@/components/Toast/useToast';
import Container from "@/components/ContainerComponent";
import { TextComponent } from "@/components/TextComponent";
import { useTheme } from "@/constants/useTheme";
import TopBarComponent from '@/components/TopBarComponent';
import useFetchUserID from '@/hooks/fetchUserID';
import { router } from 'expo-router';
import MaterialBottomSheet from '../screens/Aluno/Components/MaterialBottomSheet';

export default function Home() {
  const { userID } = useFetchUserID();
  const studentID = userID;
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { showToast } = useToast();
  const [ showMaterial, setShowMaterial ] = useState<boolean>(false);

  const data = {
    cadernos: require("../../assets/images/student/cadernos.png"),
    tarefas: require("../../assets/images/student/tarefas.png"),
  };

  const [tasks, setTasks] = useState<{ [day: string]: any[] }>({});

  const today = "Task"
  
  useEffect(() => {
    if (!studentID) {
      setTasks({});
      return;
    }

    const studentDocRef = doc(db, `users/${studentID}`);
    const unsubscribe = onSnapshot(studentDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const studentData = docSnap.data();
        setTasks(studentData.tasks || {});
      } else {
        console.log("Student document does not exist!");
        setTasks({});
      }
    }, (error) => {
      console.error('Error listening to tasks snapshot:', error);
      showToast('Erro ao carregar tarefas em tempo real', 'error', 3000, 'bottom');
    });

    return () => unsubscribe();
  }, [studentID]);

  const handleTaskStatusChange = async (day: string, index: number, done: boolean) => {
    try {
      const currentDayTasks = tasks[day] ? [...tasks[day]] : [];
      if (index < 0 || index >= currentDayTasks.length) {
        console.error(`Invalid index ${index} for day ${day}`);
        showToast('Erro: Índice de tarefa inválido', 'error', 3000, 'bottom');
        return;
      }

      currentDayTasks[index] = { ...currentDayTasks[index], done };
      const studentDocRef = doc(db, `users/${studentID}`);
      await updateDoc(studentDocRef, { [`tasks.${day}`]: currentDayTasks });

      showToast('Tarefa atualizada com sucesso!', 'success', 3000, 'bottom');
    } catch (error) {
      console.error('Error updating task status:', error);
      showToast('Erro ao atualizar tarefa', 'error', 3000, 'bottom');
    }
  };

  return (
    <Container>
      <TopBarComponent 
        title="Início" 
        rightIcon={<Ionicons onPress={() => setShowMaterial(true)} name="copy-outline" size={26} color={colors.text.secondary} />}
      />

      <View style={styles.cardsContainer}>
        <View style={styles.card_one} onTouchStart={() => router.push(`/screens/Aulas/Aulas?studentID=${studentID}`)}>
          <TextComponent weight='bold' size="xLarge">Cadernos</TextComponent>
          <Image source={data.cadernos} style={styles.image} />
        </View>

        <View style={styles.card_two}>
          <TextComponent weight='bold' size="xLarge" style={{alignSelf: 'center', marginTop: 12}}>Tarefas</TextComponent>

          <View style={styles.dayContainer}>
            {tasks[today]?.map((task, index) => (
              <View key={`${today}-${index}`} style={styles.taskItemContainer}>
                <TouchableOpacity
                  style={styles.taskItem}
                  onPress={() => handleTaskStatusChange(today, index, !task.done)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkBox, task.done && styles.checkBoxDone]}>
                    {task.done && <Ionicons name="checkmark" size={18} color={colors.colors.white} />}
                  </View>
                  <TextComponent
                    weight="bold"
                    style={[
                      styles.taskText,
                      { color: colors.colors.white },
                      task.done && styles.taskTextDone,
                    ]}
                  >
                    {task.task}
                  </TextComponent>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <Image source={data.tarefas} style={styles.image} />
        </View>
      </View>

      {showMaterial && (
        <MaterialBottomSheet
        visible={showMaterial}
        studentID={studentID as string}
        onClose={() => setShowMaterial(false)}
      />
      
      )}
    </Container>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    cardsContainer: {
      flex: 1,
      width: '100%',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingVertical: 16,
      gap: 12,
    },
    card_one: {
      backgroundColor: colors.background.list,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 16,
      height: 215,
      width: '95%',
      overflow: "hidden",
    },
    card_two: {
      backgroundColor: colors.background.list,
      borderRadius: 16,
      width: '95%',
      flex: 1,
      overflow: "hidden",
      gap: 16,
      paddingBottom: 22,
    },
    image: {
      width: "100%",
      height: "100%",
      position: "absolute",
      top: 0,
      left: 0,
    },
    dayContainer: {
      paddingLeft: 22,
      zIndex: 10,
    },
    taskItemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    taskItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    taskText: {
      marginLeft: 12,
      flexShrink: 1,
    },
    taskTextDone: {
      textDecorationLine: 'line-through',
      color: colors.colors.teal,
      opacity: 0.7,
    },
    checkBox: {
      width: 24,
      height: 24,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: colors.colors.tealLight,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    checkBoxDone: {
      backgroundColor: colors.colors.tealLight,
      borderColor: colors.colors.tealLight,
    },
  });
