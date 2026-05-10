import { ChatInterface } from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="relative h-screen w-full bg-background overflow-hidden flex flex-col">
      {/* Aurora Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-500/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        <ChatInterface />
      </div>
    </main>
  );
}
