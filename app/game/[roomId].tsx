import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { AnimatedPlayingCard } from "@/components/animated-card";
import { CountdownTimer } from "@/components/countdown-timer";
import { PlayerPanel } from "@/components/player-panel";
import { TrumpBanner } from "@/components/trump-banner";
import { TrickScoreboard } from "@/components/trick-scoreboard";

import { LegalMoveHint } from "@/components/legal-move-hint";
import { ChatBubble } from "@/components/chat-bubble";
import { AudioRecorder } from "@/components/audio-recorder";
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
  getCardDisplay,
  TURN_TIME_SECONDS,
  REVEAL_TIME_SECONDS,
  TRIO_TIME_SECONDS,
  getOppositeSuit,
  getStartingPlayer,
  RANK_ORDER,
} from "@/lib/game-engine";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSound } from "@/hooks/use-sound";
import { useSocket } from "@/hooks/use-socket";
import { trpc } from "@/lib/trpc";
import { hashGameState, getBestLearnedMoves, BotTrainingData, initializeBotTraining } from "@/lib/bot-training";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH_MY = 58;
const CARD_OVERLAP_MY = 30;

export default function GameScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user } = useAuth();
  const { state, dispatch } = useGame();
  const { socket } = useSocket(process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000");
  // selectedCard removed - single tap plays directly
  const [showTrioModal, setShowTrioModal] = useState(false);
  const [showRoundEnd, setShowRoundEnd] = useState(false);
  const [dealingCardIndex, setDealingCardIndex] = useState(0);
  const [showShuffling, setShowShuffling] = useState(false);
  const botTrainingRef = useRef<Map<string, BotTrainingData>>(new Map());

  const [trickWinnerSeat, setTrickWinnerSeat] = useState<Seat | null>(null);
  const logIdRef = useRef(0);
  const { muted, toggleMute, playShuffle, playCardPlay, playMyWin, playOtherWin } = useSound();
  const saveRoundMutation = trpc.leaderboard.saveRound.useMutation();
  const [groupName, setGroupName] = useState("Family");

  // Load group name from storage
  useEffect(() => {
    AsyncStorage.getItem("bara-patti-group-name").then((name) => {
      if (name) setGroupName(name);
    });
  }, []);

  const mySeat: Seat = 0;
  const myPlayer = state.players.find((p) => p.seat === mySeat);
  const myHand = myPlayer?.hand || [];

  const isMyTurn = state.phase === "playing" && state.currentPlayerSeat === mySeat;
  const isGameActive = state.phase === "playing" || state.phase === "trick_complete";
  const isFirstTrick = state.completedTricks.length === 0;
  const isFirstCard = !state.currentTrick || state.currentTrick.cards.length === 0;

  const validCards = useMemo(() => {
    if (!isMyTurn || !state.trumpSuit) return [];
    return getValidCards(myHand, state.currentTrick, state.trumpSuit, isFirstTrick, isFirstCard);
  }, [isMyTurn, state.trumpSuit, myHand, state.currentTrick, isFirstTrick, isFirstCard]);

  // ─── Activity Log Helper ──────────────────────────────────────────────────
  const addLog = useCallback((text: string) => {
    logIdRef.current++;
    // Activity log removed
  }, []);

  // ─── Bot Auto-play & Timeout Auto-play ────────────────────────────────────
  useEffect(() => {
    if (state.phase !== "playing") return;
    if (state.currentPlayerSeat === mySeat) return;
    if (!state.trumpSuit) return;

    const currentPlayer = state.players.find((p) => p.seat === state.currentPlayerSeat);
    if (!currentPlayer) return;

    const isBot = currentPlayer.userId.startsWith("bot-");
    // Bots play quickly (0.6-1.6s), human players get full timer then auto-play
    const delay = isBot
      ? 600 + Math.random() * 1000
      : (TURN_TIME_SECONDS + 1) * 1000; // Wait for their timer to expire + 1s buffer

    const timer = setTimeout(() => {
      const validForPlayer = getValidCards(
        currentPlayer.hand,
        state.currentTrick,
        state.trumpSuit!,
        state.completedTricks.length === 0,
        !state.currentTrick || state.currentTrick.cards.length === 0
      );
      if (validForPlayer.length > 0) {
        // For bots, use learned patterns; for humans, play lowest card
        let card: Card;
        if (isBot) {
          // Get bot training data
          let botTraining = botTrainingRef.current.get(currentPlayer.userId);
          if (!botTraining) {
            botTraining = initializeBotTraining(currentPlayer.userId);
            botTrainingRef.current.set(currentPlayer.userId, botTraining);
          }

          // Create game state snapshot for learning
          const stateSnapshot = {
            trumpSuit: state.trumpSuit,
            myHand: currentPlayer.hand,
            currentTrick: state.currentTrick?.cards || [],
            completedTricksCount: state.completedTricks.length,
            cardsPlayedByOpponents: state.completedTricks.flatMap((t) => t.cards.map((c) => c.card)),
            isFirstTrick: state.completedTricks.length === 0,
          };

          const stateHash = hashGameState(stateSnapshot);
          const bestCards = getBestLearnedMoves(botTraining, stateHash, validForPlayer);
          card = bestCards[0];
        } else {
          // Human timeout: play lowest card
          const sorted = [...validForPlayer].sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
          card = sorted[0];
        }
        addLog(
          isBot
            ? `${currentPlayer.name} played ${getCardDisplay(card)}`
            : `${currentPlayer.name} timed out — auto-played ${getCardDisplay(card)}`
        );
        playCardPlay();
        dispatch({ type: "PLAY_CARD", seat: state.currentPlayerSeat, card });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [state.currentPlayerSeat, state.phase, state.currentTrick?.cards.length]);

  // ─── Dealing Animation ────────────────────────────────────────────────────
  useEffect(() => {
    if (state.phase !== "dealing") return;
    setShowShuffling(true);
    // Activity log cleared
    playShuffle();
    addLog("Shuffling and dealing cards...");
    const shuffleTimer = setTimeout(() => {
      setShowShuffling(false);
      let cardIdx = 0;
      const dealInterval = setInterval(() => {
        cardIdx++;
        setDealingCardIndex(cardIdx);
        if (cardIdx >= 48) {
          clearInterval(dealInterval);
          setTimeout(() => dispatch({ type: "FINISH_DEALING" }), 400);
        }
      }, 60);
      return () => clearInterval(dealInterval);
    }, 1800);
    return () => clearTimeout(shuffleTimer);
  }, [state.phase]);

  // ─── Trio Check ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (state.phase !== "trio_check") return;

    const myTrios = findTrios(myHand);
    let humanHasTrio = myTrios.length > 0;

    // Process bot trios
    state.players.forEach((p) => {
      if (p.userId.startsWith("bot-") && p.hand.length > 0) {
        const botTrios = findTrios(p.hand);
        if (botTrios.length > 0) {
          dispatch({ type: "DECLARE_TRIO", seat: p.seat, trio: botTrios[0] });
          addLog(`${p.name} declared Trio of ${botTrios[0].rank}s!`);
        } else {
          dispatch({ type: "DECLINE_TRIO", seat: p.seat });
        }
      }
    });

    if (humanHasTrio) {
      // Show trio modal for the human player
      setShowTrioModal(true);
    } else {
      // No trio for human - auto-decline and advance after a short delay
      dispatch({ type: "DECLINE_TRIO", seat: mySeat });
      addLog("No trios found. Starting play...");
      const timer = setTimeout(() => {
        dispatch({ type: "FINISH_TRIO_CHECK" });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.phase]);

  // ─── Detect trick completion (show all 4 cards for 1.5s) ─────────────────
  useEffect(() => {
    if (state.phase !== "trick_complete") return;
    if (!state.currentTrick || state.currentTrick.winnerSeat == null) return;

    const winner = state.players.find((p) => p.seat === state.currentTrick!.winnerSeat);
    if (winner) {
      setTrickWinnerSeat(state.currentTrick.winnerSeat);
      if (state.currentTrick!.winnerSeat === mySeat) {
        playMyWin();
      } else {
        playOtherWin();
      }
      addLog(`${winner.seat === mySeat ? "You" : winner.name} won the hand!`);
    }

    // After 1.5s, clear the trick and move on
    const timer = setTimeout(() => {
      setTrickWinnerSeat(null);
      dispatch({ type: "COMPLETE_TRICK" });
    }, 1500);

    return () => clearTimeout(timer);
  }, [state.phase, state.completedTricks.length]);

  // ─── Round End ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (state.phase === "round_end") setShowRoundEnd(true);
  }, [state.phase]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handlePlayCard = useCallback((card: Card) => {
    if (!isMyTurn) return;
    if (!validCards.some((c) => c.id === card.id)) return;
    addLog(`You played ${getCardDisplay(card)}`);
    playCardPlay();
    dispatch({ type: "PLAY_CARD", seat: mySeat, card });
  }, [isMyTurn, validCards, mySeat]);

  const handleAutoPlay = useCallback(() => {
    if (validCards.length > 0) {
      // Play lowest legal card
      const sorted = [...validCards].sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
      handlePlayCard(sorted[0]);
    }
  }, [validCards, handlePlayCard]);

  const handleTrumpRevealDone = () => dispatch({ type: "FINISH_TRUMP_REVEAL" });

  const handleTrioDeclare = () => {
    const trios = findTrios(myHand);
    if (trios.length > 0) {
      dispatch({ type: "DECLARE_TRIO", seat: mySeat, trio: trios[0] });
      addLog(`You declared Trio of ${trios[0].rank}s!`);
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
    // Save scores to database
    try {
      const scores = calculateRoundScores(state.players, state.winningTrio);
      saveRoundMutation.mutate({
        roomId: state.roomId,
        groupName,
        roundNumber: state.roundNumber,
        trumpSuit: state.trumpSuit || undefined,
        hasTrio: !!state.winningTrio,
        scores: scores.map((s) => ({
          playerName: state.players[s.seat]?.name || `Player ${s.seat + 1}`,
          seat: s.seat,
          handsWon: s.handsWon,
          points: s.points,
          hadTrio: state.winningTrio?.seat === s.seat,
        })),
      });
    } catch (e) {
      // Silently fail - don't block gameplay
      console.warn("Failed to save scores:", e);
    }

    dispatch({ type: "END_ROUND" });
    dispatch({ type: "NEXT_ROUND" });
    setShowRoundEnd(false);
    setTimeout(() => dispatch({ type: "START_DEALING" }), 500);
  };

  // ─── Dealing / Shuffling Overlay ──────────────────────────────────────────
  if (state.phase === "dealing" || showShuffling) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.overlayCenter}>
          {showShuffling ? (
            <View style={styles.shuffleContainer}>
              <View style={styles.shuffleCards}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.shuffleCard,
                      { transform: [{ rotate: `${(i - 2) * 12}deg` }, { translateY: Math.sin(i * 1.2) * 8 }] },
                    ]}
                  >
                    <PlayingCard card={null} faceDown size="large" />
                  </View>
                ))}
              </View>
              <Text style={styles.overlayTitle}>Shuffling Cards...</Text>
            </View>
          ) : (
            <View style={styles.dealingContainer}>
              <Text style={styles.overlayTitle}>Dealing Cards</Text>
              <Text style={styles.dealingCount}>{dealingCardIndex} / 48</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${(dealingCardIndex / 48) * 100}%` }]} />
              </View>
              <View style={styles.dealingTargets}>
                {[0, 1, 2, 3].map((s) => {
                  const p = state.players[s];
                  return (
                    <View key={s} style={styles.dealTarget}>
                      <View style={[styles.dealTargetDot, { backgroundColor: ["#4ADE80", "#60A5FA", "#FB923C", "#F472B6"][s] }]} />
                      <Text style={styles.dealTargetName}>{p?.name || `P${s + 1}`}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScreenContainer>
    );
  }

  // ─── Trump Reveal Overlay ─────────────────────────────────────────────────
  if (state.phase === "trump_reveal") {
    const oppSuit = state.trumpSuit ? getOppositeSuit(state.trumpSuit) : null;
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.overlayCenter}>
          <View style={styles.trumpRevealBox}>
            <Text style={styles.trumpRevealTitle}>Trump Card Revealed</Text>
            <View style={styles.trumpRevealCardWrap}>
              {state.trumpCard && <PlayingCard card={state.trumpCard} size="xlarge" highlighted />}
            </View>
            <View style={styles.trumpRevealInfo}>
              <Text style={[styles.trumpRevealSuit, { color: state.trumpSuit && getSuitColor(state.trumpSuit) === "red" ? "#EF4444" : "#E8F5E9" }]}>
                {state.trumpSuit ? `${getSuitSymbol(state.trumpSuit)} ${state.trumpSuit.charAt(0).toUpperCase() + state.trumpSuit.slice(1)}` : ""}
              </Text>
              {oppSuit && (
                <Text style={styles.trumpRevealHint}>
                  Game starts with A{getSuitSymbol(oppSuit)}
                </Text>
              )}
            </View>
            <CountdownTimer seconds={REVEAL_TIME_SECONDS} size={56} strokeWidth={4} onComplete={handleTrumpRevealDone} />
            <TouchableOpacity style={styles.goldButton} onPress={handleTrumpRevealDone} activeOpacity={0.8}>
              <Text style={styles.goldButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // ─── Main Game View ───────────────────────────────────────────────────────
  const trickCards = state.currentTrick?.cards || [];
  const lastCompletedTrick = state.completedTricks.length > 0 ? state.completedTricks[state.completedTricks.length - 1] : null;

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={styles.gameRoot}>



        {/* Trick complete banner */}
        {state.phase === "trick_complete" && state.currentTrick?.winnerSeat != null && (
          <View style={styles.trickCompleteBanner}>
            <Text style={styles.trickCompleteBannerText}>
              {state.currentTrick.winnerSeat === mySeat
                ? "You won this hand!"
                : `${state.players.find((p) => p.seat === state.currentTrick!.winnerSeat)?.name} won this hand!`}
            </Text>
          </View>
        )}

        {/* Trump Banner - always visible */}
        {state.trumpSuit && (
          <TrumpBanner
            trumpSuit={state.trumpSuit}
            trickNumber={state.completedTricks.length + 1}
            totalTricks={12}
          />
        )}

        {/* Winning trio indicator */}
        {state.winningTrio && (
          <View style={styles.trioStrip}>
            <Text style={styles.trioStripText}>
              {state.players[state.winningTrio.seat]?.name} has Trio of {state.winningTrio.trio.rank}s — others need 4 hands
            </Text>
          </View>
        )}

        {/* Back Button - positioned below trio info, in line with top player */}
        <TouchableOpacity
          style={[styles.muteBtn, { left: 8, right: "auto", top: 125, bottom: "auto" }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          {Platform.OS === "web" ? (
            <Text style={{ fontSize: 24, color: "#A5D6A7" }}>←</Text>
          ) : (
            <MaterialIcons
              name="arrow-back"
              size={24}
              color="#A5D6A7"
            />
          )}
        </TouchableOpacity>

        {/* Table Area */}
        <View style={styles.tableArea}>
          {/* Top Player (Seat 2) */}
          <View style={styles.topPlayer}>
            <PlayerPanel
              player={state.players.find((p) => p.seat === 2)}
              isActive={state.currentPlayerSeat === 2 && state.phase === "playing"}
              isDealer={state.dealerSeat === 2}
              hasTrio={state.winningTrio?.seat === 2}
              position="top"
              mySeat={mySeat}
              onTimerComplete={handleAutoPlay}
              showTimer={state.phase === "playing"}
            />
          </View>

          {/* Middle Row: Left Player, Center Trick, Right Player */}
          <View style={styles.middleRow}>
            {/* Left Player (Seat 1) */}
            <View style={styles.sidePlayer}>
              <PlayerPanel
                player={state.players.find((p) => p.seat === 1)}
                isActive={state.currentPlayerSeat === 1 && state.phase === "playing"}
                isDealer={state.dealerSeat === 1}
                hasTrio={state.winningTrio?.seat === 1}
                position="left"
                mySeat={mySeat}
                onTimerComplete={handleAutoPlay}
                showTimer={state.phase === "playing"}
              />
            </View>

            {/* Center Trick Area */}
            <View style={styles.centerArea}>
              <View style={styles.trickTable}>
                {/* Positions: top=seat2, left=seat1, right=seat3, bottom=seat0 */}
                {([
                  { seat: 2, style: styles.trickTop },
                  { seat: 1, style: styles.trickLeft },
                  { seat: 3, style: styles.trickRight },
                  { seat: 0, style: styles.trickBottom },
                ] as { seat: number; style: any }[]).map(({ seat, style }) => {
                  const played = trickCards.find((c) => c.seat === seat);
                  const isWinner = trickWinnerSeat === seat;
                  return (
                    <View key={seat} style={[styles.trickSlot, style]}>
                      {played ? (
                        <AnimatedPlayingCard
                          card={played.card}
                          size="medium"
                          winning={isWinner}
                          animationType={isWinner ? "win" : "play"}
                        />
                      ) : (
                        <View style={styles.trickPlaceholder} />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Right Player (Seat 3) */}
            <View style={styles.sidePlayer}>
              <PlayerPanel
                player={state.players.find((p) => p.seat === 3)}
                isActive={state.currentPlayerSeat === 3 && state.phase === "playing"}
                isDealer={state.dealerSeat === 3}
                hasTrio={state.winningTrio?.seat === 3}
                position="right"
                mySeat={mySeat}
                onTimerComplete={handleAutoPlay}
                showTimer={state.phase === "playing"}
              />
            </View>
          </View>

          {/* Sidebar overlays: scoreboard + activity log */}
          <View style={styles.sidebarLeft}>
            <TrickScoreboard
              players={state.players}
              currentPlayerSeat={state.currentPlayerSeat}
              mySeat={mySeat}
            />
          </View>
          <View style={styles.sidebarRight}>

          </View>
        </View>

        {/* My Hand Area */}
        <View style={styles.myArea}>
          {/* My info bar + timer */}
          <View style={styles.myInfoBar}>
              <View style={styles.myInfoLeft}>
                <View style={[styles.myAvatar, isMyTurn && styles.myAvatarActive]}>
                  <Text style={styles.myAvatarText}>
                    {myPlayer?.name?.charAt(0).toUpperCase() || "Y"}
                  </Text>
                  {state.dealerSeat === mySeat && (
                    <View style={styles.myDealerBadge}>
                      <Text style={styles.myDealerText}>D</Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={[styles.myName, isMyTurn && { color: "#FFD700" }, { textAlign: "center" }]}>
                    {isMyTurn ? "Your Turn" : myPlayer?.name?.split("@")[0] || "You"}
                  </Text>
                  <Text style={styles.myTricks}>Hands: {myPlayer?.handsWon || 0}</Text>
                </View>
              </View>
            {isMyTurn && (
              <CountdownTimer
                seconds={TURN_TIME_SECONDS}
                size={40}
                strokeWidth={3}
                onComplete={handleAutoPlay}
              />
            )}
            {/* Audio Recorder & Mute Controls */}
            <View style={styles.audioControlsRow}>
              <AudioRecorder
                roomId={roomId as string}
                onRecordingComplete={(uri, duration) => {
                  console.log("Recording saved:", uri, "duration:", duration);
                }}
                onUploadComplete={(audioUrl) => {
                  console.log("Audio uploaded:", audioUrl);
                }}
                onUploadError={(error) => {
                  console.error("Audio upload failed:", error);
                }}
                onSendAudio={(audioUrl, duration) => {
                  console.log("Sending audio to room:", roomId, "URL:", audioUrl);
                  // Send audio message to other players via WebSocket
                  if (socket && roomId) {
                    socket.emit("audio-message", {
                      roomId,
                      seatNumber: mySeat,
                      audioUrl,
                      duration: Math.round(duration / 1000),
                      timestamp: Date.now(),
                    });
                  }
                }}
              />
              <TouchableOpacity
                style={styles.muteControlButton}
                onPress={toggleMute}
                activeOpacity={0.7}
              >
                {Platform.OS === "web" ? (
                  <Text style={{ fontSize: 24, color: muted ? "#81C784" : "#FFD700" }}>
                    {muted ? "🔇" : "🔊"}
                  </Text>
                ) : (
                  <MaterialIcons
                    name={muted ? "volume-off" : "volume-up"}
                    size={24}
                    color={muted ? "#81C784" : "#FFD700"}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Legal move hint */}
          {state.phase === "playing" && (
            <LegalMoveHint
              currentTrick={state.currentTrick}
              trumpSuit={state.trumpSuit!}
              isFirstTrick={isFirstTrick}
              isFirstCard={isFirstCard}
              validCards={validCards}
              hand={myHand}
              isMyTurn={isMyTurn}
            />
          )}

          {/* My Cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.myCardsScroll}
          >
            {myHand.map((card, i) => {
              const isValid = validCards.some((c) => c.id === card.id);
              const canTap = isMyTurn && isValid;

              return (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.myCardSlot,
                    { marginLeft: i > 0 ? -CARD_OVERLAP_MY : 0, zIndex: i },
                  ]}
                  onPress={() => {
                    if (!canTap) return;
                    handlePlayCard(card);
                  }}
                  activeOpacity={canTap ? 0.85 : 1}
                  disabled={!canTap}
                >
                  <AnimatedPlayingCard
                    card={card}
                    size="large"
                    dimmed={isMyTurn && !isValid}
                    animationType="none"
                    delay={0}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* ─── Chat Bubble ───────────────────────────────────────────────── */}
      <ChatBubble playerName={user?.name || "You"} />

      {/* ─── Trio Declaration Modal ──────────────────────────────────────── */}
      <Modal visible={showTrioModal && state.phase === "trio_check"} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.trioModal}>
            <Text style={styles.trioModalTitle}>You Have a Trio!</Text>
            <View style={styles.trioCards}>
              {findTrios(myHand).length > 0 &&
                findTrios(myHand)[0].cards.map((card, idx) => (
                  <PlayingCard key={`trio-${idx}-${card.id}`} card={card} size="xlarge" />
                ))}
            </View>
            <CountdownTimer
              seconds={TRIO_TIME_SECONDS}
              size={52}
              strokeWidth={4}
              onComplete={() => { handleTrioDecline(); handleFinishTrioCheck(); }}
            />
            <View style={styles.trioActions}>
              <TouchableOpacity
                style={styles.goldButton}
                onPress={() => { handleTrioDeclare(); handleFinishTrioCheck(); }}
                activeOpacity={0.8}
              >
                <Text style={styles.goldButtonText}>Declare Trio</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => { handleTrioDecline(); handleFinishTrioCheck(); }}
                activeOpacity={0.8}
              >
                <Text style={styles.outlineButtonText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Round End Modal ─────────────────────────────────────────────── */}
      <Modal visible={showRoundEnd} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.roundEndModal}>
            <Text style={styles.roundEndTitle}>Round Complete!</Text>
            <View style={styles.scoreTable}>
              <View style={styles.scoreHeaderRow}>
                <Text style={[styles.scoreHeaderCell, { flex: 2 }]}>Player</Text>
                <Text style={styles.scoreHeaderCell}>Hands</Text>
                <Text style={styles.scoreHeaderCell}>Points</Text>
              </View>
              {calculateRoundScores(state.players, state.winningTrio).map((score) => {
                const player = state.players[score.seat];
                const seatColor = ["#4ADE80", "#60A5FA", "#FB923C", "#F472B6"][score.seat];
                return (
                  <View key={score.seat} style={styles.scoreRow}>
                    <View style={[styles.scoreRowDot, { backgroundColor: seatColor }]} />
                    <Text style={[styles.scorePlayerName, { flex: 2 }]} numberOfLines={1}>
                      {score.seat === mySeat ? "You" : player?.name}
                      {state.winningTrio?.seat === score.seat ? " (Trio)" : ""}
                    </Text>
                    <Text style={styles.scoreValue}>{score.handsWon}</Text>
                    <Text
                      style={[
                        styles.scorePoints,
                        { color: score.points > 0 ? "#4ADE80" : score.points < 0 ? "#EF4444" : "#A5D6A7" },
                      ]}
                    >
                      {score.points > 0 ? "+" : ""}{score.points}
                    </Text>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity style={styles.goldButton} onPress={handleNextRound} activeOpacity={0.8}>
              <Text style={styles.goldButtonText}>Next Round</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlayCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  shuffleContainer: {
    alignItems: "center",
    gap: 24,
  },
  shuffleCards: {
    flexDirection: "row",
    alignItems: "center",
    height: 120,
  },
  shuffleCard: {
    marginHorizontal: -12,
  },
  overlayTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFD700",
  },
  dealingContainer: {
    alignItems: "center",
    gap: 16,
  },
  dealingCount: {
    fontSize: 20,
    color: "#A5D6A7",
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    width: 220,
    height: 5,
    backgroundColor: "#1A4D1E",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#FFD700",
    borderRadius: 3,
  },
  dealingTargets: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  dealTarget: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dealTargetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dealTargetName: {
    color: "#C8E6C9",
    fontSize: 15,
    fontWeight: "600",
  },
  trumpRevealBox: {
    alignItems: "center",
    gap: 18,
    padding: 28,
    backgroundColor: "#0D3B0FEE",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFD700",
    marginHorizontal: 24,
  },
  trumpRevealTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFD700",
  },
  trumpRevealCardWrap: {
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFD70060",
  },
  trumpRevealInfo: {
    alignItems: "center",
    gap: 4,
  },
  trumpRevealSuit: {
    fontSize: 36,
    fontWeight: "800",
  },
  trumpRevealHint: {
    fontSize: 16,
    color: "#A5D6A7",
  },
  goldButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  goldButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0D3B0F",
  },
  outlineButton: {
    backgroundColor: "transparent",
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#2E7D32",
    flex: 1,
  },
  outlineButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#A5D6A7",
  },
  // ─── Main Game ──────────────────────────────────────────────────────────
  gameRoot: {
    flex: 1,
    paddingTop: Platform.OS === "web" ? 12 : 20,
  },
  trickCompleteBanner: {
    backgroundColor: "#FFD70020",
    paddingTop: Platform.OS === "web" ? 4 : 8,
    paddingBottom: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FFD70040",
    zIndex: 10,
  },
  trickCompleteBannerText: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  topRightControlPanel: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 50,
    gap: 12,
    alignItems: "flex-end",
    flexDirection: "row",
  },
  rightControlPanel: {
    position: "absolute",
    right: 8,
    bottom: 8,
    zIndex: 50,
    gap: 12,
    alignItems: "flex-end",
  },
  audioControlsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  muteControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0D3B0FCC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2E7D3260",
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0D3B0FCC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2E7D3260",
  },
  muteBtn: {
    position: "absolute",
    top: 4,
    right: 8,
    zIndex: 50,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0D3B0FCC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2E7D3260",
  },
  trioStrip: {
    backgroundColor: "#FFD70018",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FFD70030",
  },
  trioStripText: {
    color: "#FFD700",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  tableArea: {
    flex: 1,
    position: "relative",
  },
  topPlayer: {
    alignItems: "center",
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  middleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  sidePlayer: {
    width: 100,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  centerArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  trickTable: {
    width: 180,
    height: 200,
    position: "relative",
  },
  trickSlot: {
    position: "absolute",
  },
  trickTop: {
    top: 0,
    left: "50%",
    marginLeft: -26,
  },
  trickBottom: {
    bottom: 0,
    left: "50%",
    marginLeft: -26,
  },
  trickLeft: {
    top: "50%",
    left: 0,
    marginTop: -37,
  },
  trickRight: {
    top: "50%",
    right: 0,
    marginTop: -37,
  },
  trickPlaceholder: {
    width: 52,
    height: 74,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2E7D3230",
    borderStyle: "dashed",
  },
  sidebarLeft: {
    position: "absolute",
    bottom: 8,
    left: 4,
  },
  sidebarRight: {
    position: "absolute",
    bottom: 8,
    right: 4,
    maxWidth: SCREEN_WIDTH * 0.45,
  },
  // ─── My Hand Area ─────────────────────────────────────────────────────
  myArea: {
    borderTopWidth: 1,
    borderTopColor: "#2E7D3240",
    backgroundColor: "#0A2E0C",
    paddingBottom: Platform.OS === "web" ? 12 : 10,
    paddingTop: 4,
  },
  myInfoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginHorizontal: 0,
    gap: 12,
  },
  myInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    justifyContent: "center",
  },
  myAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4ADE80",
    justifyContent: "center",
    alignItems: "center",
  },
  myAvatarActive: {
    borderWidth: 2,
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  myAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  myDealerBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFD700",
    justifyContent: "center",
    alignItems: "center",
  },
  myDealerText: {
    color: "#0D3B0F",
    fontSize: 8,
    fontWeight: "900",
  },
  myName: {
    color: "#E8F5E9",
    fontSize: 18,
    fontWeight: "700",
    marginHorizontal: 4,
    maxWidth: "80%",
  },
  myTricks: {
    color: "#81C784",
    fontSize: 15,
    fontWeight: "500",
  },
  myCardsScroll: {
    paddingVertical: 6,
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  myCardSlot: {
    // zIndex set inline
  },

  // ─── Modals ───────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  trioModal: {
    backgroundColor: "#0D3B0F",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 18,
    width: "100%",
    maxWidth: 340,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  trioModalTitle: {
    fontSize: 24,
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
    justifyContent: "center",
    alignItems: "center",
  },
  roundEndModal: {
    backgroundColor: "#0D3B0F",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    borderWidth: 2,
    borderColor: "#FFD700",
    gap: 16,
  },
  roundEndTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFD700",
    textAlign: "center",
  },
  scoreTable: {
    gap: 6,
  },
  scoreHeaderRow: {
    flexDirection: "row",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#2E7D3240",
  },
  scoreHeaderCell: {
    flex: 1,
    color: "#81C784",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    gap: 6,
  },
  scoreRowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scorePlayerName: {
    color: "#E8F5E9",
    fontSize: 16,
    fontWeight: "600",
  },
  scoreValue: {
    flex: 1,
    color: "#E8F5E9",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  scorePoints: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
});
