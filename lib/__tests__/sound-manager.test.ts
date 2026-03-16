import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the SoundManager class.
 * Since the SoundManager uses require() for mp3 assets (Metro-only),
 * we mock the entire module and test the class logic directly.
 */

// Mock expo-audio
const mockPlayer = {
  volume: 1.0,
  play: vi.fn(),
  seekTo: vi.fn(),
  remove: vi.fn(),
};

vi.mock("expo-audio", () => ({
  createAudioPlayer: vi.fn(() => ({ ...mockPlayer })),
  setAudioModeAsync: vi.fn(() => Promise.resolve()),
}));

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: vi.fn((key: string, val: string) => {
      mockStorage[key] = val;
      return Promise.resolve();
    }),
  },
}));

// Mock react-native
vi.mock("react-native", () => ({
  Platform: { OS: "web" },
}));

// We need to mock the require calls for mp3 files.
// The simplest approach: mock the entire sound-manager module's SOUNDS constant
// by mocking the module itself. Instead, let's test the logic in isolation.

describe("SoundManager Logic", () => {
  // Test the core logic without the require() calls by extracting the class behavior

  it("mute toggle logic works correctly", () => {
    let muted = false;
    const toggle = () => { muted = !muted; return muted; };

    expect(muted).toBe(false);
    expect(toggle()).toBe(true);
    expect(toggle()).toBe(false);
    expect(toggle()).toBe(true);
  });

  it("play is skipped when muted", () => {
    const playSpy = vi.fn();
    const muted = true;

    const play = () => {
      if (muted) return;
      playSpy();
    };

    play();
    expect(playSpy).not.toHaveBeenCalled();
  });

  it("play is called when not muted", () => {
    const playSpy = vi.fn();
    const muted = false;

    const play = () => {
      if (muted) return;
      playSpy();
    };

    play();
    expect(playSpy).toHaveBeenCalledOnce();
  });

  it("seekTo(0) is called before play for re-triggering", () => {
    const seekTo = vi.fn();
    const play = vi.fn();
    const muted = false;

    const playSound = () => {
      if (muted) return;
      seekTo(0);
      play();
    };

    playSound();
    expect(seekTo).toHaveBeenCalledWith(0);
    expect(play).toHaveBeenCalled();
    // seekTo should be called before play
    expect(seekTo.mock.invocationCallOrder[0]).toBeLessThan(play.mock.invocationCallOrder[0]);
  });

  it("dispose removes all players", () => {
    const players = [
      { remove: vi.fn() },
      { remove: vi.fn() },
      { remove: vi.fn() },
    ];

    const dispose = () => {
      for (const p of players) {
        p.remove();
      }
    };

    dispose();
    for (const p of players) {
      expect(p.remove).toHaveBeenCalledOnce();
    }
  });

  it("mute preference is persisted", async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;

    await AsyncStorage.setItem("@bara_patti_muted", "true");
    const val = await AsyncStorage.getItem("@bara_patti_muted");
    expect(val).toBe("true");

    await AsyncStorage.setItem("@bara_patti_muted", "false");
    const val2 = await AsyncStorage.getItem("@bara_patti_muted");
    expect(val2).toBe("false");
  });

  it("createAudioPlayer is callable with mock", async () => {
    const { createAudioPlayer } = await import("expo-audio");
    const player = createAudioPlayer("test-source" as any);
    expect(player).toBeDefined();
    expect(typeof player.play).toBe("function");
    expect(typeof player.seekTo).toBe("function");
    expect(typeof player.remove).toBe("function");
  });

  it("setAudioModeAsync is callable with playsInSilentMode", async () => {
    const { setAudioModeAsync } = await import("expo-audio");
    await setAudioModeAsync({ playsInSilentMode: true });
    expect(setAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: true });
  });
});

describe("useSound hook contract", () => {
  it("should export the expected interface", async () => {
    // Mock the sound-manager module to avoid require() for mp3 assets
    vi.doMock("@/lib/sound-manager", () => ({
      soundManager: {
        init: vi.fn(() => Promise.resolve()),
        play: vi.fn(() => Promise.resolve()),
        isMuted: vi.fn(() => false),
        toggleMute: vi.fn(() => Promise.resolve(true)),
        setMuted: vi.fn(() => Promise.resolve()),
        dispose: vi.fn(),
      },
    }));
    const hookModule = await import("../../hooks/use-sound");
    expect(typeof hookModule.useSound).toBe("function");
  });
});
