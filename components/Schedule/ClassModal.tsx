// src/components/ClassModal.tsx (Basic Structure)
// --------------------------------------------------
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Button, StyleSheet, TextInput, ScrollView, Switch, Platform, Alert, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DatePicker from 'react-native-date-picker';
import { format, parseISO } from 'date-fns'; // For date handling
import { User, ClassDefinition, ScheduleSlot } from './types'; // Adjust path

// Type for the data passed back on save
export interface NewClassData {
  studentId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  scheduleSlots: ScheduleSlot[];
}

interface ClassModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: NewClassData) => void;
  students: User[];
  initialData: ClassDefinition | null; // For editing
}

const daysOfWeek = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

const ClassModal: React.FC<ClassModalProps> = ({ visible, onClose, onSave, students, initialData }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(new Date().setMonth(new Date().getMonth() + 3))); // Default end date 3 months later
  const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisible] = useState(false);

  // State to manage time slots for each selected day
  // { 1: { startTime: '09:00', endTime: '10:00', enabled: true }, 3: { startTime: '11:00', endTime: '12:00', enabled: true } }
  const [daySlots, setDaySlots] = useState<Record<number, { startTime: Date, endTime: Date, enabled: boolean, showStartPicker: boolean, showEndPicker: boolean }>>(
     () => daysOfWeek.reduce((acc, day) => {
        acc[day.value] = {
          startTime: new Date(new Date().setHours(9, 0, 0, 0)), // Default 9 AM
          endTime: new Date(new Date().setHours(10, 0, 0, 0)),   // Default 10 AM
          enabled: false,
          showStartPicker: false,
          showEndPicker: false,
        };
        return acc;
      }, {} as Record<number, { startTime: Date, endTime: Date, enabled: boolean, showStartPicker: boolean, showEndPicker: boolean }>)
  );


  useEffect(() => {
    if (initialData) {
      setSelectedStudentId(initialData.studentId);
      setStartDate(parseISO(initialData.startDate));
      setEndDate(parseISO(initialData.endDate));

      // Reset daySlots and apply initial data
       const initialSlotsState = { ...daySlots };
       // First reset all days to disabled
        Object.keys(initialSlotsState).forEach(keyStr => {
            const key = parseInt(keyStr, 10);
            initialSlotsState[key] = { ...initialSlotsState[key], enabled: false };
        });
        // Then enable and set times for days present in initialData
      initialData.scheduleSlots.forEach(slot => {
        const [startH, startM] = slot.startTime.split(':').map(Number);
        const [endH, endM] = slot.endTime.split(':').map(Number);
        const startTime = new Date();
        startTime.setHours(startH, startM, 0, 0);
        const endTime = new Date();
        endTime.setHours(endH, endM, 0, 0);

        initialSlotsState[slot.dayOfWeek] = {
          ...initialSlotsState[slot.dayOfWeek],
           startTime: startTime,
           endTime: endTime,
          enabled: true,
        };
      });
      setDaySlots(initialSlotsState);


    } else {
      // Reset form for adding new
      setSelectedStudentId(students.length > 0 ? students[0].id : '');
      setStartDate(new Date());
      setEndDate(new Date(new Date().setMonth(new Date().getMonth() + 3)));
      // Reset day slots to default disabled state
      setDaySlots(daysOfWeek.reduce((acc, day) => {
            acc[day.value] = {
            startTime: new Date(new Date().setHours(9, 0, 0, 0)),
            endTime: new Date(new Date().setHours(10, 0, 0, 0)),
            enabled: false,
            showStartPicker: false,
            showEndPicker: false,
            };
            return acc;
        }, {} as Record<number, { startTime: Date, endTime: Date, enabled: boolean, showStartPicker: boolean, showEndPicker: boolean }>));
    }
  }, [initialData, students, visible]); // Rerun when modal opens or initial data changes


  const handleSavePress = () => {
    if (!selectedStudentId) {
      Alert.alert("Error", "Please select a student.");
      return;
    }

    const scheduleSlots: ScheduleSlot[] = Object.entries(daySlots)
      .filter(([_, slotData]) => slotData.enabled)
      .map(([dayOfWeekStr, slotData]) => ({
        dayOfWeek: parseInt(dayOfWeekStr, 10),
        startTime: format(slotData.startTime, 'HH:mm'),
        endTime: format(slotData.endTime, 'HH:mm'),
      }));

     if (scheduleSlots.length === 0) {
         Alert.alert("Error", "Please select at least one day and time for the class.");
         return;
     }

     if (endDate < startDate) {
         Alert.alert("Error", "End date cannot be before start date.");
         return;
     }

    const saveData: NewClassData = {
      studentId: selectedStudentId,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      scheduleSlots: scheduleSlots,
    };
    onSave(saveData);
  };

  // Function to update specific day's slot state
  const updateDaySlot = (dayValue: number, partialUpdate: Partial<typeof daySlots[number]>) => {
      setDaySlots(prev => ({
          ...prev,
          [dayValue]: { ...prev[dayValue], ...partialUpdate }
      }));
  };


  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView>
             <Text style={styles.modalTitle}>{initialData ? 'Edit Class' : 'Add New Class'}</Text>

            {/* Student Picker */}
            <Text style={styles.label}>Student:</Text>
            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={selectedStudentId}
                    onValueChange={(itemValue) => setSelectedStudentId(itemValue)}
                    style={styles.picker}
                >
                    <Picker.Item label="Select a student..." value="" />
                    {students.map(student => (
                    <Picker.Item key={student.id} label={student.name} value={student.id} />
                    ))}
                </Picker>
            </View>


            {/* Start Date */}
             <Text style={styles.label}>Start Date:</Text>
             <TouchableOpacity onPress={() => setStartDatePickerVisible(true)} style={styles.dateInput}>
                 <Text>{format(startDate, 'PPP')}</Text> {/* Pretty format */}
             </TouchableOpacity>
             <DatePicker
                modal
                open={isStartDatePickerVisible}
                date={startDate}
                mode="date"
                onConfirm={(date) => {
                    setStartDatePickerVisible(false);
                    setStartDate(date);
                }}
                onCancel={() => setStartDatePickerVisible(false)}
            />

            {/* End Date */}
            <Text style={styles.label}>End Date:</Text>
            <TouchableOpacity onPress={() => setEndDatePickerVisible(true)} style={styles.dateInput}>
                 <Text>{format(endDate, 'PPP')}</Text>
             </TouchableOpacity>
             <DatePicker
                modal
                open={isEndDatePickerVisible}
                date={endDate}
                mode="date"
                minimumDate={startDate} // Ensure end date is not before start date
                onConfirm={(date) => {
                    setEndDatePickerVisible(false);
                    setEndDate(date);
                }}
                onCancel={() => setEndDatePickerVisible(false)}
            />


            {/* Day/Time Selection */}
            <Text style={styles.label}>Select Days and Times:</Text>
            {daysOfWeek.map(day => (
              <View key={day.value} style={styles.dayRow}>
                <Switch
                   value={daySlots[day.value]?.enabled ?? false}
                   onValueChange={(isEnabled) => updateDaySlot(day.value, { enabled: isEnabled })}
                />
                <Text style={styles.dayLabel}>{day.label}</Text>
                {daySlots[day.value]?.enabled && (
                  <View style={styles.timePickersContainer}>
                     {/* Start Time */}
                     <TouchableOpacity onPress={() => updateDaySlot(day.value, { showStartPicker: true })} style={styles.timeInput}>
                         <Text>{format(daySlots[day.value].startTime, 'p')}</Text>
                     </TouchableOpacity>
                     <DatePicker
                        modal
                        open={daySlots[day.value].showStartPicker}
                        date={daySlots[day.value].startTime}
                        mode="time"
                        onConfirm={(time) => {
                             updateDaySlot(day.value, { startTime: time, showStartPicker: false });
                             // Optional: Automatically adjust end time if start time exceeds it
                             if (time >= daySlots[day.value].endTime) {
                                 const newEndTime = new Date(time);
                                 newEndTime.setHours(time.getHours() + 1); // Set end time 1 hour after start
                                 updateDaySlot(day.value, { endTime: newEndTime });
                             }
                        }}
                        onCancel={() => updateDaySlot(day.value, { showStartPicker: false })}
                     />
                     <Text> to </Text>
                    {/* End Time */}
                     <TouchableOpacity onPress={() => updateDaySlot(day.value, { showEndPicker: true })} style={styles.timeInput}>
                         <Text>{format(daySlots[day.value].endTime, 'p')}</Text>
                     </TouchableOpacity>
                      <DatePicker
                        modal
                        open={daySlots[day.value].showEndPicker}
                        date={daySlots[day.value].endTime}
                        mode="time"
                        // minimumDate={daySlots[day.value].startTime} // Set minimum time
                        onConfirm={(time) => {
                             if (time <= daySlots[day.value].startTime) {
                                 Alert.alert("Invalid Time", "End time must be after start time.");
                             } else {
                                updateDaySlot(day.value, { endTime: time, showEndPicker: false });
                             }
                        }}
                        onCancel={() => updateDaySlot(day.value, { showEndPicker: false })}
                     />

                  </View>
                )}
              </View>
            ))}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
                <Button title="Cancel" onPress={onClose} color="#e74c3c" />
                <Button title={initialData ? 'Update Class' : 'Save Class'} onPress={handleSavePress} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Add basic styles for the modal
const styles = StyleSheet.create({
   modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%', // Limit height
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
   modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
   label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 10,
    // Height might be needed for Android picker styling
    ...(Platform.OS === 'android' && { height: 50, justifyContent: 'center' }),
  },
  picker: {
     // Basic styling, might need platform-specific adjustments
     width: '100%',
      ...(Platform.OS === 'ios' && { height: 150 }), // Adjust height for iOS wheel picker
  },
  dateInput: {
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 5,
      padding: 10,
      marginBottom: 10,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 40,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
   dayLabel: {
      flex: 1, // Take up available space
      marginLeft: 8,
      fontSize: 16,
   },
   timePickersContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end', // Align to the right
   },
   timeInput: {
       borderWidth: 1,
       borderColor: '#ccc',
       borderRadius: 5,
       paddingHorizontal: 8,
       paddingVertical: 5,
       marginHorizontal: 3,
   },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});


export default ClassModal;

// --------------------------------------------------
// src/components/AvailabilityModal.tsx (Basic Structure)
// --------------------------------------------------