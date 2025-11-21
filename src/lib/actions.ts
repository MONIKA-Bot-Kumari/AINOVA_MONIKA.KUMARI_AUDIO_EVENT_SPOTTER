"use server";

import { summarizeInsights } from "@/ai/flows/summarize-insights";
import type { DetectedEvent } from "./types";

type AnalysisResult = {
  events: DetectedEvent[];
  summary: string;
  audioSrc: string;
};

// Since we don't have a real audio event detection model, we'll mock the detection process.
const mockDetectEvents = (clipIdentifier: string): DetectedEvent[] => {
  // For user uploads, generate random events
  const events: DetectedEvent[] = [];
  const eventTypes = [
    "Dog bark",
    "Clapping",
    "Door slam",
    "Coughing",
    "Keyboard typing",
    "Laughing",
    "Siren",
    "Phone ring",
    "Glass break",
    "Speech",
    "Meow",
    "Mouse click",
  ];
  const numEvents = Math.floor(Math.random() * 3) + 1; // 1 to 3 events

  for (let i = 0; i < numEvents; i++) {
    const startTime = parseFloat((Math.random() * 8).toFixed(1)); // 0 to 8s
    const endTime = parseFloat((startTime + Math.random() * 1.5 + 0.5).toFixed(1)); // 0.5 to 2s duration
    if (endTime > 10) continue;

    events.push({
      id: `evt-rand-${i}`,
      event: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      startTime,
      endTime,
      confidence: parseFloat(Math.random().toFixed(2)),
    });
  }

  // Always add a baby sneeze event for demonstration
  const sneezeStartTime = parseFloat((Math.random() * 8).toFixed(1));
  events.push({
      id: `evt-sneeze`,
      event: "Baby sneeze",
      startTime: sneezeStartTime,
      endTime: parseFloat((sneezeStartTime + 0.8).toFixed(1)),
      confidence: 0.85 + Math.random() * 0.15, // High confidence
  });


  return events.sort((a, b) => a.startTime - b.startTime);
};

export async function analyzeAudioClip(
  clipIdentifier: "user_upload",
  audioDataUri: string
): Promise<AnalysisResult> {
  try {
    const allDetectedEvents = mockDetectEvents(clipIdentifier);
    const detectedEvents = allDetectedEvents.filter(event => event.confidence >= 0.8);

    let summary = "No significant events were detected with high confidence.";
    if (detectedEvents.length > 0) {
      const summaryResult = await summarizeInsights(detectedEvents);
      summary = summaryResult.summary;
    }

    return {
      events: detectedEvents,
      summary,
      audioSrc: audioDataUri,
    };
  } catch (error) {
    console.error("Error during audio analysis:", error);
    throw new Error("Failed to analyze the audio clip. Please try again.");
  }
}
