'use server';

/**
 * @fileOverview Generates example audio clips for new users to quickly test the application.
 *
 * - generateExampleAudioClips - A function that generates sample audio clips.
 * - GenerateExampleAudioClipsOutput - The return type for the generateExampleAudioClips function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const GenerateExampleAudioClipsOutputSchema = z.object({
  doorSlam: z.string().describe('A WAV format data URI of a door slam sound.'),
  phoneRing: z.string().describe('A WAV format data URI of a phone ring sound.'),
});

export type GenerateExampleAudioClipsOutput = z.infer<typeof GenerateExampleAudioClipsOutputSchema>;

export async function generateExampleAudioClips(): Promise<GenerateExampleAudioClipsOutput> {
  return generateExampleAudioClipsFlow();
}

const generateExampleAudioClipsFlow = ai.defineFlow(
  {
    name: 'generateExampleAudioClipsFlow',
    outputSchema: GenerateExampleAudioClipsOutputSchema,
  },
  async () => {
    const doorSlam = await generateDoorSlamAudio();
    const phoneRing = await generatePhoneRingAudio();

    return {
      doorSlam,
      phoneRing,
    };
  }
);

async function generateDoorSlamAudio(): Promise<string> {
  const { media } = await ai.generate({
    model: ai.model('gemini-2.5-flash-preview-tts'),
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Algenib' },
        },
      },
    },
    prompt: 'Who slammed the door just now?',
  });
  if (!media) {
    throw new Error('no media returned');
  }
  const audioBuffer = Buffer.from(
    media.url.substring(media.url.indexOf(',') + 1),
    'base64'
  );
  return 'data:audio/wav;base64,' + (await toWav(audioBuffer));
}

async function generatePhoneRingAudio(): Promise<string> {
  const { media } = await ai.generate({
    model: ai.model('gemini-2.5-flash-preview-tts'),
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Achernar' },
        },
      },
    },
    prompt: 'I think your phone is ringing.',
  });
  if (!media) {
    throw new Error('no media returned');
  }
  const audioBuffer = Buffer.from(
    media.url.substring(media.url.indexOf(',') + 1),
    'base64'
  );
  return 'data:audio/wav;base64,' + (await toWav(audioBuffer));
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
