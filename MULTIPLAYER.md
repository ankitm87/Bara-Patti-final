# Bara Patti WebSocket Multiplayer Integration

This document describes the real-time multiplayer architecture for Bara Patti using Socket.IO WebSockets.

## Architecture Overview

The multiplayer system is built on an **authoritative server model**:

- **Server** (Express + Socket.IO) maintains the single source of truth for game state
- **Clients** (React Native) send actions (card plays, ready status) to the server
- **Server** validates actions, updates game state, and broadcasts updates to all connected players
- **Clients** receive state updates and render the current game state

## Components

### 1. Server-Side (`server/socket-handler.ts`)

Manages game rooms, player connections, and game state synchronization.

**Key Features:**
- Room creation and player management
- Game state persistence per room
- Action validation and broadcasting
- Automatic cleanup when rooms are empty
- Host assignment when host disconnects

**Events:**
- `create-room` - Create a new game room
- `join-room` - Join an existing room
- `leave-room` - Leave a room
- `set-ready` - Mark player as ready
- `start-game` - Start the game (host only)
- `play-card` - Play a card
- `declare-trio` - Declare a trio
- `disconnect` - Handle player disconnection

### 2. Client-Side Hook (`hooks/use-socket.ts`)

React hook for Socket.IO client connection and event management.

**Usage:**
```typescript
const socket = useSocket(serverUrl);

// Room management
await socket.createRoom(roomId, { name, avatar });
await socket.joinRoom(roomId, { name, avatar });
socket.leaveRoom(roomId);

// Game actions
socket.setReady(roomId, seat, isReady);
socket.startGame(roomId);
socket.playCard(roomId, seat, card);
socket.declareTrio(roomId, seat, trio);

// Event listeners
socket.onRoomState((state) => { /* update UI */ });
socket.onGameState((state) => { /* update UI */ });
```

### 3. Multiplayer Context (`lib/multiplayer-context.tsx`)

React context that bridges the Socket.IO connection with the existing game context.

**Features:**
- Automatic connection initialization
- State synchronization with server
- Action emission with seat validation
- Reconnection support

**Usage:**
```typescript
// Wrap your app with MultiplayerProvider
<MultiplayerProvider roomId={roomId} isMultiplayer={true}>
  <GameProvider>
    <YourApp />
  </GameProvider>
</MultiplayerProvider>

// Use in components
const { isConnected, currentSeat, emitPlayCard, emitSetReady } = useMultiplayer();
```

## Integration Steps

### Step 1: Update Lobby Screen

The lobby screen needs to:
1. Detect if this is a multiplayer room (via route params)
2. Wrap the game context with `MultiplayerProvider`
3. Use `useMultiplayer()` to emit ready status and start game

```typescript
// In lobby/[roomId].tsx
import { MultiplayerProvider, useMultiplayer } from "@/lib/multiplayer-context";

export default function LobbyScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const isMultiplayer = !!roomId; // Multiplayer if roomId is present

  return (
    <MultiplayerProvider roomId={roomId} isMultiplayer={isMultiplayer}>
      <LobbyContent />
    </MultiplayerProvider>
  );
}

function LobbyContent() {
  const { emitSetReady, emitStartGame } = useMultiplayer();
  // Use these to emit actions to server
}
```

### Step 2: Update Game Screen

The game screen needs to:
1. Emit card plays via WebSocket instead of local dispatch
2. Receive game state updates from the server
3. Handle disconnection gracefully

```typescript
// In game/[roomId].tsx
const { emitPlayCard, isConnected } = useMultiplayer();

const handlePlayCard = (card: Card) => {
  if (isMultiplayer) {
    emitPlayCard(card); // Send to server
  } else {
    dispatch({ type: "PLAY_CARD", seat: mySeat, card }); // Local dispatch
  }
};
```

### Step 3: Server-Side Game Logic

The server needs to:
1. Validate card plays (check if it's the player's turn)
2. Update game state
3. Determine trick winners
4. Auto-play for timed-out players
5. Fill empty seats with bots

**Key additions to `socket-handler.ts`:**
```typescript
socket.on("play-card", (data) => {
  const room = gameRooms.get(data.roomId);
  
  // Validate it's the current player's turn
  if (room.gameState.currentPlayerSeat !== data.seat) return;
  
  // Validate card is legal
  const validCards = getValidCards(...);
  if (!validCards.find(c => c.id === data.card.id)) return;
  
  // Update game state
  // Broadcast to all players
});
```

## Game Flow

### Quick Play (Local/Bots)
```
Home → Create Game → Lobby (fill with bots) → Game → History
```

### Multiplayer (Real Players)
```
Home → Create Game → Lobby (invite friends) → 
  (Friends join via code) → Game → History
```

## State Synchronization

### Room State (Lobby Phase)
Sent when:
- Player joins/leaves
- Player ready status changes

Contains:
- Player list with names and ready status
- Room ID and host info

### Game State (Playing Phase)
Sent when:
- Game starts (dealing begins)
- Card is played
- Trick is completed
- Round ends

Contains:
- Current phase
- Player hands and scores
- Current trick
- Trump suit
- Dealer info

## Reconnection Handling

When a player disconnects mid-game:

1. **Server** keeps the room and game state for 60 seconds
2. **Client** attempts to reconnect automatically (exponential backoff)
3. **On reconnect**, server sends current game state
4. **If no reconnect within 60s**, player is replaced by a bot

```typescript
// In socket-handler.ts
const RECONNECTION_TIMEOUT = 60000; // 60 seconds

socket.on("disconnect", () => {
  const player = room.players.get(socket.id);
  if (player && room.gameState.phase === "playing") {
    // Wait 60s for reconnection
    setTimeout(() => {
      if (!room.players.has(socket.id)) {
        // Replace with bot
        replacePlayerWithBot(room, player.seat);
      }
    }, RECONNECTION_TIMEOUT);
  }
});
```

## Auto-Play Logic

### Server-Side Auto-Play
When a human player's 20-second timer expires:

1. Server calculates valid cards for that player
2. Server plays the lowest legal card (smart auto-play)
3. Server broadcasts the card play to all clients
4. Game continues normally

### Bot Auto-Play
Bots play immediately with a random delay (600-1600ms):
```typescript
const delay = 600 + Math.random() * 1000;
setTimeout(() => {
  const card = validCards[Math.floor(Math.random() * validCards.length)];
  emitCardPlay(card);
}, delay);
```

## Testing

Run multiplayer tests:
```bash
pnpm test -- multiplayer.test.ts
```

Tests cover:
- Room creation and player management
- Game state synchronization
- Card play validation
- Reconnection scenarios
- Bot vs human player distinction

## Deployment

### Environment Variables

Add to `.env`:
```
EXPO_PUBLIC_API_URL=https://your-api-domain.com
EXPO_PUBLIC_WS_URL=wss://your-api-domain.com
```

### Server Configuration

Socket.IO requires:
- CORS enabled for client domain
- WebSocket support on hosting platform
- Sticky sessions if using multiple server instances

### Client Configuration

Expo requires:
- Deep linking configured for room join codes
- OAuth redirect URL updated
- API URL environment variable set

## Performance Considerations

1. **Network Latency**: Card plays are sent to server, validated, and broadcast back (~100-200ms)
2. **State Size**: Game state is ~5KB per room (4 players, 12 tricks)
3. **Concurrent Rooms**: Server can handle 100+ concurrent rooms on standard hardware
4. **Bandwidth**: ~1KB per action (card play, ready status, etc.)

## Future Enhancements

1. **Spectator Mode** - Allow friends to watch games
2. **Replay System** - Save and replay game actions
3. **Leaderboard Sync** - Update leaderboard in real-time
4. **Voice Chat** - Integrate WebRTC for voice
5. **Mobile Push** - Notify players when it's their turn
6. **Game Analytics** - Track win rates, common strategies
