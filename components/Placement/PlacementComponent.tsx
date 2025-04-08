import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import BottomSheet, { BottomSheetFlatList, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { TextComponent } from '@/components/TextComponent';
import { db } from '@/config/firebase';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { useTheme } from '@/constants/useTheme';

interface PlacementComponentProps {
  studentID: string;
  onClose?: () => void;
}

interface Test {
  date: string;
  completed: boolean;
  totalScore: number;
  abilitiesCompleted: Record<string, boolean>;
  id: string;
  createdAt: number;
}

const TestDetailsContent: React.FC<{
  userId: string;
  testId: string;
  onBack: () => void;
}> = ({ userId, testId, onBack }) => {
  const [testInfo, setTestInfo] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<string>('fala');
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const styles = getStyles(colors);
  useEffect(() => {
    const fetchTestInfo = async () => {
      try {
        const placementRef = doc(db, 'users', userId, 'Placement', testId);
        const docSnap = await getDoc(placementRef);
        if (docSnap.exists()) {
          setTestInfo(docSnap.data());
        } else {
          console.log('No test info found');
        }
      } catch (err) {
        console.error('Error fetching test info:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTestInfo();
  }, [userId, testId]);

  const renderSectionContent = () => {
    if (!testInfo) return null;

    switch (selectedSection) {
      case 'fala':
        return (
          <View style={styles.section}>
            <TextComponent weight="bold" size="large" style={styles.sectionTitle}>🎤 Fala</TextComponent>
            {testInfo.speaking && testInfo.speaking.length > 0 ? (
              testInfo.speaking.map((item: any, index: number) => (
                <View key={index} style={styles.card}>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Texto {index + 1}: {item.question?.text}
                  </TextComponent>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Resposta: {item.answer || 'Não respondido'}
                  </TextComponent>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Pontuação: {item.score ?? 'N/A'}
                  </TextComponent>
                </View>
              ))
            ) : (
              <TextComponent weight="regular" size="small" style={styles.sectionText}>
                Nenhuma questão de fala respondida.
              </TextComponent>
            )}
          </View>
        );
      case 'vocabulário':
        return (
          <View style={styles.section}>
            <TextComponent weight="bold" size="large" style={styles.sectionTitle}>Vocabulário</TextComponent>
            {testInfo.vocabulary && testInfo.vocabulary.length > 0 ? (
              testInfo.vocabulary.map((item: any, index: number) => (
                <View key={index} style={styles.card}>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Texto {index + 1}: {item.question?.text}
                  </TextComponent>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Resposta: {item.answer || 'Não respondido'}
                  </TextComponent>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Pontuação: {item.score ?? 'N/A'}
                  </TextComponent>
                </View>
              ))
            ) : (
              <TextComponent weight="regular" size="small" style={styles.sectionText}>
                Nenhuma questão de vocabulário respondida.
              </TextComponent>
            )}
          </View>
        );
      case 'gramática':
        return (
          <View style={styles.section}>
            <TextComponent weight="bold" size="large" style={styles.sectionTitle}>Gramática</TextComponent>
            {testInfo.grammar && testInfo.grammar.length > 0 ? (
              testInfo.grammar.map((item: any, index: number) => (
                <View key={index} style={styles.card}>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Questão {index + 1}: {item.question?.text}
                  </TextComponent>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Resposta: {item.answer || 'Não respondido'}
                  </TextComponent>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Pontuação: {item.score ?? 'N/A'}
                  </TextComponent>
                </View>
              ))
            ) : (
              <TextComponent weight="regular" size="small" style={styles.sectionText}>
                Nenhuma questão de gramática respondida.
              </TextComponent>
            )}
          </View>
        );
      case 'leitura':
        return (
          <View style={styles.section}>
            <TextComponent weight="bold" size="large" style={styles.sectionTitle}>Leitura</TextComponent>
            {testInfo.reading && testInfo.reading.length > 0 ? (
              testInfo.reading.map((item: any, index: number) => (
                <View key={index} style={styles.card}>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Texto {index + 1}: {item.question?.text}
                  </TextComponent>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Resposta: {item.answer || 'Não respondido'}
                  </TextComponent>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Pontuação: {item.score ?? 'N/A'}
                  </TextComponent>
                </View>
              ))
            ) : (
              <TextComponent weight="regular" size="small" style={styles.sectionText}>
                Nenhuma questão de leitura respondida.
              </TextComponent>
            )}
          </View>
        );
      case 'escrita':
        return (
          <View style={styles.section}>
            <TextComponent weight="bold" size="large" style={styles.sectionTitle}>Escrita</TextComponent>
            {testInfo.writing && testInfo.writing.length > 0 ? (
              testInfo.writing.map((item: any, index: number) => (
                <View key={index} style={styles.card}>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Tarefa {index + 1}: {item.question?.text}
                  </TextComponent>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Resposta: {item.answer || 'Não respondido'}
                  </TextComponent>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Pontuação: {item.score ?? 'N/A'}
                  </TextComponent>
                </View>
              ))
            ) : (
              <TextComponent weight="regular" size="small" style={styles.sectionText}>
                Nenhuma questão de escrita respondida.
              </TextComponent>
            )}
          </View>
        );
      case 'ouvido':
        return (
          <View style={styles.section}>
            <TextComponent weight="bold" size="large" style={styles.sectionTitle}>Ouvido</TextComponent>
            {testInfo.listening && testInfo.listening.length > 0 ? (
              testInfo.listening.map((item: any, index: number) => (
                <View key={index} style={styles.card}>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Áudio {index + 1}: {item.question?.text}
                  </TextComponent>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Resposta: {item.answer || 'Não respondido'}
                  </TextComponent>
                  <TextComponent weight="regular" size="small" style={styles.cardText}>
                    Pontuação: {item.score ?? 'N/A'}
                  </TextComponent>
                </View>
              ))
            ) : (
              <TextComponent weight="regular" size="small" style={styles.sectionText}>
                Nenhuma questão de ouvido respondida.
              </TextComponent>
            )}
          </View>
        );
      case 'pontuação':
        return (
          <View style={styles.section}>
            <TextComponent weight="bold" size="large" style={styles.sectionTitle}>Pontuação</TextComponent>
            {testInfo.abilitiesScore ? (
              Object.entries(testInfo.abilitiesScore).map(
                ([ability, score]) => (
                  <TextComponent weight="regular" size="small" key={ability} style={styles.cardText}>
                    {ability}: {String(score)}
                  </TextComponent>
                )
              )
            ) : (
              <TextComponent weight="regular" size="small" style={styles.sectionText}>
                Nenhuma pontuação registrada.
              </TextComponent>
            )}
          </View>
        );
      case 'status':
        return (
          <View style={styles.section}>
            <TextComponent weight="bold" size="large" style={styles.sectionTitle}>Status</TextComponent>
            <TextComponent weight="regular" size="small" style={styles.sectionText}>
              {testInfo.completed ? 'Finalizado' : 'Em Progresso'}
            </TextComponent>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Cabeçalho com botão de voltar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.colors.amber} />
        </TouchableOpacity>
        <TextComponent weight="bold" size="large" style={styles.headerTitle}>Detalhes do Teste</TextComponent>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#000" />
      ) : (
        <ScrollView style={styles.content}>
          <View style={styles.sidebar}>
            {[
              'fala',
              'vocabulário',
              'gramática',
              'leitura',
              'escrita',
              'ouvido',
              'pontuação',
              'status',
            ].map((section) => (
              <TouchableOpacity
                key={section}
                onPress={() => setSelectedSection(section)}
                style={[
                  styles.sidebarItem,
                  selectedSection === section && styles.sidebarItemActive,
                ]}
              >
                <TextComponent
                  weight="bold"
                  size="small"
                  style={
                    selectedSection === section
                      ? styles.sidebarTextActive
                      : styles.sidebarText
                  }
                >
                  {section.charAt(0).toUpperCase() + section.slice(1)}
                </TextComponent>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.detailsContent}>{renderSectionContent()}</View>
        </ScrollView>
      )}
    </View>
  );
};

const PlacementComponent: React.FC<PlacementComponentProps> = ({
  studentID,
  onClose,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = ['50%', '80%', '100%'];
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<Test[]>([]);
  const [nivelamentoPermitido, setNivelamentoPermitido] = useState<boolean | null>(
    null
  );
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');

  const { colors } = useTheme();
  const styles = getStyles(colors);

  const notebookItemStyle = {
    ...styles.testItem,
    backgroundColor: colors.cards.secondary,
  };

  // Busca informações do usuário (para obter o NivelamentoPermitido)
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const profileRef = doc(db, 'users', studentID);
        const docSnap = await getDoc(profileRef);
        if (docSnap.exists()) {
          setNivelamentoPermitido(docSnap.data().NivelamentoPermitido);
        } else {
          console.log('No such document!');
        }
      } catch (error) {
        console.error('Error fetching document: ', error);
      }
    };
    fetchUserInfo();
  }, [studentID]);

  // Busca os dados dos testes
  useEffect(() => {
    const fetchUserTests = async () => {
      try {
        const testsRef = collection(db, 'users', studentID, 'Placement');
        const querySnapshot = await getDocs(testsRef);

        const fetchedTests = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          const totalScore = Object.values(data.abilitiesScore || {}).reduce(
            (acc: number, score: any) => acc + (Number(score) || 0),
            0
          );
          return {
            date: data.date,
            completed: Object.values(data.abilitiesCompleted || {}).every(
              (v) => v === true
            ),
            totalScore,
            abilitiesCompleted: data.abilitiesCompleted || {},
            id: doc.id,
            createdAt: data.createdAt?.seconds || 0,
          } as Test;
        });
        console.log('Fetched tests:', fetchedTests);
        setTests(fetchedTests.sort((a, b) => b.createdAt - a.createdAt));
      } catch (error) {
        console.error('Error fetching tests:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserTests();
  }, [studentID]);

  // Atualiza a flag NivelamentoPermitido
  const handleNivelamento = async () => {
    try {
      const userRef = doc(db, 'users', studentID);
      await setDoc(userRef, { NivelamentoPermitido: true }, { merge: true });
    } catch (error) {
      console.error('Error updating NivelamentoPermitido:', error);
    }
  };

  // Renderiza cada item da lista de testes
  const renderItem = ({ item }: { item: Test }) => {
    const isCurrentTest =
      !item.completed &&
      Object.values(item.abilitiesCompleted).some((v) => v === false);
    const formatDate = (dateString: string): string => {
      const parts = dateString.split('/').map((p) => p.trim());
      if (parts.length !== 3) return dateString;
      return `${parts[1]}/${parts[2]}`;
    };

    return (
      <TouchableOpacity
        style={notebookItemStyle}
          onPress={() => {
          setSelectedTestId(item.id);
          setViewMode('details');
        }}
      >
        <TextComponent weight="regular" size="small">
          {formatDate(item.date)}
        </TextComponent>
        <View style={styles.scoreContainer}>
          <TextComponent weight="regular" size="small">
            Pontuação: {item.totalScore.toFixed(1)}
          </TextComponent>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: item.completed
                ? colors.colors.teal
                : isCurrentTest
                ? 'yellow'
                : 'red',
            },
          ]}
        >
          <TextComponent weight="bold" size="small" color='white'>
            {item.completed
              ? 'Finalizado'
              : isCurrentTest
              ? 'Em Progresso'
              : 'Não Finalizado'}
          </TextComponent>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      index={0}
      enablePanDownToClose={true}
      onChange={(index) => {
        if (index === -1) onClose?.();
      }}
      handleIndicatorStyle={{ backgroundColor: colors.colors.amber, width: 65 }}
      backgroundStyle={{
        ...styles.bottomSheetShadow,
        backgroundColor: colors.bottomSheet.background
      }}
    >
      <BottomSheetView style={styles.container}>
        {viewMode === 'list' ? (
          <>
            <TextComponent weight="bold" size="large" color={colors.colors.amber} style={styles.title}> 
              Nivelamento
            </TextComponent>
            {loading ? (
              <ActivityIndicator size="large" color={colors.colors.amber} />
            ) : tests.length > 0 ? (
              <View>
                <BottomSheetFlatList
                  data={tests}
                  keyExtractor={(item) => item.id}
                  renderItem={renderItem}
                  contentContainerStyle={{
                    flexGrow: 1,
                    paddingBottom: 16,
                    backgroundColor: colors.background.list,
                  }}
                />
                <View style={styles.buttonContainer}>
                  {nivelamentoPermitido ? (
                    <TouchableOpacity
                      style={[styles.button, styles.warningButton]}
                    >
                      <TextComponent
                        weight="bold"
                        size="small"
                        style={styles.buttonText}
                      >
                        Aguardando Aluno Fazer Nivelamento
                      </TextComponent>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.button, styles.confirmButton]}
                      onPress={handleNivelamento}
                    >
                      <TextComponent
                        weight="bold"
                        size="small"
                        style={styles.buttonText}
                      >
                        Refazer Nivelamento do Aluno
                      </TextComponent>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <TextComponent
                style={{
                  color: 'white',
                  textAlign: 'center',
                  marginTop: 20,
                }}
              >
                Nenhum nivelamento encontrado.
              </TextComponent>
            )}
          </>
        ) : (
          selectedTestId && (
            <TestDetailsContent
              userId={studentID}
              testId={selectedTestId}
              onBack={() => {
                setViewMode('list');
                setSelectedTestId(null);
              }}
            />
          )
        )}
      </BottomSheetView>
    </BottomSheet>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
  },
  bottomSheetShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 35,
    borderRadius: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 22,
  },
  testItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    marginBottom: 8,
    borderRadius: 8,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  buttonContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  confirmButton: {
    backgroundColor: colors.colors.teal,
  },
  warningButton: {
    backgroundColor: colors.colors.amber,
  },
  buttonText: {
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    marginLeft: 16,
  },
  content: {
    flex: 1,
  },
  sidebar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    justifyContent: 'center',
  },
  sidebarItem: {
    padding: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: colors.background.list,
    borderRadius: 4,
  },
  sidebarItemActive: {
    backgroundColor: colors.colors.amber,
  },
  sidebarText: {
    color: colors.text.primary,
  },
  sidebarTextActive: {
    color: colors.text.secondary,
  },
  detailsContent: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 16,
  },
  card: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.background.list,
    marginBottom: 8,
  },
  cardText: {
    color: colors.text.primary,
  },
});

export default PlacementComponent;
