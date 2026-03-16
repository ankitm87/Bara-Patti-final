import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Modal,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useGame } from "@/lib/game-context";
import { PlayingCard } from "@/components/playing-card";
import { CountdownTimer } from "@/components/countdown-timer";
import {
  Card,
  Seat,
  Trick,
  GamePhase,
  getSuitSymbol,
  getSuitColor,
  getValidCards,
  findTrios,
  determineTrickWinner,
  calculateRoundScores,
  TURN_TIME_SECONDS,
  REVEAL_TIME_SECONDS,
  TRIO_TIME_SECONDS,
  getOppositeSuit,
  getStartingPlayer,
  RANK_ORDER,
} from "@/lib/game-engine";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = 56;
const CARD_OVERLAP = 20;

const SEAT_COLORS = ["#4CAF50", "#2196F3", "#FF9800", "#E91E63"];

export default function GameScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user } = useAuth();
  const { state, dispatch } = useGame();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showTrioModal, setShowTrioModal] = useState(false);
  const [showRoundEnd, setShowRoundEnd] = useState(false);
  const [trickAnimation, setTrickAnimation] = useState(false);
  const [dealingCardIndex, setDealingCardIndex] = useState(0);
  const [showShuffling, setShowShuffling] = useState(false);

  const mySeat: Seat = 0; // Current player is always seat 0 in local view
  const myPlayer = state.players.find((p) => p.seat === mySeat);
  const myHand = myPlayer?.hand || [];

  // Get valid cards for current player
  const validCards =
    state.phase === "playing" && state.currentPlayerSeat === mySeat && state.trumpSuit
      ? getValidCards(
          myHand,
          state.currentTrick,
          state.trumpSuit,
          state.completedTricks.length === 0,
          !state.currentTrick || state.currentTrick.cards.length === 0
        )
      : [];

  // Auto-play for bot players
  useEffect(() => {
    if (state.phase !== "playing") return;
    if (state.currentPlayerSeat === mySeat) return; // Human player
    if (!state.trumpSuit) return;

    const botPlayer = state.players.find((p) => p.seat === state.currentPlayerSeat);
    if (!botPlayer || !botPlayer.userId.startsWith("bot-")) return;

    // Bot plays after a short delay
    const timer = setTimeout(() => {
      const botValidCards = getValidCards(
        botPlayer.hand,
        state.currentTrick,
        state.trumpSuit!,
        state.completedTricks.length === 0,
        !state.currentTrick || state.currentTrick.cards.length === 0
      );

      if (botValidCards.length > 0) {
        // Simple bot: play random valid card
        const randomCard =
          botValidCards[Math.floor(Math.random() * botValidCards.length)];
        dispatch({
          type: "PLAY_CARD",
          seat: state.currentPlayerSeat,
          card: randomCard,
        });
      }
    }, 800 + Math.random() * 1200);

    return () => clearTimeout(timer);
  }, [state.currentPlayerSeat, state.phase, state.currentTrick?.cards.length]);

  // Handle dealing phase animation
  useEffect(() => {
    if (state.phase === "dealing") {
      setShowShuffling(true);
      const shuffleTimer = setTimeout(() => {
        setShowShuffling(false);
        // Simulate dealing animation
        let cardIdx = 0;
        const dealInterval = setInterval(() => {
          cardIdx++;
          setDealingCardIndex(cardIdx);
          if (cardIdx >= 48) {
            clearInterval(dealInterval);
            // Move to trump reveal
            setTimeout(() => {
              dispatch({ type: "FINISH_DEALING" });
            }, 500);
          }
        }, 80);
        return () => clearInterval(dealInterval);
      }, 2000);
      return () => clearTimeout(shuffleTimer);
    }
  }, [state.phase === "dealing"]);

  // Handle trump reveal phase
  useEffect(() => {
    if (state.phase === "trump_reveal") {
      // Auto-advance after reveal time
    }
  }, [state.phase]);

  // Handle trio check
  useEffect(() => {
    if (state.phase === "trio_check") {
      const trios = findTrios(myHand);
      if (trios.length > 0) {
        setShowTrioModal(true);
      }
      // Bot trio declarations
      state.players.forEach((p) => {
        if (p.userId.startsWith("bot-") && p.hand.length > 0) {
          const botTrios = findTrios(p.hand);
          if (botTrios.length > 0) {
            dispatch({ type: "DECLARE_TRIO", seat: p.seat, trio: botTrios[0] });
          } else {
            dispatch({ type: "DECLINE_TRIO", seat: p.seat });
          }
        }
      });
    }
  }, [state.phase === "trio_check"]);

  // Handle round end
  useEffect(() => {
    if (state.phase === "round_end") {
      setShowRoundEnd(true);
    }
  }, [state.phase]);

  const handlePlayCard = (card: Card) => {
    if (state.currentPlayerSeat !== mySeat) return;
    if (!validCards.some((c) => c.id === card.id)) return;

    dispatch({ type: "PLAY_CARD", seat: mySeat, card });
    setSelectedCard(null);
  };

  const handleTrumpRevealDone = () => {
    dispatch({ type: "FINISH_TRUMP_REVEAL" });
  };

  const handleTrioDeclare = () => {
    const trios = findTrios(myHand);
    if (trios.length > 0) {
      dispatch({ type: "DECLARE_TRIO", seat: mySeat, trio: trios[0] });
    }
    setShowTrioModal(false);
  };

  const handleTrioDecline = () => {
    dispatch({ type: "DECLINE_TRIO", seat: mySeat });
    setShowTrioModal(false);
  };

  const handleFinishTrioCheck = () => {
    dispatch({ type: "FINISH_TRIO_CHECK" });
    setShowTrioModal(false);
  };

  const handleNextRound = () => {
    dispatch({ type: "END_ROUND" });
    dispatch({ type: "NEXT_ROUND" });
    setShowRoundEnd(false);
    // Start new round
    setTimeout(() => {
      dispatch({ type: "START_DEALING" });
    }, 500);
  };

  const handleAutoPlay = () => {
    if (validCards.length > 0) {
      handlePlayCard(validCards[0]);
    }
  };

  // ─── Render Helpers ──────────────────────────────────────────────────────

  const renderOpponentHand = (seat: Seat, position: "top" | "left" | "right") => {
    const player = state.players.find((p) => p.seat === seat);
    if (!player) return null;

    const cardCount = player.hand.length;
    const isActive = state.currentPlayerSeat === seat && state.phase === "playing";

    return (
      <View
        style={[
          styles.opponentArea,
          position === "top" && styles.opponentTop,
          position === "left" && styles.opponentLeft,
          position === "right" && styles.opponentRight,
        ]}
      >
        <View style={styles.opponentInfo}>
          <View
            style={[
              styles.opponentAvatar,
              { backgroundColor: SEAT_COLORS[seat] },
              isActive && styles.activePlayerBorder,
            ]}
          >
            <Text style={styles.opponentAvatarText}>
              {player.odInitials || player.name[0]}
            </Text>
          </View>
          <Text style={styles.opponentName} numberOfLines={1}>
            {player.name}
          </Text>
          <View style={styles.handsBadge}>
            <Text style={styles.handsBadgeText}>{player.handsWon}</Text>
          </View>
        </View>
        <View
          style={[
            styles.opponentCards,
            position === "left" && styles.opponentCardsVertical,
            position === "right" && styles.opponentCardsVertical,
          ]}
        >
          {Array.from({ length: Math.min(cardCount, 6) }).map((_, i) => (
            <View
              key={i}
              style={[
                position === "top"
                  ? { marginLeft: i > 0 ? -12 : 0 }
                  : { marginTop: i > 0 ? -30 : 0 },
              ]}
            >
              <PlayingCard card={null} faceDown size="small" />
            </View>
          ))}
          {cardCount > 6 && (
            <Text style={styles.moreCards}>+{cardCount - 6}</Text>
          )}
        </View>
        {isActive && (
          <CountdownTimer
            seconds={TURN_TIME_SECONDS}
            size={28}
            onComplete={handleAutoPlay}
          />
        )}
      </View>
    );
  };

  const renderPlayArea = () => {
    const trickCards = state.currentTrick?.cards || [];

    return (
      <View style={styles.playArea}>
        {/* Trick cards in center */}
        <View style={styles.trickCards}>
          {[2, 1, 3, 0].map((seat) => {
            const played = trickCards.find((c) => c.seat === seat);
            const pos =
              seat === 0
                ? styles.trickSouth
                : seat === 1
                ? styles.trickWest
                : seat === 2
                ? styles.trickNorth
                : styles.trickEast;

            return (
              <View key={seat} style={[styles.trickCardPosition, pos]}>
                {played ? (
                  <PlayingCard card={played.card} size="medium" />
                ) : (
                  <View style={styles.trickCardPlaceholder} />
                )}
              </View>
            );
          })}
        </View>

        {/* Trump indicator */}
        {state.trumpCard && state.trumpSuit && (
          <View style={styles.trumpIndicator}>
            <Text style={styles.trumpLabel}>Trump</Text>
            <Text
              style={[
                styles.trumpSuit,
                {
                  color:
                    getSuitColor(state.trumpSuit) === "red"
                      ? "#E53935"
                      : "#FFFFFF",
                },
              ]}
            >
              {getSuitSymbol(state.trumpSuit)}
            </Text>
          </View>
        )}

        {/* Trick count */}
        <View style={styles.trickCount}>
          <Text style={styles.trickCountText}>
            Trick {state.completedTricks.length + 1}/12
          </Text>
        </View>
      </View>
    );
  };

  const renderMyHand = () => {
    const isMyTurn = state.currentPlayerSeat === mySeat && state.phase === "playing";
    const handWidth = myHand.length * (CARD_WIDTH - CARD_OVERLAP) + CARD_OVERLAP;

    return (
      <View style={styles.myHandArea}>
        {/* Player info bar */}
        <View style={styles.myInfo}>
          <View style={styles.myInfoLeft}>
            <View
              style={[
                styles.myAvatar,
                isMyTurn && styles.activePlayerBorder,
              ]}
            >
              <Text style={styles.myAvatarText}>
                {myPlayer?.odInitials || "Y"}
              </Text>
            </View>
            <View>
              <Text style={styles.myName}>You</Text>
              <Text style={styles.myHands}>
                Hands: {myPlayer?.handsWon || 0}
              </Text>
            </View>
          </View>
          {isMyTurn && (
            <CountdownTimer
              seconds={TURN_TIME_SECONDS}
              size={36}
              label="Your Turn"
              showLabel
              onComplete={handleAutoPlay}
            />
          )}
        </View>

        {/* Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.myCards,
            { minWidth: handWidth },
          ]}
        >
          {myHand.map((card, i) => {
            const isValid = validCards.some((c) => c.id === card.id);
            const isSelected = selectedCard?.id === card.id;

            return (
              <TouchableOpacity
                key={card.id}
                style={[
                  styles.myCardWrapper,
                  { marginLeft: i > 0 ? -CARD_OVERLAP : 0 },
                  isSelected && styles.myCardSelected,
                  !isValid && isMyTurn && styles.myCardDimmed,
                ]}
                onPress={() => {
                  if (!isMyTurn) return;
                  if (!isValid) return;
                  if (isSelected) {
                    handlePlayCard(card);
                  } else {
                    setSelectedCard(card);
                  }
                }}
                activeOpacity={isValid && isMyTurn ? 0.7 : 1}
              >
                <PlayingCard
                  card={card}
                  size="medium"
                  highlighted={isSelected}
                  dimmed={!isValid && isMyTurn}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {isMyTurn && selectedCard && (
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => handlePlayCard(selectedCard)}
            activeOpacity={0.8}
          >
            <Text style={styles.playButtonText}>Play Card</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ─── Phase-specific overlays ─────────────────────────────────────────────

  if (state.phase === "dealing" || showShuffling) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.overlayContainer}>
          <View style={styles.dealingOverlay}>
            {showShuffling ? (
              <>
                <View style={styles.shuffleCards}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.shuffleCard,
                        {
                          transform: [
                            { rotate: `${(i - 2) * 15}deg` },
                            { translateY: Math.sin(i) * 10 },
                          ],
                        },
                      ]}
                    >
                      <PlayingCard card={null} faceDown size="large" />
                    </View>
                  ))}
                </View>
                <Text style={styles.dealingText}>Shuffling...</Text>
              </>
            ) : (
              <>
                <Text style={styles.dealingText}>Dealing Cards</Text>
                <Text style={styles.dealingCount}>
                  {dealingCardIndex}/48
                </Text>
                <View style={styles.dealingProgress}>
                  <View
                    style={[
                      styles.dealingProgressBar,
                      { width: `${(dealingCardIndex / 48) * 100}%` },
                    ]}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (state.phase === "trump_reveal") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.overlayContainer}>
          <View style={styles.trumpReveal}>
            <Text style={styles.trumpRevealTitle}>Trump Card</Text>
            <View style={styles.trumpRevealCard}>
              {state.trumpCard && (
                <PlayingCard card={state.trumpCard} size="large" highlighted />
              )}
            </View>
            <Text
              style={[
                styles.trumpRevealSuit,
                {
                  color:
                    state.trumpSuit && getSuitColor(state.trumpSuit) === "red"
                      ? "#E53935"
                      : "#FFFFFF",
                },
              ]}
            >
              {state.trumpSuit ? getSuitSymbol(state.trumpSuit) : ""}{" "}
              {state.trumpSuit
                ? state.trumpSuit.charAt(0).toUpperCase() + state.trumpSuit.slice(1)
                : ""}
            </Text>
            <Text style={styles.trumpRevealHint}>
              Game starts with Ace of{" "}
              {state.trumpSuit
                ? getOppositeSuit(state.trumpSuit).charAt(0).toUpperCase() +
                  getOppositeSuit(state.trumpSuit).slice(1)
                : ""}
            </Text>
            <CountdownTimer
              seconds={REVEAL_TIME_SECONDS}
              size={56}
              onComplete={handleTrumpRevealDone}
            />
            <TouchableOpacity
              style={styles.gotItButton}
              onPress={handleTrumpRevealDone}
              activeOpacity={0.8}
            >
              <Text style={styles.gotItText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // ─── Main Game View ──────────────────────────────────────────────────────

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={styles.gameContainer}>
        {/* Top opponent */}
        {renderOpponentHand(2 as Seat, "top")}

        {/* Middle row: left opponent, play area, right opponent */}
        <View style={styles.middleRow}>
          {renderOpponentHand(1 as Seat, "left")}
          {renderPlayArea()}
          {renderOpponentHand(3 as Seat, "right")}
        </View>

        {/* My hand */}
        {renderMyHand()}

        {/* Winning trio indicator */}
        {state.winningTrio && (
          <View style={styles.trioIndicator}>
            <Text style={styles.trioIndicatorText}>
              👑 {state.players[state.winningTrio.seat]?.name} has Trio of{" "}
              {state.winningTrio.trio.rank}s
            </Text>
          </View>
        )}
      </View>

      {/* Trio Declaration Modal */}
      <Modal
        visible={showTrioModal && state.phase === "trio_check"}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.trioModal}>
            <Text style={styles.trioModalTitle}>You have a Trio!</Text>
            <View style={styles.trioCards}>
              {findTrios(myHand).length > 0 &&
                findTrios(myHand)[0].cards.map((card) => (
                  <PlayingCard key={card.id} card={card} size="large" />
                ))}
            </View>
            <CountdownTimer
              seconds={TRIO_TIME_SECONDS}
              size={48}
              onComplete={() => {
                handleTrioDecline();
                handleFinishTrioCheck();
              }}
            />
            <View style={styles.trioActions}>
              <TouchableOpacity
                style={styles.trioDeclareButton}
                onPress={() => {
                  handleTrioDeclare();
                  handleFinishTrioCheck();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.trioDeclareText}>Declare Trio</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.trioDeclineButton}
                onPress={() => {
                  handleTrioDecline();
                  handleFinishTrioCheck();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.trioDeclineText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Round End Modal */}
      <Modal visible={showRoundEnd} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.roundEndModal}>
            <Text style={styles.roundEndTitle}>Round Complete!</Text>
            <View style={styles.scoreTable}>
              <View style={styles.scoreHeader}>
                <Text style={[styles.scoreHeaderText, { flex: 2 }]}>
                  Player
                </Text>
                <Text style={styles.scoreHeaderText}>Hands</Text>
                <Text style={styles.scoreHeaderText}>Points</Text>
              </View>
              {calculateRoundScores(state.players, state.winningTrio).map(
                (score) => {
                  const player = state.players[score.seat];
                  return (
                    <View key={score.seat} style={styles.scoreRow}>
                      <Text
                        style={[styles.scorePlayerName, { flex: 2 }]}
                        numberOfLines={1}
                      >
                        {score.seat === mySeat ? "You" : player?.name}
                        {state.winningTrio?.seat === score.seat ? " 👑" : ""}
                      </Text>
                      <Text style={styles.scoreValue}>{score.handsWon}</Text>
                      <Text
                        style={[
                          styles.scorePoints,
                          {
                            color:
                              score.points > 0
                                ? "#4CAF50"
                                : score.points < 0
                                ? "#F44336"
                                : "#A5D6A7",
                          },
                        ]}
                      >
                        {score.points > 0 ? "+" : ""}
                        {score.points}
                      </Text>
                    </View>
                  );
                }
              )}
            </View>
            <TouchableOpacity
              style={styles.nextRoundButton}
              onPress={handleNextRound}
              activeOpacity={0.8}
            >
              <Text style={styles.nextRoundText}>Next Round</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dealingOverlay: {
    alignItems: "center",
    gap: 20,
  },
  shuffleCards: {
    flexDirection: "row",
    alignItems: "center",
    height: 120,
  },
  shuffleCard: {
    marginHorizontal: -10,
  },
  dealingText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFD700",
  },
  dealingCount: {
    fontSize: 18,
    color: "#A5D6A7",
    fontWeight: "600",
  },
  dealingProgress: {
    width: 200,
    height: 6,
    backgroundColor: "#1A4D1E",
    borderRadius: 3,
    overflow: "hidden",
  },
  dealingProgressBar: {
    height: "100%",
    backgroundColor: "#FFD700",
    borderRadius: 3,
  },
  trumpReveal: {
    alignItems: "center",
    gap: 20,
    padding: 32,
  },
  trumpRevealTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFD700",
  },
  trumpRevealCard: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#FFD700",
    backgroundColor: "#163318",
  },
  trumpRevealSuit: {
    fontSize: 32,
    fontWeight: "700",
  },
  trumpRevealHint: {
    fontSize: 14,
    color: "#A5D6A7",
    textAlign: "center",
  },
  gotItButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginTop: 8,
  },
  gotItText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D3B0F",
  },
  gameContainer: {
    flex: 1,
  },
  middleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  opponentArea: {
    alignItems: "center",
    gap: 4,
  },
  opponentTop: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  opponentLeft: {
    width: 60,
    paddingLeft: 4,
  },
  opponentRight: {
    width: 60,
    paddingRight: 4,
  },
  opponentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  opponentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  activePlayerBorder: {
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  opponentAvatarText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  opponentName: {
    color: "#A5D6A7",
    fontSize: 11,
    fontWeight: "600",
    maxWidth: 60,
  },
  handsBadge: {
    backgroundColor: "#1A4D1E",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  handsBadgeText: {
    color: "#FFD700",
    fontSize: 11,
    fontWeight: "700",
  },
  opponentCards: {
    flexDirection: "row",
    alignItems: "center",
  },
  opponentCardsVertical: {
    flexDirection: "column",
  },
  moreCards: {
    color: "#A5D6A7",
    fontSize: 10,
    marginLeft: 4,
  },
  playArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  trickCards: {
    width: 180,
    height: 180,
    position: "relative",
  },
  trickCardPosition: {
    position: "absolute",
  },
  trickNorth: {
    top: 0,
    left: "50%",
    marginLeft: -28,
  },
  trickSouth: {
    bottom: 0,
    left: "50%",
    marginLeft: -28,
  },
  trickWest: {
    top: "50%",
    left: 0,
    marginTop: -39,
  },
  trickEast: {
    top: "50%",
    right: 0,
    marginTop: -39,
  },
  trickCardPlaceholder: {
    width: 56,
    height: 78,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2E7D3240",
    borderStyle: "dashed",
  },
  trumpIndicator: {
    position: "absolute",
    top: 4,
    right: 8,
    backgroundColor: "#1A4D1E",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#FFD700",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trumpLabel: {
    color: "#FFD700",
    fontSize: 10,
    fontWeight: "700",
  },
  trumpSuit: {
    fontSize: 16,
    fontWeight: "bold",
  },
  trickCount: {
    position: "absolute",
    bottom: 4,
    backgroundColor: "#1A4D1E",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  trickCountText: {
    color: "#A5D6A7",
    fontSize: 11,
    fontWeight: "600",
  },
  myHandArea: {
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#2E7D32",
    backgroundColor: "#0D3B0F",
  },
  myInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  myAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },
  myAvatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  myName: {
    color: "#E8F5E9",
    fontSize: 14,
    fontWeight: "700",
  },
  myHands: {
    color: "#A5D6A7",
    fontSize: 12,
  },
  myCards: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "flex-end",
  },
  myCardWrapper: {
    zIndex: 1,
  },
  myCardSelected: {
    transform: [{ translateY: -12 }],
    zIndex: 10,
  },
  myCardDimmed: {
    opacity: 0.4,
  },
  playButton: {
    backgroundColor: "#FFD700",
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D3B0F",
  },
  trioIndicator: {
    position: "absolute",
    top: 4,
    left: 12,
    right: 12,
    backgroundColor: "#FFD70030",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  trioIndicatorText: {
    color: "#FFD700",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  trioModal: {
    backgroundColor: "#1A4D1E",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 20,
    width: "100%",
    maxWidth: 340,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  trioModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFD700",
  },
  trioCards: {
    flexDirection: "row",
    gap: 8,
  },
  trioActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  trioDeclareButton: {
    flex: 1,
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  trioDeclareText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D3B0F",
  },
  trioDeclineButton: {
    flex: 1,
    backgroundColor: "#163318",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  trioDeclineText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#A5D6A7",
  },
  roundEndModal: {
    backgroundColor: "#1A4D1E",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    borderWidth: 2,
    borderColor: "#FFD700",
    gap: 16,
  },
  roundEndTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFD700",
    textAlign: "center",
  },
  scoreTable: {
    gap: 8,
  },
  scoreHeader: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#2E7D32",
  },
  scoreHeaderText: {
    flex: 1,
    color: "#A5D6A7",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  scorePlayerName: {
    color: "#E8F5E9",
    fontSize: 14,
    fontWeight: "600",
  },
  scoreValue: {
    flex: 1,
    color: "#E8F5E9",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  scorePoints: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  nextRoundButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  nextRoundText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D3B0F",
  },
});
