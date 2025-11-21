'use server';

/**
 * @fileOverview Summarizes the detected audio events in a short paragraph.
 *
 * - summarizeInsights - A function that summarizes audio insights.
 * - SummarizeInsightsInput - The input type for the summarizeInsights function.
 * - SummarizeInsightsOutput - The return type for the summarizeInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeInsightsInputSchema = z.array(
  z.object({
    event: z.string().describe('The type of audio event detected.'),
    startTime: z.number().describe('The start time of the event in seconds.'),
    endTime: z.number().describe('The end time of the event in seconds.'),
    confidence: z.number().describe('The confidence score of the detected event.'),
  })
).describe('An array of detected audio events with their details.');

export type SummarizeInsightsInput = z.infer<typeof SummarizeInsightsInputSchema>;

const SummarizeInsightsOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the detected audio events.'),
});

export type SummarizeInsightsOutput = z.infer<typeof SummarizeInsightsOutputSchema>;

export async function summarizeInsights(input: SummarizeInsightsInput): Promise<SummarizeInsightsOutput> {
  return summarizeInsightsFlow(input);
}

const summarizeInsightsPrompt = ai.definePrompt({
  name: 'summarizeInsightsPrompt',
  input: {schema: SummarizeInsightsInputSchema},
  output: {schema: SummarizeInsightsOutputSchema},
  prompt: `You are an AI assistant that analyzes audio events and provides a concise summary.

  Given the following list of detected audio events with their start and end times, and confidence scores, generate a short summary (2-3 sentences) that highlights the key findings.

  Events:
  {{#each this}}
  - Event: {{event}}, Start Time: {{startTime}}s, End Time: {{endTime}}s, Confidence: {{confidence}}
  {{/each}}
  `,
});

const summarizeInsightsFlow = ai.defineFlow(
  {
    name: 'summarizeInsightsFlow',
    inputSchema: SummarizeInsightsInputSchema,
    outputSchema: SummarizeInsightsOutputSchema,
  },
  async input => {
    const {output} = await summarizeInsightsPrompt(input);
    return output!;
  }
);
