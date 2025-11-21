"use client";

import { analyzeAudioClip } from "@/lib/actions";
import type { DetectedEvent } from "@/lib/types";
import { AlertTriangle, DoorClosed, FileAudio, HelpCircle, Loader2, Mic, MicOff, Phone, Sparkles, UploadCloud, Siren, Speech, History } from "lucide-react";
import { useCallback, useRef, useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AnalysisState = {
  id: string;
  events: DetectedEvent[];
  summary: string;
  audioSrc: string;
  fileName: string;
  timestamp: Date;
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
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const { toast } = useToast();

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
          handleAnalysis(dataUri, file.name);
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
    audioSrc: string,
    fileName: string
  ) => {
    setIsLoading(true);
    setError(null);

    startTransition(async () => {
      try {
        const result = await analyzeAudioClip("user_upload", audioSrc);
        const newAnalysis: AnalysisState = { ...result, id: `analysis-${Date.now()}`, fileName, timestamp: new Date() };
        setAnalysisHistory(prev => [newAnalysis, ...prev]);
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
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true);
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUri = e.target?.result as string;
          handleAnalysis(dataUri, `Live Recording ${new Date().toLocaleString()}`);
        };
        reader.readAsDataURL(blob);
        recordedChunksRef.current = [];
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast({ title: "Recording started", description: "Recording for 10 seconds..." });

      setTimeout(() => {
        stopRecording();
      }, 10000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setHasMicPermission(false);
      toast({
        variant: "destructive",
        title: "Microphone Access Denied",
        description: "Please enable microphone permissions in your browser settings.",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({ title: "Recording stopped", description: "Processing audio..." });
    }
  };

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tight text-primary sm:text-5xl md:text-6xl">
          Audio Insights
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Upload or record a 10-second audio clip to detect short events. Our AI will spot and timeline them for you.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadCloud className="text-primary" />
              <span>Analyze a File</span>
            </CardTitle>
            <CardDescription>
              Upload your own 10s audio clip to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4 p-6">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="audio/*"
            />
            <Button onClick={triggerFileInput} size="lg" className="w-full sm:w-auto" disabled={isPending || isRecording}>
              <UploadCloud className="mr-2 h-5 w-5" />
              Upload Audio Clip
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="text-primary" />
              <span>Live Analysis</span>
            </CardTitle>
            <CardDescription>
              Record 10s of audio from your microphone.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4 p-6">
            {!isRecording ? (
              <Button onClick={startRecording} size="lg" className="w-full sm:w-auto" disabled={isPending || isRecording}>
                <Mic className="mr-2 h-5 w-5" />
                Start Recording
              </Button>
            ) : (
              <Button onClick={stopRecording} size="lg" variant="destructive" className="w-full sm:w-auto" disabled={isPending}>
                <MicOff className="mr-2 h-5 w-5" />
                Stop Recording
              </Button>
            )}
             {!hasMicPermission && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Microphone Access Required</AlertTitle>
                <AlertDescription>
                  Allow microphone access to use live recording.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {isLoading && <LoadingState />}

      {error && !isLoading && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {analysisHistory.length > 0 && (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="text-primary" />
                    <span>Analysis History</span>
                </CardTitle>
                <CardDescription>Your past analysis results.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {analysisHistory.map((analysis) => (
                <div key={analysis.id} className="space-y-6 border-b pb-6 last:border-b-0 last:pb-0">
                  <Card className="shadow-lg overflow-hidden">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary" />
                        <span>AI Summary</span>
                      </CardTitle>
                      <CardDescription>File: {analysis.fileName} ({analysis.timestamp.toLocaleTimeString()})</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground">{analysis.summary}</p>
                    </CardContent>
                  </Card>
                  
                  <div className="space-y-4">
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
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
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
