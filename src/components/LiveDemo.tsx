import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  initHandDetector,
  detectHands,
  drawHandLandmarks,
  extractLandmarkFeatures,
  cleanupDetector,
} from "@/utils/handDetection";
import type { Hand } from "@tensorflow-models/hand-pose-detection";

interface LiveDemoProps {
  mode: DatasetMode;
  onBack: () => void;
  onOpenDataRecorder: () => void;
}

const LiveDemo = ({ mode, onBack, onOpenDataRecorder }: LiveDemoProps) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [prediction, setPrediction] = useState<string>("—");
  const [confidence, setConfidence] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetectorReady, setIsDetectorReady] = useState(false);
  const [showTranslator, setShowTranslator] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const initialize = async () => {
      await initCamera();
      await loadModel();
    };
    
    initialize();
    
    return () => {
      stopCamera();
      stopDetection();
      cleanupDetector();
    };
  }, [mode]);

  useEffect(() => {
    if (isDetectorReady && !isLoading) {
      console.log("Starting detection loop...");
      startDetection();
    }
    
    return () => {
      stopDetection();
    };
  }, [isDetectorReady, isLoading]);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: "user" // Front camera
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Set canvas size to match video
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
      }
      setIsLoading(false);
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Please allow camera access to use hand detection",
        variant: "destructive",
      });
      console.error("Camera error:", error);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  const loadModel = async () => {
    try {
      toast({
        title: "Loading Hand Detector",
        description: "Initializing MediaPipe Hands...",
      });
      
      await initHandDetector();
      setIsDetectorReady(true);
      
      toast({
        title: "Ready!",
        description: `${mode} recognition active with hand tracking`,
      });
      
      console.log(`Model loaded for ${mode} mode`);
      console.log("Model config:", config.models[mode]);
    } catch (error) {
      console.error("Model loading error:", error);
      toast({
        title: "Model Error",
        description: "Failed to load hand detection model",
        variant: "destructive",
      });
    }
  };

  const startDetection = () => {
    console.log("Detection started, isDetectorReady:", isDetectorReady);
    
    const detectFrame = async () => {
      if (!videoRef.current || !canvasRef.current) {
        animationRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      // Check if video is ready
      if (videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        animationRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      try {
        const hands = await detectHands(videoRef.current);
        
        // Draw hand landmarks on canvas
        drawHandLandmarks(
          canvasRef.current,
          hands,
          videoRef.current.videoWidth,
          videoRef.current.videoHeight
        );

        // Process prediction
        if (hands.length > 0) {
          const features = extractLandmarkFeatures(hands);
          if (features) {
            // TODO: Pass features to trained model for prediction
            // For now, use mock prediction based on mode
            const mockPrediction = getMockPrediction(hands);
            setPrediction(mockPrediction);
            setConfidence(0.85); // Mock confidence
          }
        } else {
          setPrediction("No hand detected");
          setConfidence(0);
        }
      } catch (error) {
        console.error("Detection error:", error);
      }
      
      animationRef.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  };

  const stopDetection = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const getMockPrediction = (hands: Hand[]) => {
    // Simple mock prediction based on hand position
    // Replace this with actual model inference
    const vocabulary = config.models[mode].vocabulary;
    
    if (hands[0]?.keypoints) {
      // Use hand position to cycle through vocabulary (for demo)
      const handY = hands[0].keypoints[0].y;
      const index = Math.floor(handY / 50) % vocabulary.length;
      return vocabulary[index];
    }
    
    return vocabulary[0];
  };

  const handleSpeak = () => {
    if (prediction === "—" || prediction === "No hand detected") return;
    
    const utterance = new SpeechSynthesisUtterance(prediction);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
    
    toast({
      title: "Speaking",
      description: prediction,
    });
  };

  const handleCopy = async () => {
    if (prediction === "—" || prediction === "No hand detected") return;
    
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
                  style={{ transform: 'scaleX(-1)' }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none scale-x-[-1]"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-10">
                    <p className="text-lg text-muted-foreground">
                      Initializing camera and hand tracking...
                    </p>
                  </div>
                )}
                {!isDetectorReady && !isLoading && (
                  <div className="absolute top-4 right-4 bg-gentle-yellow text-warm-gray px-3 py-2 rounded-lg text-sm z-10">
                    Loading hand detector...
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
                  disabled={prediction === "—" || prediction === "No hand detected"}
                  className="text-lg px-6"
                >
                  <Volume2 className="w-5 h-5 mr-2" />
                  Speak
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShowTranslator(true)}
                  disabled={prediction === "—" || prediction === "No hand detected"}
                  className="text-lg px-6"
                >
                  <Languages className="w-5 h-5 mr-2" />
                  Translate
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleCopy}
                  disabled={prediction === "—" || prediction === "No hand detected"}
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
