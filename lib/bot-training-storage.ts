/**
 * Bot Training Storage
 *
 * Persists bot training data to AsyncStorage for learning across sessions
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { BotTrainingData, exportTrainingData, importTrainingData, initializeBotTraining } from "./bot-training";

const STORAGE_KEY_PREFIX = "bot-training-";

/**
 * Get storage key for a bot
 */
function getStorageKey(botId: string): string {
  return `${STORAGE_KEY_PREFIX}${botId}`;
}

/**
 * Save bot training data to storage
 */
export async function saveBotTraining(training: BotTrainingData): Promise<void> {
  try {
    const key = getStorageKey(training.botId);
    const jsonData = exportTrainingData(training);
    await AsyncStorage.setItem(key, jsonData);
    console.log(`[BotTraining] Saved training data for ${training.botId}`);
  } catch (error) {
    console.error(`[BotTraining] Failed to save training data for ${training.botId}:`, error);
  }
}

/**
 * Load bot training data from storage
 */
export async function loadBotTraining(botId: string): Promise<BotTrainingData> {
  try {
    const key = getStorageKey(botId);
    const jsonData = await AsyncStorage.getItem(key);
    if (jsonData) {
      console.log(`[BotTraining] Loaded training data for ${botId}`);
      return importTrainingData(botId, jsonData);
    }
  } catch (error) {
    console.error(`[BotTraining] Failed to load training data for ${botId}:`, error);
  }

  // Return new training data if not found
  return initializeBotTraining(botId);
}

/**
 * Clear bot training data
 */
export async function clearBotTraining(botId: string): Promise<void> {
  try {
    const key = getStorageKey(botId);
    await AsyncStorage.removeItem(key);
    console.log(`[BotTraining] Cleared training data for ${botId}`);
  } catch (error) {
    console.error(`[BotTraining] Failed to clear training data for ${botId}:`, error);
  }
}

/**
 * Clear all bot training data
 */
export async function clearAllBotTraining(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const trainingKeys = keys.filter((k) => k.startsWith(STORAGE_KEY_PREFIX));
    await AsyncStorage.multiRemove(trainingKeys);
    console.log(`[BotTraining] Cleared training data for ${trainingKeys.length} bots`);
  } catch (error) {
    console.error("[BotTraining] Failed to clear all training data:", error);
  }
}

/**
 * Get all bot training data
 */
export async function getAllBotTraining(): Promise<BotTrainingData[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const trainingKeys = keys.filter((k) => k.startsWith(STORAGE_KEY_PREFIX));
    const data = await AsyncStorage.multiGet(trainingKeys);
    return data
      .map(([key, value]) => {
        if (!value) return null;
        const botId = key.replace(STORAGE_KEY_PREFIX, "");
        return importTrainingData(botId, value);
      })
      .filter((d) => d !== null) as BotTrainingData[];
  } catch (error) {
    console.error("[BotTraining] Failed to get all training data:", error);
    return [];
  }
}
