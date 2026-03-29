import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

/**
 * Upload audio file to S3 via the backend API
 * The backend will handle the S3 upload and return a public URL
 */
export async function uploadAudioToS3(audioUri: string, fileName: string): Promise<string> {
  try {
    // Read the audio file as base64
    const base64Data = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Call backend API to upload to S3
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        fileName,
        fileType: "audio/m4a",
        fileData: base64Data,
      }),
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.url) {
      throw new Error("No URL returned from upload");
    }

    console.log("[AudioUpload] Successfully uploaded audio:", result.url);
    return result.url;
  } catch (error) {
    console.error("[AudioUpload] Failed to upload audio:", error);
    throw error;
  }
}

/**
 * Generate a unique filename for the audio recording
 */
export function generateAudioFileName(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `audio-${timestamp}-${random}.m4a`;
}
