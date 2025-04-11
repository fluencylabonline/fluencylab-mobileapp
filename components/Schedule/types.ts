// src/types.ts (Ideally in a separate types file)
// --------------------------------------------------

export interface User {
    id: string;
    name: string;
    role: 'teacher' | 'student';
    professorId?: string; // Only for students
  }
  
  export interface ScheduleSlot {
    dayOfWeek: number; // 0 (Sun) to 6 (Sat)
    startTime: string; // "HH:mm" format (e.g., "09:00")
    endTime: string; // "HH:mm" format (e.g., "10:00")
  }
  
  export interface ClassDefinition {
    id: string;
    studentId: string;
    startDate: string; // "YYYY-MM-DD"
    endDate: string; // "YYYY-MM-DD" -> For non-recurring, startDate === endDate
    scheduleSlots: ScheduleSlot[]; // For non-recurring, will have one slot matching the booked date/time
    isRecurring: boolean; // <-- ADDED/UPDATED: true for teacher-set classes, false for booked slots
    type: 'class';
    color?: string;
  }  
  
  export interface AvailabilitySlot {
    id: string;
    teacherId: string;
    date: string; // "YYYY-MM-DD"
    startTime: string; // "HH:mm"
    endTime: string; // "HH:mm"
    type: 'availability'; // To differentiate in Agenda
    color?: string; // Optional color for display
  }
  
  // Combined type for items shown in the Agenda list
  export interface AgendaItem {
    id: string; // Can be ClassDefinition id or AvailabilitySlot id
    name: string; // Description (e.g., "Class with John Doe" or "Available Slot")
    time: string; // Formatted time (e.g., "09:00 - 10:00")
    type: 'class' | 'availability';
    originalData: ClassDefinition | AvailabilitySlot; // Store original for editing/deletion
    height?: number; // Optional: for Agenda rendering performance
    day: string; // YYYY-MM-DD date string this item belongs to
  }
  
  // Type for the structure react-native-calendars Agenda expects
  export type AgendaSchedule = {
    [dateString: string]: AgendaItem[];
  };
  

// src/components/Schedule/types.ts (Add this new interface)
// ... other interfaces ...

export interface RescheduleRecord {
  id: string;
  studentId: string;
  originalClassDate: string; // YYYY-MM-DD (The date of the class that was rescheduled *away from*)
  monthKey: string; // YYYY-MM (For easy querying of the limit)
  rescheduledAt: string; // ISO timestamp of when the reschedule action was taken
}

// src/components/Schedule/mockData.ts (Add this new mock array)
// ... other mock data ...
