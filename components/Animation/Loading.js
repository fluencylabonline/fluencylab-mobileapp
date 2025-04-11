import React from 'react';
import { StyleSheet } from 'react-native';
import Lottie from 'lottie-react-native';
import Container from '../ContainerComponent';

const LoadingScreen = () => {

  return (
    <Container style={styles.container}>
      <Lottie
        source={require('../../assets/animations/animation.json')} // Load the local file
        autoPlay={true}
        loop={true}
        style={styles.animation}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: 300,
    height: 300,
  },
});

export default LoadingScreen;