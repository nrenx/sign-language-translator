#!/usr/bin/env python3
"""
Convert Keras model to TensorFlow.js Graph Model format
This fixes the InputLayer compatibility issue with LayersModel format
"""

import os
import sys
import tensorflow as tf
import tensorflowjs as tfjs

def convert_keras_to_tfjs_graph(keras_model_path, output_dir):
    """
    Convert a Keras model to TFJS graph model format
    
    Args:
        keras_model_path: Path to the .keras model file
        output_dir: Directory to save the TFJS graph model
    """
    print(f"Loading Keras model from: {keras_model_path}")
    
    # Load the Keras model
    model = tf.keras.models.load_model(keras_model_path)
    
    print("\nModel Summary:")
    model.summary()
    
    # Get input shape
    input_shape = model.input_shape
    print(f"\nInput shape: {input_shape}")
    print(f"Output shape: {model.output_shape}")
    
    # Convert to TensorFlow SavedModel first (intermediate step)
    saved_model_dir = os.path.join(os.path.dirname(output_dir), 'saved_model_temp')
    print(f"\nSaving as TensorFlow SavedModel to: {saved_model_dir}")
    
    # For Keras 3, use export method instead of save with format
    model.export(saved_model_dir)
    
    # Convert SavedModel to TFJS Graph Model
    print(f"\nConverting to TensorFlow.js Graph Model: {output_dir}")
    tfjs.converters.convert_tf_saved_model(
        saved_model_dir,
        output_dir
    )
    
    print(f"\n✅ Conversion successful!")
    print(f"Output directory: {output_dir}")
    print(f"\nFiles created:")
    for file in os.listdir(output_dir):
        file_path = os.path.join(output_dir, file)
        size = os.path.getsize(file_path)
        print(f"  - {file} ({size:,} bytes)")
    
    # Clean up temporary SavedModel
    import shutil
    if os.path.exists(saved_model_dir):
        shutil.rmtree(saved_model_dir)
        print(f"\n🗑️  Cleaned up temporary directory: {saved_model_dir}")

if __name__ == "__main__":
    # Paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    keras_model = os.path.join(base_dir, "asl_model_output", "best_model.keras")
    tfjs_output = os.path.join(base_dir, "asl_model_output", "tfjs_graph_model")
    
    # Check if Keras model exists
    if not os.path.exists(keras_model):
        print(f"❌ Error: Keras model not found at {keras_model}")
        sys.exit(1)
    
    # Create output directory
    os.makedirs(tfjs_output, exist_ok=True)
    
    # Convert
    try:
        convert_keras_to_tfjs_graph(keras_model, tfjs_output)
        
        print("\n" + "="*60)
        print("NEXT STEPS:")
        print("="*60)
        print("1. Copy the converted files to public/models/alphabet_tfjs/:")
        print(f"   cp {tfjs_output}/* public/models/alphabet_tfjs/")
        print("\n2. Update src/components/LiveDemo.tsx to use tf.loadGraphModel()")
        print("\n3. Test the application in the browser")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ Conversion failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
