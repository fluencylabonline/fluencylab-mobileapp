import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from "react-native";
import Container from "@/components/ContainerComponent";
import { Colors } from "@/constants/Colors";
import TopBarComponent from "@/components/TopBarComponent";
import { useTheme } from "@/constants/useTheme";
import { useRouter } from "expo-router";

type GamesItems = {
  title: string;
  backgroundImage?: any;
  path: any;
};

const ITEM_HEIGHT = 235;

export default function Practice() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<React.ReactNode | null>(
    null
  );

  const data: GamesItems[] = [
    {
      title: "Wordle",
      backgroundImage: require("../../assets/games/wordle.png"),
      path: "/screens/Games/Wordle/Wordle",
    },
    {
      title: "Flashcards",
      backgroundImage: require("../../assets/games/flashcards.png"),
      path: "/screens/Games/Flashcards/Flashcards",
    },
    {
      title: "Listening",
      backgroundImage: require("../../assets/games/listening.png"),
      path: "/screens/Games/Listening/Listening",
    },
    {
      title: "TicTacToe",
      backgroundImage: require("../../assets/games/tictactoe.png"),
      path: "/screens/Games/TicTacToe/TicTacToe",
    },
    {
      title: "Speaking",
      backgroundImage: require("../../assets/games/speaking.png"),
      path: "/screens/Games/Speaking/Speaking",
    },
    {
      title: "Guessly",
      backgroundImage: require("../../assets/games/guessly.png"),
      path: "/screens/Games/Guessly/Guessly",
    },
    {
      title: "Vocabulary",
      backgroundImage: require("../../assets/games/vocabulary.png"),
      path: "/screens/Games/Vocabulary/Vocabulary",
    },
    {
      title: "Quiz",
      backgroundImage: require("../../assets/games/quiz.png"),
      path: "/screens/Games/Quiz/Quiz",
    },
    {
      title: "Who Am I?",
      backgroundImage: require("../../assets/games/whatami.png"),
      path: "/screens/Games/Whatami/Whatami",
    },
  ];

  // Animated scroll value
  const scrollY = useRef(new Animated.Value(0)).current;

  return (
    <Container>
      <TopBarComponent title="Prática" />
      <View style={{ flex: 1 }}>
        <Animated.FlatList
          data={data}
          keyExtractor={(_, index) => index.toString()}
          numColumns={1}
          contentContainerStyle={styles.gamesContainer}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.gameContainer,
                {
                  backgroundColor: isDark
                    ? Colors.background.dark
                    : Colors.background.light,
                },
              ]}
              onPress={() => router.push(item.path)}
              activeOpacity={0.8}
            >
              {item.backgroundImage && (
                <Image source={item.backgroundImage} style={styles.image} />
              )}
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
        />
        {/* Vertical dots indicator */}
        <View style={styles.dotsContainer}>
          {data.map((_, index) => {
            // Calculate the position of each item in the list.
            const inputRange = [
              (index - 1) * ITEM_HEIGHT,
              index * ITEM_HEIGHT,
              (index + 1) * ITEM_HEIGHT,
            ];
            const scale = scrollY.interpolate({
              inputRange,
              outputRange: [1, 1.5, 1],
              extrapolate: "clamp",
            });
            const opacity = scrollY.interpolate({
              inputRange,
              outputRange: [0.5, 1, 0.5],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={index}
                style={[styles.dot, { transform: [{ scale }], opacity }]}
              />
            );
          })}
        </View>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  gamesContainer: {
    paddingBottom: 40,
    gap: 18,
  },
  modalContent: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  gameContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginLeft: 42,
    marginRight: 10,
    height: 215,
    width: 335,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundSize: "cover",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Dots indicator styles
  dotsContainer: {
    position: "absolute",
    left: 16,
    top: "50%",
    transform: [{ translateY: -50 }],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.indigo.default,
    marginVertical: 4,
  },
});
