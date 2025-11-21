'use server';

/**
 * @fileOverview Generates a precautionary message based on detected dangerous audio events.
 *
 * - generatePrecautionMessage - A function that takes dangerous events and returns a safety message.
 * - GeneratePrecautionMessageInput - The input type for the function.
 * - GeneratePrecautionMessageOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePrecautionMessageInputSchema = z.array(
    z.string()
).describe("A list of dangerous audio events detected, such as 'siren' or 'glass break'.");

export type GeneratePrecautionMessageInput = z.infer<typeof GeneratePrecautionMessageInputSchema>;

const GeneratePrecautionMessageOutputSchema = z.object({
  message: z.string().describe('A concise and helpful precautionary message for the user based on the detected events.'),
});

export type GeneratePrecautionMessageOutput = z.infer<typeof GeneratePrecautionMessageOutputSchema>;


export async function generatePrecautionMessage(input: GeneratePrecautionMessageInput): Promise<GeneratePrecautionMessageOutput> {
    return generatePrecautionMessageFlow(input);
}


const precautionPrompt = ai.definePrompt({
    name: 'precautionPrompt',
    input: { schema: GeneratePrecautionMessageInputSchema },
    output: { schema: GeneratePrecautionMessageOutputSchema },
    prompt: `You are a security AI. Based on the following detected audio events, generate a short, clear, and helpful precautionary message (1-2 sentences).

Detected Events:
{{#each this}}
- {{this}}
{{/each}}

Example: If events are 'siren', message could be: "Emergency vehicle detected nearby. Please be aware of your surroundings and clear any pathways if necessary."
Example: If events are 'glass break', 'shout', message could be: "Potential disturbance detected. For your safety, please be cautious and consider checking the area if it is safe to do so."
Example: If events are 'profanity', message could be: "Inappropriate language detected. Please be mindful of the environment and ensure it is safe."
`,
});


const generatePrecautionMessageFlow = ai.defineFlow(
    {
        name: 'generatePrecautionMessageFlow',
        inputSchema: GeneratePrecautionMessageInputSchema,
        outputSchema: GeneratePrecautionMessageOutputSchema,
    },
    async (events) => {
        const { output } = await precautionPrompt(events);
        return output || { message: "Undefined threat detected. Proceed with caution." };
    }
);
