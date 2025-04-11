// src/screens/StudentScheduleScreen.tsx (Refactored)
// --------------------------------------------------
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Agenda, DateData } from 'react-native-calendars';
import { v4 } from 'react-native-uuid/dist/v4';
import { addMonths, subMonths, startOfMonth, endOfMonth, getDay, parseISO, format } from 'date-fns';

// --- Use updated import paths ---
import { User, ClassDefinition, AvailabilitySlot, AgendaItem, AgendaSchedule, ScheduleSlot, RescheduleRecord } from '@/components/Schedule/types';
// Import the *initial* mock data (treat as immutable)
import { mockUsers, mockClasses, mockAvailability } from '@/components/Schedule/mockData';
// Import the reschedule tracker (simulated external state) and utils
import { globalMockReschedules } from '@/components/Schedule/mockData'; // Keep this separate for now
import { generateAgendaItems, checkRescheduleLimit, addRescheduleRecord } from '@/components/Schedule/scheduleUtils';

// Import the modal
import ClassActionModal from '@/components/Schedule/ClassActionModal';
// --- ---

interface StudentScheduleScreenProps {
  studentId: string;
}

const StudentScheduleScreen: React.FC<StudentScheduleScreenProps> = ({ studentId }) => {
  // --- State ---
  const [items, setItems] = useState<AgendaSchedule>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teacher, setTeacher] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- Component's Source of Truth for Data ---
  // Initialize state with the imported mock data
  const [currentClasses, setCurrentClasses] = useState<ClassDefinition[]>(mockClasses);
  const [currentAvailability, setCurrentAvailability] = useState<AvailabilitySlot[]>(mockAvailability);
  // We still read reschedule history from the simulated global state
  // const [currentReschedules, setCurrentReschedules] = useState<RescheduleRecord[]>(globalMockReschedules); // If managing locally

  // Modal State
  const [isClassActionModalVisible, setClassActionModalVisible] = useState(false);
  const [selectedClassItem, setSelectedClassItem] = useState<AgendaItem | null>(null);
  const [canStudentReschedule, setCanStudentReschedule] = useState(false);

  // --- Data Fetching Simulation ---
  useEffect(() => {
    setIsLoading(true);
    const student = mockUsers.find(u => u.id === studentId && u.role === 'student');
    setCurrentUser(student || null);

    if (student && student.professorId) {
      const prof = mockUsers.find(u => u.id === student.professorId && u.role === 'teacher');
      setTeacher(prof || null);
    }

    // Set initial state from imports
    setCurrentClasses(mockClasses);
    setCurrentAvailability(mockAvailability);

    // Initial calendar load using the initial state
    if (student) {
      loadCalendarData(new Date(), student.id); // Pass only date and studentId initially
    }

    setIsLoading(false);
  }, [studentId]); // Dependency on studentId

  // --- Calendar Data Loading ---
  // Reads directly from component state now
  const loadCalendarData = useCallback((
      date: Date,
      currentStudentId: string,
    ) => {
    console.log(`Student ${currentStudentId} loading data around:`, date);
    const rangeStart = startOfMonth(subMonths(date, 1));
    const rangeEnd = endOfMonth(addMonths(date, 1));

    // Generate items using the *current state* variables
    const newItems = generateAgendaItems(
      currentClasses,          // Use component state
      currentAvailability,     // Use component state
      mockUsers,
      rangeStart,
      rangeEnd,
      currentStudentId,
      'student'
    );

    setItems(prevItems => ({ ...prevItems, ...newItems }));

  // Depend on the state variables it reads from, plus studentId
  }, [currentClasses, currentAvailability, studentId]);

  // --- Trigger calendar reload when data state changes ---
  useEffect(() => {
      // If the component is not loading and we have a user, reload the calendar
      // whenever the underlying class/availability data changes.
      if (!isLoading && currentUser) {
          loadCalendarData(currentMonth, currentUser.id);
      }
  }, [currentClasses, currentAvailability, isLoading, currentUser, currentMonth, loadCalendarData]); // Add dependencies


  // --- Agenda Item Rendering ---
  const renderItem = // ... (No changes needed in renderItem itself) ...
    useCallback((item: AgendaItem) => {
        const isClass = item.type === 'class';
        const itemStyle = isClass ? styles.classItem : styles.availabilityItem;
        const itemColor = item.originalData.color || (isClass ? '#3498db' : '#2ecc71');
        return (
          <TouchableOpacity
            style={[styles.itemContainer, itemStyle, { borderLeftColor: itemColor }]}
            onPress={() => handleItemPress(item)}
            testID={`item-${item.id}`}
          >
            <Text style={styles.itemTextName}>{item.name}</Text>
            <Text style={styles.itemTextTime}>{item.time}</Text>
            {item.type === 'availability' && <Text style={styles.bookText}>(Tap to book)</Text>}
            {isClass && !(item.originalData as ClassDefinition).isRecurring && <Text style={styles.nonRecurringText}>(Booked Slot)</Text>}
          </TouchableOpacity>
        );
    }, [/* dependencies like currentUser, teacher if needed */]); // Adjust dependencies if needed

  // ... renderEmptyDate remains the same ...
  const renderEmptyDate = useCallback(() => { /* ... */ }, []);

  // --- Event Handlers ---
  const handleItemPress = (item: AgendaItem) => {
     if (!currentUser) return;

     if (item.type === 'availability') {
       confirmBooking(item);
     } else if (item.type === 'class') {
       // Check limit using the *simulated global* reschedule list
       const canReschedule = checkRescheduleLimit(currentUser.id, item.day, globalMockReschedules);
       setCanStudentReschedule(canReschedule);
       setSelectedClassItem(item);
       setClassActionModalVisible(true);
     }
   };

  // ... confirmBooking remains the same (calls bookSlot) ...
   const confirmBooking = (item: AgendaItem) => {
       if (item.type !== 'availability' || !currentUser || !teacher) return;
       const slot = item.originalData as AvailabilitySlot;
       Alert.alert(
         'Confirm Booking',
         `Book this slot with ${teacher.name} on ${format(parseISO(slot.date), 'PPP')} at ${slot.startTime} - ${slot.endTime}?`,
         [ { text: 'Cancel', style: 'cancel' }, { text: 'Book Slot', onPress: () => bookSlot(slot) } ]
       );
   };

  // --- Booking Logic ---
  const bookSlot = (slotToBook: AvailabilitySlot) => {
     if (!currentUser) return;
     console.log(`Booking slot ${slotToBook.id} for student ${currentUser.id}`);

     const bookedDate = parseISO(slotToBook.date);
     const newClassSlot: ScheduleSlot = { /* ... create slot ... */
         dayOfWeek: getDay(bookedDate),
         startTime: slotToBook.startTime,
         endTime: slotToBook.endTime,
     };
     const newClass: ClassDefinition = { /* ... create new class object ... */
        id: v4(),
        studentId: currentUser.id,
        startDate: slotToBook.date, endDate: slotToBook.date,
        scheduleSlots: [newClassSlot],
        isRecurring: false, type: 'class', color: '#f39c12',
     };

    // --- Update Component State ---
    setCurrentClasses(prevClasses => [...prevClasses, newClass]);
    setCurrentAvailability(prevAvail => prevAvail.filter(a => a.id !== slotToBook.id));
    // --- End State Update ---

    // Calendar will reload automatically via the useEffect watching state changes
    // OR explicitly call: loadCalendarData(currentMonth, currentUser.id);

    Alert.alert("Success", "Slot booked successfully!");
  };

  // --- Modal Action Handlers ---
  const handleModalClose = () => { /* ... same as before ... */
      setClassActionModalVisible(false);
      setSelectedClassItem(null);
  };

  const handleCancelClass = (itemToCancel: AgendaItem) => {
      if (!currentUser || itemToCancel.type !== 'class') return;
      const classDef = itemToCancel.originalData as ClassDefinition;
      console.log(`Cancelling class ${classDef.id} on ${itemToCancel.day}`);

      if (!classDef.isRecurring) {
          // --- Update Component State ---
          setCurrentClasses(prevClasses => prevClasses.filter(c => c.id !== classDef.id));
          // --- End State Update ---
          // Calendar reloads via useEffect
          Alert.alert("Success", "Booked class has been cancelled.");
      } else {
          Alert.alert( /* ... Teacher confirmation message ... */
              "Cancellation Request",
              "Cancellation for recurring classes needs teacher confirmation. Please contact your teacher to finalize."
          );
      }
      handleModalClose();
  };

  const handleRescheduleClass = (itemToReschedule: AgendaItem) => {
       if (!currentUser || itemToReschedule.type !== 'class') return;
       const classDef = itemToReschedule.originalData as ClassDefinition;
       console.log(`Rescheduling class ${classDef.id} from ${itemToReschedule.day}`);

       let cancellationSuccessful = false;
       if (!classDef.isRecurring) {
           // --- Update Component State ---
           setCurrentClasses(prevClasses => prevClasses.filter(c => c.id !== classDef.id));
           // --- End State Update ---
           cancellationSuccessful = true;
       } else {
           Alert.alert( /* ... Teacher confirmation message ... */
              "Teacher Confirmation Needed",
              "The original recurring class slot requires teacher confirmation to cancel, but you can proceed to choose a new slot."
           );
           cancellationSuccessful = true; // Proceed for demo
       }

       if (cancellationSuccessful) {
            try {
                // Add record to the *simulated global* tracker
                const newRecord = addRescheduleRecord(currentUser.id, itemToReschedule.day);
                globalMockReschedules.push(newRecord); // Modify the external tracker directly
                // NOTE: If reschedule state were managed locally:
                // setCurrentReschedules(prev => [...prev, newRecord]);

                // Calendar reloads via useEffect watching currentClasses

                handleModalClose();
                Alert.alert( /* ... User guidance message ... */
                    "Class Cancelled",
                    "The original class slot has been cancelled (or requested cancellation for recurring). Please tap on an available green slot in the calendar to book your rescheduled class."
                 );
            } catch (error) { /* ... error handling ... */
                 console.error(error);
                 Alert.alert("Error", "Could not record reschedule due to an invalid date format.");
                 handleModalClose();
            }
       } else { /* ... error handling ... */
            Alert.alert("Error", "Could not cancel the original class slot.");
            handleModalClose();
       }
  };


  // --- Month Change Handler ---
   const handleMonthChange = (month: DateData) => {
     if (!currentUser) return;
     console.log("Month changed:", month.dateString);
     const newMonthDate = new Date(month.year, month.month - 1, 1);
     setCurrentMonth(newMonthDate);
     // Reload data for the new month range using current state
     loadCalendarData(newMonthDate, currentUser.id);
   };

  // --- Render Logic ---
  // ... (isLoading, !currentUser, !teacher checks remain the same) ...
   if (isLoading) { return <SafeAreaView style={styles.centered}><ActivityIndicator size="large" /></SafeAreaView>; }
   if (!currentUser) { return <SafeAreaView style={styles.centered}><Text>Error: Student not found.</Text></SafeAreaView>; }
   if (!teacher) { return <SafeAreaView style={styles.centered}><Text>Error: Could not find assigned teacher.</Text></SafeAreaView>; }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ... Header ... */}
       <View style={styles.header}>
             <Text style={styles.headerTitle}>Your Schedule</Text>
             <Text style={styles.headerSubtitle}>Teacher: {teacher.name}</Text>
        </View>

      <Agenda
        // Pass memoized functions if needed, though Agenda handles some itself
        testID="studentAgenda"
        items={items}
        // loadItemsForMonth={...} // Only needed if NOT using onVisibleMonthsChange/manual load
        onVisibleMonthsChange={(months: string | any[]) => { if (months.length > 0) handleMonthChange(months[0]); }}
        renderItem={renderItem} // Pass non-memoized or memoized version
        renderEmptyDate={renderEmptyDate} // Pass non-memoized or memoized version
        rowHasChanged={(r1: AgendaItem, r2: AgendaItem) => r1.id !== r2.id || r1.name !== r2.name } // Basic check
        showClosingKnob={true}
        pastScrollRange={6} futureScrollRange={6}
      />

      {/* --- Class Action Modal --- */}
      <ClassActionModal
        visible={isClassActionModalVisible}
        onClose={handleModalClose}
        item={selectedClassItem}
        onCancelClass={handleCancelClass}
        onRescheduleClass={handleRescheduleClass}
        canReschedule={canStudentReschedule}
      />
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({ /* ... Same styles as before ... */
    safeArea: { flex: 1, backgroundColor: '#f8f8f8' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 15, backgroundColor: '#e9ecef', borderBottomWidth: 1, borderBottomColor: '#dee2e6' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
    headerSubtitle: { fontSize: 14, color: '#6c757d', textAlign: 'center', marginTop: 4 },
    itemContainer: { backgroundColor: 'white', borderRadius: 5, padding: 10, marginRight: 10, marginTop: 17, borderLeftWidth: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.20, shadowRadius: 1.41, elevation: 2 },
    classItem: { opacity: 0.9 },
    availabilityItem: { backgroundColor: '#e8f5e9' },
    itemTextName: { fontWeight: 'bold', fontSize: 16, marginBottom: 3 },
    itemTextTime: { fontSize: 14, color: '#555' },
    bookText: { fontSize: 12, color: '#1a5d2a', marginTop: 4, fontStyle: 'italic' },
    nonRecurringText: { fontSize: 11, color: '#6c757d', marginTop: 3, fontStyle: 'italic' },
    emptyDate: { height: 60, marginRight: 10, padding: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 5 },
});

// ... (Wrapper export remains the same) ...
const StudentAppWrapper = () => {
    const MOCK_STUDENT_ID = 'student-1';
    return <StudentScheduleScreen studentId={MOCK_STUDENT_ID} />;
}
export default StudentAppWrapper;