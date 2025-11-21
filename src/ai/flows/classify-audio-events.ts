'use server';

/**
 * @fileOverview An AI flow for classifying events in an audio clip.
 *
 * - classifyAudioEvents - A function that takes an audio data URI and returns detected events.
 * - ClassifyAudioEventsInput - The input type for the classifyAudioEvents function.
 * - ClassifyAudioEventsOutput - The return type for the classifyAudioEvents function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClassifyAudioEventsInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "An audio clip, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ClassifyAudioEventsInput = z.infer<typeof ClassifyAudioEventsInputSchema>;

const ClassifyAudioEventsOutputSchema = z.object({
  events: z.array(
    z.object({
        id: z.string().describe("A unique identifier for the event (e.g., evt-1)."),
        event: z.string().describe('The type of audio event detected (e.g., "Dog bark", "Door slam").'),
        startTime: z.number().describe('The start time of the event in seconds.'),
        endTime: z.number().describe('The end time of the event in seconds.'),
        confidence: z.number().describe('The confidence score of the detected event (0.0 to 1.0).'),
    })
  ).describe("An array of detected audio events with their details. The audio is 10 seconds long.")
});
export type ClassifyAudioEventsOutput = z.infer<typeof ClassifyAudioEventsOutputSchema>;

export async function classifyAudioEvents(input: ClassifyAudioEventsInput): Promise<ClassifyAudioEventsOutput> {
  return classifyAudioEventsFlow(input);
}

const classifyAudioPrompt = ai.definePrompt({
  name: 'classifyAudioPrompt',
  input: {schema: ClassifyAudioEventsInputSchema},
  output: {schema: ClassifyAudioEventsOutputSchema},
  prompt: `You are an expert audio analyst. Your task is to identify all distinct sound events in the provided 10-second audio clip.

The events can include a wide range of sounds like "Dog bark", "Keyboard typing", "Phone ring", "Baby sneeze", "Clapping", "Door slam", "Profanity", "Vulgar language", and more.

For each event you identify, you must provide:
- A unique ID for the event.
- A descriptive name for the event.
- The precise start and end times in seconds.
- A confidence score between 0.0 and 1.0.

Analyze the following audio clip and return a structured list of all detected events.

Audio: {{media url=audioDataUri}}`,
});

const classifyAudioEventsFlow = ai.defineFlow(
  {
    name: 'classifyAudioEventsFlow',
    inputSchema: ClassifyAudioEventsInputSchema,
    outputSchema: ClassifyAudioEventsOutputSchema,
  },
  async input => {
    const {output} = await classifyAudioPrompt(input);
    return output || { events: [] };
  }
);
