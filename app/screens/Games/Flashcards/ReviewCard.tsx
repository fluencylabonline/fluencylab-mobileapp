import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { db } from '@/config/firebase'; // Make sure this path is correct
import { collection, doc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { TextComponent } from '@/components/TextComponent';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/constants/useTheme';
import Loading from '@/components/Animation/Loading';
import Container from '@/components/ContainerComponent';
import { Easing } from 'react-native-reanimated';

interface Card {
    id: string;
    front: string;
    back: string;
    interval: number;
    easeFactor: number;
    reviewCount: number;
    dueDate: string; // Add dueDate to the interface
}

interface ReviewCardProps {
    closeModalGame: () => void; // Accept the closeModal function as a prop
    selectedDeck: string;    // Accept the selectedDeck as a prop
  }
  
  const ReviewCard: React.FC<ReviewCardProps> = ({ closeModalGame, selectedDeck }) => {
    const { colors, isDark } = useTheme();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const auth = getAuth();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    const [cards, setCards] = useState<Card[]>([]);
    const [currentCard, setCurrentCard] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true); // Add loading state

    const flipAnim = useState(new Animated.Value(0))[0]; // Set up the animated value for the flip
    const progressAnim = useState(new Animated.Value(0))[0]; // Animated value for progress bar
    
    useEffect(() => {
        const progress = ((currentCard + 1) / cards.length) * 100;
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300, // You can tweak this duration
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false, // Width cannot be animated with native driver
        }).start();
    }, [currentCard, cards.length]);
    
    useEffect(() => {
        if (!currentUser) return;

        const fetchCards = async () => {
            setLoading(true);
            try {
                const today = new Date();
                today.setHours(23, 59, 59, 999); // Set to end of the day
        
                const cardsQuery = query(
                    collection(db, 'users', currentUser.uid, 'Decks', selectedDeck, 'cards'),
                    where('dueDate', '<=', today.toISOString()), // Include overdue and today's cards
                    orderBy('dueDate', 'asc') // Optional: Sort by earliest due date
                );
        
                const cardsSnapshot = await getDocs(cardsQuery);
                const cardsData = cardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Card));
                setCards(cardsData);
            } catch (error) {
                console.error('Error fetching cards:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchCards();
    }, [selectedDeck, currentUser]);

    const reviewCard = async (cardId: string, rating: 'easy' | 'medium' | 'hard') => {
        const card = cards.find(c => c.id === cardId);
        if (!card) return;

        let { interval, easeFactor, reviewCount } = card;
        const now = new Date();

        switch (rating) {
            case 'easy':
                easeFactor += 0.15; // Increased ease factor increment
                interval = Math.round(interval * easeFactor); // Round to nearest day
                break;
            case 'medium':
                interval = Math.round(interval * 1); // Round to nearest day
                break;
            case 'hard':
                easeFactor = Math.max(1.3, easeFactor - 0.2); // Minimum ease factor of 1.3
                interval = Math.max(1, Math.round(interval / 2)); // Round to nearest day
                break;
        }
        
        reviewCount += 1;
        const dueDate = new Date(now.setDate(now.getDate() + interval)).toISOString();

        try {
            const cardRef = doc(db, 'users', currentUser.uid, 'Decks', selectedDeck, 'cards', cardId);
            await updateDoc(cardRef, { interval, easeFactor, reviewCount, dueDate });

            // Update local state for immediate UI update
            setCards(prevCards => prevCards.filter(c => c.id !== cardId));
            if (cards.length === 1) {
                setCurrentCard(0)
            }
            // If the current card was the last one, reset currentCard
            if (currentCard >= cards.length -1) {
                setCurrentCard(0)
            }
        } catch (error) {
            console.error('Error reviewing card:', error);
        }

        setIsFlipped(false);
    };

    const handleNextCard = () => {
        setCurrentCard(prevCard => (prevCard + 1) % cards.length);
        setIsFlipped(false);
    };

    if (loading) {
        return <Loading />;
    }

    if (cards.length === 0) {
        return (
            <Container style={[styles.container]}>
                <TextComponent weight="bold" size="large">
                    Sem cartões para revisar
                </TextComponent>
            </Container>
        );
    }

    const currentCardData = cards[currentCard];
    const cardsRemaining = cards.length - (currentCard + 1);

    const flipCard = () => {
        Animated.spring(flipAnim, {
            toValue: isFlipped ? 0 : 180,
            friction: 8,
            tension: 10,
            useNativeDriver: true,
        }).start();
        setIsFlipped(!isFlipped);
    };    

    // Interpolating the rotation
    const rotateY = flipAnim.interpolate({
        inputRange: [0, 180],
        outputRange: ['0deg', '180deg'],
    });

    // Adding scaleX transform to reverse the back text when flipped
    const scaleX = flipAnim.interpolate({
        inputRange: [0, 180],
        outputRange: [1, -1], // Flip back text horizontally
    });

    return (
        <Container style={[styles.container]}>
            <View style={styles.headerContainer}>
                <TextComponent weight="bold" size="large" style={[styles.headerTitle, { color: Colors.amber.default }]}>
                    {selectedDeck}
                </TextComponent>
            </View>
            <TouchableOpacity style={styles.headerButton} onPress={closeModalGame}>
                <Ionicons size={30} name='close-outline' color={colors.text}/>
            </TouchableOpacity>

            <View style={[styles.progressBar, { backgroundColor: colors.cardBackgroundSecodary }]}>
                <View style={[styles.progress, { backgroundColor: Colors.amber.default }]} />
                <TextComponent weight="bold" size="small" style={styles.progressText}>
                    {currentCard + 1} / {cards.length} cartões
                </TextComponent>
            </View>
            
            <View style={styles.cardStack}>
                {cardsRemaining > 1 && (
                    <View style={[styles.card, styles.cardBehind, { zIndex: 0, top: 10, left: 5, backgroundColor: colors.cardBackgroundBottomSheet }]} />
                )}
                {cardsRemaining > 0 && (
                    <View style={[styles.card, styles.cardBehind, { zIndex: 1, backgroundColor: colors.cardBackground }]} />
                )}
                <TouchableOpacity activeOpacity={1} onPress={flipCard} style={{ zIndex: 2 }}>
                    <Animated.View style={[styles.card, { transform: [{ rotateY }, { scaleX }], backgroundColor: Colors.amber.default }]}>
                        <TextComponent weight="bold" size="large" style={styles.cardText}>
                            {isFlipped ? currentCardData.back : currentCardData.front}
                        </TextComponent>
                    </Animated.View>
                </TouchableOpacity>
            </View>

            {isFlipped && (
                <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                        onPress={() => reviewCard(currentCardData.id, 'easy')} 
                        style={[styles.buttonStyle, { borderTopLeftRadius: 12, borderBottomLeftRadius: 12, paddingHorizontal: 20, backgroundColor: Colors.teal.default }]}
                    >
                        <TextComponent weight="bold" size="medium" style={styles.textButtonStyle}>
                            Fácil
                        </TextComponent>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => reviewCard(currentCardData.id, 'medium')} 
                        style={[styles.buttonStyle, { paddingHorizontal: 20, backgroundColor: Colors.amber.default }]}
                    >
                        <TextComponent weight="bold" size="medium" style={styles.textButtonStyle}>
                            Médio
                        </TextComponent>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => reviewCard(currentCardData.id, 'hard')} 
                        style={[styles.buttonStyle, { borderTopRightRadius: 12, borderBottomRightRadius: 12, paddingHorizontal: 20, backgroundColor: Colors.deepOrange.default }]}
                    >
                        <TextComponent weight="bold" size="medium" style={styles.textButtonStyle}>
                            Difícil
                        </TextComponent>
                    </TouchableOpacity>       
                </View>
            )}

            {!isFlipped && cards.length > 1 && (
                <TouchableOpacity 
                    onPress={handleNextCard} 
                    style={[styles.buttonStyle, { borderRadius: 12, paddingHorizontal: 30, backgroundColor: Colors.amber.default }]}
                >
                    <TextComponent weight="bold" size="medium" style={styles.textButtonStyle}>
                        Pular <Ionicons style={{paddingTop: 5}} name='arrow-forward-outline' />
                    </TextComponent>
                </TouchableOpacity>  
            )}
        </Container>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        gap: 20
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingTop: 10, 
        position: 'absolute',
        top: 10,
        left: 10,
    },
    headerButton: {
        position: 'absolute',
        top: 5,
        right: 5
    },
    headerTitle: {
        marginLeft: 10,
        textAlign: 'center'
    },
    progressBar: {
        width: '90%',
        height: 20,
        borderRadius: 10,
        marginTop: 20,
        marginBottom: 20,
        overflow: 'hidden',
        position: 'relative'
    },
    progress: {
        height: '100%',
        borderRadius: 10,
    },
    progressText: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        textAlign: 'center',
        lineHeight: 20,
        color: 'white',
    },
    cardStack: {
        width: 300,
        height: 500,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    cardBehind: {
        position: 'absolute',
        width: 290,
        height: 480,
        borderRadius: 8,
        top: 5,
        left: 5,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    card: {
        width: 300,
        height: 500,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        marginVertical: 20,
    },
    cardText: {
        color: 'white',
        marginHorizontal: 18,
        textAlign: 'center'
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '50%',
        gap: 2,
        marginTop: 5
    },
    buttonStyle: {
        padding: 14,
    },
    textButtonStyle: {
        color: 'white',
    }
});

export default ReviewCard;