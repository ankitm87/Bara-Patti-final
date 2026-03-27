# Project TODO

- [x] App branding - custom icon, theme colors, app name
- [x] Theme configuration - green card table colors
- [x] Navigation structure - tabs + modal stack
- [x] Icon mappings for tab bar
- [x] Login screen with Manus OAuth sign-in
- [x] Home screen - create/join game buttons, recent games
- [x] Profile screen - user info, stats, logout
- [x] Game history screen
- [ ] Database schema - rooms, players, rounds, tricks, scores
- [ ] Server API - room creation, joining, game state management
- [x] Create room screen with invite code generation
- [x] Join room screen with code input
- [x] WhatsApp sharing of invite code
- [x] Lobby screen with 4 player slots and ready status
- [x] Game engine - 48-card deck (no 2s), dealing logic
- [x] Trump determination - last card to dealer
- [x] Trio detection logic
- [x] Opposite suit starting rule (Ace of opposite suit)
- [x] Trump escalation rule - must play higher trump
- [x] Card rendering - all 48 cards with suits and values
- [x] Card dealing animation
- [x] Card shuffling animation
- [x] Trump reveal screen with 20-second countdown
- [x] Trio declaration modal with 20-second window
- [x] Game table UI - 4 player positions, play area
- [x] 20-second turn timer per player
- [x] Trick-taking gameplay flow
- [x] Hand counting and scoring logic
- [x] Round summary screen with score breakdown
- [x] Dealer rotation between rounds
- [x] Keep screen awake during gameplay
- [x] Game engine unit tests (47 tests passing)
- [x] Bot players for single-player testing

## V2 Upgrades

- [x] Poker-style circular table layout redesign
- [x] Player panels with avatar, name, tricks won, active turn indicator
- [x] Glowing border for active player
- [x] Large tappable cards for current player
- [x] Smaller face-down cards for opponents
- [x] Smooth card play animations (300-500ms)
- [x] Dealing cards one-by-one animation
- [x] Winning trick animation (cards move to winner)
- [x] Center trick area - show cards in order played
- [x] Highlight winning card in trick
- [x] Permanent trump display at top (TRUMP suit symbol)
- [x] Trump reveal animation when dealer's last card flipped
- [x] Circular countdown timer with warning at 5 seconds
- [x] Auto-play lowest legal card on timer expiry
- [x] Grey out and disable illegal cards
- [x] Contextual hints above cards (follow suit, higher trump)
- [x] Live trick counter scoreboard during game
- [x] Collapsible activity log showing recent actions
- [x] Improved invite system with Copy Invite Link button
- [x] Improved WhatsApp share message format
- [ ] Reconnect support (60-second window)
- [x] Mobile UX - prevent accidental card plays (tap-then-confirm)
- [x] Sound effects - shuffle, card play, trick win
- [x] Mute toggle for sound effects
- [x] Future-ready architecture for AI players, async, leaderboard
- [x] V2 game engine tests (14 additional tests passing)

## V3 Sound Effects

- [x] Download free sound effects (shuffle, card play, trick win)
- [x] Build SoundManager utility with expo-audio
- [x] Integrate shuffle sound into dealing animation
- [x] Integrate card play sound when a card is played
- [x] Integrate trick win sound when a trick is won
- [x] Add mute toggle to game screen UI
- [x] Persist mute preference with AsyncStorage

## Bug Fixes

- [x] Fix: User unable to play the game / see shuffling / hear sounds
- [x] Investigate game flow - can user reach the game screen?
- [x] Check if sound files are valid (not 0-byte)
- [x] Verify Create Game flow works end-to-end without auth requirement

## V4 Bug Fixes & UX Improvements

- [x] Fix: Lobby "Ready" button doesn't start the game / navigate to game table
- [x] Fix: 4th player's card not visible when playing first (last card in trick hidden)
- [x] Fix: Cards at right edge cut off - stack cards closer together (but not too narrow)
- [x] Fix: Tab bar (Home, History, Profile) is cut off at the bottom
- [x] Fix: Show trump suit prominently on the playing page
- [x] Fix: Compulsory trump cut rule - must play trump if you don't have the led suit (only play random if you have neither led suit nor trump)
- [x] Fix: Opposite suit starting rule - A of opposite suit must start, not random card
- [x] Fix: In Quick Play the starting rule was not enforced correctly
- [x] Rename: "Tricks" → "Hands" throughout the UI
- [x] Fix: Center my cards horizontally (currently left-aligned)
- [x] Fix: Remove "Play Card" prompt button - just tap card to play it directly

## V5 Fixes & Leaderboard

- [x] Fix: Lobby "Tap when ready" still doesn't start game when room has invited friend + bots
- [x] Fix: 4th card in trick not visible - add 1-2s delay before clearing trick
- [x] Build persistent grouped leaderboard with database storage
- [x] Database schema for leaderboard (players, groups, scores)
- [x] Server API endpoints for leaderboard CRUD
- [x] Leaderboard UI screen with group filtering
- [x] Store game results after each round/session

## V6 Fixes & Features

- [x] Fix: Game freezes after winning a hand - "two children with same key" error
- [x] Add crown icon next to trio winner (e.g. Chachu has winning trio → crown skin)
- [x] Add disappearing push chat messages (5s auto-dismiss) with pre-filled options
- [x] Pre-filled chat: "Badh badh ke aaiye"
- [x] Pre-filled chat: "Naadri banenge ab"
- [x] Pre-filled chat: "Humpe naa hai lalli"
- [x] Custom text chat option
- [x] Different sound for winning a hand vs others winning
- [x] Fix: Activity log cut off on right side on mobile - not readable

## V7 Fixes

- [x] Fix: Game still freezes after winning the first hand in bot play (cannot play second hand)
- [x] Add auto-play for timed-out players in group games (computer assigns card based on logic)

## V8 Real-Time Multiplayer (WebSocket)

- [x] Install socket.io and socket.io-client
- [x] Server-side Socket.IO setup with room management
- [x] Server-side game state management (authoritative server)
- [x] Room creation, joining, and player management via WebSocket
- [x] Game state sync - dealing, card play, trick completion, round end
- [x] Client-side Socket.IO hook for connecting and emitting events
- [ ] Update game context to support multiplayer mode (server-driven state)
- [ ] Update lobby screen for real-time player join/leave/ready
- [ ] Update game screen to send/receive card plays via WebSocket
- [ ] Auto-play for timed-out players on server side
- [ ] Bot fill for empty seats on server side
- [ ] Reconnection support for dropped connections

## V9 OAuth & Multiplayer Testing Setup

- [x] Fix OAuth redirect URI for Expo Go (use mobile endpoint instead of deep link)
- [x] Update OAuth flow to use WebBrowser.openAuthSessionAsync for native
- [x] Create MULTIPLAYER_TESTING.md guide for testing with friends
- [ ] Test OAuth login flow in Expo Go
- [ ] Set up ngrok tunnel for external testing
- [ ] Test multiplayer with 2 real players
- [ ] Test multiplayer with 4 real players
- [ ] Verify WebSocket connection in DevTools
- [ ] Test reconnection scenarios

## V12 Profile & UX Improvements

- [x] Fix profile tab navigation - Leaderboard, Achievements, How to Play screens not loading
- [x] Capture user name from email (extract before @)
- [x] Remove activity log from game screen
- [x] Integrate multiplayer into lobby screen with WebSocket support

## V13 Bug Fixes & Casino Aesthetic

- [x] Fix React key error 67 - duplicate keys in card rendering
- [ ] Implement server-side auto-play for timed-out players
- [ ] Implement bot fill for empty seats
- [x] Redesign with casino-elegant aesthetic (premium colors, typography)
- [x] Increase font sizes throughout app (18px base, 24px headings)
- [x] Increase button sizes and touch targets for accessibility
- [ ] Add premium animations and transitions
- [ ] Refine card styling with shadow and depth effects

## V14 Auto-Play, Animations & Sound Effects

- [x] Implement server-side auto-play for timed-out players
- [ ] Add smooth card dealing animations
- [ ] Add smooth card playing animations
- [ ] Add trick-winning animations
- [x] Replace card play sound with realistic casino chip/card sound
- [x] Replace win sound with realistic casino applause/bell
- [ ] Test animations on device for smoothness

## V15 Layout Adjustments

- [x] Revert home page to original compact layout (no scrolling)
- [x] Enlarge game play screen fonts and layout for better readability
- [x] Increase player names, card info, and turn timer sizes on game screen
- [x] Optimize spacing on game screen to use available space

## V16 Bug Fixes & UI Enhancements

- [x] Fix CountdownTimer dispatch error - setState during render
- [x] Add back button to game screen
- [x] Enlarge trump display (suit symbol bigger)
- [x] Improve player layout - increase spacing and visibility
- [ ] Add smooth card dealing animations
- [ ] Add smooth card playing animations
- [ ] Add trick-winning animations


## V17 Card Animations

- [x] Create AnimatedPlayingCard component with reanimated
- [x] Add deal animation (scale up, fade in, rotate, slide down)
- [x] Add play animation (scale down, fade, slide to center)
- [x] Add win animation (scale up, glow effect)
- [x] Integrate animations into my hand cards rendering
- [x] Integrate animations into trick area cards rendering
- [ ] Test animations on device for smoothness
- [ ] Fine-tune animation timings and easing


## V18 UI Layout Fixes

- [x] Fix overlapping back button and trump display
- [x] Fix overlapping volume icon and hand cards
- [x] Center-align "Your turn" text
- [x] Display full player names instead of email
- [x] Show full player names in avatars (not just initials)
- [x] Fix hands won display - ensure Maasi's count is visible
- [x] Ensure all player info is fully visible on screen


## V19 Final UI Fixes & Player Name Capture

- [x] Add player name capture screen after OAuth login
- [x] Move back button to top-left corner
- [x] Fix Maasi player panel cutoff on right side
- [x] Fix timer visibility - ensure "Your Turn" timer is fully visible
- [x] Remove animation after card play (no reshuffling animation)
- [x] Use different sounds for card plays and wins
- [x] Store player name in user profile
- [x] Display player name throughout the app


## V20 Button & Timer Positioning Fixes

- [x] Move back button below trio info, in line with Chachu player
- [x] Fix timer cutoff on mobile - ensure "Your Turn" timer is fully visible on Expo Go


## V21 Final UI Polish

- [x] Move back button closer to trio info (reduce gap)
- [x] Disable card animation after card play
- [x] Fix timer visibility - ensure circle and text are fully visible
- [x] Fix alignment of "Your Turn", "Hands", and legal move hint

## V22 Top Content Cutoff Fix

- [x] Add top padding to gameRoot to prevent trump banner and hand count from being cut off by status bar
- [x] Increase top padding further to accommodate trick complete banner and status bar
- [x] Add top padding to trick complete banner
- [x] Test in Expo Go to verify all content is visible

## V23 Bot Card Selection Logic

- [x] Fix: Bot plays high cards when it should play low (when can't win)
- [x] Bots were playing RANDOM cards instead of lowest card
- [x] Changed bot auto-play to use lowest card strategy (same as human timeout)
- [x] All 93 tests pass

## V24 Web App Player Features

- [x] Capture player name on web app when joining game
- [x] Prompt user to input their display name
- [x] Fix player positioning - joining player should always be in center (seat 0)
- [x] Fix game sync issue - added WebSocket listeners for room and game state sync
- [x] Implement 60-second player reconnection window with ReconnectionHandler component
- [x] Add real-time game chat with pre-filled messages (Badh badh ke aaiye, Naadri banenge ab)
- [x] Add chat event handlers to server socket
- [x] All 93 tests passing

## V25 Player Avatars & Voice Notes

- [x] Add player avatars with initials or profile pictures in player panels
- [x] Create Avatar component with initials fallback
- [x] Implement short audio voice note recording (max 30 seconds)
- [x] Add voice note playback in game chat
- [x] Integrate voice notes with WebSocket for real-time delivery
- [x] Add voice note UI with record/play buttons
- [x] Test voice notes on mobile and web
- [x] All 93 tests passing
