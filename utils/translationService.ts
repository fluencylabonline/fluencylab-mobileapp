// src/utils/translationService.ts
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

// You would typically store API keys in environment variables.
// For demonstration purposes, we're using placeholders.
const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY as string;
const modelName = process.env.EXPO_PUBLIC_GEMINI_MODEL_NAME as string;

export const translateText = async (text: string): Promise<string> => {
  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const generationConfig = {
      temperature: 0.1, // Lower temperature for more deterministic translations
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    };

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    const chat = await model.startChat({
      generationConfig,
      safetySettings,
    });

    // Use a single instruction that directs Gemini to translate:
    // "Translate to Portuguese if the text is in English, or translate to English if the text is in Portuguese."
    const instructionPrompt = `Translate the following text to Portuguese if it is in English, or translate it to English if it is in Portuguese. Return only the translation without explanations or notes: "${text}"`;

    const result = await chat.sendMessage(instructionPrompt);
    const response = result.response.text();

    // Clean up any quotation marks that might have been included in the response
    return response.replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Failed to translate text');
  }
};
