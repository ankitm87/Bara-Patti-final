import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, Trick, Suit, getSuitSymbol, getOppositeSuit } from "@/lib/game-engine";

interface LegalMoveHintProps {
  currentTrick: Trick | null;
  trumpSuit: Suit;
  isFirstTrick: boolean;
  isFirstCard: boolean;
  validCards: Card[];
  hand: Card[];
  isMyTurn: boolean;
}

export function LegalMoveHint({
  currentTrick,
  trumpSuit,
  isFirstTrick,
  isFirstCard,
  validCards,
  hand,
  isMyTurn,
}: LegalMoveHintProps) {
  if (!isMyTurn || hand.length === 0) return null;

  let hint = "";

  if (isFirstTrick && isFirstCard) {
    const oppSuit = getOppositeSuit(trumpSuit);
    hint = `Play Ace of ${getSuitSymbol(oppSuit)} ${oppSuit}`;
  } else if (currentTrick && currentTrick.cards.length > 0) {
    const leadSuit = currentTrick.cards[0].card.suit;
    const hasSuit = hand.some((c) => c.suit === leadSuit);

    if (hasSuit) {
      if (leadSuit === trumpSuit) {
        const allHigher = validCards.length < hand.filter((c) => c.suit === leadSuit).length;
        if (allHigher) {
          hint = `Must play higher ${getSuitSymbol(trumpSuit)} trump`;
        } else {
          hint = `Follow ${getSuitSymbol(leadSuit)} suit`;
        }
      } else {
        hint = `Follow ${getSuitSymbol(leadSuit)} suit`;
      }
    } else {
      const trumpInTrick = currentTrick.cards.some(
        (c) => c.card.suit === trumpSuit && leadSuit !== trumpSuit
      );
      if (trumpInTrick) {
        const hasTrump = hand.some((c) => c.suit === trumpSuit);
        if (hasTrump) {
          hint = `Play higher ${getSuitSymbol(trumpSuit)} trump or any card`;
        } else {
          hint = "Play any card";
        }
      } else {
        hint = "Cut with trump or play any card";
      }
    }
  } else {
    hint = "Lead any card";
  }

  if (!hint) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFD70020",
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#FFD70040",
    alignSelf: "center",
  },
  hint: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
