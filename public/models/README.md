# ASL Alphabet Recognition Model

## ✅ Model Status: Production Ready

The landmark-based ASL alphabet model is fully integrated and operational.

## Model Information

**Architecture**: Sequential MLP (Multi-Layer Perceptron)  
**Framework**: TensorFlow 2.19.0 → TensorFlow.js  
**Training Date**: 2025-11-21  
**Classes**: 28 (A-Z letters + Space character)  
**Validation Accuracy**: 98.81%

### Model Details

- **Input**: 63 features (21 MediaPipe hand landmarks × 3 coordinates)
- **Input Shape**: `[1, 63]` (batch size 1, 63 features)
- **Output**: 28 class probabilities (softmax activation)
- **Preprocessing**: Wrist-centered landmark coordinates

### Architecture

```
Input Layer: [batch, 63]
├── Dense(256) + ReLU + BatchNorm + Dropout(0.3)
├── Dense(128) + ReLU + BatchNorm + Dropout(0.2)
├── Dense(64) + ReLU + Dropout(0.1)
└── Dense(28) + Softmax
```

**Total Parameters**: 60,892  
**Trainable Parameters**: 60,124

## Training Information

- **Dataset**: ASL Alphabet (165,782 total images)
- **Successful Extractions**: 151,479 landmark sets
- **Training Samples**: 363,549 (with augmentation)
- **Validation Samples**: 30,296
- **Epochs Trained**: 11 (early stopping)
- **Best Val Accuracy**: 99.92%
- **Final Val Accuracy**: 98.81%
- **Train-Val Gap**: 0.35% (excellent generalization)

## Integration Guide

### Files in This Directory

- `model.json` — TFJS model architecture and weights manifest
- `group1-shard1of1.bin` — Model weights (binary)
- `labels.json` — Class labels in prediction order

### How the App Uses This Model

1. **Hand Detection**: MediaPipe Hands detects hand in webcam frame
2. **Landmark Extraction**: Extract 21 hand landmarks (x, y, z coordinates)
3. **Wrist Centering**: Subtract landmark[0] (wrist) from all landmarks
4. **Tensor Creation**: Flatten to 63-feature vector `[1, 63]`
5. **Prediction**: Feed to model → get 28 probabilities
6. **Output**: Display highest-confidence class (if > 50%)

### Usage Example

```javascript
// Load model
const model = await tf.loadGraphModel('/models/alphabet_tfjs/model.json');

// Load labels
const response = await fetch('/models/alphabet_tfjs/labels.json');
const labels = await response.json();

// Extract and preprocess landmarks
const hands = await detector.estimateHands(video);
const wrist = hands[0].keypoints[0];
const landmarks = new Float32Array(63);

for (let i = 0; i < 21; i++) {
  const kp = hands[0].keypoints[i];
  landmarks[i * 3] = kp.x - wrist.x;
  landmarks[i * 3 + 1] = kp.y - wrist.y;
  landmarks[i * 3 + 2] = (kp.z || 0) - (wrist.z || 0);
}

// Predict
const inputTensor = tf.tensor2d(landmarks, [1, 63]);
const prediction = model.predict(inputTensor);
const classIndex = prediction.argMax(-1).dataSync()[0];
const predictedLabel = labels[classIndex];
```

## Class Labels

The model recognizes 28 classes in this order:

```
A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, Space, T, U, V, W, X, Y, Z
```

**Note**: "Space" is the 20th class (index 19).

## Performance Notes

- **Real-time**: Runs at 30+ FPS on modern browsers with WebGL backend
- **Accuracy**: 98.81% on validation set
- **Robustness**: Works under varying lighting and hand positions
- **Recommendation**: Use 5-frame majority voting for smoother predictions

## Training Source

Full training report and artifacts available in:
- `asl_model_output/training_report.md`
- `asl_model_output/best_model.keras` (original Keras model)

## Privacy

All inference happens in-browser using TensorFlow.js. No data is sent to external servers.
