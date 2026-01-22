import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hand, BookOpen, MessageSquare, HelpCircle, Lock } from "lucide-react";
import { DatasetMode, config } from "@/config";
import LiveDemo from "@/components/LiveDemo";
import DataRecorder from "@/components/DataRecorder";
import HelpDialog from "@/components/HelpDialog";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [selectedMode, setSelectedMode] = useState<DatasetMode | null>(null);
  const [showDataRecorder, setShowDataRecorder] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { toast } = useToast();

  const modeCards: Array<{
    mode: DatasetMode;
    title: string;
    description: string;
    accent: string;
    icon: JSX.Element;
  }> = [
    {
      mode: "alphabet",
      title: "Alphabet (A–Z)",
      description: "Realtime inference with our production model",
      accent: "bg-primary/10",
      icon: <BookOpen className="w-8 h-8 text-primary" />,
    },
    {
      mode: "words",
      title: "Words",
      description: "Coming soon — locked until new dataset ships",
      accent: "bg-secondary/30",
      icon: <Hand className="w-8 h-8 text-accent-foreground" />,
    },
    {
      mode: "sequences",
      title: "Full Sequences",
      description: "Future roadmap for short phrases",
      accent: "bg-gentle-yellow",
      icon: <MessageSquare className="w-8 h-8 text-warm-gray" />,
    },
  ];

  const handleModeSelect = (mode: DatasetMode) => {
    if (!config.models[mode].enabled) {
      toast({
        title: "Mode Locked",
        description: "Only the alphabet model is live right now",
      });
      return;
    }
    setSelectedMode(mode);
  };

  if (showDataRecorder) {
    return (
      <div className="min-h-screen bg-background">
        <DataRecorder onBack={() => setShowDataRecorder(false)} />
      </div>
    );
  }

  if (selectedMode) {
    return (
      <div className="min-h-screen bg-background">
        <LiveDemo 
          mode={selectedMode} 
          onBack={() => setSelectedMode(null)}
          onOpenDataRecorder={() => {
            setSelectedMode(null);
            setShowDataRecorder(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12 mt-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Hand className="w-12 h-12 md:w-16 md:h-16 text-primary" />
            <h1 className="text-4xl md:text-6xl font-bold text-foreground">
              Simple Hands
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Point your hand at the camera — we'll read the gesture
          </p>
        </header>

        {/* Dataset Mode Selection */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {modeCards.map(({ mode, title, description, accent, icon }) => {
            const isLocked = !config.models[mode].enabled;
            return (
              <Card
                key={mode}
                className={`relative p-8 bg-card border-2 border-border transition-all ${
                  isLocked ? "opacity-70" : "cursor-pointer hover:shadow-lg hover:scale-105"
                }`}
                onClick={() => handleModeSelect(mode)}
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${accent}`}>
                    {icon}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground capitalize">
                    {title}
                  </h3>
                  <p className="text-muted-foreground text-lg">
                    {description}
                  </p>
                </div>
                {isLocked && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    Locked
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            size="lg"
            variant="outline"
            onClick={() => setShowDataRecorder(true)}
            className="text-lg px-8 py-6"
          >
            Data & Train
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => setShowHelp(true)}
            className="text-lg px-8 py-6"
          >
            <HelpCircle className="w-5 h-5 mr-2" />
            Help
          </Button>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-muted-foreground">
          <p className="text-sm">
            Privacy First: Your video never leaves your device. Only 28×28 grayscale snapshots
            are processed locally for predictions.
          </p>
          <p className="text-xs mt-2">
            Built with ❤️ for accessibility | Open Source
          </p>
        </footer>
      </div>

      <HelpDialog open={showHelp} onOpenChange={setShowHelp} />
    </div>
  );
};

export default Index;
