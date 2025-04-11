import React, { useRef, useState, useEffect } from 'react';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { StyleSheet, View, Text, TouchableOpacity, Animated, Image } from 'react-native'; // Import Image from react-native
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { TextComponent } from '@/components/TextComponent';
import InputComponent from '@/components/InputComponent';
import Container from '@/components/ContainerComponent';
import ButtonComponent from '@/components/ButtonComponent';
import { useTheme } from '@/constants/useTheme';
const AnimatedImageBackground = Animated.createAnimatedComponent(View);
type LandingPageNavigationProp = StackNavigationProp<RootStackParamList, 'Landing'>;

interface LandingPageProps {
  navigation: LandingPageNavigationProp;
}

const Landing: React.FC<LandingPageProps> = ({ navigation }) => {
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(50)).current;
  const inputFadeAnim = useRef(new Animated.Value(0)).current;
  const inputTranslateAnim = useRef(new Animated.Value(50)).current;
  const buttonFadeAnim = useRef(new Animated.Value(1)).current;
  const buttonTranslateAnim = useRef(new Animated.Value(0)).current;
  const accountButtonFadeAnim = useRef(new Animated.Value(1)).current;
  const accountButtonTranslateAnim = useRef(new Animated.Value(0)).current;
  const expandButtonTranslateAnim = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const [snapIndex, setSnapIndex] = useState(0);

  const handleSheetChange = (index: number) => {
    setSnapIndex(index);
  };

  useEffect(() => {
    if (snapIndex !== 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(inputFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(inputTranslateAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(buttonFadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(buttonTranslateAnim, {
          toValue: 50,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(accountButtonFadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(accountButtonTranslateAnim, {
          toValue: 50,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(expandButtonTranslateAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: 50,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(inputFadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(inputTranslateAnim, {
          toValue: 50,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(buttonFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(buttonTranslateAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(accountButtonFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(accountButtonTranslateAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(expandButtonTranslateAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [snapIndex]);

  const handleExpand = () => {
    bottomSheetRef.current?.expand();
  };

  const handleSubmit = () => {
    console.log('Name:', name);
    console.log('Number:', number);
  };

  return (
    <Container>
      <AnimatedImageBackground style={styles.backgroundImage}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/brand/logo.png')} // Adjust the path based on your folder structure
            style={styles.logo}
            resizeMode="contain" // Optional: resize the image to fit within the specified dimensions
          />
        </View>

        <Animated.View
            style={{
                opacity: accountButtonFadeAnim,
                transform: [{ translateY: accountButtonTranslateAnim }],
            }}
         >
            <TouchableOpacity style={styles.buttonContainer} onPress={() => navigation.navigate('Login')}>
                <TextComponent weight='bold' size='large' style={[{color: colors.colors.white}]}>
                    Já tenho conta 😎
                </TextComponent>
            </TouchableOpacity>
        </Animated.View>

        <Animated.Text
            style={[
                styles.animatedText,
                {
                opacity: fadeAnim,
                transform: [{ translateY: translateAnim }],
                },
            ]}
            >
            <TextComponent weight='bold' size='xLarge' style={[styles.animatedText]}>
                Vem estudar com a gente!
            </TextComponent>
        </Animated.Text>

        <BottomSheet
          ref={bottomSheetRef}
          snapPoints={['20%', '55%']}
          enablePanDownToClose={false}
          index={0}
          handleIndicatorStyle={{
            backgroundColor: colors.colors.white,
            width: snapIndex === 0 ? 70 : 100,
            height: 7,
            borderRadius: 2.5,
            marginTop: 10,
          }}
          onChange={handleSheetChange}
          backgroundStyle={{
            backgroundColor: colors.bottomSheet.background,
          }}
        >
          <BottomSheetView style={styles.bottomSheetContent}>
            {snapIndex === 0 ? (
              <Animated.View
                style={{
                  opacity: buttonFadeAnim,
                  transform: [{ translateY: expandButtonTranslateAnim }],
                }}
              >
                <TouchableOpacity onPress={handleExpand}>
                  <TextComponent weight='bold' size='large' style={[styles.expandButtonText, {color: 'white'}]}>Ainda não sou aluno 😔</TextComponent>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <Animated.View
                style={[
                  styles.formContainer,
                  {
                    opacity: inputFadeAnim,
                    transform: [{ translateY: inputTranslateAnim }],
                  },
                ]}
              >
                <InputComponent
                  placeholder="Seu nome"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="gray"
                />
                <InputComponent
                  placeholder="Seu número"
                  value={number}
                  onChangeText={setNumber}
                  keyboardType="phone-pad"
                  placeholderTextColor="gray"
                />
                <ButtonComponent 
                    color='indigo'
                    onPress={handleSubmit}
                    title='Agendar uma aula grátis'
                />
                <TextComponent
                  weight='bold'
                  style={{
                    color: colors.text.secondary,
                    fontSize: 15,
                    position: 'absolute',
                    bottom: 5,
                  }}
                >
                  Como funciona a FluencyLab?
                </TextComponent>
              </Animated.View>
            )}
          </BottomSheetView>
        </BottomSheet>
      </AnimatedImageBackground>
    </Container>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    paddingTop: 40, 
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 250, // Adjust the width and height to your needs
    height: 100,
  },
  buttonContainer: {
    top: 150,
    alignSelf: 'center',
    textAlign: 'center',
    backgroundColor: colors.bottomSheet.background,
    borderRadius: 26,
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  animatedText: {
    width: '80%',
    textAlign: 'center',
    alignSelf: 'center',
    top: 80
  },
  bottomSheetContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButtonText: {
    paddingBottom: 350,
  },
  formContainer: {
    width: '75%',
    alignItems: 'center',
    paddingBottom: 100,
    gap: 2
  },
});

export default Landing;
