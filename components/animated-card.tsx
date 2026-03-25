import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { PlayingCard } from "./playing-card";
import { Card as CardType } from "@/lib/game-engine";

interface AnimatedPlayingCardProps {
  card: CardType | null;
  faceDown?: boolean;
  size?: "tiny" | "small" | "medium" | "large" | "xlarge";
  highlighted?: boolean;
  dimmed?: boolean;
  winning?: boolean;
  animationType?: "none" | "deal" | "play" | "win";
  delay?: number;
}

/**
 * Animated card component with support for dealing, playing, and winning animations.
 * Uses react-native-reanimated for smooth 60fps animations.
 */
export function AnimatedPlayingCard({
  card,
  faceDown = false,
  size = "medium",
  highlighted = false,
  dimmed = false,
  winning = false,
  animationType = "none",
  delay = 0,
}: AnimatedPlayingCardProps) {
  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const rotateZ = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (animationType === "none") return;

    // Reset values
    scale.value = animationType === "deal" ? 0 : 1;
    opacity.value = animationType === "deal" ? 0 : 1;
    rotateZ.value = animationType === "deal" ? -15 : 0;
    translateY.value = animationType === "deal" ? -50 : 0;
    translateX.value = animationType === "deal" ? -30 : 0;

    // Start animation after delay
    const timer = setTimeout(() => {
      if (animationType === "deal") {
        // Deal animation: scale up + fade in + rotate + slide down
        scale.value = withTiming(1, {
          duration: 400,
          easing: Easing.out(Easing.cubic),
        });
        opacity.value = withTiming(1, {
          duration: 300,
          easing: Easing.out(Easing.quad),
        });
        rotateZ.value = withTiming(0, {
          duration: 400,
          easing: Easing.out(Easing.cubic),
        });
        translateY.value = withTiming(0, {
          duration: 400,
          easing: Easing.out(Easing.cubic),
        });
        translateX.value = withTiming(0, {
          duration: 400,
          easing: Easing.out(Easing.cubic),
        });
      } else if (animationType === "play") {
        // Play animation: no animation, card stays in place
        // This prevents reshuffling effect after card is played
        return;
      } else if (animationType === "win") {
        // Win animation: scale up + glow effect
        scale.value = withSpring(1.15, {
          damping: 6,
          mass: 1,
          overshootClamping: false,
        });
        opacity.value = withTiming(1, {
          duration: 200,
          easing: Easing.in(Easing.quad),
        });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [animationType, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotateZ: `${rotateZ.value}deg` },
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <PlayingCard
        card={card}
        faceDown={faceDown}
        size={size}
        highlighted={highlighted}
        dimmed={dimmed}
        winning={winning}
      />
    </Animated.View>
  );
}
