import { View, Text } from "react-native";

interface AnagramProps {
    gameID: string;
    vocabularyData: any[];
    isSinglePlayer: boolean;
}

export default function Anagram({ gameID, vocabularyData, isSinglePlayer }: AnagramProps) {

    return (
        <View>
            <Text>Anagram</Text>
        </View>
    )
}   
