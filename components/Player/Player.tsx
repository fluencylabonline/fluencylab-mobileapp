import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native'; // Added Platform
import { Audio, AVPlaybackStatus, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { TextComponent } from '../TextComponent';

interface AudioPlayerProps {
    sourceUrl: string | null;
    playbackRate?: number;
    minimal?: boolean;
}

// Helper function to format time from milliseconds to MM:SS
const formatTime = (millis: number | undefined): string => {
    // ... (keep formatTime function as is)
     if (millis === undefined || isNaN(millis) || millis < 0) {
        return '00:00';
    }
    const totalSeconds = Math.floor(millis / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const AudioPlayer: React.FC<AudioPlayerProps> = ({
    sourceUrl,
    playbackRate = 1.0,
    minimal = false // Default to false (full player)
}) => {
    const soundRef = useRef<Audio.Sound | null>(null);
    const isMountedRef = useRef(true);

    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [durationMillis, setDurationMillis] = useState<number | undefined>(undefined);
    const [positionMillis, setPositionMillis] = useState<number>(0);
    const [isSeeking, setIsSeeking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { colors } = useTheme();
    const styles = getStyles(colors);
    // --- Audio Mode Configuration (Keep as is) ---
    useEffect(() => {
        // Configure audio session - important for background play, interruptions
        Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            // interruptionModeIOS: InterruptionModeIOS.DoNotMix, // Or MixWithOthers if needed
            playsInSilentModeIOS: true, // Play sound even when phone is on silent
            // interruptionModeAndroid: InterruptionModeAndroid.DoNotMix, // Or DuckOthers
            shouldDuckAndroid: true, // Lower volume of other apps
            staysActiveInBackground: true, // Keep playing when app is backgrounded (requires background audio capability enabled in app.json/config)
            playThroughEarpieceAndroid: false
        });
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            // Consider unloading sound here ONLY if it's intended to stop when component unmounts completely
            // console.log('AudioPlayer unmounting, unloading sound...');
            // soundRef.current?.unloadAsync().catch(e => console.warn("Error unloading on unmount:", e));
            // soundRef.current = null;
        };
    }, []);

    // --- Playback Status Update (Keep logic, add mounted check) ---
     const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
        if (!isMountedRef.current) return; // Don't update state if unmounted

        if (!status.isLoaded) {
            if (status.error) {
                console.error(`Playback Error: ${status.error}`);
                 // Show shorter error in minimal mode
                const errorMessage = `Erro: ${status.error.substring(0, minimal ? 30 : 100)}...`;
                setError(errorMessage);
                setIsLoading(false);
                setIsPlaying(false);
                // Reset duration/position on error maybe?
                // setDurationMillis(undefined);
                // setPositionMillis(0);
            } else {
                // If simply unloaded (e.g., via unloadAsync)
                 // setError(null); // Clear error if unloaded cleanly
                 // Maybe reset state fully here? Depends on desired behavior when URL becomes null
                 // setIsPlaying(false);
                 // setPositionMillis(0);
                 // setDurationMillis(undefined);
            }
        } else {
            // Sound is loaded
            // Sound is loaded
            setError(null); // Clear error if loaded successfully

            if (!isSeeking) {
                setIsLoading(status.isBuffering); // Use isBuffering directly
                setPositionMillis(status.positionMillis);
            }
            setDurationMillis(status.durationMillis);
            setIsPlaying(status.isPlaying);

            if (status.didJustFinish && !status.isLooping) {
                setIsPlaying(false);
                // Optional: Seek to start? Better to let user replay explicitly.
                // soundRef.current?.setPositionAsync(0);
                // setPositionMillis(0);
            }
        }
    }, [isSeeking, minimal, durationMillis, isPlaying]); // Add minimal, durationMillis, isPlaying


    // --- Load/Unload Sound Effect (Keep robust logic) ---
    useEffect(() => {
         // Keep the isMountedRef.current = true; at the start
         isMountedRef.current = true;
        let currentSoundInstance: Audio.Sound | null = null; // To manage the instance within this effect run

        const loadSound = async () => {
             // 1. Unload Previous Sound
            const soundToUnload = soundRef.current;
            soundRef.current = null; // Clear ref immediately
             if (soundToUnload) {
                 console.log('Initiating unload of previous sound...');
                 // Reset state immediately for faster UI update
                 if (isMountedRef.current) {
                    setIsPlaying(false);
                    setPositionMillis(0);
                    setDurationMillis(undefined);
                    setIsLoading(false); // Ensure loading is false before potential new load
                    setError(null);
                 }
                 try {
                    await soundToUnload.unloadAsync();
                    console.log('Previous sound unloaded successfully.');
                 } catch (unloadError) {
                    console.warn('Error unloading previous sound:', unloadError);
                 }
            } else {
                // If no sound to unload, still ensure state is reset if sourceUrl was present before becoming null
                if (!sourceUrl && isMountedRef.current) {
                    setIsPlaying(false);
                    setPositionMillis(0);
                    setDurationMillis(undefined);
                    setIsLoading(false);
                    setError(null);
                }
            }


            // 2. Handle No Source
            if (!sourceUrl) {
                 console.log('No source URL provided, skipping load.');
                 // State should already be reset from unload step or initial state
                return;
            }

            // 3. Load New Sound
             if (isMountedRef.current) {
                 console.log(`Attempting to load sound from: ${sourceUrl}`);
                 setIsLoading(true); // Set loading true *before* createAsync
                 setError(null);
                 setPositionMillis(0); // Ensure position reset
                 setDurationMillis(undefined); // Ensure duration reset
             } else {
                 return; // Don't proceed if already unmounted
             }


            try {
                const initialStatus = {
                    shouldPlay: false, // Start paused
                    progressUpdateIntervalMillis: 500, // How often status updates
                    rate: playbackRate, // Apply initial rate
                    // volume: 1.0, // Default volume
                };
                console.log('Calling createAsync...');
                const { sound, status } = await Audio.Sound.createAsync(
                    { uri: sourceUrl },
                    initialStatus,
                    onPlaybackStatusUpdate // Attach listener
                );
                console.log('createAsync finished.');

                // 4. Update Ref and State (if still mounted)
                if (isMountedRef.current) {
                     console.log('New sound loaded successfully, updating ref.');
                    soundRef.current = sound;
                    currentSoundInstance = sound; // Track for cleanup

                    if (status.isLoaded) {
                        console.log('Initial status:', status);
                         setDurationMillis(status.durationMillis);
                         // Don't set position here, let initial status handle or keep at 0
                         setIsLoading(status.isBuffering); // Reflect initial buffering state
                         setIsPlaying(status.isPlaying); // Reflect initial playing state (should be false)
                    } else {
                        console.warn('createAsync success but status is not loaded?');
                        setError('Falha ao obter status inicial do áudio.');
                        setIsLoading(false);
                    }
                } else {
                    // Component unmounted *during* load
                    console.log('Component unmounted during load, unloading immediately.');
                    await sound.unloadAsync();
                }

            } catch (err: any) {
                console.error('Error in createAsync:', err);
                if (isMountedRef.current) {
                    setError(minimal ? 'Erro ao carregar' : 'Não foi possível carregar o áudio.');
                    setIsLoading(false);
                     soundRef.current = null; // Ensure ref is null on error
                }
            }
        };

        loadSound();

        // 5. Cleanup Function
        return () => {
            console.log('Running cleanup for load/unload effect...');
             isMountedRef.current = false; // Mark as unmounted first

            // Use the specific instance created *in this effect run* if available
            const soundToClean = currentSoundInstance || soundRef.current;
             soundRef.current = null; // Clear the main ref on cleanup regardless

             if (soundToClean) {
                 console.log('Unloading sound in cleanup...');
                 // Don't await here, just fire and forget in cleanup
                 soundToClean.unloadAsync().catch(e => console.warn("Error in effect cleanup unload:", e));
             }
        };
    // DEPENDENCIES: Re-run load/unload ONLY if the sourceUrl changes.
    // PlaybackRate change is handled by a separate effect.
    // onPlaybackStatusUpdate is memoized, shouldn't cause re-runs unless isSeeking/minimal change.
    }, [sourceUrl]); // Keep playbackRate and onPlaybackStatusUpdate OUT of dependencies here.


    // --- Effect to Update Playback Rate ---
    useEffect(() => {
        const currentSound = soundRef.current; // Capture ref
        if (currentSound) {
            console.log(`Setting playback rate to: ${playbackRate}`);
            currentSound.setRateAsync(playbackRate, true) // true for shouldCorrectPitch
                .catch(e => console.warn("Failed to set playback rate:", e));
        }
    // DEPENDENCY: Only run when playbackRate prop changes
    }, [playbackRate]);

    // --- Play/Pause Handler (Keep robust logic) ---
        // --- Refined Play/Pause Handler ---
        const handlePlayPause = async () => {
            // Capture the current sound reference immediately
            const currentSound = soundRef.current;
    
            // Check if the reference exists *before* doing anything else
            if (!currentSound) {
                console.warn("Play/Pause ignored: Sound reference is null.");
                return;
            }
    
            // Avoid action during initial loading (buffering after load is fine)
            // Check isLoading state *before* the async getStatusAsync call
            if (isLoading && !isPlaying) {
                 console.warn("Play/Pause ignored: Initial loading in progress.");
                 return;
            }
    
            try {
                 // Get the status directly from the captured reference
                 const status = await currentSound.getStatusAsync();
    
                 // Check if the sound associated with *this specific reference* is still loaded
                 if (!status.isLoaded) {
                     console.warn("Play/Pause ignored: Sound associated with ref is not loaded.");
                     // It might have been unloaded by a concurrent effect run
                     // Optionally reset state here or show an error
                     // setError("Áudio não está pronto. Tente novamente.");
                     // setIsPlaying(false); // Ensure UI reflects this
                     return;
                 }
    
                 // Now perform the action based on the reliable status
                 if (status.isPlaying) {
                     console.log('Pausing...');
                     await currentSound.pauseAsync();
                     // Let onPlaybackStatusUpdate handle setting isPlaying state
                 } else {
                     console.log('Playing...');
                     // Check if at the end and seek to start if necessary
                     if (status.positionMillis >= (status.durationMillis ?? 0) - 100) {
                        await currentSound.setPositionAsync(0);
                     }
                     await currentSound.playAsync();
                     // Let onPlaybackStatusUpdate handle setting isPlaying state
                 }
            } catch (err: any) {
                 console.error('Error during play/pause:', err.message, err);
    
                 // Check if the error is specifically "Player does not exist"
                 if (err.message?.includes('Player does not exist.') || err.message?.includes('Sound has not been prepared.')) { // Added another possible error string
                     console.warn('Caught "Player does not exist" or similar error. Sound likely unloaded unexpectedly.');
                     setError('Ocorreu um erro. Recarregue o áudio.');
                     // Reset state thoroughly
                     if (isMountedRef.current) {
                         setIsPlaying(false);
                         setPositionMillis(0);
                         // Optionally try to force clean the ref again
                         soundRef.current = null;
                     }
                 } else {
                     // Handle other potential errors
                     setError('Erro ao controlar a reprodução.');
                 }
            }
        };


    // --- Seek Handlers (Keep logic, add mounted check) ---
     const handleSeekStart = () => {
        if (!soundRef.current || !isMountedRef.current || !durationMillis) return;
        console.log('Seek start');
        setIsSeeking(true);
         // Optionally pause while seeking?
         // if (isPlaying) {
         //     soundRef.current?.pauseAsync();
         // }
    };

    const handleSeekComplete = async (value: number) => {
        if (!isMountedRef.current) { // Check mount state first
             setIsSeeking(false);
             return;
        }

        const currentSound = soundRef.current;
        const currentDuration = durationMillis; // Use state value

        if (!currentSound || currentDuration === undefined) {
             console.warn("Seek cancelled: No sound or duration.");
             setIsSeeking(false);
             return;
        }

        // Clamp value to valid range
        const newPosition = Math.min(Math.max(0, value), currentDuration);
        console.log(`Seek complete: value=${value}, newPosition=${newPosition}`);

        // Set seeking false *before* async call to allow status updates immediately
        setIsSeeking(false);
        // Optimistically update position for smoother UI
        setPositionMillis(newPosition);

        try {
            // Check status before seeking to ensure it's still loaded
            const status = await currentSound.getStatusAsync();
            if (!isMountedRef.current) return; // Check again after await

            if (!status.isLoaded) {
                console.warn("Seek cancelled: Sound unloaded before seek operation could complete.");
                // Reset state if unloaded?
                // setError(minimal ? 'Erro' : 'Áudio descarregado.');
                // setPositionMillis(0);
                return;
            }

            await currentSound.setPositionAsync(newPosition);
            console.log(`setPositionAsync(${newPosition}) completed.`);

            // Optional: Resume playing if paused during seek start
            // if (wasPlayingBeforeSeek && isMountedRef.current) { // Need to track 'wasPlayingBeforeSeek' state
            //     currentSound.playAsync();
            // }

        } catch (err: any) {
            console.error('Error seeking audio:', err);
             if (isMountedRef.current) setError(minimal ? 'Erro' : 'Erro ao buscar no áudio.');
             // No need to set seeking false here, already done
        }
    };


    // --- JSX Render ---
    return (
        // Adjust container style based on minimal prop
        <View style={[
                styles.playerContainer,
                minimal && styles.minimalPlayerLayout // Apply row layout style if minimal
            ]}>
                
            {/* --- Conditionally render error --- */}
            {error && !minimal && (
                <TextComponent size="small" style={styles.errorText}>{error}</TextComponent>
            )}

            {/* --- Slider (Always Visible) --- */}
            <Slider
                style={[
                    styles.slider,
                    minimal && styles.minimalSlider // Apply flex: 1 style if minimal
                ]}
                minimumValue={0}
                maximumValue={durationMillis ?? 1} // Use 1 as max if duration unknown
                value={positionMillis}
                minimumTrackTintColor={colors.colors.spaceBlue} // Use theme primary
                maximumTrackTintColor={colors.colors.spaceBlue} // Use theme border or secondary text
                thumbTintColor={colors.colors.spaceBlue} // Use theme primary dark
                onSlidingStart={handleSeekStart}
                onSlidingComplete={handleSeekComplete}
                 // Disable slider if duration is unknown OR if it's initially loading
                disabled={durationMillis === undefined || (isLoading && !isPlaying && positionMillis === 0)}
            />

            {/* --- Conditionally render time --- */}
            {!minimal && (
                <View style={styles.timeContainer}>
                    <TextComponent size="small">{formatTime(positionMillis)}</TextComponent>
                    <TextComponent size="small">{formatTime(durationMillis)}</TextComponent>
                </View>
            )}

            {/* --- Controls container (always includes play/pause) --- */}
            {/* Add justifyContent center for minimal mode */}
            <View style={[styles.controlsContainer, minimal && styles.minimalControlsContainer]}>
                <TouchableOpacity
                    style={[styles.playPauseButton, { backgroundColor: colors.cards.primary }]} // Use theme background
                    onPress={handlePlayPause}
                    // Disable button if sound isn't ready (no ref or initial loading) OR if there's an error?
                    disabled={!soundRef.current || (isLoading && !isPlaying && positionMillis === 0)}
                >
                    {/* Show loader only during initial load/buffer and not playing */}
                    {isLoading && !isPlaying && positionMillis === 0 ? (
                        <ActivityIndicator size="small" color={colors.colors.spaceBlue} />
                    ) : (
                        <Ionicons
                            name={isPlaying ? 'pause' : 'play'}
                            size={minimal ? 24 : 28} // Smaller icon in minimal mode
                            // Dim icon if disabled
                            color={!soundRef.current || (isLoading && !isPlaying && positionMillis === 0)
                                ? colors.colors.spaceBlue // Use theme disabled color
                                : colors.colors.spaceBlue // Use theme primary color
                            }
                        />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

// --- Styles ---
const getStyles = (colors: any) => StyleSheet.create({
    playerContainer: {
        paddingVertical: 5, // Reduced vertical padding
        alignItems: 'center',
        // Background applied inline in parent component
    },
     // --- NEW/MODIFIED Styles for Minimal Layout ---
     minimalPlayerLayout: {
        flexDirection: 'row', // Arrange items horizontally
        alignItems: 'center', // Vertically center slider and button
        paddingHorizontal: 10, // Add horizontal padding for the row
        paddingVertical: 8, // Adjust vertical padding for row layout
    },
    minimalSlider: {
        flex: 1, // Slider takes available space
        height: 40, // Ensure slider has touchable height
        width: undefined, // Remove fixed width if previously set
    },
    minimalControlsContainer: {
        width: 'auto', // Don't take full width
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 0, // Remove top margin
        marginLeft: 10,
    },
    // Style for minimal view adjustment
    minimalPlayerContainer: {
        paddingVertical: 5,
        // backgroundColor: 'rgba(240, 240, 240, 0.9)', // Example subtle background
    },
    errorText: {
        marginBottom: 5, // Reduced margin
        fontSize: 12,
        textAlign: 'center',
        color: colors.colors.amber, // Use theme error color
        paddingHorizontal: 10, // Add padding
    },
    slider: {
        width: '90%',
        height: 40, // Reduced height
        zIndex: 0,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '85%',
        marginTop: -8, // Pull times closer to slider
        marginBottom: 5, // Reduced margin
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // Center controls by default
        width: '100%',
        marginTop: 0, // Reduced margin if time is hidden
    },
     
    playPauseButton: {
        width: 45, // Smaller button
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 10, // Reduced margin
         // Add subtle shadow/elevation for depth
         // elevation: 2,
         // shadowColor: '#000',
         // shadowOffset: { width: 0, height: 1 },
         // shadowOpacity: 0.2,
         // shadowRadius: 1.41,
    },
    // Optional styles for skip buttons:
    controlButton: {
        padding: 10,
    },
});

export default AudioPlayer;