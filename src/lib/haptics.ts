import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

// Distinct vibration patterns, so a rider can tell what happened without looking at the phone.
// Built from short haptic taps on a timer, so the same pattern feels the same on iPhone and Android.
//
//   nextStop   buzz · buzz              a stop is coming up
//   yourStop   short · short · LONG     YOUR stop is next — get ready
//   arrived    LONG · LONG              the train is at a station
//   reward     tap · tap · ding         you got a card
//   rare       rising taps + ding       rare / epic card
//   legendary  long rising roll + ding  legendary card
//   error      error buzz               something went wrong (e.g. not a TQuest code)

export type BuzzPattern = 'tap' | 'nextStop' | 'yourStop' | 'arrived' | 'reward' | 'rare' | 'legendary' | 'error' | 'success';

const { Light, Medium, Heavy } = Haptics.ImpactFeedbackStyle;
const { Success, Error: Err } = Haptics.NotificationFeedbackType;
const Android = Haptics.AndroidHaptics;

type Step = { at: number; impact?: Haptics.ImpactFeedbackStyle; notify?: Haptics.NotificationFeedbackType };

// A "long" pulse = a quick run of heavy taps.
const long = (start: number): Step[] => [0, 70, 140, 210].map((d) => ({ at: start + d, impact: Heavy }));

export const PATTERNS: Record<BuzzPattern, Step[]> = {
  tap: [{ at: 0, impact: Light }],
  nextStop: [{ at: 0, impact: Medium }, { at: 200, impact: Medium }],
  yourStop: [{ at: 0, impact: Medium }, { at: 200, impact: Medium }, ...long(420)],
  arrived: [...long(0), ...long(450)],
  reward: [{ at: 0, impact: Light }, { at: 130, impact: Medium }, { at: 280, notify: Success }],
  rare: [{ at: 0, impact: Light }, { at: 110, impact: Medium }, { at: 220, impact: Heavy }, { at: 380, notify: Success }],
  legendary: [
    { at: 0, impact: Light }, { at: 90, impact: Light }, { at: 180, impact: Medium }, { at: 260, impact: Medium },
    ...long(340), { at: 700, notify: Success },
  ],
  error: [{ at: 0, notify: Err }],
  success: [{ at: 0, notify: Success }],
};

let timers: ReturnType<typeof setTimeout>[] = [];

/** Plays a pattern. Starting a new one cancels any pattern still playing. */
export function buzz(pattern: BuzzPattern) {
  timers.forEach(clearTimeout);
  timers = PATTERNS[pattern].map((step) =>
    setTimeout(() => {
      const duration = step.notify === Err ? 80 : step.notify === Success ? 50 : step.impact === Heavy ? 70 : step.impact === Medium ? 45 : 20;
      const p = Platform.OS === 'android'
        ? Haptics.performAndroidHapticsAsync(
          step.notify === Err
            ? Android.Reject
            : step.notify === Success
              ? Android.Confirm
              : step.impact === Heavy
                ? Android.Long_Press
                : step.impact === Medium
                  ? Android.Virtual_Key
                  : Android.Keyboard_Tap
        ).catch(() => {
          Vibration.vibrate(duration);
        })
        : step.notify !== undefined
          ? Haptics.notificationAsync(step.notify)
          : Haptics.impactAsync(step.impact ?? Medium);
      p.catch(() => {}); // no haptics on web / some devices — ignore
    }, step.at)
  );
}
