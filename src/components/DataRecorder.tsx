import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Video, Square, Download, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { config } from "@/config";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DataRecorderProps {
  onBack: () => void;
}

interface RecordedSample {
  label: string;
  frames: number;
  timestamp: number;
}

const DataRecorder = ({ onBack }: DataRecorderProps) => {
  const [selectedDataset, setSelectedDataset] = useState<string>("alphabet");
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSamples, setRecordedSamples] = useState<RecordedSample[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    initCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Please allow camera access to record samples",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  const getVocabulary = () => {
    const mode = selectedDataset as keyof typeof config.models;
    return config.models[mode]?.vocabulary || [];
  };

  const startRecording = () => {
    if (!selectedLabel) {
      toast({
        title: "Select a Label",
        description: "Please choose what gesture you want to record",
        variant: "destructive",
      });
      return;
    }

    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(countdownInterval);
          setIsRecording(true);
          setTimeout(stopRecording, config.dataCollection.maxRecordingSeconds * 1000);
          return null;
        }
        return prev! - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    const newSample: RecordedSample = {
      label: selectedLabel,
      frames: Math.floor(config.dataCollection.maxRecordingSeconds * config.dataCollection.fps),
      timestamp: Date.now(),
    };
    setRecordedSamples([...recordedSamples, newSample]);
    toast({
      title: "Sample Recorded",
      description: `Recorded "${selectedLabel}" gesture`,
    });
  };

  const handleExport = () => {
    const data = {
      dataset: selectedDataset,
      samples: recordedSamples,
      config: config.dataCollection,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hand-gesture-dataset-${selectedDataset}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Dataset Exported",
      description: `Downloaded ${recordedSamples.length} samples`,
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack} size="lg">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Data & Train
          </h2>
          <div className="w-24" />
        </div>

        <Alert className="mb-6 bg-gentle-yellow border-warm-gray">
          <AlertCircle className="h-4 w-4 text-warm-gray" />
          <AlertDescription className="text-warm-gray">
            Record labeled examples for training. Training is currently disabled but you can export
            your data for offline training. Admin/owner can enable server-side training later.
          </AlertDescription>
        </Alert>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recording Interface */}
          <div className="space-y-4">
            <Card className="p-6 bg-card">
              <h3 className="text-xl font-bold text-foreground mb-4">
                Record New Sample
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Dataset Mode
                  </label>
                  <Select
                    value={selectedDataset}
                    onValueChange={setSelectedDataset}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alphabet">Alphabet (A-Z)</SelectItem>
                      <SelectItem value="words">Words</SelectItem>
                      <SelectItem value="sequences">Full Sequences</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Gesture Label
                  </label>
                  <Select
                    value={selectedLabel}
                    onValueChange={setSelectedLabel}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a gesture..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getVocabulary().map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="relative overflow-hidden bg-card">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                />
                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="text-8xl font-bold text-white">
                      {countdown}
                    </span>
                  </div>
                )}
                {isRecording && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-full">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    <span className="font-medium">Recording</span>
                  </div>
                )}
              </div>
            </Card>

            <div className="flex gap-3">
              <Button
                size="lg"
                onClick={startRecording}
                disabled={isRecording || countdown !== null}
                className="flex-1 text-lg"
              >
                <Video className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
              {isRecording && (
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={stopRecording}
                  className="text-lg"
                >
                  <Square className="w-5 h-5 mr-2" />
                  Stop
                </Button>
              )}
            </div>
          </div>

          {/* Recorded Samples */}
          <div className="space-y-4">
            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-foreground">
                  Recorded Samples
                </h3>
                <Button
                  variant="outline"
                  onClick={handleExport}
                  disabled={recordedSamples.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {recordedSamples.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No samples recorded yet
                  </p>
                ) : (
                  recordedSamples.map((sample, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {sample.label}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {sample.frames} frames
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(sample.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-6 bg-card">
              <h3 className="text-xl font-bold text-foreground mb-4">
                Training (Disabled)
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Server-side training is currently disabled. To enable training:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Export your recorded dataset</li>
                <li>Train model offline using Python/TensorFlow</li>
                <li>Convert model to TensorFlow.js format</li>
                <li>Update model URL in config.ts</li>
              </ol>
              <Button
                className="w-full mt-4"
                disabled
                variant="secondary"
              >
                Train Model (Admin Only)
              </Button>
            </Card>

            <Card className="p-6 bg-soft-blue">
              <h3 className="text-lg font-bold text-foreground mb-2">
                📚 Recommended Datasets
              </h3>
              <ul className="space-y-1 text-sm text-foreground">
                <li>• Sign Language MNIST (Kaggle)</li>
                <li>• ASL Alphabet Dataset</li>
                <li>• HaGRID Hand Gestures</li>
                <li>• MS-ASL (Video sequences)</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataRecorder;
