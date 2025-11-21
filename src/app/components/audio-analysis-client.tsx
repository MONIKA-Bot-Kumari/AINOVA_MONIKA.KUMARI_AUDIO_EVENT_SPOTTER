"use client";

import { analyzeAudioClip, type AnalysisResult } from "@/lib/actions";
import type { DetectedEvent } from "@/lib/types";
import { 
  AlertTriangle, Mic, UploadCloud, Loader2, Bell, Zap, MessageSquare, HelpCircle,
  ArrowLeft, Baby, Keyboard, Phone, DoorClosed, FileDown,
  Wifi, Radio, Power, FileAudio, Siren, Atom, Footprints, PawPrint
} from "lucide-react";
import { useCallback, useRef, useState, useEffect, useTransition } from "react";
import { jsPDF } from "jspdf";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";


const eventConfig: { [key: string]: { icon: React.ElementType, color: string } } = {
  "glass break": { icon: AlertTriangle, color: "text-cyan-400" },
  "shout": { icon: MessageSquare, color: "text-blue-400" },
  "siren": { icon: Siren, color: "text-red-500" },
  "heavy impact": { icon: Zap, color: "text-orange-400" },
  "conversation": { icon: MessageSquare, color: "text-blue-400" },
  "dog bark": { icon: PawPrint, color: "text-yellow-400" },
  "baby sneeze": { icon: Baby, color: "text-pink-400" },
  "keyboard typing": { icon: Keyboard, color: "text-indigo-400" },
  "phone ring": { icon: Phone, color: "text-purple-400" },
  "door slam": { icon: DoorClosed, color: "text-teal-400" },
  "footsteps": { icon: Footprints, color: "text-green-400" },
  "machine noise": { icon: Atom, color: "text-gray-400" },
  "default": { icon: HelpCircle, color: "text-gray-400" },
};

const getEventConfig = (eventName: string) => {
  const lowerEventName = eventName.toLowerCase();
  for (const key in eventConfig) {
    if (lowerEventName.includes(key)) {
      return eventConfig[key];
    }
  }
  return eventConfig.default;
};


export default function AudioAnalysisClient() {
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const [monitorBarHeights, setMonitorBarHeights] = useState<number[]>([]);

  useEffect(() => {
    // Generate random bar heights only on the client-side to avoid hydration errors
    const interval = setInterval(() => {
      const newHeights = [...Array(30)].map(() => Math.random() * 80 + 10);
      setMonitorBarHeights(newHeights);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ variant: "destructive", title: "File too large", description: "Please upload an audio file smaller than 5MB." });
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
        toast({ variant: "destructive", title: "Invalid file type", description: "Please upload a valid audio file." });
      }
    }
  };

  const handleAnalysis = useCallback(async (audioDataUri: string, clipName: string) => {
    setIsAnalyzing(true);
    startTransition(async () => {
      try {
        const result = await analyzeAudioClip(clipName, audioDataUri);
        setAnalysisHistory(prev => [result, ...prev]);
        setSelectedAnalysis(result);
      } catch (e: any) {
        toast({ variant: "destructive", title: "Analysis Failed", description: e.message });
      } finally {
        setIsAnalyzing(false);
      }
    });
  }, [toast]);
  
  const triggerFileInput = () => fileInputRef.current?.click();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUri = e.target?.result as string;
          handleAnalysis(dataUri, `REC-${new Date().toISOString()}`);
        };
        reader.readAsDataURL(blob);
        recordedChunksRef.current = [];
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast({ title: "Recording started", description: "Recording for 10 seconds..." });

      setTimeout(() => stopRecording(), 10000);
    } catch (err) {
      console.error("Recording error:", err);
      toast({ variant: "destructive", title: "Microphone Access Denied", description: "Please enable microphone permissions." });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({ title: "Recording stopped", description: "Processing audio..." });
    }
  };

  const resetSelection = () => {
    setSelectedAnalysis(null);
  };

  const generatePdf = (analysis: AnalysisResult) => {
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text("SPOTTER.AI - Analysis Report", 20, 20);

    doc.setFontSize(12);
    doc.text(`Clip Name: ${analysis.name}`, 20, 30);
    doc.text(`Timestamp: ${analysis.timestamp}`, 20, 37);

    doc.setFontSize(16);
    doc.text("Detected Events", 20, 50);

    let yPos = 60;
    analysis.events.forEach((event) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.text(`Event: ${event.event}`, 25, yPos);
      doc.setFontSize(10);
      doc.text(`- Time: ${event.startTime.toFixed(2)}s - ${event.endTime.toFixed(2)}s`, 25, yPos + 5);
      doc.text(`- Confidence: ${Math.round(event.confidence * 100)}%`, 25, yPos + 10);
      yPos += 20;
    });

    doc.save(`analysis_${analysis.name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  };
  
  const isLoading = isAnalyzing || isPending;
  const currentAnalysis = selectedAnalysis || analysisHistory[0];

  return (
    <div className="font-mono text-gray-300 p-4 lg:p-6 bg-background min-h-screen">
      <header className="flex justify-between items-center border-b border-gray-700 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary"></div>
          <h1 className="text-xl font-bold text-white">SPOTTER.AI</h1>
          <span className="text-xs text-gray-500">v2.5.0-PRO</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-primary"><Wifi size={14} /><span>CONNECTED</span></div>
          <div className="flex items-center gap-1.5 text-primary"><Radio size={14} /><span>LIVE FEED</span></div>
          <div className="flex items-center gap-1.5 text-primary"><Power size={14} /><span>PWR 98%</span></div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-gray-700 shadow-lg">
            <CardHeader className="border-b border-gray-700 p-4">
              <CardTitle className="text-lg text-white">Room A-102 / MIC ARRAY 1</CardTitle>
              <CardDescription className="text-xs">
                NOISE FLOOR: <span className="text-primary">{currentAnalysis?.noiseFloor ?? '-58'}dB</span> // SNR: <span className="text-primary">{currentAnalysis?.snr ?? '12'}dB</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="text-xs text-primary mb-2 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                LIVE INPUT MONITOR
              </div>
              <div className="h-24 w-full bg-gray-900/50 rounded-md flex items-end gap-1 p-2">
                {monitorBarHeights.map((height, i) => (
                  <div key={i} className="bg-primary w-full rounded-t-sm" style={{height: `${height}%`}}></div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard title="PEAK LEVEL" value={`${currentAnalysis?.peakLevel.toFixed(1) ?? '-3.2'}`} unit="dB" />
            <StatCard title="EVENTS/HR" value={`${currentAnalysis?.eventsPerHour ?? '142'}`} color="text-primary" />
            <StatCard title="PROCESS LOAD" value={`${currentAnalysis?.processLoad ?? '12'}`} unit="%" color="text-primary" />
            <StatCard title="UPTIME" value={currentAnalysis?.uptime ?? '14h 22m'} color="text-primary" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SettingsCard title="SIGNAL PROCESSING">
              <SettingSlider label="SENSITIVITY THRESHOLD" value={-42} unit="dB" />
              <SettingSlider label="NOISE GATE" value={-60} unit="dB" />
            </SettingsCard>
            <SettingsCard title="FILTERS & MODE">
              <SettingSwitch label="HIGH-PASS FILTER (80Hz)" defaultChecked={true} />
              <SettingSwitch label="VOCAL ISOLATION" />
              <SettingSwitch label="ALARM PRIORITY" defaultChecked={true} isAlarm={true} />
            </SettingsCard>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-widest text-gray-400">ANALYSIS LOG</h2>
                {selectedAnalysis && (
                  <div className="flex items-center gap-2">
                    <Button onClick={() => generatePdf(selectedAnalysis)} variant="outline" size="sm" className="h-7 border-primary text-primary hover:bg-primary/10 hover:text-primary">
                      <FileDown size={14} className="mr-1.5" /> PDF
                    </Button>
                    <Button onClick={resetSelection} variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:bg-primary/10 hover:text-primary">
                        <ArrowLeft size={16} />
                    </Button>
                  </div>
                )}
            </div>
            
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : selectedAnalysis ? (
                 selectedAnalysis.events.map(event => <DetectionEventItem key={event.id} event={event} />)
              ) : analysisHistory.length > 0 ? (
                <Card className="bg-card border-gray-700">
                  <CardContent className="p-2 max-h-80 overflow-y-auto">
                    {analysisHistory.map(hist => (
                      <HistoryItem key={hist.id} analysis={hist} onSelect={() => setSelectedAnalysis(hist)} />
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card border-gray-700 h-64 flex flex-col justify-center items-center text-center p-4">
                  <p className="text-gray-400 mb-4">Upload or record audio to begin analysis.</p>
                  <div className="flex gap-4">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="audio/*" />
                    <Button onClick={triggerFileInput} variant="outline" className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
                      <UploadCloud size={16} className="mr-2"/> Upload File
                    </Button>
                    {!isRecording ? (
                      <Button onClick={startRecording} variant="outline" className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
                        <Mic size={16} className="mr-2"/> Record
                      </Button>
                    ) : (
                      <Button onClick={stopRecording} variant="destructive">
                        Stop
                      </Button>
                    )}
                  </div>
                </Card>
              )}
               {analysisHistory.length > 0 && !selectedAnalysis && (
                 <div className="flex gap-4 justify-center">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="audio/*" />
                    <Button onClick={triggerFileInput} variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
                      <UploadCloud size={16} className="mr-2"/> Upload New
                    </Button>
                     {!isRecording ? (
                      <Button onClick={startRecording} variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
                        <Mic size={16} className="mr-2"/> Record New
                      </Button>
                    ) : (
                      <Button onClick={stopRecording} variant="destructive" size="sm">
                        Stop
                      </Button>
                    )}
                 </div>
               )}
            </div>
        </div>
      </div>
    </div>
  );
}


function StatCard({ title, value, unit, color = "text-white" }: { title: string, value: string | number, unit?: string, color?: string }) {
  return (
    <Card className="bg-card border-gray-700 p-3">
      <CardDescription className="text-xs text-gray-400">{title}</CardDescription>
      <CardTitle className={cn("text-2xl font-bold", color)}>
        {value}{unit && <span className="text-base ml-1">{unit}</span>}
      </CardTitle>
    </Card>
  );
}

function SettingsCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <Card className="bg-card border-gray-700 p-4">
      <CardDescription className="text-xs text-gray-400 mb-4">{title}</CardDescription>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function SettingSlider({ label, value, unit }: { label: string, value: number, unit: string }) {
  return (
    <div>
      <div className="flex justify-between items-center text-sm mb-1">
        <label className="text-gray-300">{label}</label>
        <span className="text-primary font-bold">{value}{unit}</span>
      </div>
      <Slider defaultValue={[value]} max={0} min={-100} step={1} className="[&>span]:bg-primary [&>span]:h-4 [&>span]:w-4 [&>span]:border-2 [&>span]:border-background" />
    </div>
  );
}

function SettingSwitch({ label, defaultChecked = false, isAlarm = false }: { label: string, defaultChecked?: boolean, isAlarm?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <label className={cn("text-sm font-medium", isAlarm ? "text-red-400" : "text-gray-300")}>{label}</label>
      <Switch defaultChecked={defaultChecked} className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-600" />
    </div>
  );
}

function HistoryItem({ analysis, onSelect }: { analysis: AnalysisResult, onSelect: () => void }) {
  const Icon = analysis.name.startsWith('REC-') ? Mic : FileAudio;
  return (
    <button onClick={onSelect} className="w-full text-left p-2 rounded-md hover:bg-primary/10 transition-colors flex items-center gap-3">
      <Icon className="w-5 h-5 text-primary flex-shrink-0" />
      <div className="flex-grow overflow-hidden">
        <p className="text-sm text-white truncate font-medium">{analysis.name}</p>
        <p className="text-xs text-gray-400">{analysis.timestamp} - {analysis.events.length} events</p>
      </div>
    </button>
  )
}

function DetectionEventItem({ event }: { event: DetectedEvent }) {
  const { icon: Icon, color } = getEventConfig(event.event);
  const progressColor = color.replace('text-', 'bg-');

  const date = new Date();
  const timestamp = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${(date.getSeconds() - Math.floor(event.startTime)).toString().padStart(2, '0')}`;

  return (
    <Card className="bg-card border border-gray-700/50 overflow-hidden">
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon size={16} className={color} />
            <span className="font-bold text-sm text-white tracking-wider">{event.event.toUpperCase()}</span>
          </div>
          <div className="text-xs text-gray-400 font-mono">{timestamp}</div>
        </div>
        <div className="flex items-center justify-between text-xs gap-4">
          <Progress value={event.confidence * 100} className={cn("w-2/3 h-1.5", `[&>*]:${progressColor}`)} />
          <span className="text-gray-400 font-semibold">{Math.round(event.confidence * 100)}% CONF</span>
        </div>
      </div>
    </Card>
  );
}
