import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Hand, MessageSquare } from "lucide-react";
import { config, DatasetMode } from "@/config";

const Vocabulary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = (location.state?.mode as DatasetMode) || "alphabet";
  const vocabulary = config.models[mode].vocabulary;

  const getModeIcon = () => {
    switch (mode) {
      case "alphabet":
        return <BookOpen className="w-8 h-8 text-primary" />;
      case "words":
        return <Hand className="w-8 h-8 text-accent-foreground" />;
      case "sequences":
        return <MessageSquare className="w-8 h-8 text-warm-gray" />;
    }
  };

  const getModeColor = () => {
    switch (mode) {
      case "alphabet":
        return "bg-primary/10";
      case "words":
        return "bg-secondary/30";
      case "sequences":
        return "bg-gentle-yellow";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} size="lg">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${getModeColor()} flex items-center justify-center`}>
              {getModeIcon()}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground capitalize">
              {mode} Vocabulary
            </h1>
          </div>
          <div className="w-24" />
        </div>

        <Card className="p-8 bg-card">
          <div className="mb-6">
            <p className="text-lg text-muted-foreground">
              {mode === "alphabet" && "All letters in the sign language alphabet"}
              {mode === "words" && "Common word gestures you can learn"}
              {mode === "sequences" && "Phrase sequences for advanced practice"}
            </p>
          </div>

          {mode === "alphabet" ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {vocabulary.map((letter) => (
                <div
                  key={letter}
                  className="aspect-square bg-muted rounded-lg flex items-center justify-center text-3xl font-bold text-foreground hover:bg-primary hover:text-primary-foreground transition-all hover:scale-110 cursor-pointer"
                >
                  {letter}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {vocabulary.map((item, index) => (
                <div
                  key={index}
                  className="px-6 py-4 bg-muted rounded-lg text-lg font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-all hover:scale-105 cursor-pointer"
                >
                  {item}
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 p-4 bg-soft-blue rounded-lg">
            <h3 className="text-lg font-bold text-foreground mb-2">
              💡 Learning Tips
            </h3>
            <ul className="space-y-2 text-sm text-foreground">
              <li>• Practice each gesture slowly at first</li>
              <li>• Pay attention to finger positions and hand orientation</li>
              <li>• Use the live demo to test your gestures in real-time</li>
              <li>• Start with the most common {mode === "alphabet" ? "letters" : mode}</li>
            </ul>
          </div>
        </Card>

        {mode === "words" && config.models.words.beginnerVocabulary && (
          <Card className="mt-6 p-6 bg-pastel-green">
            <h3 className="text-xl font-bold text-foreground mb-4">
              Beginner Set (Start Here!)
            </h3>
            <div className="flex flex-wrap gap-3">
              {config.models.words.beginnerVocabulary.map((word, index) => (
                <div
                  key={index}
                  className="px-5 py-3 bg-background rounded-lg text-lg font-medium text-foreground shadow-sm"
                >
                  {word}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Vocabulary;
