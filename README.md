# Sign Language Translator

A privacy-first React/Vite app that performs real-time ASL alphabet recognition entirely in the browser using TensorFlow.js and MediaPipe Hands. All video processing happens locally—hand landmarks are extracted and classified on-device with **98.81% accuracy**.

## ✅ Status: Production Ready

The application uses a landmark-based neural network trained on 151,479 ASL hand gesture samples with 28 classes (A-Z + Space). The model achieves 98.81% validation accuracy and runs at 30+ FPS on modern browsers.

## 🌟 Features

- **Real-time Detection**: Live ASL alphabet recognition using TensorFlow.js + MediaPipe
- **Privacy-First**: All processing happens in the browser—no data sent to servers
- **High Accuracy**: 98.81% validation accuracy on ASL alphabet
- **Lightweight**: Only 238 KB model size, runs smoothly on most devices
- **Accessibility Helpers**: Speech synthesis, translation, clipboard copy, and in-app help
- **On-Device Processing**: Hand landmarks extracted and classified locally
- **Data Recorder**: Export training data for model improvements

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Modern web browser with webcam support
- (Optional) GPU for faster inference

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The dev server runs at `http://localhost:8080` by default.

### Building for Production

```bash
npm run build
npm run preview
```

## 🛠️ Configuration

### Model Setup

The production model is already configured in `public/models/alphabet_tfjs/`:
- `model.json` — Model architecture and weights manifest (1 KB)
- `group1-shard1of1.bin` — Model weights (237 KB)
- `labels.json` — 28 class labels (A-Z + Space)

**Model Specifications**:
- **Input**: 63 features (21 MediaPipe hand landmarks × 3 coordinates, wrist-centered)
- **Output**: 28 class probabilities
- **Architecture**: Sequential MLP with 4 dense layers
- **Size**: ~238 KB (lightweight and fast)

Configuration in `src/config.ts`:

```typescript
models: {
  alphabet: {
    enabled: true,
    url: `${import.meta.env.BASE_URL}models/alphabet_tfjs/model.json`,
    labelsPath: `${import.meta.env.BASE_URL}models/alphabet_tfjs/labels.json`,
    inputShape: [63], // Landmark-based input
    useLandmarks: true, // Use MediaPipe landmark extraction
  }
}
```

### Translation API (Optional)

```typescript
translation: {
  enabled: true,
  apiEndpoint: "https://libretranslate.com/translate",
  apiKey: "", // Add your API key
  defaultSourceLanguage: "en",
  defaultTargetLanguage: "es",
}
```

## 🧠 Model Integration

### How It Works

The app uses a landmark-based approach for ASL recognition:

1. **Hand Detection**: MediaPipe Hands detects hand in webcam frame
2. **Landmark Extraction**: Extract 21 hand landmarks (x, y, z coordinates)
3. **Wrist Centering**: Normalize by subtracting wrist position from all landmarks
4. **Classification**: Feed 63-feature vector to TensorFlow.js model
5. **Prediction**: Display highest-confidence class (if confidence > 50%)

### Preprocessing Pipeline

The app uses **landmark-based preprocessing** (not image-based):

```javascript
// 1. Detect hands using MediaPipe
const hands = await detector.estimateHands(video);

// 2. Extract wrist position (landmark 0)
const wrist = hands[0].keypoints[0];

// 3. Create wrist-centered feature vector (63 values)
const landmarks = new Float32Array(63);
for (let i = 0; i < 21; i++) {
  const kp = hands[0].keypoints[i];
  landmarks[i * 3] = kp.x - wrist.x;
  landmarks[i * 3 + 1] = kp.y - wrist.y;
  landmarks[i * 3 + 2] = (kp.z || 0) - (wrist.z || 0);
}

// 4. Create tensor and predict
const inputTensor = tf.tensor2d(landmarks, [1, 63]);
const prediction = model.predict(inputTensor);
```

See `src/components/LiveDemo.tsx` for the full implementation.

### Training a New Model

To retrain or improve the model:

1. **Open Training Notebook**: `training_setup/sign_language_colab.ipynb`
2. **Upload to Google Colab**: Requires Kaggle API for dataset access
3. **Configure Output**: Save to Google Drive (`asl_model_output/`)
4. **Run Training**: Takes ~30-60 minutes on GPU
5. **Deploy Model**: Copy `tfjs_model/` contents to `public/models/alphabet_tfjs/`

See `training_setup/README.md` for detailed instructions.

## 📁 Project Structure

```
sign-language-translator/
├── src/
│   ├── components/
│   │   ├── LiveDemo.tsx           # Main detection interface
│   │   ├── DataRecorder.tsx       # Data collection tool
│   │   ├── TranslatorDialog.tsx   # Translation feature
│   │   ├── HelpDialog.tsx         # User guidance
│   │   └── ui/                    # Reusable UI components
│   ├── pages/
│   │   ├── Index.tsx              # Home page
│   │   ├── Vocabulary.tsx         # Practice mode
│   │   └── NotFound.tsx
│   ├── config.ts                  # App configuration
│   └── main.tsx
├── public/
│   └── models/
│       └── alphabet_tfjs/         # Your trained model
├── training_setup/                # Training notebooks and scripts
└── README.md
```

## 🎓 Training Your Own Model

See `training_setup/` for:
- Dataset preparation notebooks
- Model architecture examples
- Training scripts
- Conversion utilities

## 🐛 Troubleshooting

### Camera Issues
- Ensure HTTPS (required for camera access)
- Check browser permissions
- Try desktop Chrome for best compatibility

### Model Loading Errors
- Verify all model files are in `public/models/alphabet_tfjs/`
- Check console for specific error messages
- Ensure `labels.json` class count matches model output

### Poor Detection
- Improve lighting conditions
- Keep hand centered in frame
- Ensure clear background contrast
- Collect more training data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License

## 🙏 Acknowledgments

- TensorFlow.js team for browser ML capabilities
- Sign language community for datasets and feedback

---

Built for accessibility and learning
