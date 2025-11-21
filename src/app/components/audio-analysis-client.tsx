"use client";

import { analyzeAudioClip, getExampleClips } from "@/lib/actions";
import type { DetectedEvent } from "@/lib/types";
import { AlertTriangle, DoorClosed, FileAudio, HelpCircle, Loader2, Phone, Sparkles, UploadCloud, Siren, Speech } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AnalysisState = {
  events: DetectedEvent[];
  summary: string;
  audioSrc: string;
  fileName: string;
};

const eventIcons: { [key: string]: React.ElementType } = {
  "Door Slam": DoorClosed,
  "Phone Ring": Phone,
  "Glass Break": AlertTriangle,
  "Siren": Siren,
  "Speech": Speech,
  "Default": HelpCircle,
};

const getEventIcon = (eventName: string) => {
  return eventIcons[eventName] || eventIcons.Default;
};

export default function AudioAnalysisClient() {
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [exampleClips, setExampleClips] = useState<{ doorSlam: string; phoneRing: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    getExampleClips().then(setExampleClips).catch(err => {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load example audio clips.",
      });
    });
  }, [toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
            variant: "destructive",
            title: "File too large",
            description: "Please upload an audio file smaller than 5MB.",
        });
        return;
      }
      if (file.type.startsWith('audio/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUri = e.target?.result as string;
          handleAnalysis("user_upload", dataUri, file.name);
        };
        reader.readAsDataURL(file);
      } else {
        toast({
            variant: "destructive",
            title: "Invalid file type",
            description: "Please upload a valid audio file.",
        });
      }
    }
  };

  const handleAnalysis = useCallback(async (
    clipType: "door_slam" | "phone_ring" | "user_upload",
    audioSrc: string,
    fileName: string
  ) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    startTransition(async () => {
      try {
        const result = await analyzeAudioClip(clipType, audioSrc);
        setAnalysis({...result, fileName});
      } catch (e: any) {
        setError(e.message);
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: e.message,
        });
      } finally {
        setIsLoading(false);
      }
    });
  }, [toast]);

  const handleExampleClick = (clipType: "door_slam" | "phone_ring") => {
    if (!exampleClips) {
      toast({
        variant: "destructive",
        title: "Examples not ready",
        description: "Example clips are still being generated. Please wait a moment.",
      });
      return;
    }
    const audioSrc = clipType === "door_slam" ? exampleClips.doorSlam : exampleClips.phoneRing;
    const fileName = clipType === "door_slam" ? "Door Slam Example" : "Phone Ring Example";
    handleAnalysis(clipType, audioSrc, fileName);
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tight text-primary sm:text-5xl md:text-6xl">
          Audio Insights
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Upload a 10-second audio clip to detect short events like door slams or phone rings. Our AI will spot and timeline them for you.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="text-primary" />
            <span>Start Analysis</span>
          </CardTitle>
          <CardDescription>
            Upload your own 10s audio clip or use one of our examples.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-4 p-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="audio/*"
          />
          <Button onClick={triggerFileInput} size="lg" className="w-full sm:w-auto">
            <UploadCloud className="mr-2 h-5 w-5" />
            Upload Audio Clip
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-px w-8 bg-border"></div>
            OR
            <div className="h-px w-8 bg-border"></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {!exampleClips ? (
              <Button disabled variant="outline" size="lg"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Loading Examples</Button>
            ) : (
              <>
                <Button variant="outline" size="lg" onClick={() => handleExampleClick('door_slam')}>Use Door Slam Example</Button>
                <Button variant="outline" size="lg" onClick={() => handleExampleClick('phone_ring')}>Use Phone Ring Example</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      {isLoading && <LoadingState />}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && analysis && (
        <div className="space-y-8 animate-in fade-in-50 duration-500">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-primary" />
                <span>AI Summary</span>
              </CardTitle>
              <CardDescription>A brief summary of the detected audio events.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">{analysis.summary}</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
                <CardDescription>File: {analysis.fileName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="w-full">
                    <audio ref={audioRef} src={analysis.audioSrc} controls className="w-full rounded-md"/>
                    <div className="mt-2 h-10 w-full rounded-lg bg-secondary relative overflow-hidden">
                        <div className="absolute inset-0 w-full h-full">
                        {analysis.events.map(event => {
                            const left = (event.startTime / 10) * 100;
                            const width = ((event.endTime - event.startTime) / 10) * 100;
                            const Icon = getEventIcon(event.event);
                            return (
                                <div
                                    key={event.id}
                                    className={cn(
                                        "absolute top-0 h-full flex items-center justify-center bg-accent/70 transition-all duration-200 ease-in-out cursor-pointer",
                                        hoveredEventId === event.id && "ring-2 ring-offset-2 ring-accent ring-offset-secondary"
                                    )}
                                    style={{ left: `${left}%`, width: `${width}%` }}
                                    onMouseEnter={() => setHoveredEventId(event.id)}
                                    onMouseLeave={() => setHoveredEventId(null)}
                                    onClick={() => audioRef.current && (audioRef.current.currentTime = event.startTime)}
                                >
                                    <Icon className="h-5 w-5 text-accent-foreground" />
                                </div>
                            )
                        })}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[48px]"></TableHead>
                                <TableHead>Event</TableHead>
                                <TableHead className="text-right">Start Time</TableHead>
                                <TableHead className="text-right">End Time</TableHead>
                                <TableHead className="text-right">Confidence</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analysis.events.length > 0 ? analysis.events.map(event => {
                                const Icon = getEventIcon(event.event);
                                return (
                                <TableRow
                                    key={event.id}
                                    onMouseEnter={() => setHoveredEventId(event.id)}
                                    onMouseLeave={() => setHoveredEventId(null)}
                                    className={cn(
                                        "cursor-pointer transition-colors",
                                        hoveredEventId === event.id && "bg-secondary"
                                    )}
                                    onClick={() => audioRef.current && (audioRef.current.currentTime = event.startTime)}
                                >
                                    <TableCell><Icon className="h-5 w-5 text-muted-foreground" /></TableCell>
                                    <TableCell className="font-medium">{event.event}</TableCell>
                                    <TableCell className="text-right">{event.startTime.toFixed(2)}s</TableCell>
                                    <TableCell className="text-right">{event.endTime.toFixed(2)}s</TableCell>
                                    <TableCell className="text-right font-mono">{(event.confidence * 100).toFixed(0)}%</TableCell>
                                </TableRow>
                                )}) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">No events detected.</TableCell>
                                </TableRow>
                                )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function LoadingState() {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-5 w-full" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="w-full">
                        <Skeleton className="h-12 w-full rounded-md" />
                        <Skeleton className="mt-2 h-10 w-full rounded-lg" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
