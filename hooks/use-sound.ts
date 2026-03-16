/**
 * React hook for the SoundManager.
 * Provides reactive mute state and sound playback methods.
 */

import { useState, useEffect, useCallback } from "react";
import { soundManager } from "@/lib/sound-manager";

export function useSound() {
  const [muted, setMuted] = useState(soundManager.isMuted());

  useEffect(() => {
    // Initialize sound manager on first use
    soundManager.init().then(() => {
      setMuted(soundManager.isMuted());
    });
  }, []);

  const toggleMute = useCallback(async () => {
    const newMuted = await soundManager.toggleMute();
    setMuted(newMuted);
  }, []);

  const playSound = useCallback(
    (name: "shuffle" | "cardPlay" | "trickWin") => {
      soundManager.play(name);
    },
    []
  );

  return {
    muted,
    toggleMute,
    playSound,
    playShuffle: useCallback(() => soundManager.play("shuffle"), []),
    playCardPlay: useCallback(() => soundManager.play("cardPlay"), []),
    playTrickWin: useCallback(() => soundManager.play("trickWin"), []),
  };
}
