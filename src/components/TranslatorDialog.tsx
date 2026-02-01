import { useState, useEffect } from "react";
import React from "react";
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

// Sarvam AI TTS - Supports all major Indian languages
// API: https://docs.sarvam.ai/api-reference-docs/text-to-speech
const SARVAM_LANGS: Record<string, string> = {
  "hi": "hi-IN", // Hindi
  "te": "te-IN", // Telugu
  "ta": "ta-IN", // Tamil
  "bn": "bn-IN", // Bengali
  "kn": "kn-IN", // Kannada
  "ml": "ml-IN", // Malayalam
  "mr": "mr-IN", // Marathi
  "gu": "gu-IN", // Gujarati
  "pa": "pa-IN", // Punjabi
  "od": "od-IN", // Odia
};

const LANGUAGES = [
  // Indian Regional Languages (Sarvam AI TTS supported)
  { code: "hi", name: "Hindi (हिंदी)", speechCode: "hi-IN", hasSarvam: true },
  { code: "te", name: "Telugu (తెలుగు)", speechCode: "te-IN", hasSarvam: true },
  { code: "ta", name: "Tamil (தமிழ்)", speechCode: "ta-IN", hasSarvam: true },
  { code: "mr", name: "Marathi (मराठी)", speechCode: "mr-IN", hasSarvam: true },
  { code: "bn", name: "Bengali (বাংলা)", speechCode: "bn-IN", hasSarvam: true },
  { code: "gu", name: "Gujarati (ગુજરાતી)", speechCode: "gu-IN", hasSarvam: true },
  { code: "kn", name: "Kannada (ಕನ್ನಡ)", speechCode: "kn-IN", hasSarvam: true },
  { code: "ml", name: "Malayalam (മലയാളം)", speechCode: "ml-IN", hasSarvam: true },
  { code: "pa", name: "Punjabi (ਪੰਜਾਬੀ)", speechCode: "pa-IN", hasSarvam: true },
  { code: "od", name: "Odia (ଓଡ଼ିଆ)", speechCode: "od-IN", hasSarvam: true },
  // International Languages (Browser Speech API)
  { code: "es", name: "Spanish", speechCode: "es-ES", hasSarvam: false },
  { code: "fr", name: "French", speechCode: "fr-FR", hasSarvam: false },
  { code: "de", name: "German", speechCode: "de-DE", hasSarvam: false },
  { code: "it", name: "Italian", speechCode: "it-IT", hasSarvam: false },
  { code: "pt", name: "Portuguese", speechCode: "pt-BR", hasSarvam: false },
  { code: "zh", name: "Chinese", speechCode: "zh-CN", hasSarvam: false },
  { code: "ja", name: "Japanese", speechCode: "ja-JP", hasSarvam: false },
  { code: "ko", name: "Korean", speechCode: "ko-KR", hasSarvam: false },
  { code: "ar", name: "Arabic", speechCode: "ar-SA", hasSarvam: false },
  { code: "ru", name: "Russian", speechCode: "ru-RU", hasSarvam: false },
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Load speech synthesis voices (they load asynchronously in some browsers)
  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis.cancel();
    };
  }, []);

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

  const handleSpeak = async () => {
    if (!translatedText || isSpeaking) return;
    
    setIsSpeaking(true);
    
    // Stop any ongoing audio/speech
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();
    
    const langConfig = LANGUAGES.find(l => l.code === targetLanguage);
    const sarvamLang = SARVAM_LANGS[targetLanguage];
    
    // Use Sarvam AI for Indian languages
    if (sarvamLang && config.tts?.sarvamApiKey) {
      try {
        const response = await fetch('https://api.sarvam.ai/text-to-speech', {
          method: 'POST',
          headers: {
            'api-subscription-key': config.tts.sarvamApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: translatedText.slice(0, 1500), // Max 1500 chars for bulbul:v2
            target_language_code: sarvamLang,
            speaker: 'anushka', // lowercase as per docs
            model: 'bulbul:v2',
            pace: 0.75, // Slower speech (range: 0.3 to 3.0, default: 1.0)
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || errorData.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.audios && data.audios[0]) {
          // Sarvam returns base64 encoded WAV audio
          const audioBase64 = data.audios[0];
          const audioBlob = await fetch(`data:audio/wav;base64,${audioBase64}`).then(r => r.blob());
          const audioUrl = URL.createObjectURL(audioBlob);
          
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          
          audio.onended = () => {
            setIsSpeaking(false);
            audioRef.current = null;
            URL.revokeObjectURL(audioUrl);
          };
          
          audio.onerror = () => {
            setIsSpeaking(false);
            audioRef.current = null;
            URL.revokeObjectURL(audioUrl);
            toast({
              title: "Speech Error",
              description: "Could not play audio.",
              variant: "destructive",
            });
          };
          
          await audio.play();
          return;
        }
        throw new Error('No audio returned from Sarvam AI');
      } catch (error) {
        setIsSpeaking(false);
        toast({
          title: "Speech Error",
          description: error instanceof Error ? error.message : "TTS failed",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Fallback to Web Speech API for international languages
    const speechLang = langConfig?.speechCode || targetLanguage;
    
    let voices = window.speechSynthesis.getVoices();
    
    // If voices not loaded yet, wait for them
    if (voices.length === 0) {
      await new Promise<void>(resolve => {
        const checkVoices = () => {
          voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            resolve();
          } else {
            setTimeout(checkVoices, 100);
          }
        };
        setTimeout(resolve, 2000);
        checkVoices();
      });
      voices = window.speechSynthesis.getVoices();
    }
    
    // Find a matching voice for the language
    const matchingVoice = voices.find(voice => 
      voice.lang === speechLang || 
      voice.lang.startsWith(targetLanguage + '-') ||
      voice.lang.startsWith(targetLanguage)
    );
    
    // Use browser's speech synthesis
    const utterance = new SpeechSynthesisUtterance(translatedText);
    utterance.lang = speechLang;
    
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
    
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast({
        title: "Speech Error",
        description: "Could not speak in this language. Try Chrome or Edge.",
        variant: "destructive",
      });
    };
    
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
                  disabled={isSpeaking}
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  {isSpeaking ? "Speaking..." : "Speak"}
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
