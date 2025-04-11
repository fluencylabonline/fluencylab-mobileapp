
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Button, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import DatePicker from 'react-native-date-picker';
import { format } from 'date-fns';

// Type for the data passed back on save
export interface NewAvailabilityData {
    date: string;      // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
}

interface AvailabilityModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (data: NewAvailabilityData) => void;
    // No initial data usually needed for adding new slots
}

const AvailabilityModal: React.FC<AvailabilityModalProps> = ({ visible, onClose, onSave }) => {
    const [date, setDate] = useState(new Date());
    const [startTime, setStartTime] = useState(new Date(new Date().setHours(9, 0, 0, 0))); // Default 9 AM
    const [endTime, setEndTime] = useState(new Date(new Date().setHours(10, 0, 0, 0)));   // Default 10 AM

    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [isStartTimePickerVisible, setStartTimePickerVisible] = useState(false);
    const [isEndTimePickerVisible, setEndTimePickerVisible] = useState(false);

    // Reset state when modal becomes visible
    useEffect(() => {
        if (visible) {
            setDate(new Date());
            setStartTime(new Date(new Date().setHours(9, 0, 0, 0)));
            setEndTime(new Date(new Date().setHours(10, 0, 0, 0)));
        }
    }, [visible]);

    const handleSavePress = () => {
        if (endTime <= startTime) {
            Alert.alert("Invalid Time", "End time must be after start time.");
            return;
        }

        const saveData: NewAvailabilityData = {
            date: format(date, 'yyyy-MM-dd'),
            startTime: format(startTime, 'HH:mm'),
            endTime: format(endTime, 'HH:mm'),
        };
        onSave(saveData);
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
                    <Text style={styles.modalTitle}>Add Availability Slot</Text>

                     {/* Date Picker */}
                     <Text style={styles.label}>Date:</Text>
                     <TouchableOpacity onPress={() => setDatePickerVisible(true)} style={styles.inputStyle}>
                        <Text>{format(date, 'PPP')}</Text>
                    </TouchableOpacity>
                    <DatePicker
                        modal
                        open={isDatePickerVisible}
                        date={date}
                        mode="date"
                        minimumDate={new Date()} // Cannot add availability in the past
                        onConfirm={(selectedDate) => {
                            setDatePickerVisible(false);
                            setDate(selectedDate);
                        }}
                        onCancel={() => setDatePickerVisible(false)}
                    />

                    {/* Start Time Picker */}
                    <Text style={styles.label}>Start Time:</Text>
                    <TouchableOpacity onPress={() => setStartTimePickerVisible(true)} style={styles.inputStyle}>
                        <Text>{format(startTime, 'p')}</Text>
                    </TouchableOpacity>
                     <DatePicker
                        modal
                        open={isStartTimePickerVisible}
                        date={startTime}
                        mode="time"
                        onConfirm={(time) => {
                            setStartTimePickerVisible(false);
                            setStartTime(time);
                             // Optional: Adjust end time if start time exceeds it
                             if (time >= endTime) {
                                 const newEndTime = new Date(time);
                                 newEndTime.setHours(time.getHours() + 1); // Set end time 1 hour after start
                                 setEndTime(newEndTime);
                             }
                        }}
                        onCancel={() => setStartTimePickerVisible(false)}
                     />

                    {/* End Time Picker */}
                    <Text style={styles.label}>End Time:</Text>
                     <TouchableOpacity onPress={() => setEndTimePickerVisible(true)} style={styles.inputStyle}>
                        <Text>{format(endTime, 'p')}</Text>
                    </TouchableOpacity>
                     <DatePicker
                        modal
                        open={isEndTimePickerVisible}
                        date={endTime}
                        mode="time"
                        // minimumDate={startTime} // Handled in validation
                        onConfirm={(time) => {
                            setEndTimePickerVisible(false);
                            if (time <= startTime) {
                                Alert.alert("Invalid Time", "End time must be after start time.");
                            } else {
                                setEndTime(time);
                            }
                        }}
                        onCancel={() => setEndTimePickerVisible(false)}
                     />

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                        <Button title="Cancel" onPress={onClose} color="#e74c3c" />
                        <Button title="Save Slot" onPress={handleSavePress} />
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// Re-use or define styles similar to ClassModal
const styles = StyleSheet.create({
    modalOverlay: { /* ... same as ClassModal ... */
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: { /* ... same as ClassModal ... */
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: { /* ... same as ClassModal ... */
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    label: { /* ... same as ClassModal ... */
        fontSize: 16,
        fontWeight: '600',
        marginTop: 10,
        marginBottom: 5,
    },
    inputStyle: { // Style for the TouchableOpacity inputs
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 5,
      padding: 10,
      marginBottom: 10,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 40,
    },
    buttonContainer: { /* ... same as ClassModal ... */
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
});

export default AvailabilityModal;