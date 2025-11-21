import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Hand, Camera, Sun } from "lucide-react";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HelpDialog = ({ open, onOpenChange }: HelpDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl">How to Use Simple Hands</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-4 bg-soft-blue">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <Hand className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-foreground">Hand Position</h3>
                <p className="text-sm text-foreground">
                  Keep your hand clearly visible and facing the camera
                </p>
              </div>
            </Card>

            <Card className="p-4 bg-pastel-green">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <Camera className="w-6 h-6 text-accent-foreground" />
                </div>
                <h3 className="font-bold text-foreground">Distance</h3>
                <p className="text-sm text-foreground">
                  Position yourself 1-2 feet away from the camera
                </p>
              </div>
            </Card>

            <Card className="p-4 bg-gentle-yellow">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-warm-gray/20 flex items-center justify-center">
                  <Sun className="w-6 h-6 text-warm-gray" />
                </div>
                <h3 className="font-bold text-warm-gray">Lighting</h3>
                <p className="text-sm text-warm-gray">
                  Use good lighting for better accuracy
                </p>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground">Getting Started</h3>
            <ol className="space-y-3 list-decimal list-inside text-foreground">
              <li className="text-lg">
                <strong>Choose a Mode:</strong> Start with Alphabet mode to learn letter gestures
              </li>
              <li className="text-lg">
                <strong>Allow Camera Access:</strong> Grant permission when your browser asks
              </li>
              <li className="text-lg">
                <strong>Make Gestures:</strong> Follow the vocabulary guide and make clear hand signs
              </li>
              <li className="text-lg">
                <strong>Use the Tools:</strong> Click Speak to hear, Translate to convert languages, or Copy to clipboard
              </li>
            </ol>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="text-lg font-bold text-foreground mb-2">Privacy Notice</h3>
            <p className="text-sm text-muted-foreground">
              Your privacy matters! The webcam stream stays on-device. We only capture temporary 28×28
              grayscale snapshots to feed the alphabet model—no footage or landmarks leave your browser.
            </p>
          </div>

          <div className="bg-primary/10 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-foreground mb-2">Tips for Best Results</h3>
            <ul className="space-y-2 text-sm text-foreground">
              <li>• Use a plain background without clutter</li>
              <li>• Keep your hand still for 1-2 seconds</li>
              <li>• Practice gestures slowly at first</li>
              <li>• Check the vocabulary guide for correct hand positions</li>
              <li>• If detection is unclear, try adjusting lighting or distance</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpDialog;
