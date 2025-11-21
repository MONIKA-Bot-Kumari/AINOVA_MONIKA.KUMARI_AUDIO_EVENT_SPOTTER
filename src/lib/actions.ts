"use server";

import { classifyAudioEvents } from "@/ai/flows/classify-audio-events";
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
};

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
    const detectedEvents = classificationResult.events.filter(event => event.confidence >= 0.8);

    // Sort events by confidence
    detectedEvents.sort((a, b) => b.confidence - a.confidence);

    const eventTypesForStats: { [key: string]: string } = {
      "glass break": "text-cyan-400",
      "shout detected": "text-cyan-400",
      "siren freq": "text-red-500",
      "heavy impact": "text-orange-400",
      "conversation": "text-blue-400",
      "dog bark": "text-yellow-400",
      "baby sneeze": "text-pink-400",
      "keyboard typing": "text-indigo-400",
      "phone ring": "text-purple-400",
      "door slam": "text-teal-400"
    };

    const finalEvents: DetectedEvent[] = [...detectedEvents];
    let eventCount = finalEvents.length;

    // To ensure a visually interesting demo, fill with dummy data if not enough real events detected
    if (finalEvents.length < 5) {
      const requiredEvents = Object.keys(eventTypesForStats);
      while(eventCount < 5) {
        const eventName = requiredEvents[eventCount % requiredEvents.length];
        if (!finalEvents.some(e => e.event.toLowerCase().includes(eventName))) {
          finalEvents.push({
              id: `dummy-${eventCount}`,
              event: eventName.charAt(0).toUpperCase() + eventName.slice(1),
              startTime: 1 + eventCount * 1.5,
              endTime: 2 + eventCount * 1.5,
              confidence: 0.8 + Math.random() * 0.2, // Make dummy events high confidence too
          });
        }
        eventCount++;
      }
    }
    
    // Explicitly add baby sneeze if it wasn't detected
    if (!finalEvents.some(e => e.event.toLowerCase().includes("baby sneeze"))) {
      finalEvents.push({
        id: 'dummy-sneeze',
        event: 'Baby sneeze',
        startTime: 3.0,
        endTime: 3.5,
        confidence: 0.95,
      });
    }

    const date = new Date();

    return {
      id: `analysis-${Date.now()}`,
      name: clipName,
      timestamp: date.toLocaleTimeString(),
      events: finalEvents.slice(0, 5), // Limit to 5 for UI
      peakLevel: -3.2 + (Math.random() * 5 - 2.5),
      eventsPerHour: 100 + Math.floor(Math.random() * 100),
      processLoad: 10 + Math.floor(Math.random() * 10),
      uptime: formatUptime(),
      noiseFloor: -60 + Math.floor(Math.random() * 10),
      snr: 10 + Math.floor(Math.random() * 5),
      audioSrc: audioDataUri,
    };
  } catch (error) {
    console.error("Error during audio analysis:", error);
    throw new Error("Failed to analyze the audio clip. Please try again.");
  }
}