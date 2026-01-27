# ASL Model Training Guide

## Overview

- **Goal**: Train an ASL alphabet recognition model with 97-99% accuracy
- **Method**: Hybrid CNN + Engineered Features (two-branch architecture)
- **Output**: TensorFlow.js model for browser deployment
- **Classes**: 28 (A-Z + Nothing + Space)

## Training Notebooks

- `sign_language_improved.ipynb` — **Recommended** (hybrid model, best accuracy)
- `sign_language_colab.ipynb` — Original MLP model
- `sign_language_retrain.ipynb` — Simplified retraining version

## Quick Start (Google Colab)

- Open `sign_language_improved.ipynb` in [Google Colab](https://colab.research.google.com)
- Enable GPU: Runtime → Change runtime type → GPU
- Run all cells in order
- Training takes ~25-30 minutes with GPU
- Download `tfjs_model/` folder from Google Drive when done

## Model Architecture

- **Branch 1 (CNN)**: Processes 63 landmarks (21 hand points × 3 coords)
- **Branch 2 (Dense)**: Processes 121 engineered features
- **Merge**: Both branches combine for final classification
- **Output**: 28 class probabilities (softmax)

## Engineered Features (121 total)

- Normalized landmarks (63) — wrist-centered coordinates
- Distance features (24) — fingertip distances, palm distances
- Angle features (19) — joint angles for each finger
- Fingertip positions (10) — Y/Z coordinates
- Palm orientation (3) — palm plane normal vector
- Additional features (2) — hand scale, aspect ratio

## Data Augmentation

- Gaussian noise (2 levels)
- Horizontal flip
- Z-axis rotation (±5°, ±10°)
- Scale variation (0.9x, 1.1x)
- Result: ~6x training data

## Training Settings

- Epochs: 100 (with early stopping)
- Batch size: 64
- Learning rate: 0.001 with 5-epoch warmup
- Early stopping patience: 15 epochs
- Best model saved automatically

## Expected Results

- Test accuracy: 97-99%
- Model size: ~2 MB
- Inference time: <10ms per prediction

## Output Files

After training, these files are saved to Google Drive:

- `tfjs_model/model.json` — model architecture
- `tfjs_model/group1-shard1of1.bin` — model weights
- `tfjs_model/labels.json` — class labels
- `tfjs_model/model_config.json` — input dimensions
- `best_model_improved.keras` — Keras checkpoint

## Deployment

- Copy all files from `tfjs_model/` to `public/models/alphabet_tfjs/`
- The browser app loads the model automatically
- Feature engineering runs in JavaScript to match training

## Troubleshooting

- **No GPU**: Enable in Colab runtime settings
- **Out of memory**: Reduce batch size to 32
- **Low accuracy**: Increase augmentation or epochs
- **TFJS error**: Reinstall tensorflowjs (`pip install tensorflowjs>=4.20.0`)
- **Training disconnected**: Use recovery cell to resume from checkpoint

## Requirements

- Google Colab (free tier works) or local GPU
- Kaggle account for dataset access
- Google Drive for saving outputs

---

**Current Model**: Hybrid CNN (99.91% test accuracy)  
**Last Updated**: January 2026
