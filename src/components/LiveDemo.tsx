import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatasetMode, config } from "@/config";
import {
  ArrowLeft,
  Volume2,
  Copy,
  Languages,
  HelpCircle,
  Database,
  BookOpen,
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

const LiveDemo = ({ mode, onBack, onOpenDataRecorder }: LiveDemoProps) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const preProcessCanvasRef = useRef<HTMLCanvasElement | null>(null);
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
  const { toast } = useToast();
  const isModeEnabled = config.models[mode].enabled;
  const useLandmarks = config.models[mode].useLandmarks ?? false;
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
          labelsRef.current = await response.json();
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

  // New landmark-based preprocessing
  const preprocessLandmarks = useCallback((hand: handPoseDetection.Hand): tf.Tensor2D | null => {
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
    
    const landmarks = new Float32Array(63);

    // Apply wrist-centering: subtract wrist from all landmarks
    for (let i = 0; i < 21; i++) {
      const kp = keypoints[i];
      landmarks[i * 3] = kp.x - wrist.x;
      landmarks[i * 3 + 1] = kp.y - wrist.y;
      landmarks[i * 3 + 2] = (kp.z || 0) - (wrist.z || 0);
    }

    // Return as [1, 63] tensor
    return tf.tensor2d(landmarks, [1, 63]);
  }, []);

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

      let tensor: tf.Tensor | null = null;
      let logits: tf.Tensor | null = null;

      try {
        const hands = await detectorRef.current.estimateHands(videoRef.current, {
          flipHorizontal: false,
        });

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
        }

        // Use landmark-based or image-based preprocessing based on config
        if (useLandmarks) {
          tensor = preprocessLandmarks(hands[0]);
          if (!tensor) {
            console.warn('Failed to extract landmarks');
            animationRef.current = requestAnimationFrame(detectFrame);
            return;
          }
          if (shouldLog) {
            console.log('Landmark tensor shape:', tensor.shape);
          }
        } else {
          const cropBox = computeCropBox(
            hands[0],
            videoRef.current.videoWidth,
            videoRef.current.videoHeight,
          );
          tensor = preprocessFrame(videoRef.current, preProcessCanvasRef.current!, cropBox);
          if (!tensor) {
            animationRef.current = requestAnimationFrame(detectFrame);
            return;
          }
        }

        logits = modelRef.current.predict(tensor) as tf.Tensor;
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
        } else {
          setPrediction("—");
        }
      } catch (error) {
        console.error("Inference error:", error);
      } finally {
        tensor?.dispose();
        logits?.dispose();
      }

      animationRef.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  }, [computeCropBox, getTopPrediction, preprocessFrame, preprocessLandmarks, useLandmarks]);

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
    if (!isPredictionReady()) return;
    
    const utterance = new SpeechSynthesisUtterance(prediction);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
    
    toast({
      title: "Speaking",
      description: prediction,
    });
  };

  const handleCopy = async () => {
    if (!isPredictionReady()) return;
    
    try {
      await navigator.clipboard.writeText(prediction);
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

  const isPredictionReady = () => prediction !== "—";

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
                  <div className={`absolute top-4 right-4 px-3 py-2 rounded-lg text-sm z-10 transition-colors ${
                    handsDetected ? 'bg-pastel-green text-gray-800' : 'bg-muted text-muted-foreground'
                  }`}>
                    {handsDetected ? '✋ Hand Detected' : '👋 Show your hand'}
                  </div>
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
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 justify-center mt-6">
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
              <li>• Hold each gesture steady for best results</li>
            </ul>
          </Card>
        </div>
      </div>

      <TranslatorDialog
        open={showTranslator}
        onOpenChange={setShowTranslator}
        text={prediction}
      />
      <HelpDialog open={showHelp} onOpenChange={setShowHelp} />
    </div>
  );
};

export default LiveDemo;
