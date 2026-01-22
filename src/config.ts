// Configuration file for Simple Hands

export type DatasetMode = "alphabet" | "words" | "sequences";

type ModelConfig = {
  url: string;
  vocabulary: string[];
  enabled: boolean;
  labelsPath?: string;
  inputShape?: [number, number, number] | [number]; // Support both image and landmark input
  useLandmarks?: boolean; // Flag to indicate landmark-based model
  beginnerVocabulary?: string[];
};

type AppConfig = {
  translation: {
    enabled: boolean;
    apiEndpoint: string;
    apiKey: string;
    defaultSourceLanguage: string;
    defaultTargetLanguage: string;
  };
  models: Record<DatasetMode, ModelConfig>;
  training: {
    enabled: boolean;
    serverEndpoint: string;
    uploadEndpoint: string;
  };
  dataCollection: {
    maxRecordingSeconds: number;
    fps: number;
    exportFormat: "json" | "npz";
  };
  ui: {
    showConfidence: boolean;
    showHelp: boolean;
  };
};

// ASL Alphabet - 28 classes matching the trained model
// Model trained on: A-Z letters + Space character
const SIGN_LANGUAGE_ALPHABET = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "Space",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];

export const config: AppConfig = {
  translation: {
    enabled: true,
    // Using Google Gemini 2.5 Flash Lite - Optimized for speed and efficiency
    // Free tier: Higher rate limits, faster responses
    // Get your API key from https://aistudio.google.com/app/apikey
    apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
    apiKey: "AIzaSyCSZ3k6FJ73aV9c_65_gnYCDezxLRij9Cc",
    defaultSourceLanguage: "en",
    defaultTargetLanguage: "hi", // Default to Hindi
  },
  models: {
    alphabet: {
      enabled: true,
      url: `${import.meta.env.BASE_URL}models/alphabet_tfjs/model.json`,
      labelsPath: `${import.meta.env.BASE_URL}models/alphabet_tfjs/labels.json`,
      vocabulary: SIGN_LANGUAGE_ALPHABET,
      inputShape: [63], // Landmark-based: 21 landmarks × 3 coordinates
      useLandmarks: true, // Use landmark extraction instead of image preprocessing
    },
    words: {
      enabled: false,
      url: "/models/words/model.json",
      vocabulary: [],
    },
    sequences: {
      enabled: false,
      url: "/models/sequences/model.json",
      vocabulary: [],
    },
  },
  training: {
    enabled: false,
    serverEndpoint: "/api/train",
    uploadEndpoint: "/api/upload-dataset",
  },
  dataCollection: {
    maxRecordingSeconds: 10,
    fps: 30,
    exportFormat: "json",
  },
  ui: {
    showConfidence: true,
    showHelp: true,
  },
};

export const ENABLED_MODES: DatasetMode[] = (Object.entries(config.models) as [
  DatasetMode,
  ModelConfig,
][])
  .filter(([, model]) => model.enabled)
  .map(([mode]) => mode);
