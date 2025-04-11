// src/App.tsx (or TeacherScheduleScreen.tsx)
// --------------------------------------------------
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Button, // Simple button for triggering modals
  Platform,
} from 'react-native';
import { Agenda, DateData } from 'react-native-calendars';
import { v4 } from 'react-native-uuid/dist/v4';
import { addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// --- Mock Data & Types --- (Import from separate files ideally)
import { User, ClassDefinition, AvailabilitySlot, AgendaItem, AgendaSchedule } from '@/components/Schedule/types';
import { mockUsers, mockClasses, mockAvailability, MOCK_TEACHER_ID } from '@/components/Schedule/mockData';
import { generateAgendaItems } from '@/components/Schedule/scheduleUtils';

// --- Modals --- (Define these as separate components ideally)
import ClassModal from '@/components/Schedule/ClassModal'; // Assume these exist
import AvailabilityModal from '@/components/Schedule/AvailabilityModal'; // Assume these exist
import { NewClassData } from '@/components/Schedule/ClassModal'; // Type exported from ClassModal
import { NewAvailabilityData } from '@/components/Schedule/AvailabilityModal'; // Type exported from AvailabilityModal
import Container from '@/components/ContainerComponent';
// --- ---

const TeacherScheduleScreen: React.FC = () => {
  // --- State ---
  const [items, setItems] = useState<AgendaSchedule>({});
  const [allClasses, setAllClasses] = useState<ClassDefinition[]>(mockClasses);
  const [allAvailability, setAllAvailability] = useState<AvailabilitySlot[]>(mockAvailability);
  const [students, setStudents] = useState<User[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Track month for data loading range

  // Modal visibility state
  const [isClassModalVisible, setClassModalVisible] = useState(false);
  const [isAvailabilityModalVisible, setAvailabilityModalVisible] = useState(false);

  // State for editing
  const [editingClass, setEditingClass] = useState<ClassDefinition | null>(null);
  // Note: Editing Availability is not explicitly requested, only deletion

  // --- Data Fetching Simulation ---
  useEffect(() => {
    // Simulate fetching teacher's data (we just use the ID)
    const teacherId = MOCK_TEACHER_ID;

    // Simulate fetching students linked to the teacher
    const teacherStudents = mockUsers.filter(
      (user) => user.role === 'student' && user.professorId === teacherId
    );
    setStudents(teacherStudents);

    // Initial data load for the calendar (e.g., load 3 months around current)
    loadCalendarData(new Date());

  }, []); // Runs once on mount

  // --- Calendar Data Loading ---
  const loadCalendarData = useCallback((date: Date) => {
    console.log("Loading data around:", date);
    const rangeStart = startOfMonth(subMonths(date, 1)); // Load previous, current, and next month
    const rangeEnd = endOfMonth(addMonths(date, 1));

    const newItems = generateAgendaItems(allClasses, allAvailability, students, rangeStart, rangeEnd, 'teacher', 'teacher');

    // Important: Merge new items with existing ones if needed,
    // or replace if the range completely shifts.
    // For Agenda's loadItemsForMonth, you might receive specific date ranges.
    // This simple approach recalculates for the broad range.
    setItems(prevItems => ({ ...prevItems, ...newItems })); // Merge new items

  }, [allClasses, allAvailability, students]); // Dependencies for regeneration

  // --- Agenda Item Rendering ---
  const renderItem = (item: AgendaItem) => {
    const itemStyle = item.type === 'class' ? styles.classItem : styles.availabilityItem;
    const itemColor = item.originalData.color || '#cccccc'; // Default color

    return (
      <TouchableOpacity
        style={[styles.itemContainer, itemStyle, { borderLeftColor: itemColor }]}
        onPress={() => handleItemPress(item)}
        testID={`item-${item.id}`}
      >
        <Text style={styles.itemTextName}>{item.name}</Text>
        <Text style={styles.itemTextTime}>{item.time}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyDate = () => {
    return (
      <View style={styles.emptyDate}>
        <Text>No classes or availability</Text>
      </View>
    );
  };

  // --- Event Handlers ---
  const handleItemPress = (item: AgendaItem) => {
    if (item.type === 'class') {
      Alert.alert(
        'Class Action',
        `Selected: ${item.name} (${item.time})`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Edit',
            onPress: () => {
              setEditingClass(item.originalData as ClassDefinition);
              setClassModalVisible(true);
            },
          },
          {
            text: 'Delete',
            onPress: () => confirmDelete(item),
            style: 'destructive',
          },
        ]
      );
    } else if (item.type === 'availability') {
      Alert.alert(
        'Availability Action',
        `Selected: Available Slot (${item.time} on ${item.day})`,
        [
          { text: 'Cancel', style: 'cancel' },
          // Add Edit functionality here if needed later
          {
            text: 'Delete',
            onPress: () => confirmDelete(item),
            style: 'destructive',
          },
        ]
      );
    }
  };

  const confirmDelete = (item: AgendaItem) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: () => deleteItem(item), style: 'destructive' },
      ]
    );
  };

  const deleteItem = (item: AgendaItem) => {
    console.log('Deleting item:', item.id, item.type);
    if (item.type === 'class') {
      setAllClasses(prev => prev.filter(c => c.id !== item.id));
    } else if (item.type === 'availability') {
      setAllAvailability(prev => prev.filter(a => a.id !== item.id));
    }
    // No need to directly manipulate `items` state here.
    // The effect hook watching `allClasses`/`allAvailability`
    // *should* trigger regeneration via `loadCalendarData`.
    // However, for immediate feedback, we might force a reload:
    loadCalendarData(currentMonth); // Force reload after delete
  };

  // Called when the visible month changes in the calendar
  const handleMonthChange = (month: DateData) => {
    console.log("Month changed:", month.dateString);
    const newMonthDate = new Date(month.year, month.month - 1, 1);
    setCurrentMonth(newMonthDate);
    loadCalendarData(newMonthDate);
  };

 // --- Modal Save Handlers ---

  const handleSaveClass = (classData: NewClassData) => {
     console.log("Saving Class:", classData);
     if (editingClass) {
       // Update existing class
       const updatedClass: ClassDefinition = {
         ...editingClass,
         ...classData,
         isRecurring: true, // Assuming all are recurring
         type: 'class',
       };
       setAllClasses(prev => prev.map(c => c.id === editingClass.id ? updatedClass : c));
     } else {
       // Add new class
       const newClass: ClassDefinition = {
         id: v4(),
         ...classData,
         isRecurring: true,
         type: 'class',
       };
       setAllClasses(prev => [...prev, newClass]);
     }
     setEditingClass(null);
     setClassModalVisible(false);
     loadCalendarData(currentMonth); // Refresh calendar data
  };

  const handleSaveAvailability = (availabilityData: NewAvailabilityData) => {
      console.log("Saving Availability:", availabilityData);
      const newAvailability: AvailabilitySlot = {
          id: v4(),
          teacherId: MOCK_TEACHER_ID,
          ...availabilityData,
          type: 'availability',
      };
      setAllAvailability(prev => [...prev, newAvailability]);
      setAvailabilityModalVisible(false);
      loadCalendarData(currentMonth); // Refresh calendar data
  };


  // --- Memoization ---
  // Memoize props that don't change often if performance becomes an issue
   const memoizedRenderItem = useCallback(renderItem, [allClasses, allAvailability]); // Recreate if data changes
   const memoizedRenderEmptyDate = useCallback(renderEmptyDate, []);

  return (
    <SafeAreaView style={styles.safeArea}>
        <Container>
      <View style={styles.headerButtons}>
         <Button title="Add Class" onPress={() => { setEditingClass(null); setClassModalVisible(true); }} />
         <Button title="Add Availability" onPress={() => setAvailabilityModalVisible(true)} />
      </View>

      <Agenda
        testID="agenda"
        items={items}
        // loadItemsForMonth={handleMonthChange} // Use if you load data month-by-month
        // For this simpler example, initial load + month change handles it
        onVisibleMonthsChange={(months: string | any[]) => {
            // Optional: Could trigger loading based on visible months
            // console.log('Visible months changed', months);
            if (months.length > 0) {
                handleMonthChange(months[0]); // Trigger reload based on the first visible month
            }
        }}
        // onDayPress={(day)=> console.log('day pressed', day.dateString)} // Optional
        renderItem={memoizedRenderItem}
        renderEmptyDate={memoizedRenderEmptyDate}
        // rowHasChanged tells Agenda when to re-render items. Basic check:
        rowHasChanged={(r1: AgendaItem, r2: AgendaItem) => {
            return r1.id !== r2.id || r1.name !== r2.name || r1.time !== r2.time;
        }}
        showClosingKnob={true}
        // markingType={'period'} // Example for marking
        // markedDates={{ ... }} // Add marked dates if needed
        // Max date prevents infinite scrolling forward
        maxDate={'2026-12-31'}
        pastScrollRange={12} // How many past months to render initially/allow scrolling
        futureScrollRange={12} // How many future months
        // Specify the initial date to show
        // selected={format(new Date(), 'yyyy-MM-dd')} // Select today initially
      />

      {/* --- Modals --- */}
       {isClassModalVisible && (
         <ClassModal
           visible={isClassModalVisible}
           onClose={() => { setEditingClass(null); setClassModalVisible(false); }}
           onSave={handleSaveClass}
           students={students}
           initialData={editingClass} // Pass data for editing
         />
       )}

      {isAvailabilityModalVisible && (
         <AvailabilityModal
           visible={isAvailabilityModalVisible}
           onClose={() => setAvailabilityModalVisible(false)}
           onSave={handleSaveAvailability}
           // No initial data needed for adding availability usually
         />
       )}
    </Container>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
   headerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#eee', // Header background
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  itemContainer: {
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
    marginTop: 17, // Required by Agenda for spacing
    borderLeftWidth: 5, // Use color to differentiate type visually
    shadowColor: "#000", // Basic shadow for depth
    shadowOffset: {
        width: 0,
        height: 1,
    },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    elevation: 2,
  },
  classItem: {
    // Example: specific style for class items if needed beyond color
  },
  availabilityItem: {
     backgroundColor: '#e8f5e9', // Light green background for availability
  },
  itemTextName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 3,
  },
  itemTextTime: {
    fontSize: 14,
    color: '#555',
  },
  emptyDate: {
    height: 60, // Give it some height
    // marginTop: 17, // Match item margin top
    marginRight: 10,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: '#f9f9f9', // Slightly different background
    borderRadius: 5,
    borderTopWidth: 1,
    borderTopColor: '#eee',


  },
  // Add styles for Modals, Pickers, DatePickers etc. inside their components
});

export default TeacherScheduleScreen;