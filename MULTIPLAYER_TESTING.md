# Multiplayer Testing Guide

This guide explains how to test Bara Patti multiplayer with real friends using Expo Go.

## Prerequisites

1. **Your Device**: Running the app in Expo Go (iOS or Android)
2. **Friends' Devices**: Also running Expo Go
3. **Network**: All devices on the same WiFi or with internet access
4. **ngrok Account**: Free account from https://ngrok.com (optional, for external testing)

## Quick Start (Local WiFi Testing)

### Step 1: Get Your Local IP

```bash
# On Mac/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# On Windows
ipconfig
```

Look for your local IP (usually `192.168.x.x` or `10.0.x.x`).

### Step 2: Update Environment Variables

Create a `.env.local` file in the project root:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000
```

Replace `192.168.1.100` with your actual local IP.

### Step 3: Start the Dev Server

```bash
pnpm dev
```

This starts both the Metro bundler (port 8081) and the API server (port 3000).

### Step 4: Share QR Code with Friends

In Expo Go:
1. Open the Expo Go app
2. Scan the QR code from your terminal
3. Share the QR code with friends (screenshot or show on screen)
4. Friends scan the same QR code

### Step 5: Test Multiplayer

1. **You**: Create a game and get the invite code
2. **Friends**: Join using the invite code
3. **All**: Tap "Ready" when all 4 players are in the lobby
4. **Play**: The game should start automatically

## Advanced: ngrok Tunnel (External Testing)

For testing with friends outside your network, use ngrok to create a public tunnel.

### Step 1: Install ngrok

```bash
# Using Homebrew (Mac)
brew install ngrok

# Or download from https://ngrok.com/download
```

### Step 2: Create ngrok Tunnel

```bash
# Create tunnel for port 3000 (API server)
ngrok http 3000
```

You'll see output like:
```
Forwarding                    https://abc123def456.ngrok.io -> http://localhost:3000
```

### Step 3: Update Environment Variable

```env
EXPO_PUBLIC_API_BASE_URL=https://abc123def456.ngrok.io
```

### Step 4: Restart Dev Server

```bash
pnpm dev
```

### Step 5: Share QR Code

Friends can now scan the QR code from anywhere with internet access.

## Troubleshooting

### "Authorization failed" Error

**Problem**: OAuth redirect URI not recognized

**Solution**: This is fixed in the latest version. The app now uses the mobile OAuth endpoint which doesn't require deep link schemes.

### "Cannot connect to server"

**Problem**: Friends can't reach your API server

**Causes**:
- Wrong IP address in `EXPO_PUBLIC_API_BASE_URL`
- Firewall blocking port 3000
- Different WiFi networks

**Solutions**:
1. Verify IP address: `ifconfig | grep "inet "`
2. Check firewall: Allow port 3000
3. Use ngrok for external testing

### "Room not found"

**Problem**: Friend can't join the game

**Causes**:
- Invite code is wrong
- Room expired (after 5 minutes with no players)
- Server crashed

**Solutions**:
1. Double-check the invite code
2. Create a new game
3. Check server logs: `pnpm dev` output

### "Game freezes after card play"

**Problem**: Game state doesn't update after playing a card

**Causes**:
- Server not receiving the card play event
- WebSocket connection dropped
- Network latency

**Solutions**:
1. Check browser console for errors
2. Verify WebSocket connection: Open DevTools → Network → WS tab
3. Check server logs for errors
4. Increase network timeout if on slow connection

## Testing Checklist

- [ ] Create game with invite code
- [ ] Friend joins with invite code
- [ ] Both players see each other in lobby
- [ ] Both tap "Ready"
- [ ] Game starts automatically
- [ ] Cards are dealt to both players
- [ ] Player 1 plays a card
- [ ] Player 2 sees the card immediately
- [ ] Player 2 plays a card
- [ ] Both see the trick winner
- [ ] Game continues for 12 tricks
- [ ] Scores are calculated correctly
- [ ] Leaderboard updates after game

## Performance Tips

1. **Close other apps** - Free up memory for smooth gameplay
2. **Use 5GHz WiFi** - Better latency than 2.4GHz
3. **Keep devices close** - Reduces latency
4. **Restart app** - If experiencing lag, restart Expo Go
5. **Check network** - Run `ping 8.8.8.8` to verify internet

## Debugging

### Enable Verbose Logging

In `app/_layout.tsx`, add:

```typescript
if (__DEV__) {
  console.log("[DEBUG] App initialized");
}
```

### Check WebSocket Connection

In browser DevTools:
1. Open Network tab
2. Filter by "WS" (WebSocket)
3. Should see connection to `/socket.io/`
4. Check frames for real-time events

### Monitor Server Logs

```bash
# In another terminal
pnpm dev
# Look for [socket] messages
```

## Next Steps

After successful multiplayer testing:

1. **Test with 4 real players** - Verify all game mechanics work
2. **Test reconnection** - Disconnect and reconnect mid-game
3. **Test auto-play** - Let timer expire and verify auto-play
4. **Test leaderboard** - Verify scores save after game
5. **Test chat** - Send messages during gameplay

## Deployment

When ready for production:

1. Deploy API server to cloud (Heroku, Railway, Vercel)
2. Update `EXPO_PUBLIC_API_BASE_URL` to production URL
3. Build APK/IPA for distribution
4. Submit to app stores

See `MULTIPLAYER.md` for architecture details.
