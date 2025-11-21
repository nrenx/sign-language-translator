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
  // Indian Regional Languages
  { code: "hi", name: "Hindi (हिंदी)" },
  { code: "te", name: "Telugu (తెలుగు)" },
  { code: "ta", name: "Tamil (தமிழ்)" },
  { code: "mr", name: "Marathi (मराठी)" },
  { code: "bn", name: "Bengali (বাংলা)" },
  { code: "gu", name: "Gujarati (ગુજરાતી)" },
  { code: "kn", name: "Kannada (ಕನ್ನಡ)" },
  { code: "ml", name: "Malayalam (മലയാളം)" },
  { code: "pa", name: "Punjabi (ਪੰਜਾਬੀ)" },
  { code: "or", name: "Odia (ଓଡ଼ିଆ)" },
  { code: "as", name: "Assamese (অসমীয়া)" },
  { code: "ur", name: "Urdu (اردو)" },
  // International Languages
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
  const [meaningText, setMeaningText] = useState("");
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

    if (!config.translation.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please add your Google API key in config.ts",
        variant: "destructive",
      });
      return;
    }

    setIsTranslating(true);
    try {
      const targetLangName = LANGUAGES.find(l => l.code === targetLanguage)?.name || targetLanguage;
      
      const translationPrompt = `Translate the following text from English to ${targetLangName}. Only respond with the translation, nothing else:\n\n${text}`;
      const meaningPrompt = `Provide a simple explanation of the meaning of "${text}" entirely in ${targetLangName} language only. Use simple words. Write 1-2 sentences. Do not use English at all, only ${targetLangName}.`;

      // Get translation
      const translationResponse = await fetch(`${config.translation.apiEndpoint}?key=${config.translation.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: translationPrompt
            }]
          }]
        }),
      });

      if (!translationResponse.ok) {
        const errorData = await translationResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${translationResponse.status}`);
      }

      const translationData = await translationResponse.json();
      const translation = translationData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      
      if (!translation) {
        throw new Error("No translation returned from API");
      }
      
      setTranslatedText(translation);

      // Get meaning in target language
      const meaningResponse = await fetch(`${config.translation.apiEndpoint}?key=${config.translation.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: meaningPrompt
            }]
          }]
        }),
      });

      if (meaningResponse.ok) {
        const meaningData = await meaningResponse.json();
        const meaning = meaningData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (meaning) {
          setMeaningText(meaning);
        }
      }
      
      toast({
        title: "Translated",
        description: `Translated to ${targetLangName}`,
      });
    } catch (error) {
      console.error("Translation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Translation Failed",
        description: errorMessage,
        variant: "destructive",
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

              {meaningText && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Meaning
                  </label>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-foreground text-sm">
                    {meaningText}
                  </div>
                </div>
              )}

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
