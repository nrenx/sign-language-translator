import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Volume2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { config } from "@/config";

interface TranslatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  text: string;
}

const LANGUAGES = [
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "ru", name: "Russian" },
];

const TranslatorDialog = ({
  open,
  onOpenChange,
  text,
}: TranslatorDialogProps) => {
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const { toast } = useToast();

  const handleTranslate = async () => {
    if (!config.translation.enabled) {
      toast({
        title: "Translation Disabled",
        description: "Please configure translation API in config.ts",
        variant: "destructive",
      });
      return;
    }

    setIsTranslating(true);
    try {
      // TODO: Replace with actual translation API call
      // This is a placeholder implementation
      const response = await fetch(config.translation.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
          source: config.translation.defaultSourceLanguage,
          target: targetLanguage,
          format: "text",
          api_key: config.translation.apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error("Translation failed");
      }

      const data = await response.json();
      setTranslatedText(data.translatedText || data.translation || "Translation not available");
      
      toast({
        title: "Translated",
        description: `Translated to ${LANGUAGES.find(l => l.code === targetLanguage)?.name}`,
      });
    } catch (error) {
      console.error("Translation error:", error);
      // Fallback: Show placeholder message
      setTranslatedText(`[Translation to ${targetLanguage}: ${text}]`);
      toast({
        title: "Using Mock Translation",
        description: "Configure translation API for real translations",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSpeak = () => {
    if (!translatedText) return;
    
    const utterance = new SpeechSynthesisUtterance(translatedText);
    utterance.lang = targetLanguage;
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = async () => {
    if (!translatedText) return;
    
    try {
      await navigator.clipboard.writeText(translatedText);
      toast({
        title: "Copied",
        description: "Translation copied to clipboard",
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Translate</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Original Text
            </label>
            <div className="p-4 bg-muted rounded-lg text-foreground">
              {text}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Target Language
            </label>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            onClick={handleTranslate}
            disabled={isTranslating}
          >
            {isTranslating ? "Translating..." : "Translate"}
          </Button>

          {translatedText && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Translated Text
                </label>
                <div className="p-4 bg-accent rounded-lg text-accent-foreground">
                  {translatedText}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleSpeak}
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  Speak
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCopy}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TranslatorDialog;
