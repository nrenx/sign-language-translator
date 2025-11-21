
// TensorFlow.js Model Usage Example
// Generated: asl_model_output

// Load the model (layers model format)
const model = await tf.loadLayersModel('path/to/tfjs_model/model.json');

// Load labels
const response = await fetch('path/to/tfjs_model/labels.json');
const labels = await response.json();

// Make prediction
const inputTensor = tf.tensor2d([[...63 landmark features...]]); // Shape: [1, 63]
const prediction = model.predict(inputTensor);
const classIndex = prediction.argMax(-1).dataSync()[0];
const predictedLabel = labels[classIndex];

console.log('Predicted class:', predictedLabel);
