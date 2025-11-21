"use server";

import { summarizeInsights } from "@/ai/flows/summarize-insights";
import type { DetectedEvent } from "./types";
import { generateExampleAudioClips } from "@/ai/flows/generate-example-audio-clips";

type AnalysisResult = {
  events: DetectedEvent[];
  summary: string;
  audioSrc: string;
};

// Since we don't have a real audio event detection model, we'll mock the detection process.
const mockDetectEvents = (clipIdentifier: string): DetectedEvent[] => {
  if (clipIdentifier === "door_slam") {
    return [
      {
        id: "evt-door-1",
        event: "Door Slam",
        startTime: 1.8,
        endTime: 2.5,
        confidence: 0.94,
      },
      {
        id: "evt-speech-1",
        event: "Speech",
        startTime: 3.5,
        endTime: 5.1,
        confidence: 0.78,
      },
    ];
  }
  if (clipIdentifier === "phone_ring") {
    return [
      {
        id: "evt-phone-1",
        event: "Phone Ring",
        startTime: 4.1,
        endTime: 6.2,
        confidence: 0.89,
      },
       {
        id: "evt-speech-2",
        event: "Speech",
        startTime: 0.5,
        endTime: 2.5,
        confidence: 0.81,
      },
    ];
  }
  // For user uploads, generate random events
  const events: DetectedEvent[] = [];
  const eventTypes = ["Door Slam", "Phone Ring", "Glass Break", "Siren", "Speech"];
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
  return events.sort((a, b) => a.startTime - b.startTime);
};

export async function analyzeAudioClip(
  clipIdentifier: "door_slam" | "phone_ring" | "user_upload",
  audioDataUri: string
): Promise<AnalysisResult> {
  try {
    const detectedEvents = mockDetectEvents(clipIdentifier);

    let summary = "No significant events were detected.";
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


export async function getExampleClips() {
    try {
        return await generateExampleAudioClips();
    } catch(error) {
        console.error("Error generating example clips:", error);
        throw new Error("Could not generate example audio clips.");
    }
}
