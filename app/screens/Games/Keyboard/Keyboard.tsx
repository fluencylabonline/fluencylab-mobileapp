import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons'; // Make sure @expo/vector-icons is installed
import { useTheme } from '@/constants/useTheme';
const { width: screenWidth } = Dimensions.get('window');

const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace', 'Enter'],
];

interface KeyboardProps {
    onKeyPress: (key: string) => void;
    keyBackgroundColors: Record<string, string>;
    keyTextColors?: Record<string, string>;
}
const Keyboard: React.FC<KeyboardProps> = ({
    onKeyPress,
    keyBackgroundColors,
    keyTextColors = {},
}) => {
    const { colors } = useTheme();
    // Get styles based on the current theme mode
    const styles = getKeyboardStyles(colors);

    // Define default colors based on the current theme
    // These are used if a specific color isn't provided in keyBackgroundColors/keyTextColors
    const defaultBgColor = colors.background.listSecondary; // Darker/Lighter Gray
    const defaultTextColor = colors.colors.white; // White/Near Black
    const specialKeyBgColor = colors.background.listSecondary; // Darker/Lighter Gray for special keys

    return (
        // Container for the entire keyboard
        <View style={styles.keyboardContainer}>
            {KEYBOARD_ROWS.map((row, rowIndex) => (
                // Container for each row of keys
                <View key={rowIndex} style={styles.row}>
                    {row.map((key) => {
                        // Determine background color: Use provided color or default based on key type and theme
                        const bgColor = keyBackgroundColors[key] || (key === 'Enter' || key === 'Backspace' ? specialKeyBgColor : defaultBgColor);
                        const textColor = keyTextColors[key] || defaultTextColor;

                        return (
                            // Touchable area for each key
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.key, // Base key style
                                    { backgroundColor: bgColor }, // Apply the determined background color
                                    // Apply special styling (like width) for Enter/Backspace keys
                                    key === 'Enter' || key === 'Backspace' ? styles.specialKey : null,
                                ]}
                                onPress={() => onKeyPress(key)} // Call the passed function on press
                                activeOpacity={0.7} // Feedback on press
                            >
                                {/* Display Icon or Text based on the key */}
                                {key === 'Backspace' ? (
                                    <Ionicons name="backspace-outline" size={styles.keyText.fontSize ? styles.keyText.fontSize * 1.2 : 20} color={textColor} />
                                ) : key === 'Enter' ? (
                                     // Using checkmark for Enter often feels better in games than return arrow
                                    <Ionicons name="checkmark-outline" size={styles.keyText.fontSize ? styles.keyText.fontSize * 1.2 : 20} color={textColor} />
                                ) : (
                                    // Regular letter key
                                    <Text style={[styles.keyText, { color: textColor }]}>
                                        {key}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
        </View>
    );
};

// Function to generate themed styles for the Keyboard
const getKeyboardStyles = (colors: any) => StyleSheet.create({
    keyboardContainer: {
        alignSelf: 'stretch', // Take full width available in the parent
        alignItems: 'center', // Center rows horizontally
        paddingVertical: 8, // Vertical padding around the keyboard
        paddingHorizontal: 3, // Horizontal padding around the keyboard
        backgroundColor: colors.background.list, // Background for the keyboard area
    },
    row: {
        flexDirection: 'row', // Arrange keys horizontally
        justifyContent: 'center', // Center keys within the row
        marginVertical: 4, // Vertical margin between rows
        width: '100%', // Ensure row takes full width
    },
    key: {
        // Dynamic width based on screen size, ensures roughly 10 keys fit comfortably
        width: Math.max(30, Math.min(screenWidth / 11, 40)), // Min 30px, Max 45px, Responsive otherwise
        height: 50, // Fixed height for keys
        marginHorizontal: screenWidth > 400 ? 3 : 2, // Slightly more margin on larger screens
        justifyContent: 'center', // Center content (icon/text) vertically
        alignItems: 'center', // Center content (icon/text) horizontally
        borderRadius: 5, // Slightly rounded corners
        // Default background color is applied dynamically in the component logic
    },
    specialKey: {
        // Make special keys wider
        width: Math.max(45, Math.min(screenWidth / 7.5, 60)), // Min 45px, Max 65px, Responsive
    },
    keyText: {
        fontSize: 14, // Base font size
        fontWeight: 'bold', // Make text bold
         // Default text color is applied dynamically in the component logic
        textTransform: 'uppercase', // Ensure letters are uppercase
    },
});

export default Keyboard;