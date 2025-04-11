// src/components/Schedule/scheduleUtils.ts (Modify this function)
import {
    format,
    parseISO,
    isWithinInterval,
    eachDayOfInterval,
    getDay,
    startOfDay,
  } from 'date-fns';
  import {
    AgendaSchedule,
    AgendaItem,
    ClassDefinition,
    AvailabilitySlot,
    User,
    RescheduleRecord,
  } from './types'; // Adjusted path
  import { v4 } from 'react-native-uuid/dist/v4';
  /**
 * Checks if a student has reached their reschedule limit for a given month.
 * @param studentId The ID of the student.
 * @param dateToCheck The specific date (YYYY-MM-DD) of the class being considered for reschedule.
 * @param rescheduleRecords The current list of reschedule records.
 * @returns true if the student CAN reschedule, false otherwise.
 */
export const checkRescheduleLimit = (
  studentId: string,
  dateToCheck: string,
  rescheduleRecords: RescheduleRecord[]
): boolean => {
  try {
    const monthKey = format(parseISO(dateToCheck), 'yyyy-MM');
    const count = rescheduleRecords.filter(
      (record) => record.studentId === studentId && record.monthKey === monthKey
    ).length;
    return count === 0; // Allow reschedule only if count is 0
  } catch (error) {
      console.error("Error parsing date for reschedule check:", dateToCheck, error);
      return false; // Default to false if date is invalid
  }
};

/**
 * Adds a reschedule record to the list (simulates saving to DB).
 * @param studentId The ID of the student rescheduling.
 * @param originalClassDate The date (YYYY-MM-DD) of the class being rescheduled away from.
 * @returns The new reschedule record.
 */
export const addRescheduleRecord = (
  studentId: string,
  originalClassDate: string,
): RescheduleRecord => {
   try {
    const monthKey = format(parseISO(originalClassDate), 'yyyy-MM');
    const newRecord: RescheduleRecord = {
        id: v4(),
        studentId,
        originalClassDate,
        monthKey,
        rescheduledAt: new Date().toISOString(),
    };
    // In a real app, you'd push this to your state management / API
    console.log("Adding reschedule record:", newRecord);
    return newRecord;
   } catch (error) {
       console.error("Error creating reschedule record:", originalClassDate, error);
       // Rethrow or handle appropriately
       throw new Error("Failed to create reschedule record due to invalid date.");
   }
};


  // Helper to get user name (can be student or teacher)
  const getUserName = (userId: string, users: User[]): string => {
    return users.find(u => u.id === userId)?.name ?? 'Unknown User';
  };
  
  // Function to generate Agenda items - now handles student/teacher context
  export const generateAgendaItems = (
    allClasses: ClassDefinition[],
    allAvailability: AvailabilitySlot[],
    allUsers: User[],
    rangeStart: Date, // Date range start
    rangeEnd: Date,   // Date range end
    contextUserId: string, // ID of the user viewing the schedule (student or teacher)
    viewMode: 'student' | 'teacher'
  ): AgendaSchedule => {
    const items: AgendaSchedule = {};
    const interval = { start: startOfDay(rangeStart), end: startOfDay(rangeEnd) };
  
    const currentUser = allUsers.find(u => u.id === contextUserId);
    if (!currentUser) return {}; // Should not happen with mock data
  
    const teacherId = viewMode === 'teacher' ? contextUserId : currentUser?.professorId;
    const studentId = viewMode === 'student' ? contextUserId : undefined;
  
    // Initialize empty arrays for all days in the range
    eachDayOfInterval(interval).forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      if (!items[dateStr]) {
        items[dateStr] = [];
      }
    });
  
    // --- Process Classes ---
    allClasses.forEach(classDef => {
      // Filter based on view mode
      if (viewMode === 'student' && classDef.studentId !== studentId) {
        return; // Skip classes not for this student
      }
      // Note: Teacher view implicitly sees all classes (no studentId filter needed here)
  
      const classStartDate = parseISO(classDef.startDate);
      const classEndDate = parseISO(classDef.endDate);
      const studentName = getUserName(classDef.studentId, allUsers);
  
      eachDayOfInterval(interval).forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
  
        if (isWithinInterval(day, { start: startOfDay(classStartDate), end: startOfDay(classEndDate) })) {
          const dayOfWeek = getDay(day); // 0=Sun, 1=Mon, ...
  
          classDef.scheduleSlots.forEach(slot => {
            if (slot.dayOfWeek === dayOfWeek) {
              // Generate item only if it's a recurring class OR if the specific date matches
              if (classDef.isRecurring || format(day, 'yyyy-MM-dd') === classDef.startDate) {
                 const agendaItem: AgendaItem = {
                  id: classDef.id,
                  name: viewMode === 'student'
                    ? `Your Class` // Student view: Simple name
                    : `Class with ${studentName}`, // Teacher view: Show student name
                  time: `${slot.startTime} - ${slot.endTime}`,
                  type: 'class',
                  originalData: classDef,
                  day: dateStr,
                  // Add height etc. if needed
                };
                if (!items[dateStr]) items[dateStr] = [];
                items[dateStr].push(agendaItem);
              }
            }
          });
        }
      });
    });
  
    // --- Process Availability (Only relevant if a teacher exists) ---
    if (teacherId) {
        const teacherName = getUserName(teacherId, allUsers);
        allAvailability.forEach(avail => {
          // Filter: Only show availability for the relevant teacher
          if (avail.teacherId !== teacherId) {
              return;
          }
           // Filter: Optionally hide if booked (if modifying availability instead of removing)
           // if (avail.bookedByStudentId) return;
  
          const availDate = parseISO(avail.date);
          if (isWithinInterval(availDate, interval)) {
              const dateStr = format(availDate, 'yyyy-MM-dd');
              const agendaItem: AgendaItem = {
                  id: avail.id,
                  name: viewMode === 'student'
                      ? `Available Slot (with ${teacherName})` // Student sees teacher name
                      : 'Available for Rescheduling', // Teacher view: Generic name
                  time: `${avail.startTime} - ${avail.endTime}`,
                  type: 'availability',
                  originalData: avail,
                  day: dateStr,
              };
              if (!items[dateStr]) items[dateStr] = [];
              items[dateStr].push(agendaItem);
          }
      });
    }
  
  
    // Sort items within each day by start time
    Object.keys(items).forEach(dateStr => {
      items[dateStr].sort((a, b) => {
          const timeA = a.time.split(' - ')[0];
          const timeB = b.time.split(' - ')[0];
          return timeA.localeCompare(timeB);
      });
    });
  
    return items;
  };