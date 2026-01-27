/**
 * Feature Engineering Utilities for ASL Recognition
 * 
 * This module provides JavaScript implementations of the same feature
 * engineering used during model training in Python.
 * 
 * Features extracted (must match Python training exactly!):
 * - Normalized landmarks: 63 features (21 landmarks × 3 coordinates)
 * - Distance features: 26 key distances between landmarks (with duplicates)
 * - Angle features: 19 joint angles (normalized to [0,1])
 * - Fingertip positions: 10 features (y,z for each fingertip)
 * - Palm orientation: 3 features (normal vector)
 * 
 * Total: 121 features (matches trained model)
 */

// MediaPipe hand landmark indices
const FINGERTIP_IDS = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky tips
const FINGER_MCP_IDS = [1, 5, 9, 13, 17];  // Base of each finger
const FINGER_PIP_IDS = [2, 6, 10, 14, 18]; // Second joint
const FINGER_DIP_IDS = [3, 7, 11, 15, 19]; // Third joint

// Distance pairs for feature extraction (must match Python training exactly!)
// Note: Some pairs are duplicated intentionally to match training data
const DISTANCE_PAIRS: [number, number][] = [
  // Fingertips to wrist (5)
  [4, 0], [8, 0], [12, 0], [16, 0], [20, 0],
  // Between adjacent fingertips (4)
  [4, 8], [8, 12], [12, 16], [16, 20],
  // Thumb to other fingertips (4) - includes (4,8) which is duplicate
  [4, 8], [4, 12], [4, 16], [4, 20],
  // Fingertips to palm center (5)
  [4, 9], [8, 9], [12, 9], [16, 9], [20, 9],
  // Between finger MCPs (3)
  [5, 9], [9, 13], [13, 17],
  // Finger curl indicators (5) - includes (12,9) which is duplicate
  [4, 1], [8, 5], [12, 9], [16, 13], [20, 17],
];
// Total: 26 distance features (matching Python training)

// Finger joint triplets for angle calculation
// [MCP_base, PIP, DIP, TIP] for each finger
const FINGER_JOINTS = [
  [1, 2, 3, 4],    // Thumb
  [5, 6, 7, 8],    // Index
  [9, 10, 11, 12], // Middle
  [13, 14, 15, 16], // Ring
  [17, 18, 19, 20], // Pinky
];

/**
 * Calculate Euclidean distance between two 3D points
 */
function calculateDistance(p1: number[], p2: number[]): number {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  const dz = p1[2] - p2[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate angle at p2 formed by p1-p2-p3 in degrees
 */
function calculateAngle(p1: number[], p2: number[], p3: number[]): number {
  // Vector from p2 to p1
  const v1 = [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
  // Vector from p2 to p3
  const v2 = [p3[0] - p2[0], p3[1] - p2[1], p3[2] - p2[2]];
  
  // Dot product
  const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  
  // Magnitudes
  const mag1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]);
  const mag2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1] + v2[2] * v2[2]);
  
  // Cosine of angle
  let cosAngle = dot / (mag1 * mag2 + 1e-8);
  cosAngle = Math.max(-1, Math.min(1, cosAngle)); // Clamp to [-1, 1]
  
  // Convert to degrees
  return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * Cross product of two 3D vectors
 */
function crossProduct(v1: number[], v2: number[]): number[] {
  return [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0],
  ];
}

/**
 * Normalize a 3D vector
 */
function normalize(v: number[]): number[] {
  const mag = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) + 1e-8;
  return [v[0] / mag, v[1] / mag, v[2] / mag];
}

export interface HandKeypoint {
  x: number;
  y: number;
  z?: number;
}

export interface EngineerFeatures {
  normalizedLandmarks: Float32Array; // 63 features
  distances: Float32Array;           // 26 features (matches Python with duplicates)
  angles: Float32Array;              // 19 features
  fingertipPositions: Float32Array;  // 10 features
  orientation: Float32Array;         // 3 features
  combined: Float32Array;            // 121 features total
}

/**
 * Extract all engineered features from 21 hand landmarks.
 * 
 * @param keypoints - Array of 21 MediaPipe hand keypoints (in pixel or normalized coords)
 * @param imageWidth - Optional image width for normalizing pixel coordinates (default: assumes already normalized)
 * @param imageHeight - Optional image height for normalizing pixel coordinates (default: assumes already normalized)
 * @returns Object containing all feature arrays
 */
export function extractEngineerFeatures(
  keypoints: HandKeypoint[],
  imageWidth?: number,
  imageHeight?: number
): EngineerFeatures | null {
  if (!keypoints || keypoints.length !== 21) {
    console.warn(`Invalid keypoints: expected 21, got ${keypoints?.length || 0}`);
    return null;
  }

  // Convert keypoints to 2D array format [21][3]
  // If image dimensions provided, normalize coordinates to 0-1 range (matching Python training)
  const landmarks: number[][] = keypoints.map(kp => {
    const x = imageWidth ? kp.x / imageWidth : kp.x;
    const y = imageHeight ? kp.y / imageHeight : kp.y;
    const z = kp.z || 0;
    return [x, y, z];
  });
  
  // Get wrist position
  const wrist = landmarks[0];
  
  // === 1. Normalized landmarks (wrist-centered) ===
  const centered: number[][] = landmarks.map(lm => [
    lm[0] - wrist[0],
    lm[1] - wrist[1],
    lm[2] - wrist[2],
  ]);
  
  // Normalize by hand size (distance from wrist to middle finger MCP)
  const handSize = calculateDistance(landmarks[0], landmarks[9]);
  const normalized: number[][] = handSize > 0 
    ? centered.map(lm => [lm[0] / handSize, lm[1] / handSize, lm[2] / handSize])
    : centered;
  
  // Flatten to 63 features
  const normalizedLandmarks = new Float32Array(63);
  for (let i = 0; i < 21; i++) {
    normalizedLandmarks[i * 3] = normalized[i][0];
    normalizedLandmarks[i * 3 + 1] = normalized[i][1];
    normalizedLandmarks[i * 3 + 2] = normalized[i][2];
  }
  
  // === 2. Distance features ===
  const distances = new Float32Array(DISTANCE_PAIRS.length);
  for (let i = 0; i < DISTANCE_PAIRS.length; i++) {
    const [idx1, idx2] = DISTANCE_PAIRS[i];
    distances[i] = calculateDistance(normalized[idx1], normalized[idx2]);
  }
  
  // === 3. Angle features ===
  const anglesList: number[] = [];
  
  // Finger joint angles
  for (const [base, pip, dip, tip] of FINGER_JOINTS) {
    // MCP angle (wrist -> base -> pip)
    anglesList.push(calculateAngle(landmarks[0], landmarks[base], landmarks[pip]));
    // PIP angle (base -> pip -> dip)
    anglesList.push(calculateAngle(landmarks[base], landmarks[pip], landmarks[dip]));
    // DIP angle (pip -> dip -> tip)
    anglesList.push(calculateAngle(landmarks[pip], landmarks[dip], landmarks[tip]));
  }
  
  // Angles between fingers (spread)
  for (let i = 0; i < FINGERTIP_IDS.length - 1; i++) {
    const tip1 = FINGERTIP_IDS[i];
    const tip2 = FINGERTIP_IDS[i + 1];
    anglesList.push(calculateAngle(landmarks[tip1], landmarks[0], landmarks[tip2]));
  }
  
  // Normalize angles to [0, 1]
  const angles = new Float32Array(anglesList.length);
  for (let i = 0; i < anglesList.length; i++) {
    angles[i] = anglesList[i] / 180.0;
  }
  
  // === 4. Fingertip positions (y and z relative to wrist) ===
  const fingertipPositions = new Float32Array(10);
  for (let i = 0; i < FINGERTIP_IDS.length; i++) {
    const tipIdx = FINGERTIP_IDS[i];
    fingertipPositions[i * 2] = normalized[tipIdx][1];     // y (height)
    fingertipPositions[i * 2 + 1] = normalized[tipIdx][2]; // z (depth)
  }
  
  // === 5. Palm orientation (normal vector) ===
  // Using cross product of (wrist -> index MCP) × (wrist -> pinky MCP)
  const v1 = [
    landmarks[5][0] - landmarks[0][0],
    landmarks[5][1] - landmarks[0][1],
    landmarks[5][2] - landmarks[0][2],
  ];
  const v2 = [
    landmarks[17][0] - landmarks[0][0],
    landmarks[17][1] - landmarks[0][1],
    landmarks[17][2] - landmarks[0][2],
  ];
  const palmNormal = normalize(crossProduct(v1, v2));
  const orientation = new Float32Array(palmNormal);
  
  // === Combine all features ===
  // Total: 63 + 26 + 19 + 10 + 3 = 121 features (matches Python training)
  const combined = new Float32Array(121);
  let offset = 0;
  
  combined.set(normalizedLandmarks, offset);
  offset += normalizedLandmarks.length; // 63
  
  combined.set(distances, offset);
  offset += distances.length; // 26
  
  combined.set(angles, offset);
  offset += angles.length; // 19
  
  combined.set(fingertipPositions, offset);
  offset += fingertipPositions.length; // 10
  
  combined.set(orientation, offset); // 3
  
  return {
    normalizedLandmarks,
    distances,
    angles,
    fingertipPositions,
    orientation,
    combined,
  };
}

/**
 * Extract only the basic normalized landmarks (for simple model).
 * This is the original preprocessing without engineered features.
 * 
 * @param keypoints - Array of 21 MediaPipe hand keypoints
 * @returns Float32Array of 63 wrist-centered landmark coordinates
 */
export function extractNormalizedLandmarks(keypoints: HandKeypoint[]): Float32Array | null {
  if (!keypoints || keypoints.length !== 21) {
    return null;
  }

  const wrist = keypoints[0];
  const landmarks = new Float32Array(63);

  for (let i = 0; i < 21; i++) {
    const kp = keypoints[i];
    landmarks[i * 3] = kp.x - wrist.x;
    landmarks[i * 3 + 1] = kp.y - wrist.y;
    landmarks[i * 3 + 2] = (kp.z || 0) - (wrist.z || 0);
  }

  return landmarks;
}

/**
 * Check if the model expects engineered features (119-dim) or basic landmarks (63-dim)
 */
export function getExpectedFeatureDim(inputShape: number[]): number {
  // If model expects a single input dimension
  if (inputShape.length === 1) {
    return inputShape[0];
  }
  // For 2D input like [batch, features]
  if (inputShape.length === 2) {
    return inputShape[1];
  }
  // Default to basic landmarks
  return 63;
}
