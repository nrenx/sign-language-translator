// Configuration file for Simple Hands
// Replace these values with your actual API endpoints and model URLs

export const config = {
  // Translation API configuration
  translation: {
    enabled: true,
    // Example: LibreTranslate API endpoint (replace with your own or use a different service)
    apiEndpoint: "https://libretranslate.com/translate",
    apiKey: "", // Add your API key if required
    defaultSourceLanguage: "en",
    defaultTargetLanguage: "es",
  },

  // Model URLs for each dataset mode
  // Replace these placeholder URLs with your actual TensorFlow.js model paths
  models: {
    alphabet: {
      url: "/models/alphabet/model.json", // Placeholder - replace with actual model
      vocabulary: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
      windowSize: 10, // Number of frames to consider for prediction
    },
    words: {
      url: "/models/words/model.json", // Placeholder - replace with actual model
      vocabulary: [
        "hello",
        "goodbye",
        "please",
        "thanks",
        "yes",
        "no",
        "help",
        "sorry",
        "good",
        "bad",
      ],
      windowSize: 30, // Larger window for dynamic words
      // Optional: subset for beginner mode
      beginnerVocabulary: ["hello", "goodbye", "please", "thanks", "yes"],
    },
    sequences: {
      url: "/models/sequences/model.json", // Placeholder - replace with actual model
      vocabulary: [
        "hello how are you",
        "nice to meet you",
        "see you later",
        "have a good day",
        "what is your name",
      ],
      windowSize: 60, // Longest window for phrase sequences
    },
  },

  // MediaPipe configuration
  mediapipe: {
    enabled: true,
    // MediaPipe will be loaded from CDN
    modelComplexity: 1, // 0 = lite, 1 = full (default)
    maxNumHands: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  },

  // Inference settings
  inference: {
    smoothingWindow: 5, // Number of predictions to smooth over
    confidenceThreshold: 0.6, // Minimum confidence to display prediction
    debounceMs: 500, // Milliseconds to wait before updating prediction
  },

  // Server-side training (disabled by default)
  training: {
    enabled: false, // Set to true to enable server-side training endpoints
    serverEndpoint: "/api/train", // Placeholder for future backend
    uploadEndpoint: "/api/upload-dataset", // Placeholder for dataset uploads
  },

  // Data collection settings
  dataCollection: {
    maxRecordingSeconds: 10,
    fps: 30, // Target frames per second for recording
    exportFormat: "json", // 'json' or 'npz'
  },

  // UI settings
  ui: {
    showConfidence: true, // Display confidence scores
    showLandmarks: true, // Show hand skeleton overlay
    showHelp: true, // Show help button
  },
};

export type DatasetMode = "alphabet" | "words" | "sequences";
