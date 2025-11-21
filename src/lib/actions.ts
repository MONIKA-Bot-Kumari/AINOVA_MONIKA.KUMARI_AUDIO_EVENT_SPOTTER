"use server";

import { classifyAudioEvents } from "@/ai/flows/classify-audio-events";
import { summarizeInsights } from "@/ai/flows/summarize-insights";
import type { DetectedEvent } from "./types";

type AnalysisResult = {
  events: DetectedEvent[];
  summary: string;
  audioSrc: string;
};

export async function analyzeAudioClip(
  clipIdentifier: "user_upload",
  audioDataUri: string
): Promise<AnalysisResult> {
  try {
    // Call the new AI flow to get events
    const classificationResult = await classifyAudioEvents({ audioDataUri });
    const allDetectedEvents = classificationResult.events;

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