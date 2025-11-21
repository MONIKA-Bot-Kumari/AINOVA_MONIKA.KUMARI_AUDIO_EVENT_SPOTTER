import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-insights.ts';
import '@/ai/flows/generate-example-audio-clips.ts';
import '@/ai/flows/classify-audio-events.ts';
