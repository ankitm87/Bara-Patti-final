# Bara Patti - Mobile App Interface Design

## Overview

Bara Patti is a traditional Indian 4-player trick-taking card game played with 48 cards (standard 52-card deck minus all 2s). The app provides real-time multiplayer gameplay with invite codes, card animations, and comprehensive scoring.

---

## Screen List

| Screen | Purpose |
|--------|---------|
| **Login** | Email sign-in via Manus OAuth |
| **Home** | Main menu - create/join game, profile access |
| **Create Room** | Generate invite code, share via WhatsApp |
| **Join Room** | Enter invite code to join a game |
| **Lobby** | Waiting room showing 4 player slots, ready status |
| **Game Table** | Main gameplay - cards, trump, timer, tricks |
| **Trio Declaration** | Modal overlay to declare/show trio before play |
| **Trump Reveal** | Full-screen trump card reveal with countdown |
| **Round Summary** | End-of-round scoring breakdown |
| **Game History** | Past games and cumulative scores |
| **Profile** | User name, email, stats |

---

## Primary Content and Functionality

### Login Screen
- Manus OAuth sign-in button (email-based)
- App logo and name prominently displayed
- Clean, minimal design with dark green felt background

### Home Screen
- Large "Create Game" button (primary action)
- "Join Game" button (secondary action)
- Player avatar and name in top bar
- Recent games list at bottom (scrollable)
- Settings gear icon (top-right)

### Create Room Screen
- Auto-generated 6-character invite code (alphanumeric, uppercase)
- Large code display with copy button
- "Share via WhatsApp" button (opens WhatsApp with pre-filled message)
- "Share" button (system share sheet)
- Player list (1/4 initially, showing creator)
- "Start Game" button (enabled when 4 players joined)

### Join Room Screen
- 6-digit code input (large, spaced character boxes)
- "Join" button
- Error state for invalid/full rooms

### Lobby Screen
- 4 player slots arranged in a diamond/cross pattern (mimicking table seating)
- Each slot shows: avatar, name, ready status
- "Ready" toggle button
- Chat/emoji reactions (optional)
- Game starts automatically when all 4 are ready

### Game Table Screen (Core)
- **Top area**: Opponent cards (face down, fanned)
- **Left/Right areas**: Side opponents' cards (face down, fanned vertically)
- **Center**: Play area (trick pile) with 4 card positions
- **Bottom**: Player's hand (face up, fanned, scrollable/draggable)
- **Trump indicator**: Small card in corner showing trump suit + card
- **Timer**: Circular countdown (20 seconds) near active player
- **Score display**: Current hands won by each player
- **Dealer chip**: Small "D" badge on current dealer

### Trio Declaration (Modal)
- Shows before first trick if player has a trio
- "Declare Trio" button with 20-second countdown
- Displays the three cards of the trio
- All players see the declaration with countdown
- Cannot declare after first card is played

### Trump Reveal Screen
- Full-screen card flip animation
- The last card dealt (to dealer) flips to reveal trump
- 20-second countdown for all players to see
- Suit highlighted with glow effect
- "Got it" dismiss button (or auto-dismiss after 20s)

### Round Summary Screen
- Table showing each player's hands won
- Trio bonus indicator
- Points calculation breakdown
- Running total score
- "Next Round" button (dealer rotates)

### Profile Screen
- User avatar (initial-based)
- Display name (editable)
- Email (from sign-in)
- Games played, win rate stats
- Logout button

---

## Key User Flows

### Flow 1: Create and Start Game
1. User taps "Create Game" on Home
2. Room created with invite code displayed
3. User taps "Share via WhatsApp" → WhatsApp opens with invite message
4. Friends join using code → player slots fill up
5. All players tap "Ready"
6. Game begins → dealing animation → trump reveal

### Flow 2: Join a Game
1. User taps "Join Game" on Home
2. Enters 6-character invite code
3. Joins lobby → sees other players
4. Taps "Ready"
5. Waits for all players → game begins

### Flow 3: Playing a Round
1. Cards dealt one-by-one with animation (last card to dealer = trump)
2. Trump card revealed → 20-second viewing window for all
3. Trio check → players with trio get 20 seconds to declare
4. First player (left of dealer) must play Ace of opposite suit
5. Each player plays a card within 20 seconds
6. Trick winner collects and leads next
7. After all 12 tricks → round summary
8. Dealer rotates → next round begins

### Flow 4: Trump Rules During Play
1. If trump suit is led, must follow with higher trump if possible
2. If cutting (playing trump on non-trump lead), next player must play higher trump
3. Cannot play lower trump if you have a higher one when trump is active

---

## Color Choices

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `primary` | `#1B5E20` | `#4CAF50` | Main green (card table felt) |
| `background` | `#0D3B0F` | `#0A1F0B` | Deep green table background |
| `surface` | `#1A4D1E` | `#163318` | Card areas, panels |
| `foreground` | `#FFFFFF` | `#E8F5E9` | Primary text (white on green) |
| `muted` | `#A5D6A7` | `#81C784` | Secondary text |
| `border` | `#2E7D32` | `#388E3C` | Dividers, card borders |
| `success` | `#FFD700` | `#FFC107` | Gold for winning, trio |
| `warning` | `#FF9800` | `#FFB74D` | Timer warning |
| `error` | `#F44336` | `#EF5350` | Error states, time out |

### Card Suit Colors
- Hearts: `#E53935` (red)
- Diamonds: `#E53935` (red)
- Clubs: `#212121` (black)
- Spades: `#212121` (black)

### Accent Colors
- Trump glow: `#FFD700` (gold)
- Active player highlight: `#4CAF50` (bright green)
- Timer critical: `#F44336` (red, last 5 seconds)

---

## Layout Specifications

### Game Table Layout (Portrait 9:16)
```
┌─────────────────────────┐
│  [Score] [Trump] [Timer] │  ← Status bar (48px)
├─────────────────────────┤
│     ┌─────────────┐     │
│     │  Opponent N  │     │  ← Top opponent (cards face down)
│     │  🂠 🂠 🂠 🂠    │     │
│     └─────────────┘     │
│  ┌──┐             ┌──┐  │
│  │O │   ┌─────┐   │O │  │  ← Side opponents
│  │p │   │Play │   │p │  │
│  │p │   │Area │   │p │  │  ← Center trick area
│  │W │   │     │   │E │  │
│  └──┘   └─────┘   └──┘  │
│                          │
│  ┌──────────────────┐   │
│  │  Your Hand        │   │  ← Player's cards (face up)
│  │  🂡 🂢 🂣 🂤 🂥 🂦    │   │
│  └──────────────────┘   │
└─────────────────────────┘
```

### Card Dimensions
- Hand cards: 60px × 84px (ratio 5:7)
- Played cards: 70px × 98px
- Trump indicator: 40px × 56px
- Opponent cards (face down): 36px × 50px

---

## Animation Specifications

### Card Dealing
- Cards fly from deck position to each player, one at a time
- Duration: 150ms per card, 48 cards total (~7.2s)
- Slight arc trajectory
- Sound effect on each card placement

### Card Shuffling (Pre-deal)
- Cards scatter and reassemble animation
- Duration: 2 seconds
- Randomized card positions during shuffle

### Trump Reveal
- Card flips from face-down to face-up
- 3D rotation on Y-axis, 600ms
- Gold glow pulse after reveal

### Playing a Card
- Card slides from hand to center play area
- Duration: 300ms with ease-out
- Slight scale up on selection (1.1x)

### Trick Collection
- All 4 played cards slide to winner's position
- Duration: 400ms
- Fade out at destination

---

## Navigation Structure

```
(tabs)
├── index.tsx          → Home Screen
├── history.tsx        → Game History
├── profile.tsx        → Profile Screen

(modal stack)
├── create-room.tsx    → Create Room
├── join-room.tsx      → Join Room
├── lobby/[roomId].tsx → Lobby
├── game/[roomId].tsx  → Game Table
```

---

## Technical Architecture

### State Management
- **Game state**: Server-authoritative via tRPC + polling (or WebSocket if available)
- **Room state**: Database-backed (rooms, players, game rounds)
- **Local UI state**: React Context for animations, selections
- **Auth state**: Built-in useAuth hook

### Real-Time Communication
- tRPC polling every 1-2 seconds for game state updates
- Server maintains authoritative game state
- Optimistic UI for card plays with server validation

### Data Models
- **Room**: id, code, hostId, status, createdAt
- **RoomPlayer**: roomId, userId, seat, isReady
- **GameRound**: roomId, roundNumber, dealerSeat, trumpCard, trumpSuit, status
- **PlayerHand**: roundId, userId, cards (JSON)
- **Trick**: roundId, trickNumber, leadSeat, cards played, winnerSeat
- **Score**: roundId, userId, handsWon, trioBonus, points
