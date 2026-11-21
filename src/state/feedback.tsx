import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';

import { buzz, type BuzzPattern } from '@/lib/haptics';
import { questieSay, setPremiumVoice } from '@/lib/questieVoice';

// "Hear it your way": every announcement goes out on the channels the rider switched on —
// on-screen text, voice, and vibration. Settings are saved on the phone.

export type FeedbackSettings = {
  text: boolean;      // big on-screen banner
  voice: boolean;     // spoken announcement
  vibration: boolean; // haptic pattern
  comfort: boolean;   // motion comfort: calm screen, no animations
  speechRate: number; // 0.8 slow · 1 normal · 1.15 fast
  premiumVoice: boolean; // Questie's ElevenLabs voice (off = phone voice, saves credits)
};

export type AnnouncementKind = 'next' | 'yourStop' | 'arrive' | 'reward' | 'info' | 'error';

export type Announcement = {
  text: string;            // what the banner shows
  speak?: string;          // what the voice says (defaults to `text`)
  buzz?: BuzzPattern;
  kind?: AnnouncementKind;
  banner?: boolean;        // set false when the screen already shows it (e.g. the card reveal)
  voice?: boolean;         // set false to skip speaking this one
};

type Banner = { id: number; text: string; kind: AnnouncementKind };

type FeedbackValue = {
  settings: FeedbackSettings;
  /** Change one setting. Refuses to turn off the last of text / voice / vibration. Returns false if refused. */
  setSetting: <K extends keyof FeedbackSettings>(key: K, value: FeedbackSettings[K]) => boolean;
  announce: (a: Announcement) => void;
  banner: Banner | null;
  dismissBanner: () => void;
  loaded: boolean;
};

const DEFAULTS: FeedbackSettings = { text: true, voice: true, vibration: true, comfort: false, speechRate: 1, premiumVoice: true };
const STORAGE_KEY = 'tquest.feedback.v1';
const Ctx = createContext<FeedbackValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<FeedbackSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(1);

  // load saved settings once
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => { if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) }); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    setPremiumVoice(settings.premiumVoice);
  }, [settings.premiumVoice]);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings, loaded]);

  const showBanner = useCallback((text: string, kind: AnnouncementKind) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setBanner({ id: nextId.current++, text, kind });
    // longer text stays up longer
    hideTimer.current = setTimeout(() => setBanner(null), Math.min(9000, 3500 + text.length * 45));
  }, []);

  const announce = useCallback(
    (a: Announcement) => {
      const kind = a.kind ?? 'info';
      if (settings.text && a.banner !== false) showBanner(a.text, kind);
      // Screen readers (VoiceOver / TalkBack) always get the text.
      AccessibilityInfo.announceForAccessibility(a.speak ?? a.text);
      if (settings.voice && a.voice !== false) {
        // Questie's voice (ElevenLabs, falls back to the device voice)
        questieSay(a.speak ?? a.text, settings.speechRate);
      }
      if (settings.vibration && a.buzz) buzz(a.buzz);
    },
    [settings, showBanner]
  );

  const setSetting = useCallback(
    <K extends keyof FeedbackSettings>(key: K, value: FeedbackSettings[K]) => {
      const next = { ...settings, [key]: value };
      if (!next.text && !next.voice && !next.vibration) {
        showBanner('Keep at least one way on, so you never miss your stop.', 'error');
        if (settings.vibration) buzz('error');
        return false;
      }
      setSettings(next);
      return true;
    },
    [settings, showBanner]
  );

  const dismissBanner = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setBanner(null);
  }, []);

  const value = useMemo(() => ({ settings, setSetting, announce, banner, dismissBanner, loaded }), [settings, setSetting, announce, banner, dismissBanner, loaded]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFeedback(): FeedbackValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFeedback must be used inside <FeedbackProvider>');
  return v;
}
