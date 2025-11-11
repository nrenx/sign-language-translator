import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TranslatorDialog from "./TranslatorDialog";
import HelpDialog from "./HelpDialog";

interface LiveDemoProps {
  mode: DatasetMode;
  onBack: () => void;
  onOpenDataRecorder: () => void;
}

const LiveDemo = ({ mode, onBack, onOpenDataRecorder }: LiveDemoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prediction, setPrediction] = useState<string>("—");
  const [confidence, setConfidence] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showTranslator, setShowTranslator] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    initCamera();
    loadModel();
    return () => {
      stopCamera();
    };
  }, [mode]);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
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
    // TODO: Load TensorFlow.js model based on mode
    // This is a placeholder for the actual model loading
    console.log(`Loading model for ${mode} mode...`);
    console.log("Model config:", config.models[mode]);
    
    // Simulate model loading
    setTimeout(() => {
      toast({
        title: "Model Loaded",
        description: `${mode} recognition ready (using mock model)`,
      });
    }, 1000);
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

  const vocabulary = config.models[mode].vocabulary;

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

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Camera and Prediction */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Feed */}
            <Card className="relative overflow-hidden bg-card">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
                    <p className="text-lg text-muted-foreground">
                      Initializing camera...
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

          {/* Vocabulary Reference */}
          <div className="space-y-4">
            <Card className="p-6 bg-card">
              <h3 className="text-xl font-bold text-foreground mb-4">
                Vocabulary
              </h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {mode === "alphabet" ? (
                  <div className="grid grid-cols-5 gap-2">
                    {vocabulary.map((letter) => (
                      <div
                        key={letter}
                        className="aspect-square bg-muted rounded-lg flex items-center justify-center text-2xl font-bold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        {letter}
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {vocabulary.map((item, index) => (
                      <li
                        key={index}
                        className="px-4 py-3 bg-muted rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>

            <Card className="p-6 bg-gentle-yellow">
              <h3 className="text-lg font-bold text-warm-gray mb-2">
                💡 Quick Tips
              </h3>
              <ul className="space-y-2 text-sm text-warm-gray">
                <li>• Keep your hand clearly visible</li>
                <li>• Position 1-2 feet from camera</li>
                <li>• Good lighting helps accuracy</li>
              </ul>
            </Card>
          </div>
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
