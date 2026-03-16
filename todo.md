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
