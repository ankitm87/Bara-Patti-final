#!/usr/bin/env node

/**
 * Test script to simulate two players joining a room
 * This helps debug the room validation and player joining flow
 */

const API_URL = "http://localhost:3000";
const ROOM_ID = "TEST" + Math.random().toString(36).substring(2, 8).toUpperCase();

console.log(`\n🎮 Testing room join flow with room ID: ${ROOM_ID}\n`);

async function callTRPC(method, input, isMutation = false) {
  const url = `${API_URL}/api/trpc/${method}`;
  console.log(`📡 Calling: ${method} (${isMutation ? 'POST' : 'GET'})`);
  
  try {
    const options = {
      method: isMutation ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (isMutation) {
      options.body = JSON.stringify({ json: input });
      console.log(`   URL: ${url}`);
      console.log(`   Body:`, JSON.stringify(input, null, 2));
    } else {
      const encodedInput = encodeURIComponent(JSON.stringify({ json: input }));
      console.log(`   URL: ${url}?input=${encodedInput}`);
    }
    
    const response = await fetch(isMutation ? url : `${url}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`, options);
    
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    if (response.ok) {
      console.log(`   Response:`, JSON.stringify(data.result?.data || data.json || data, null, 2));
    } else {
      console.log(`   Error:`, data.error?.json?.message || JSON.stringify(data, null, 2));
    }
    return data;
  } catch (error) {
    console.error(`   Error:`, error.message);
    return null;
  }
}

async function main() {
  // Step 1: Player 1 creates room
  console.log("\n--- Step 1: Player 1 creates room ---");
  await callTRPC("room.create", {
    roomId: ROOM_ID,
    playerName: "player1",
    displayName: "Alice"
  }, true);
  
  // Step 2: Verify room exists
  console.log("\n--- Step 2: Verify room exists ---");
  const roomState1 = await callTRPC("room.getState", { roomId: ROOM_ID }, false);
  
  // Step 3: Player 2 joins room
  console.log("\n--- Step 3: Player 2 joins room ---");
  await callTRPC("room.join", {
    roomId: ROOM_ID,
    playerName: "player2",
    displayName: "Bob"
  }, true);
  
  // Step 4: Verify both players are in room
  console.log("\n--- Step 4: Verify both players are in room ---");
  const roomState2 = await callTRPC("room.getState", { roomId: ROOM_ID }, false);
  
  const playerCount = roomState2?.result?.data?.json?.players?.length || 0;
  if (playerCount === 2) {
    console.log("\n✅ SUCCESS: Both players are in the room!");
  } else {
    console.log(`\n❌ FAILED: Expected 2 players, got ${playerCount}`);
  }
}

main().catch(console.error);
