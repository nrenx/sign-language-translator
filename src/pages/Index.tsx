import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hand, BookOpen, MessageSquare, HelpCircle } from "lucide-react";
import { DatasetMode } from "@/config";
import LiveDemo from "@/components/LiveDemo";
import DataRecorder from "@/components/DataRecorder";
import HelpDialog from "@/components/HelpDialog";

const Index = () => {
  const [selectedMode, setSelectedMode] = useState<DatasetMode | null>(null);
  const [showDataRecorder, setShowDataRecorder] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

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
          <Card
            className="p-8 cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-card border-2 border-border"
            onClick={() => setSelectedMode("alphabet")}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                Alphabet (A–Z)
              </h3>
              <p className="text-muted-foreground text-lg">
                Learn and practice static letter gestures
              </p>
            </div>
          </Card>

          <Card
            className="p-8 cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-card border-2 border-border"
            onClick={() => setSelectedMode("words")}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center">
                <Hand className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                Words
              </h3>
              <p className="text-muted-foreground text-lg">
                Recognize common word gestures
              </p>
            </div>
          </Card>

          <Card
            className="p-8 cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-card border-2 border-border"
            onClick={() => setSelectedMode("sequences")}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gentle-yellow flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-warm-gray" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                Full Sequences
              </h3>
              <p className="text-muted-foreground text-lg">
                Advanced: Detect short phrases
              </p>
            </div>
          </Card>
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
            Privacy First: Your video never leaves your device. Only hand
            landmarks are processed.
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
