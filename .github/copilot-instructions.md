# Sign Language Translator — AI Agent Guide

- **App Skeleton**: Vite + React 18 + TS; `src/main.tsx` mounts `App.tsx`, which wraps tooltip/toast providers and the router for `/`, `/vocabulary`, and a simple 404.
- **Mode Governance**: `src/config.ts` declares `DatasetMode` plus `config.models`. Only `alphabet` has `enabled: true`; `words` and `sequences` stay locked but their metadata lives in config for future work. Use `ENABLED_MODES` if you need a quick list.
- **Model Assets**: Production TFJS files live under `public/models/alphabet_tfjs/` (`model.json`, shards, `labels.json`). Update that folder (or its URL in config) when shipping a new model.
- **Detection Pipeline**: `components/LiveDemo.tsx` uses MediaPipe Hands for hand detection and cropping, then feeds cropped regions to the TFJS model. The flow: webcam → MediaPipe hand detection → compute crop box → resize to model input size → convert to grayscale → normalize to [0,1] → TFJS prediction. Adjust preprocessing if training assumptions change.
- **Lifecycle**: The detection loop sits behind `requestAnimationFrame`. Always call `stopCamera` + `stopDetection` on unmounts or mode switches; TF tensors are disposed each frame to avoid leaks.
- **Locked Modes UX**: `pages/Index.tsx` shows toast + lock badges when users click disabled modes, `Vocabulary.tsx` silently falls back to alphabet if a locked mode is linked, and `DataRecorder` only records when `config.models[dataset].enabled`.
- **Privacy**: All processing happens in-browser. MediaPipe runs locally, video never leaves the device, only grayscale tensors are processed.
- **UI System**: Minimal shadcn-inspired components in `components/ui/`: alert, button, card, dialog, select, sonner, toast, toaster, tooltip. All use Tailwind + the `cn()` utility from `lib/utils.ts`.
- **Notifications**: `hooks/use-toast.ts` provides single-toast notifications. Reuse existing speech/clipboard helpers in `LiveDemo` & `TranslatorDialog` for consistency.
- **Build & Scripts**: `npm run dev` (Vite), `npm run build`, `npm run preview`, `npm run lint`. No automated tests yet—mention that when landing risky changes.
- **Browser Guards**: Components defensively check for `navigator`/`document` before use to keep future SSR options open.
