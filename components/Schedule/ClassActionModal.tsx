// src/components/Schedule/ClassActionModal.tsx (New File)
// --------------------------------------------------
import React from 'react';
import { Modal, View, Text, Button, StyleSheet, Alert } from 'react-native';
import { AgendaItem, ClassDefinition } from './types';
import { format, parseISO } from 'date-fns';

interface ClassActionModalProps {
  visible: boolean;
  onClose: () => void;
  item: AgendaItem | null;
  onCancelClass: (item: AgendaItem) => void;
  onRescheduleClass: (item: AgendaItem) => void;
  canReschedule: boolean; // Determined before opening the modal
}

const ClassActionModal: React.FC<ClassActionModalProps> = ({
  visible,
  onClose,
  item,
  onCancelClass,
  onRescheduleClass,
  canReschedule,
}) => {
  if (!item || item.type !== 'class') {
    return null; // Should not happen if logic is correct, but safety first
  }
// Default to false if undefined
const handleCancel = () => {
    Alert.alert(
        "Confirm Cancellation",
        // Generic confirmation message
        `Are you sure you want to cancel this class on ${format(parseISO(item.day), 'PPP')} at ${item.time}?`,
        [
            { text: "Keep Class", style: "cancel", onPress: onClose },
            // The actual logic of what happens is in the callback (onCancelClass)
            { text: "Confirm Cancel", style: "destructive", onPress: () => onCancelClass(item) }
        ]
    );
  };

  const handleReschedule = () => {
     Alert.alert(
        "Confirm Reschedule",
         // Generic confirmation message
        `This will cancel the class on ${format(parseISO(item.day), 'PPP')} at ${item.time} so you can choose a new slot.\nProceed?`,
        [
            { text: "Keep Class", style: "cancel", onPress: onClose },
            // The actual logic is in the callback (onRescheduleClass)
            { text: "Proceed", style: "destructive", onPress: () => onRescheduleClass(item) }
        ]
    );
  };


  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Class Action</Text>

          <View style={styles.classInfo}>
             <Text style={styles.infoLabel}>Class:</Text>
             <Text style={styles.infoText}>{item.name}</Text>
             <Text style={styles.infoLabel}>Date:</Text>
             <Text style={styles.infoText}>{format(parseISO(item.day), 'EEEE, MMMM do, yyyy')}</Text>
             <Text style={styles.infoLabel}>Time:</Text>
             <Text style={styles.infoText}>{item.time}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button title="Cancel Class" onPress={handleCancel} color="#e74c3c" />

            {canReschedule ? (
                <Button title="Reschedule Class" onPress={handleReschedule} color="#f39c12" />
                ) : (
                <View style={styles.disabledRescheduleContainer}>
                    <Button title="Reschedule Class" disabled={true} />
                    <Text style={styles.disabledMessage}>
                        You have already rescheduled a class this month. Please contact your teacher.
                    </Text>
                </View>
                )}
          </View>

           <View style={styles.closeButtonContainer}>
             <Button title="Close" onPress={onClose} color="#3498db"/>
           </View>

        </View>
      </View>
    </Modal>
  );
};

// Styles similar to other modals
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '85%',
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
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
   classInfo: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
   infoLabel: {
       fontSize: 14,
       color: '#6c757d', // Gray label
       marginBottom: 2,
   },
   infoText: {
       fontSize: 16,
       fontWeight: '500',
       marginBottom: 8,
   },
  buttonContainer: {
    marginBottom: 15, // Space between main buttons and close button
    // Arrange buttons nicely, maybe column for more space?
  },
   disabledRescheduleContainer: {
      alignItems: 'center', // Center disabled button and message
      marginTop: 10, // Add space above disabled section
   },
   disabledMessage: {
       fontSize: 13,
       color: '#dc3545', // Red warning color
       textAlign: 'center',
       marginTop: 5,
       paddingHorizontal: 10, // Prevent text touching edges
   },
   closeButtonContainer: {
       marginTop: 10,
       borderTopWidth: 1,
       borderTopColor: '#eee',
       paddingTop: 15,
   }
  // Add more styles if needed
});

export default ClassActionModal;