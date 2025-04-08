// components/QuizTimer.tsx
// (Create this file in your components directory or adjust path)

import React, { useState, useEffect, useRef, memo } from 'react';
import { View, StyleSheet } from 'react-native';
// Adjust import paths for your project structure
import { TextComponent } from '@/components/TextComponent';
import { useTheme } from '@/constants/useTheme';

interface QuizTimerProps {
    duration: number;
    isPlaying: boolean; // Controls if the timer should be running
    onFinish: () => void; // Callback when the timer reaches 0
    resetKey: any; // A prop that changes to signal a reset (e.g., question index)
}

const QuizTimer: React.FC<QuizTimerProps> = ({
    duration,
    isPlaying,
    onFinish,
    resetKey, // Use this key to reset the timer when the question changes
}) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const [timeLeft, setTimeLeft] = useState(duration);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const onFinishRef = useRef(onFinish); // Use ref for the callback

    // Keep the callback reference up-to-date without causing effect re-runs
    useEffect(() => {
        onFinishRef.current = onFinish;
    }, [onFinish]);

    useEffect(() => {
        // Function to clear existing interval
        const clearExistingInterval = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        if (isPlaying) {
            clearExistingInterval(); // Clear previous timer if any
            setTimeLeft(duration); // Reset time visually when starting/resetting

            intervalRef.current = setInterval(() => {
                setTimeLeft((prevTime) => {
                    if (prevTime <= 1) {
                        clearExistingInterval(); // Stop interval first
                        console.log("Log: Timer finished via interval.");
                        // Call the latest onFinish via ref
                        if (onFinishRef.current) {
                            // Check if component might be unmounting (though effect cleanup should handle)
                            // Wrap in try/catch just in case onFinish causes an error
                            try {
                                onFinishRef.current();
                            } catch (e) {
                                console.error("Error executing onFinish callback:", e)
                            }
                        }
                        return 0; // Ensure time stays at 0
                    }
                    return prevTime - 1; // Decrement time
                });
            }, 1000);

        } else {
            clearExistingInterval(); // Clear interval if isPlaying becomes false
        }

        // Cleanup function for effect
        return () => clearExistingInterval();

    // Dependency array: This effect runs when isPlaying changes or resetKey changes
    // When resetKey changes (e.g., new question), it clears the old timer,
    // resets timeLeft state visually, and starts a new timer if isPlaying is true.
    }, [isPlaying, duration, resetKey]);

    // Calculate progress for the bar
    const progress = duration > 0 ? (timeLeft / duration) * 100 : 0;
    const displayTime = Math.max(0, timeLeft); // Ensure displayed time is not negative

    return (
        <View style={styles.timerContainer}>
            <View style={[styles.timerBarContainer, { backgroundColor: colors.background.list }]}>
                {/* Ensure progress is between 0 and 100 */}
                <View style={[styles.timerBar, { width: `${Math.min(100, Math.max(0, progress))}%` }]} />
            </View>
            <TextComponent style={[styles.timerText, { color: colors.text.secondary }]}>
                {displayTime}s
            </TextComponent>
        </View>
    );
};

const getStyles = (colors: any) => StyleSheet.create({
    timerContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 15,
    },
    timerBarContainer: {
        height: 8,
        width: '90%', // Bar takes most of the width
        // backgroundColor: set dynamically via theme
        borderRadius: 4,
        overflow: 'hidden',
        marginVertical: 8,
     },
     timerBar: {
         height: '100%',
         backgroundColor: colors.colors.teal, // Use a distinct color for progress
         borderRadius: 4,
     },
     timerText: {
         textAlign: 'center',
         fontSize: 14,
         fontWeight: '500',
     },
});

// Memoize the component to prevent re-renders if props haven't actually changed
export default memo(QuizTimer);