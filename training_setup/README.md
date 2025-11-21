# ASL Model Training Setup

This directory contains training notebooks and documentation for the ASL alphabet recognition model.

## 📁 Contents

- **`sign_language_colab.ipynb`** - Main training notebook (Google Colab)
- **`sign_language_retrain.ipynb`** - Retraining/fine-tuning notebook
- **`QUICK_START_COLAB.md`** - Quick start guide for Colab training
- **`NOTEBOOK_COMPARISON.md`** - Comparison between different training approaches

## 🎯 Current Model

The production model was trained using the notebook in this directory:

- **Training Date**: November 21, 2025
- **Model Type**: Landmark-based MLP (Multi-Layer Perceptron)
- **Classes**: 28 (A-Z + Space)
- **Validation Accuracy**: 98.81%
- **Output Location**: `../asl_model_output/`

## 🚀 Training a New Model

### Prerequisites

- Google Colab account (free tier works)
- Google Drive for storing outputs
- Kaggle account for dataset access

### Steps

1. **Open Notebook in Colab**:
   - Upload `sign_language_colab.ipynb` to Google Colab
   - Or use the direct Colab link (if shared)

2. **Configure Kaggle API**:
   - Download your `kaggle.json` credentials
   - Upload to Colab or mount Google Drive

3. **Mount Google Drive**:
   ```python
   from google.colab import drive
   drive.mount('/content/drive')
   ```

4. **Run Training Cells**:
   - Follow instructions in `QUICK_START_COLAB.md`
   - Training takes ~30-60 minutes on GPU

5. **Download Outputs**:
   - Model saved to Google Drive: `asl_model_output/`
   - Includes: `best_model.keras`, `tfjs_model/`, `training_report.md`

### Model Architecture

The current model uses this architecture:

```python
Sequential([
    Dense(256, activation='relu', kernel_regularizer=l2(0.001)),
    BatchNormalization(),
    Dropout(0.3),
    Dense(128, activation='relu', kernel_regularizer=l2(0.001)),
    BatchNormalization(),
    Dropout(0.2),
    Dense(64, activation='relu'),
    Dropout(0.1),
    Dense(28, activation='softmax')  # 28 classes
])
```

**Input**: 63 features (21 MediaPipe landmarks × 3 coords, wrist-centered)  
**Output**: 28 class probabilities

## 📊 Training Configuration

Recommended hyperparameters:

```python
EPOCHS = 100
BATCH_SIZE = 64
LEARNING_RATE = 0.001
OPTIMIZER = 'adam'
EARLY_STOPPING_PATIENCE = 10
REDUCE_LR_PATIENCE = 5
```

## 🔄 Retraining Process

To improve the model or add new classes:

1. **Collect New Data**:
   - Use the app's Data Recorder feature
   - Or download additional datasets from Kaggle

2. **Update Notebook**:
   - Modify class labels if adding new signs
   - Adjust augmentation parameters
   - Update output directory

3. **Run Training**:
   - Use `sign_language_retrain.ipynb` for fine-tuning
   - Or start fresh with `sign_language_colab.ipynb`

4. **Deploy Updated Model**:
   - Copy `tfjs_model/` outputs to `../public/models/alphabet_tfjs/`
   - Update `../src/config.ts` if class count changed
   - Test in browser

## 📈 Model Evaluation

The training notebook automatically generates:

- **Training Report**: `training_report.md`
- **TensorBoard Logs**: `logs/` directory
- **Training History Plot**: `training_history.png`
- **Sample Predictions**: Console output during training

### Viewing TensorBoard

```python
%load_ext tensorboard
%tensorboard --logdir /content/drive/MyDrive/asl_model_output/logs
```

## 🛠️ Troubleshooting

### Common Issues

**GPU Not Available**:
- Colab: Runtime → Change runtime type → GPU
- Verify with: `tf.config.list_physical_devices('GPU')`

**Out of Memory**:
- Reduce `BATCH_SIZE` to 32 or 16
- Reduce augmentation multiplier
- Use smaller model architecture

**Low Accuracy**:
- Increase training data (augmentation)
- Adjust learning rate (try 0.0001)
- Increase epochs (if underfitting)
- Reduce dropout (if underfitting)

**MediaPipe Errors**:
- Ensure images have visible hands
- Check MediaPipe version compatibility
- Verify image format (RGB, not RGBA)

## 📚 References

- **MediaPipe Hands**: https://google.github.io/mediapipe/solutions/hands
- **TensorFlow.js**: https://www.tensorflow.org/js
- **ASL Dataset**: Kaggle ASL Alphabet dataset

## 📝 Notes

- The model expects **wrist-centered** landmarks (subtract landmark[0])
- Training uses **data augmentation** to improve generalization
- **Early stopping** prevents overfitting
- TFJS conversion uses **default quantization** (float32)

For detailed training instructions, see `QUICK_START_COLAB.md`.

---

**Last Updated**: November 21, 2025  
**Current Model**: ASL Alphabet v1.0 (28 classes, 98.81% val accuracy)
