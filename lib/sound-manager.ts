/**
 * Sound Manager for Bara Patti
 *
 * Manages game sound effects using expo-audio.
 * Supports mute toggle with AsyncStorage persistence.
 * Uses createAudioPlayer for manual lifecycle control of short SFX.
 */

import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Sound assets
const SOUNDS = {
  shuffle: require("@/assets/sounds/card-shuffle.mp3"),
  cardPlay: require("@/assets/sounds/card-play.mp3"),
  myWin: require("@/assets/sounds/my-win.wav"),
  otherWin: require("@/assets/sounds/other-win.wav"),
} as const;

type SoundName = keyof typeof SOUNDS;

const MUTE_KEY = "@bara_patti_muted";

class SoundManager {
  private players: Map<SoundName, ReturnType<typeof createAudioPlayer>> = new Map();
  private muted = false;
  private initialized = false;

  /**
   * Initialize the sound system. Call once at app startup.
   * Sets audio mode and preloads all sound effects.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Enable playback in iOS silent mode
      await setAudioModeAsync({ playsInSilentMode: true });

      // Load mute preference
      const stored = await AsyncStorage.getItem(MUTE_KEY);
      if (stored !== null) {
        this.muted = stored === "true";
      }

      // Preload all sound effects
      for (const [name, source] of Object.entries(SOUNDS)) {
        try {
          const player = createAudioPlayer(source);
          player.volume = 1.0;
          this.players.set(name as SoundName, player);
        } catch (err) {
          console.warn(`[SoundManager] Failed to preload ${name}:`, err);
        }
      }

      this.initialized = true;
    } catch (err) {
      console.warn("[SoundManager] Init failed:", err);
    }
  }

  /**
   * Play a sound effect by name.
   * Seeks to start before playing to allow rapid re-triggering.
   */
  async play(name: SoundName): Promise<void> {
    if (this.muted) return;

    try {
      const player = this.players.get(name);
      if (player) {
        player.seekTo(0);
        player.play();
      }
    } catch (err) {
      console.warn(`[SoundManager] Play ${name} failed:`, err);
    }
  }

  /** Get current mute state */
  isMuted(): boolean {
    return this.muted;
  }

  /** Toggle mute on/off and persist preference */
  async toggleMute(): Promise<boolean> {
    this.muted = !this.muted;
    try {
      await AsyncStorage.setItem(MUTE_KEY, String(this.muted));
    } catch {
      // Ignore storage errors
    }
    return this.muted;
  }

  /** Set mute state directly */
  async setMuted(muted: boolean): Promise<void> {
    this.muted = muted;
    try {
      await AsyncStorage.setItem(MUTE_KEY, String(this.muted));
    } catch {
      // Ignore storage errors
    }
  }

  /** Clean up all players. Call when app is shutting down. */
  dispose(): void {
    for (const player of this.players.values()) {
      try {
        player.remove();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.players.clear();
    this.initialized = false;
  }
}

// Singleton instance
export const soundManager = new SoundManager();
