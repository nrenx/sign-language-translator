# Simple Hands — Child-Friendly Hand Gesture Recognition

A minimal, accessible website for real-time hand-gesture recognition. Built for children and learners to easily practice sign language alphabet, words, and phrases using webcam detection.

## 🌟 Features

- **Three Dataset Modes:**
  - **Alphabet (A-Z)**: Static letter gestures
  - **Words**: Common word gestures with adjustable vocabulary
  - **Full Sequences**: Dynamic phrase detection (advanced)

- **Real-Time Detection:**
  - Client-side hand landmark extraction using MediaPipe
  - Live prediction display with confidence scores
  - Visual hand skeleton overlay on webcam feed

- **Accessibility Tools:**
  - Text-to-Speech (Web Speech API)
  - Translation to 10+ languages
  - Copy to clipboard functionality

- **Data Collection:**
  - Record labeled gesture samples
  - Export datasets for offline training
  - Prepare for future model training

- **Privacy-First:**
  - All processing happens in your browser
  - No video data sent to servers
  - Only hand landmarks are processed

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Modern web browser with webcam support
- (Optional) GPU for faster inference

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd simple-hands

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:8080`

### Building for Production

```bash
npm run build
npm run preview
```

## 🛠️ Configuration

Edit `src/config.ts` to customize:

### Translation API

```typescript
translation: {
  enabled: true,
  apiEndpoint: "https://libretranslate.com/translate",
  apiKey: "", // Add your API key
  defaultSourceLanguage: "en",
  defaultTargetLanguage: "es",
}
```

### Model URLs

Replace placeholder model URLs with your trained TensorFlow.js models:

```typescript
models: {
  alphabet: {
    url: "/models/alphabet/model.json", // Your model path
    vocabulary: ["A", "B", "C", ...],
    windowSize: 10,
  },
  // Similar for 'words' and 'sequences'
}
```

### MediaPipe Settings

```typescript
mediapipe: {
  enabled: true,
  modelComplexity: 1, // 0 = lite, 1 = full
  maxNumHands: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
}
```

## 🧠 Integrating Machine Learning

### Option 1: MediaPipe Hands (Recommended for MVP)

1. Install MediaPipe:
```bash
npm install @mediapipe/hands @mediapipe/camera_utils
```

2. Add to your component:
```typescript
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

// Initialize MediaPipe
const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  },
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

hands.onResults((results) => {
  // Process hand landmarks
  if (results.multiHandLandmarks) {
    const landmarks = results.multiHandLandmarks[0];
    // Send landmarks to your model for classification
  }
});
```

### Option 2: TensorFlow.js Hand Pose

1. Install TensorFlow.js:
```bash
npm install @tensorflow/tfjs @tensorflow-models/hand-pose-detection
```

2. Load and use:
```typescript
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/hand-pose-detection';

const model = await handpose.createDetector(
  handpose.SupportedModels.MediaPipeHands
);

const hands = await model.estimateHands(videoElement);
```

### Custom Model Integration

1. **Train your model** (Python/TensorFlow):
```python
# Example training script structure
import tensorflow as tf

# Load your dataset
# Define model architecture
model = tf.keras.Sequential([...])

# Train
model.fit(X_train, y_train, epochs=50)

# Convert to TensorFlow.js
import tensorflowjs as tfjs
tfjs.converters.save_keras_model(model, 'models/alphabet')
```

2. **Load in browser**:
```typescript
import * as tf from '@tensorflow/tfjs';

const model = await tf.loadLayersModel('/models/alphabet/model.json');

// Predict
const prediction = model.predict(landmarksTensor);
```

## 📊 Recommended Datasets

- **Sign Language MNIST**: Static letter gestures
  - [Kaggle: Sign Language MNIST](https://www.kaggle.com/datamunge/sign-language-mnist)

- **ASL Alphabet**: American Sign Language alphabet
  - [Kaggle: ASL Alphabet](https://www.kaggle.com/grassknoted/asl-alphabet)

- **HaGRID**: Hand Gesture Recognition Image Dataset
  - [GitHub: HaGRID](https://github.com/hukenovs/hagrid)

- **MS-ASL**: Microsoft American Sign Language (video sequences)
  - [MS-ASL Dataset](https://www.microsoft.com/en-us/research/project/ms-asl/)

- **EgoHands**: Egocentric hand detection
  - [EgoHands Dataset](http://vision.soic.indiana.edu/projects/egohands/)

## 🎓 Training Your Own Models

### Step 1: Collect Data

1. Use the "Data & Train" tab in the app
2. Record samples for each gesture
3. Export as JSON

### Step 2: Train Offline

```bash
# Example training script (create your own)
python train.py --dataset exported-data.json --mode alphabet
```

### Step 3: Convert to TensorFlow.js

```bash
tensorflowjs_converter \
  --input_format=keras \
  saved_model.h5 \
  models/alphabet/
```

### Step 4: Update Config

Update `src/config.ts` with your new model URL:
```typescript
models: {
  alphabet: {
    url: "/models/alphabet/model.json",
  }
}
```

## 🔧 Advanced Configuration

### Enable Server-Side Training (Optional)

1. Create backend API endpoints
2. Update `src/config.ts`:
```typescript
training: {
  enabled: true,
  serverEndpoint: "https://your-api.com/train",
  uploadEndpoint: "https://your-api.com/upload",
}
```

3. Implement authentication for admin access

### Custom Translation API

Replace LibreTranslate with your preferred service:

```typescript
// In TranslatorDialog.tsx
const response = await fetch("https://your-translation-api.com", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${YOUR_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    text: text,
    target_lang: targetLanguage,
  }),
});
```

## 📁 Project Structure

```
simple-hands/
├── src/
│   ├── components/
│   │   ├── LiveDemo.tsx        # Main detection interface
│   │   ├── DataRecorder.tsx    # Dataset collection
│   │   ├── TranslatorDialog.tsx
│   │   └── HelpDialog.tsx
│   ├── pages/
│   │   └── Index.tsx           # Landing page
│   ├── config.ts               # App configuration
│   ├── index.css              # Design system
│   └── main.tsx
├── public/
│   └── models/                 # Place your models here
├── README.md
└── package.json
```

## 🎨 Design System

The app uses a soft, child-friendly color palette defined in `src/index.css`:

- **Soft Blue**: Primary color and backgrounds
- **Warm Gray**: Text and subtle elements
- **Pastel Green**: Secondary accents
- **Gentle Yellow**: Highlights and tips

All colors use HSL format for consistency and accessibility.

## 🐛 Troubleshooting

### Camera not working

- Check browser permissions
- Try HTTPS (required for getUserMedia)
- Test in different browsers

### Model loading errors

- Verify model files are in `public/models/`
- Check browser console for CORS errors
- Ensure model format is TensorFlow.js compatible

### Poor detection accuracy

- Improve lighting conditions
- Use plain background
- Adjust confidence thresholds in config
- Train on more diverse data

## 📝 Development Roadmap

- [ ] Integrate real MediaPipe/TensorFlow.js detection
- [ ] Train baseline models for each mode
- [ ] Add temporal smoothing for predictions
- [ ] Implement server-side training pipeline
- [ ] Add user authentication (optional)
- [ ] Support multiple languages in UI
- [ ] Mobile app version (React Native)
- [ ] Offline mode with service workers

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- MediaPipe by Google for hand detection
- TensorFlow.js team for browser ML
- Sign language community for datasets and guidance
- All contributors and testers

## 📞 Support

- Documentation: [docs/](docs/)
- Issues: [GitHub Issues](your-repo/issues)
- Discussions: [GitHub Discussions](your-repo/discussions)

---

Built with ❤️ for accessibility and learning
