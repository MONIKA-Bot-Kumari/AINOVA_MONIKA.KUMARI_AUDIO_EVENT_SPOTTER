import AudioAnalysisClient from "@/app/components/audio-analysis-client";

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-start p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-4xl">
        <AudioAnalysisClient />
      </div>
    </main>
  );
}
