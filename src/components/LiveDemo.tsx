import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatasetMode, config } from "@/config";
import { extractEngineerFeatures, extractNormalizedLandmarks } from "@/lib/featureEngineering";
import {
  ArrowLeft,
  Volume2,
  Copy,
  Languages,
  HelpCircle,
  Database,
  BookOpen,
  Delete,
  Space,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TranslatorDialog from "./TranslatorDialog";
import HelpDialog from "./HelpDialog";

type CropBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

interface LiveDemoProps {
  mode: DatasetMode;
  onBack: () => void;
  onOpenDataRecorder: () => void;
}

const MIN_CONFIDENCE = 0.5;
const LETTER_HOLD_DURATION = 3000; // 3 seconds - how long to hold gesture to capture
const RECAPTURE_COOLDOWN = 500; // 0.5 seconds - cooldown after capturing before same letter can be captured again

const LiveDemo = ({ mode, onBack, onOpenDataRecorder }: LiveDemoProps) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const preProcessCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelRef = useRef<tf.GraphModel | null>(null);
  const detectorRef = useRef<handPoseDetection.HandDetector | null>(null);
  const labelsRef = useRef<string[]>([]);
  const animationRef = useRef<number>();
  const [prediction, setPrediction] = useState<string>("—");
  const [confidence, setConfidence] = useState<number>(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isDetectorReady, setIsDetectorReady] = useState(false);
  const [handsDetected, setHandsDetected] = useState(false);
  const [showTranslator, setShowTranslator] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showHandTracking, setShowHandTracking] = useState(true);
  const { toast } = useToast();
  
  // Sentence building state
  const [capturedSentence, setCapturedSentence] = useState<string>("");
  const [holdProgress, setHoldProgress] = useState<number>(0); // Progress of holding current letter (0-100)
  const currentHoldLetterRef = useRef<string>("");
  const holdStartTimeRef = useRef<number>(0);
  const lastCapturedLetterRef = useRef<string>("");
  const lastCaptureTimeRef = useRef<number>(0);
  const isModeEnabled = config.models[mode].enabled;
  const useLandmarks = config.models[mode].useLandmarks ?? false;
  const useEngineeredFeatures = config.models[mode].useEngineeredFeatures ?? false;
  const inputShape = config.models[mode].inputShape ?? [28, 28, 1];
  const [inputWidth, inputHeight] = inputShape.length === 3 ? inputShape : [28, 28];
  const initCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast({
        title: "Camera Unsupported",
        description: "This browser does not expose getUserMedia",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: "user" 
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play();
        setIsCameraReady(true);
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Please allow camera access to use alphabet recognition",
        variant: "destructive",
      });
      console.error("Camera error:", error);
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
    setIsCameraReady(false);
  }, []);

  const loadModelAssets = useCallback(async () => {
    try {
      toast({
        title: "Loading Alphabet Model",
        description: "Preparing TFJS weights for inference...",
      });

      await tf.ready();
      console.log('TensorFlow.js backend:', tf.getBackend());
      console.log('Loading model from:', config.models[mode].url);
      
      modelRef.current = await tf.loadGraphModel(config.models[mode].url);
      console.log('Model loaded successfully');
      console.log('Model inputs:', modelRef.current.inputs);
      console.log('Model outputs:', modelRef.current.outputs);

      if (config.models[mode].labelsPath) {
        try {
          const response = await fetch(config.models[mode].labelsPath);
          const labelsData = await response.json();
          
          // Handle both array format ["A", "B", ...] and object format {"0": "A", "1": "B", ...}
          if (Array.isArray(labelsData)) {
            labelsRef.current = labelsData;
          } else {
            // Convert object to array (sorted by numeric keys)
            const maxIndex = Math.max(...Object.keys(labelsData).map(Number));
            labelsRef.current = Array.from({ length: maxIndex + 1 }, (_, i) => labelsData[i.toString()] || `Class ${i}`);
          }
          console.log('Labels loaded:', labelsRef.current);
        } catch (labelsError) {
          console.warn("Unable to load labels file, falling back to config vocabulary", labelsError);
          labelsRef.current = config.models[mode].vocabulary;
        }
      } else {
        labelsRef.current = config.models[mode].vocabulary;
      }

      setIsModelReady(true);
      toast({
        title: "Ready!",
        description: "Alphabet recognition running locally",
      });
    } catch (error) {
      console.error("Model loading error:", error);
      toast({
        title: "Model Error",
        description: "Failed to load the TensorFlow.js model",
        variant: "destructive",
      });
    }
  }, [mode, toast]);

  const loadHandDetector = useCallback(async () => {
    if (detectorRef.current) {
      return detectorRef.current;
    }

    try {
      toast({
        title: "Loading Hand Detector",
        description: "Initializing MediaPipe Hands runtime...",
      });

      const detector = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        {
          runtime: "mediapipe",
          modelType: "full",
          solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
        },
      );

      detectorRef.current = detector;
      setIsDetectorReady(true);
      toast({
        title: "Hand Detector Ready",
        description: "Cropping hands before classification",
      });
      return detector;
    } catch (error) {
      console.error("Detector loading error:", error);
      toast({
        title: "Detector Error",
        description: "Failed to initialize MediaPipe Hands",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const stopDetection = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  }, []);

  const preprocessFrame = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement, cropBox: CropBox): tf.Tensor4D | null => {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(
      video,
      cropBox.x,
      cropBox.y,
      cropBox.width,
      cropBox.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const grayscale = new Float32Array(canvas.width * canvas.height);

    for (let i = 0; i < grayscale.length; i += 1) {
      const r = imageData.data[i * 4];
      const g = imageData.data[i * 4 + 1];
      const b = imageData.data[i * 4 + 2];
      const normalized = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      grayscale[i] = normalized;
    }

    return tf.tensor4d(grayscale, [1, canvas.height, canvas.width, 1]);
  }, []);

  // New landmark-based preprocessing with optional feature engineering
  const preprocessLandmarks = useCallback((hand: handPoseDetection.Hand, videoWidth: number, videoHeight: number): { landmarkTensor: tf.Tensor2D; featureTensor: tf.Tensor2D } | null => {
    const keypoints = hand.keypoints;
    if (!keypoints || keypoints.length !== 21) {
      console.warn(`Invalid keypoints: expected 21, got ${keypoints?.length || 0}`);
      return null;
    }

    // Extract wrist position (landmark 0)
    const wrist = keypoints[0];
    if (!wrist) {
      console.warn('Wrist landmark (index 0) not found');
      return null;
    }
    
    // For hybrid model: extract both landmarks and engineered features
    // Pass video dimensions to normalize pixel coords to 0-1 range (matching Python training)
    if (useEngineeredFeatures) {
      const features = extractEngineerFeatures(keypoints, videoWidth, videoHeight);
      if (!features) {
        console.warn('Failed to extract engineered features');
        return null;
      }
      
      // Return both tensors for dual-input model
      const landmarkTensor = tf.tensor2d(features.normalizedLandmarks, [1, 63]);
      const featureTensor = tf.tensor2d(features.combined, [1, 121]);
      return { landmarkTensor, featureTensor };
    }
    
    // For simple model: use only normalized landmarks
    const landmarks = extractNormalizedLandmarks(keypoints);
    if (!landmarks) {
      console.warn('Failed to extract landmarks');
      return null;
    }

    const landmarkTensor = tf.tensor2d(landmarks, [1, 63]);
    return { landmarkTensor, featureTensor: landmarkTensor }; // Same tensor for simple model
  }, [useEngineeredFeatures]);

  const getTopPrediction = useCallback((probabilities: Float32Array | Uint8Array | number[]) => {
    let bestIndex = 0;
    let bestScore = probabilities[0] ?? 0;

    for (let i = 1; i < probabilities.length; i += 1) {
      if (probabilities[i] > bestScore) {
        bestScore = probabilities[i];
        bestIndex = i;
      }
    }

    const label = labelsRef.current[bestIndex] ?? config.models[mode].vocabulary[bestIndex] ?? "?";
    return { label, score: bestScore };
  }, [mode]);

  // Draw hand tracking landmarks on overlay canvas
  const drawHandLandmarks = useCallback((hands: handPoseDetection.Hand[]) => {
    if (!overlayCanvasRef.current || !videoRef.current || !showHandTracking) {
      return;
    }

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!hands.length) return;

    // Draw each hand
    hands.forEach((hand) => {
      const keypoints = hand.keypoints;
      if (!keypoints || keypoints.length !== 21) return;

      // Draw connections between landmarks
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
        [5, 9], [9, 13], [13, 17]
      ];

      // Draw lines
      ctx.strokeStyle = '#00FF00';
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
        // Wrist is larger and different color
        if (index === 0) {
          ctx.fillStyle = '#FF0000';
          ctx.beginPath();
          ctx.arc(keypoint.x, keypoint.y, 6, 0, 2 * Math.PI);
          ctx.fill();
        } else {
          ctx.fillStyle = '#00FF00';
          ctx.beginPath();
          ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    });
  }, [showHandTracking]);

  const computeCropBox = useCallback((hand: handPoseDetection.Hand, frameWidth: number, frameHeight: number): CropBox => {
    const points = hand.keypoints ?? [];
    if (!points.length) {
      return { x: 0, y: 0, width: frameWidth, height: frameHeight };
    }

    let minX = frameWidth;
    let minY = frameHeight;
    let maxX = 0;
    let maxY = 0;

    points.forEach(({ x, y }) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;
    const size = Math.max(boxWidth, boxHeight);
    const padding = size * 0.35;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const halfSize = size / 2 + padding;

    const x = clamp(centerX - halfSize, 0, frameWidth);
    const y = clamp(centerY - halfSize, 0, frameHeight);
    const width = Math.min(frameWidth - x, halfSize * 2);
    const height = Math.min(frameHeight - y, halfSize * 2);

    return {
      x,
      y,
      width: Math.max(1, width),
      height: Math.max(1, height),
    };
  }, []);

  const startDetection = useCallback(() => {
    const detectFrame = async () => {
      // For landmark mode, canvas is not needed
      const needsCanvas = !useLandmarks;
      if (!videoRef.current || !modelRef.current || !detectorRef.current) {
        animationRef.current = requestAnimationFrame(detectFrame);
        return;
      }
      
      if (needsCanvas && !preProcessCanvasRef.current) {
        animationRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      if (videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        animationRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      let landmarkTensor: tf.Tensor | null = null;
      let featureTensor: tf.Tensor | null = null;
      let imageTensor: tf.Tensor | null = null;
      let logits: tf.Tensor | null = null;

      try {
        const hands = await detectorRef.current.estimateHands(videoRef.current, {
          flipHorizontal: false,
        });

        // Draw hand tracking overlay
        drawHandLandmarks(hands);

        if (!hands.length) {
          setPrediction("—");
          setConfidence(0);
          setHandsDetected(false);
          animationRef.current = requestAnimationFrame(detectFrame);
          return;
        }
        
        setHandsDetected(true);
        
        // Log only on first detection or every 30 frames to reduce spam
        const shouldLog = Math.random() < 0.033; // ~1 in 30 frames
        if (shouldLog) {
          console.log(`Detected ${hands.length} hand(s), landmarks: ${hands[0].keypoints?.length || 0}`);
          // Log first few keypoints for debugging
          const kp = hands[0].keypoints;
          if (kp && kp.length > 0) {
            console.log('Sample keypoints (0,4,8):', {
              wrist: { x: kp[0].x.toFixed(3), y: kp[0].y.toFixed(3), z: kp[0].z?.toFixed(3) },
              thumbTip: { x: kp[4].x.toFixed(3), y: kp[4].y.toFixed(3), z: kp[4].z?.toFixed(3) },
              indexTip: { x: kp[8].x.toFixed(3), y: kp[8].y.toFixed(3), z: kp[8].z?.toFixed(3) },
            });
          }
        }

        // Use landmark-based or image-based preprocessing based on config
        if (useLandmarks) {
          // Pass video dimensions to normalize pixel coordinates to 0-1 range
          const videoWidth = videoRef.current.videoWidth;
          const videoHeight = videoRef.current.videoHeight;
          const tensors = preprocessLandmarks(hands[0], videoWidth, videoHeight);
          if (!tensors) {
            console.warn('Failed to extract landmarks');
            animationRef.current = requestAnimationFrame(detectFrame);
            return;
          }
          
          landmarkTensor = tensors.landmarkTensor;
          featureTensor = tensors.featureTensor;
          
          if (shouldLog) {
            console.log('Landmark tensor shape:', landmarkTensor.shape);
            console.log('Feature tensor shape:', featureTensor.shape);
            // Log first few feature values
            featureTensor.data().then(data => {
              console.log('Feature sample (first 10):', Array.from(data.slice(0, 10)).map(v => v.toFixed(4)));
              console.log('Feature sample (last 10):', Array.from(data.slice(-10)).map(v => v.toFixed(4)));
            });
          }
          
          // For hybrid model with dual inputs
          if (useEngineeredFeatures) {
            // Model expects named inputs: { landmark_input, feature_input }
            logits = modelRef.current.predict({
              landmark_input: landmarkTensor,
              feature_input: featureTensor
            }) as tf.Tensor;
          } else {
            // Simple model with single input
            logits = modelRef.current.predict(landmarkTensor) as tf.Tensor;
          }
        } else {
          const cropBox = computeCropBox(
            hands[0],
            videoRef.current.videoWidth,
            videoRef.current.videoHeight,
          );
          imageTensor = preprocessFrame(videoRef.current, preProcessCanvasRef.current!, cropBox);
          if (!imageTensor) {
            animationRef.current = requestAnimationFrame(detectFrame);
            return;
          }
          logits = modelRef.current.predict(imageTensor) as tf.Tensor;
        }

        const probabilities = await logits.data();
        
        if (shouldLog) {
          console.log('Probabilities:', Array.from(probabilities).map(p => p.toFixed(3)));
        }

        if (!probabilities.length) {
          animationRef.current = requestAnimationFrame(detectFrame);
          return;
        }

        const { label, score } = getTopPrediction(probabilities);
        if (shouldLog) {
          console.log(`Prediction: ${label} (${(score * 100).toFixed(1)}%)`);
        }
        setConfidence(score);
        if (score >= MIN_CONFIDENCE) {
          setPrediction(label);
          // Track letter hold time for sentence building
          updateLetterHold(label);
        } else {
          setPrediction("—");
          // Reset hold tracking when no confident prediction
          resetLetterHold();
        }
      } catch (error) {
        console.error("Inference error:", error);
      } finally {
        landmarkTensor?.dispose();
        featureTensor?.dispose();
        imageTensor?.dispose();
        logits?.dispose();
      }

      animationRef.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  }, [computeCropBox, getTopPrediction, preprocessFrame, preprocessLandmarks, useLandmarks, drawHandLandmarks]);

  // Sentence building functions - track how long a letter is held
  const updateLetterHold = useCallback((letter: string) => {
    const now = Date.now();
    
    // If this is a new letter (different from what we're currently holding)
    if (letter !== currentHoldLetterRef.current) {
      currentHoldLetterRef.current = letter;
      holdStartTimeRef.current = now;
      setHoldProgress(0);
      return;
    }
    
    // Calculate how long we've been holding this letter
    const holdDuration = now - holdStartTimeRef.current;
    const progress = Math.min((holdDuration / LETTER_HOLD_DURATION) * 100, 100);
    setHoldProgress(progress);
    
    // Check if we've held for 3 seconds
    if (holdDuration >= LETTER_HOLD_DURATION) {
      // Allow re-capture of same letter after cooldown period
      const timeSinceLastCapture = now - lastCaptureTimeRef.current;
      const canCaptureSameLetter = letter !== lastCapturedLetterRef.current || timeSinceLastCapture >= RECAPTURE_COOLDOWN;
      
      if (canCaptureSameLetter) {
        captureLetter(letter);
        lastCapturedLetterRef.current = letter;
        lastCaptureTimeRef.current = now;
        // Reset to prevent immediate re-capture
        currentHoldLetterRef.current = "";
        holdStartTimeRef.current = 0;
        setHoldProgress(0);
      }
    }
  }, []);

  const resetLetterHold = useCallback(() => {
    currentHoldLetterRef.current = "";
    holdStartTimeRef.current = 0;
    setHoldProgress(0);
  }, []);

  const captureLetter = useCallback((letter: string) => {
    setCapturedSentence(prev => prev + letter);
    
    toast({
      title: "Letter Captured! ✓",
      description: `Added "${letter}" to sentence`,
    });
  }, [toast]);

  const handleAddSpace = () => {
    setCapturedSentence(prev => prev + " ");
    lastCapturedLetterRef.current = " "; // Prevent immediate re-capture of same letter
  };

  const handleDeleteLast = () => {
    setCapturedSentence(prev => prev.slice(0, -1));
    lastCapturedLetterRef.current = ""; // Allow capturing same letter again
  };

  const handleClearSentence = () => {
    setCapturedSentence("");
    lastCapturedLetterRef.current = "";
    lastCaptureTimeRef.current = 0;
    currentHoldLetterRef.current = "";
    holdStartTimeRef.current = 0;
    setHoldProgress(0);
    toast({
      title: "Cleared",
      description: "Sentence cleared",
    });
  };

  useEffect(() => {
    if (!isModeEnabled) {
      return;
    }

    if (typeof document === "undefined") {
      return;
    }

    // Only create canvas for image-based preprocessing
    if (!useLandmarks) {
      preProcessCanvasRef.current = document.createElement("canvas");
      preProcessCanvasRef.current.width = inputWidth;
      preProcessCanvasRef.current.height = inputHeight;
    }
    
    setPrediction("—");
    setConfidence(0);

    const initialize = async () => {
      await Promise.all([
        initCamera(),
        loadModelAssets(),
        loadHandDetector(),
      ]);
    };

    initialize();

    return () => {
      stopCamera();
      stopDetection();
      modelRef.current = null;
      preProcessCanvasRef.current = null;
      detectorRef.current?.dispose();
      detectorRef.current = null;
      setIsDetectorReady(false);
    };
  }, [mode, isModeEnabled, inputWidth, inputHeight, initCamera, loadModelAssets, loadHandDetector, stopCamera, stopDetection]);

  // Setup overlay canvas dimensions when video is ready
  useEffect(() => {
    if (videoRef.current && overlayCanvasRef.current && isCameraReady) {
      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;
      
      const updateCanvasSize = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      };
      
      // Set initial size
      if (video.videoWidth > 0) {
        updateCanvasSize();
      }
      
      // Update on video metadata loaded
      video.addEventListener('loadedmetadata', updateCanvasSize);
      
      return () => {
        video.removeEventListener('loadedmetadata', updateCanvasSize);
      };
    }
  }, [isCameraReady]);

  useEffect(() => {
    if (!isModeEnabled) {
      return;
    }

    if (isCameraReady && isModelReady && isDetectorReady) {
      startDetection();
    }

    return () => {
      stopDetection();
    };
  }, [isCameraReady, isModelReady, isDetectorReady, isModeEnabled, startDetection, stopDetection]);


  const handleSpeak = () => {
    const textToSpeak = capturedSentence || prediction;
    if (textToSpeak === "—" || !textToSpeak) return;
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
    
    toast({
      title: "Speaking",
      description: textToSpeak,
    });
  };

  const handleCopy = async () => {
    const textToCopy = capturedSentence || prediction;
    if (textToCopy === "—" || !textToCopy) return;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: "Copied",
        description: "Text copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const isPredictionReady = () => capturedSentence !== "" || prediction !== "—";

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack} size="lg">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground capitalize">
            {mode} Mode
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/vocabulary", { state: { mode } })}
              disabled={!isModeEnabled}
            >
              <BookOpen className="w-5 h-5 mr-2" />
              View Vocabulary
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowHelp(true)}
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onOpenDataRecorder}
              disabled={!isModeEnabled}
            >
              <Database className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Camera and Prediction */}
          <div className="space-y-4">
            {/* Video Feed */}
            <Card className="relative overflow-hidden bg-card">
              <div className="aspect-video bg-muted flex items-center justify-center relative">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover scale-x-[-1]"
                  playsInline
                  autoPlay
                  style={{ transform: "scaleX(-1)" }}
                  muted
                />
                {/* Hand tracking overlay canvas */}
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none scale-x-[-1]"
                  style={{ transform: "scaleX(-1)" }}
                />
                {!isCameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-10">
                    <p className="text-lg text-muted-foreground">
                      Initializing camera stream...
                    </p>
                  </div>
                )}
                {isCameraReady && !isModelReady && (
                  <div className="absolute top-4 right-4 bg-gentle-yellow text-warm-gray px-3 py-2 rounded-lg text-sm z-10">
                    Loading alphabet model...
                  </div>
                )}
                {isCameraReady && isModelReady && !isDetectorReady && (
                  <div className="absolute top-4 right-4 bg-gentle-yellow text-warm-gray px-3 py-2 rounded-lg text-sm z-10">
                    Loading hand detector...
                  </div>
                )}
                {isCameraReady && isModelReady && isDetectorReady && (
                  <>
                    <div className={`absolute top-4 right-4 px-3 py-2 rounded-lg text-sm z-10 transition-colors ${
                    handsDetected ? 'bg-pastel-green text-gray-800' : 'bg-muted text-muted-foreground'
                  }`}>
                    {handsDetected ? '✋ Hand Detected' : '👋 Show your hand'}
                  </div>
                    {/* Hand tracking toggle */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowHandTracking(!showHandTracking)}
                      className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur-sm"
                    >
                      {showHandTracking ? '👁️ Hide Tracking' : '👁️ Show Tracking'}
                    </Button>
                  </>
                )}
                {!isModeEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-10">
                    <p className="text-lg text-muted-foreground">
                      This mode is currently locked.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Prediction Display */}
            <Card className="p-8 bg-card">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">
                  Detected Gesture
                </p>
                <p className="text-5xl md:text-7xl font-bold text-foreground min-h-[80px] flex items-center justify-center">
                  {prediction}
                </p>
                {config.ui.showConfidence && (
                  <p className="text-sm text-muted-foreground">
                    Confidence: {(confidence * 100).toFixed(0)}%
                  </p>
                )}
                
                {/* Hold Progress Indicator */}
                {holdProgress > 0 && prediction !== "—" && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Hold for {((LETTER_HOLD_DURATION - (holdProgress * LETTER_HOLD_DURATION / 100)) / 1000).toFixed(1)}s to capture "{prediction}"
                    </p>
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-pastel-green h-full transition-all duration-100 ease-linear"
                        style={{ width: `${holdProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Captured Sentence Display */}
            {capturedSentence && (
              <Card className="p-6 bg-pastel-green border-2 border-green-300">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700 uppercase tracking-wide font-medium">
                      📝 Captured Sentence
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleClearSentence}
                      className="h-8 text-gray-700 hover:bg-green-200"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <div className="bg-white/80 rounded-lg p-4 min-h-[60px] flex items-center">
                    <p className="text-2xl md:text-3xl font-semibold text-gray-800 break-words">
                      {capturedSentence}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddSpace}
                      className="bg-white hover:bg-green-50"
                    >
                      <Space className="w-4 h-4 mr-1" />
                      Add Space
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDeleteLast}
                      disabled={!capturedSentence}
                      className="bg-white hover:bg-green-50"
                    >
                      <Delete className="w-4 h-4 mr-1" />
                      Delete Last
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Action Buttons */}
            <Card className="p-6 bg-card">
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={handleSpeak}
                  disabled={!isPredictionReady()}
                  className="text-lg px-6"
                >
                  <Volume2 className="w-5 h-5 mr-2" />
                  Speak
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShowTranslator(true)}
                  disabled={!isPredictionReady()}
                  className="text-lg px-6"
                >
                  <Languages className="w-5 h-5 mr-2" />
                  Translate
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleCopy}
                  disabled={!isPredictionReady()}
                  className="text-lg px-6"
                >
                  <Copy className="w-5 h-5 mr-2" />
                  Copy
                </Button>
              </div>
            </Card>
          </div>

          {/* Quick Tips */}
          <Card className="p-6 bg-gentle-yellow max-w-2xl">
            <h3 className="text-lg font-bold text-warm-gray mb-2">
              💡 Quick Tips
            </h3>
            <ul className="space-y-2 text-sm text-warm-gray">
              <li>• Keep your hand clearly visible in the camera frame</li>
              <li>• Position yourself 1-2 feet from the camera</li>
              <li>• Good lighting helps improve detection accuracy</li>
              <li>• <strong>Green dots and lines show hand tracking in real-time</strong></li>
              <li>• Use the "Show/Hide Tracking" button to toggle hand landmarks</li>
              <li>• <strong>Hold each gesture for 3 seconds</strong> to capture the letter</li>
              <li>• Watch the progress bar fill up as you hold the gesture</li>
              <li>• To capture the same letter twice (e.g., "HELLO"), briefly remove your hand between captures</li>
              <li>• Letters are added to your sentence automatically after 3 seconds</li>
              <li>• Use Speak, Translate, or Copy buttons to work with your sentence</li>
            </ul>
          </Card>
        </div>
      </div>

      <TranslatorDialog
        open={showTranslator}
        onOpenChange={setShowTranslator}
        text={capturedSentence || prediction}
      />
      <HelpDialog open={showHelp} onOpenChange={setShowHelp} />
    </div>
  );
};

export default LiveDemo;
