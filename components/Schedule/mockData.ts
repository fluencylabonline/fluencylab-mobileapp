import { v4 } from 'react-native-uuid/dist/v4';
import { User, ClassDefinition, AvailabilitySlot, RescheduleRecord } from './types';

  export const MOCK_TEACHER_ID = 'teacher-1';
  
  export const mockUsers: User[] = [
    { id: MOCK_TEACHER_ID, name: 'Professor Minerva', role: 'teacher' },
    { id: 'student-1', name: 'Harry Potter', role: 'student', professorId: MOCK_TEACHER_ID },
    { id: 'student-2', name: 'Hermione Granger', role: 'student', professorId: MOCK_TEACHER_ID },
    { id: 'student-3', name: 'Ron Weasley', role: 'student', professorId: MOCK_TEACHER_ID },
    { id: 'student-4', name: 'Draco Malfoy', role: 'student', professorId: 'teacher-2' }, // Different teacher
  ];
  

  export const mockClasses: ClassDefinition[] = [
    {
      id: v4(),
      studentId: 'student-1',
      startDate: '2025-04-01',
      endDate: '2025-06-30',
      scheduleSlots: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 3, startTime: '11:00', endTime: '12:00' },
      ],
      isRecurring: true, // <-- SET EXPLICITLY
      type: 'class',
      color: '#3498db',
    },
    {
      id: v4(),
      studentId: 'student-2',
      startDate: '2025-04-10',
      endDate: '2025-05-31',
      scheduleSlots: [
        { dayOfWeek: 4, startTime: '14:00', endTime: '15:30' },
      ],
      isRecurring: true, // <-- SET EXPLICITLY
      type: 'class',
      color: '#e74c3c',
    },
  ];
  
  export const mockAvailability: AvailabilitySlot[] = [
    {
      id: v4(),
      teacherId: MOCK_TEACHER_ID,
      date: '2025-04-15', // Use specific dates around current time
      startTime: '10:00',
      endTime: '11:00',
      type: 'availability',
      color: '#2ecc71', // Green
    },
     {
      id: v4(),
      teacherId: MOCK_TEACHER_ID,
      date: '2025-04-22',
      startTime: '16:00',
      endTime: '17:00',
      type: 'availability',
      color: '#2ecc71', // Green
    },
  ];

  export let globalMockReschedules: RescheduleRecord[] = [
    // Example entry (if student-1 rescheduled a class in April 2025)
    //{
    //   id: v4(),
    //   studentId: 'student-1',
    //   originalClassDate: '2025-04-15',
    //   monthKey: '2025-04',
    //   rescheduledAt: new Date().toISOString(),
    // }
];