import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore'; 
import { db } from '@/config/firebase';
import { useToast } from '@/components/Toast/useToast';
import { useTheme } from '@/constants/useTheme';
import { TextComponent } from '@/components/TextComponent';
import InputComponent from '@/components/InputComponent';

interface TasksComponentProps {
  studentID: string;
  onClose: () => void;
}

const TasksComponent: React.FC<TasksComponentProps> = ({ studentID, onClose }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<{ [day: string]: any[] }>({});
  const [newTask, setNewTask] = useState('');
  const { colors } = useTheme();
  const styles = getStyles(colors);

  // Get today's day with first letter capitalized
  const today = new Date();
  const todayWeekday = new Intl.DateTimeFormat('pt-PT', { weekday: 'short' }).format(today);
  const capitalizedToday = todayWeekday.charAt(0).toUpperCase() + todayWeekday.slice(1);

  // Listen for real-time task updates from Firestore
  useEffect(() => {
    // Ensure studentID is valid before trying to create a listener
    if (!studentID) {
        setTasks({}); // Clear tasks if no studentID
        return;
    }

    const studentDocRef = doc(db, `users/${studentID}`);

    // Set up the real-time listener using onSnapshot
    const unsubscribe = onSnapshot(studentDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const studentData = docSnap.data();
        // Update state directly from the snapshot data
        setTasks(studentData.tasks || {});
      } else {
        console.log("Student document does not exist!");
        setTasks({}); // Clear tasks if the document is deleted or doesn't exist
      }
    }, (error) => { // Optional: Add error handling for the listener itself
      console.error('Error listening to tasks snapshot:', error);
      showToast('Erro ao carregar tarefas em tempo real', 'error', 3000, 'bottom');
    });

    // Cleanup function: This is crucial!
    // It runs when the component unmounts or when studentID changes.
    return () => {
      unsubscribe(); // Detach the listener
    };
    // Add showToast to dependency array if used inside error handler
  }, [studentID, showToast]);

  // Update task status
  const handleTaskStatusChange = async (day: string, index: number, done: boolean) => {
    try {
      // Important: Get the current tasks for the specific day *before* updating Firestore.
      // Create a deep copy or reconstruct the array to avoid mutation issues if needed elsewhere,
      // but for updateDoc field paths, sending the modified array directly is usually fine.
      const currentDayTasks = tasks[day] ? [...tasks[day]] : []; // Create a copy
      if (index < 0 || index >= currentDayTasks.length) {
          console.error(`Invalid index ${index} for day ${day}`);
          showToast('Erro: Índice de tarefa inválido', 'error', 3000, 'bottom');
          return;
      }
      // Modify the copy
      currentDayTasks[index] = { ...currentDayTasks[index], done };

      const studentDocRef = doc(db, `users/${studentID}`);
      // Update Firestore with the modified array for the specific day
      await updateDoc(studentDocRef, { [`tasks.${day}`]: currentDayTasks });

      showToast('Tarefa atualizada com sucesso!', 'success', 3000, 'bottom');

      // NO NEED for manual setTasks here - onSnapshot will trigger the update
    } catch (error) {
      console.error('Error updating task status:', error);
      showToast('Erro ao atualizar tarefa', 'error', 3000, 'bottom');
    }
  };

  // Delete a task
  const handleDeleteTask = async (day: string, index: number) => {
    try {
       // Create a copy of the tasks for the specific day
      const currentDayTasks = tasks[day] ? [...tasks[day]] : [];
       if (index < 0 || index >= currentDayTasks.length) {
          console.error(`Invalid index ${index} for day ${day} deletion`);
          showToast('Erro: Índice de tarefa inválido', 'error', 3000, 'bottom');
          return;
      }
      // Remove the task from the copied array
      currentDayTasks.splice(index, 1);

      const studentDocRef = doc(db, `users/${studentID}`);
      // Update Firestore, replacing the entire array for that day
      await updateDoc(studentDocRef, { [`tasks.${day}`]: currentDayTasks });

      // Consider changing toast type to 'success' or similar if deletion is expected
      showToast('Tarefa removida!', 'success', 3000, 'bottom');

      // NO NEED for manual setTasks here - onSnapshot will trigger the update
    } catch (error) {
      console.error('Error deleting task:', error);
      showToast('Erro ao remover tarefa', 'error', 3000, 'bottom');
    }
  };

  // Add a new task
  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    try {
      const studentDocRef = doc(db, `users/${studentID}`);
      const taskToAdd = { task: newTask, done: false };

      // Use arrayUnion to safely add the new task to the array for today
      // This handles the case where the day's array might not exist yet.
      await updateDoc(studentDocRef, {
        [`tasks.${capitalizedToday}`]: arrayUnion(taskToAdd)
      });

      showToast('Tarefa adicionada!', 'success', 3000, 'bottom');
      setNewTask(''); // Clear the input field

      // NO NEED for manual setTasks here - onSnapshot will trigger the update
    } catch (error) {
      console.error('Error adding task:', error);
      showToast('Erro ao adicionar tarefa', 'error', 3000, 'bottom');
    }
  };

  // Rest of the component remains the same (JSX, styles)
  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={['55%', '90%']}
      index={0}
      onChange={(index) => {
        if (index === -1) onClose();
      }}
      enablePanDownToClose={true}
      handleIndicatorStyle={{ backgroundColor: colors.colors.teal, width: 70, height: 5, borderRadius: 2.5 }}
      backgroundStyle={{
        ...styles.bottomSheetShadow,
        backgroundColor: colors.bottomSheet.background
      }}
    >
      <TextComponent weight="bold" size="large" color={colors.colors.teal} style={styles.dayTitle}>
        Tarefas
      </TextComponent>

      {/* Add Task Input */}
      <InputComponent
        placeholder="Nova tarefa..."
        value={newTask}
        onChangeText={setNewTask}
        onSubmitEditing={handleAddTask}
        button={<Ionicons onPress={handleAddTask} name="add" size={28} color={colors.colors.teal} />}
      />

      {/* Task List */}
      <BottomSheetFlatList
        data={Object.keys(tasks)} // Iterate over days
        keyExtractor={(day) => day}
        renderItem={({ item: day }) => (
          <View style={styles.dayContainer}>
            {tasks[day]?.map((task, index) => (
              // Each task item container
              <View key={`${day}-${index}`} style={styles.taskItemContainer}>
                <TouchableOpacity
                  style={styles.taskItem}
                  onPress={() => handleTaskStatusChange(day, index, !task.done)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkBox, task.done && styles.checkBoxDone]}>
                    {task.done && <Ionicons name="checkmark" size={18} color="#fff" />}
                  </View>
                  <TextComponent
                    weight="regular"
                    style={[
                      styles.taskText,
                      { color: colors.text.primary },
                      task.done && styles.taskTextDone,
                    ]}
                  >
                    {task.task}
                  </TextComponent>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteTask(day, index)} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={22} color={colors.colors.deepOrange} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        // Add content inset for better spacing at the bottom
        contentContainerStyle={{ paddingBottom: 30 }}
        // Show message if no tasks exist
        ListEmptyComponent={
            <View style={styles.emptyListContainer}>
                {/* Ensure this TextComponent is the ONLY child or other children are non-text */}
                <TextComponent style={{ color: colors.text.secondary, textAlign: 'center' }}>
                   Nenhuma tarefa encontrada. Adicione uma acima!
                </TextComponent>
            </View>
        }
      />
    </BottomSheet>
  );
};


// Add/Update styles for better look and feel
const getStyles = (colors: any) => StyleSheet.create({  
  bottomSheetShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 }, // Shadow points upwards
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 15, // Elevation for Android
    borderTopLeftRadius: 20, // Rounded top corners
    borderTopRightRadius: 20,
  },
  dayContainer: {
    // Removed background/border here, apply styling to task items instead
    marginBottom: 5, // Spacing between days if you show multiple
    paddingHorizontal: 15, // Padding for the list content
  },
  dayTitle: {
    paddingVertical: 15, // Increased padding
    textAlign: 'center',
    // borderBottomWidth: 1, // Optional separator below title
    // borderBottomColor: '#eee',
  },
   emptyListContainer: {
     marginTop: 40,
     alignItems: 'center',
     justifyContent: 'center',
     paddingHorizontal: 20,
   },
  // Container for Add Task elements
  addTaskContainer: {
    minWidth: '100%',
    flexDirection: 'row',
  },
  // Input field for new tasks
  addTaskInput: {
    flex: 1,
    height: 45, // Slightly taller input
    fontSize: 16,
    paddingHorizontal: 10, // Internal padding
    borderRadius: 8, // Rounded corners
    // Add background based on theme if needed, e.g.:
    // backgroundColor: isDark ? Colors.black.darker : '#f0f0f0',
  },
  // Container for each task item row (checkbox, text, delete button)
  taskItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12, // Vertical padding for each item
    borderBottomWidth: 1, // Separator line between tasks
    borderBottomColor: 'rgba(128, 128, 128, 0.1)', // Very light separator
  },
  // Touchable area for task text and checkbox
  taskItem: {
    flex: 1, // Take available space
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10, // Space before delete button
  },
  taskText: {
    fontSize: 16,
    marginLeft: 12, // Space between checkbox and text
    flexShrink: 1, // Allow text to wrap if long
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
    color: colors.colors.teal, // Use teal for done text
    opacity: 0.7, // Make done text slightly faded
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.colors.teal, // Use a theme color for border
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkBoxDone: {
    backgroundColor: colors.colors.teal,
    borderColor: colors.colors.teal,
  },
  checkMark: { // Style for the checkmark text inside the box (removed in favor of Icon)
    // fontSize: 14,
    // color: '#fff',
    // fontWeight: 'bold',
  },
  // Delete button touchable area
  deleteButton: {
      padding: 5, // Increase tap target
  }
});

export default TasksComponent;