"use server";

import { classifyAudioEvents } from "@/ai/flows/classify-audio-events";
import { generatePrecautionMessage } from "@/ai/flows/generate-precaution-message";
import { generateExampleAudioClips } from "@/ai/flows/generate-example-audio-clips";
import type { DetectedEvent } from "./types";

export type AnalysisResult = {
  id: string;
  name: string;
  timestamp: string;
  events: DetectedEvent[];
  peakLevel: number;
  eventsPerHour: number;
  processLoad: number;
  uptime: string;
  noiseFloor: number;
  snr: number;
  audioSrc: string;
  isDanger: boolean;
  precautionaryMessage: string;
};

// For the example, "phone ring" will be treated as dangerous.
const DANGEROUS_EVENTS = ["siren", "glass break", "shout", "heavy impact", "phone ring"];

// Dummy uptime start time
const startTime = new Date();

function formatUptime() {
  const now = new Date();
  const diffMs = now.getTime() - startTime.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${diffHrs}h ${diffMins}m`;
}

export async function analyzeAudioClip(
  clipName: string,
  audioDataUri: string
): Promise<AnalysisResult> {
  try {
    const classificationResult = await classifyAudioEvents({ audioDataUri });
    
    const detectedEvents = classificationResult.events
      .filter(event => event.confidence >= 0.5) 
      .sort((a, b) => b.confidence - a.confidence);

    const date = new Date();

    const dangerousEventsFound = detectedEvents
        .filter(e => DANGEROUS_EVENTS.some(de => e.event.toLowerCase().includes(de)))
        .map(e => e.event);

    let isDanger = dangerousEventsFound.length > 0;
    let precautionaryMessage = "";

    if (isDanger) {
        const messageResult = await generatePrecautionMessage(dangerousEventsFound);
        precautionaryMessage = messageResult.message;
    }


    return {
      id: `analysis-${Date.now()}`,
      name: clipName,
      timestamp: date.toLocaleTimeString(),
      events: detectedEvents.slice(0, 5), // Limit to 5 for UI
      peakLevel: -3.2 + (Math.random() * 5 - 2.5),
      eventsPerHour: 100 + Math.floor(Math.random() * 100),
      processLoad: 10 + Math.floor(Math.random() * 10),
      uptime: formatUptime(),
      noiseFloor: -60 + Math.floor(Math.random() * 10),
      snr: 10 + Math.floor(Math.random() * 5),
      audioSrc: audioDataUri,
      isDanger,
      precautionaryMessage,
    };
  } catch (error) {
    console.error("Error during audio analysis:", error);
    throw new Error("Failed to analyze the audio clip. Please try again.");
  }
}

export async function generateExampleClips() {
    return await generateExampleAudioClips();
}
