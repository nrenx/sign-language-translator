import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

let detector: handPoseDetection.HandDetector | null = null;

export const initHandDetector = async () => {
  try {
    // Set backend to WebGL for better performance
    await tf.setBackend('webgl');
    await tf.ready();

    const model = handPoseDetection.SupportedModels.MediaPipeHands;
    const detectorConfig: handPoseDetection.MediaPipeHandsMediaPipeModelConfig = {
      runtime: 'mediapipe',
      solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
      modelType: 'full',
    };

    detector = await handPoseDetection.createDetector(model, detectorConfig);
    console.log('Hand detector initialized successfully');
    return detector;
  } catch (error) {
    console.error('Error initializing hand detector:', error);
    throw error;
  }
};

export const detectHands = async (video: HTMLVideoElement) => {
  if (!detector) {
    throw new Error('Detector not initialized');
  }

  try {
    const hands = await detector.estimateHands(video, {
      flipHorizontal: false, // We handle flipping in CSS
    });
    return hands;
  } catch (error) {
    console.error('Error detecting hands:', error);
    return [];
  }
};

export const drawHandLandmarks = (
  canvas: HTMLCanvasElement,
  hands: handPoseDetection.Hand[],
  videoWidth: number,
  videoHeight: number
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (hands.length === 0) return;

  hands.forEach((hand) => {
    const keypoints = hand.keypoints;

    // Draw connections between keypoints
    const connections = [
      // Thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Index finger
      [0, 5], [5, 6], [6, 7], [7, 8],
      // Middle finger
      [0, 9], [9, 10], [10, 11], [11, 12],
      // Ring finger
      [0, 13], [13, 14], [14, 15], [15, 16],
      // Pinky
      [0, 17], [17, 18], [18, 19], [19, 20],
      // Palm
      [5, 9], [9, 13], [13, 17],
    ];

    // Draw connections
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    connections.forEach(([start, end]) => {
      const startPoint = keypoints[start];
      const endPoint = keypoints[end];
      if (startPoint && endPoint) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
      }
    });

    // Draw keypoints
    keypoints.forEach((keypoint, index) => {
      const { x, y } = keypoint;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      
      // Different colors for different finger parts
      if (index === 0) {
        ctx.fillStyle = '#ef4444'; // Wrist - red
      } else if ([1, 2, 3, 4].includes(index)) {
        ctx.fillStyle = '#f59e0b'; // Thumb - orange
      } else if ([5, 6, 7, 8].includes(index)) {
        ctx.fillStyle = '#10b981'; // Index - green
      } else if ([9, 10, 11, 12].includes(index)) {
        ctx.fillStyle = '#3b82f6'; // Middle - blue
      } else if ([13, 14, 15, 16].includes(index)) {
        ctx.fillStyle = '#8b5cf6'; // Ring - purple
      } else {
        ctx.fillStyle = '#ec4899'; // Pinky - pink
      }
      
      ctx.fill();
    });
  });
};

export const extractLandmarkFeatures = (hands: handPoseDetection.Hand[]) => {
  if (hands.length === 0) return null;

  const hand = hands[0];
  const keypoints = hand.keypoints;

  // Normalize keypoints relative to wrist (index 0)
  const wrist = keypoints[0];
  const normalized = keypoints.map((kp) => ({
    x: kp.x - wrist.x,
    y: kp.y - wrist.y,
    z: kp.z || 0,
  }));

  // Flatten to array of numbers for ML model input
  return normalized.flatMap((kp) => [kp.x, kp.y, kp.z]);
};

export const cleanupDetector = () => {
  if (detector) {
    detector.dispose();
    detector = null;
  }
};
