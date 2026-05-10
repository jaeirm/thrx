import React, { useState, useEffect, useRef } from 'react';
import { X, Settings2, Sliders, Database, Save, RotateCcw, Upload, FileText, Trash2, MessageCircle, Key, Brain, Cpu, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db';
import { uploadFile } from '@/lib/upload';
import { DocumentMeta } from '@/types';

interface SettingsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabType = 'rag' | 'knowledge' | 'keys' | 'integrations';

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<TabType>('rag');
    const [chunkSize, setChunkSize] = useState(1000);
    const [chunkOverlap, setChunkOverlap] = useState(200);
    const [topK, setTopK] = useState(3);
    const [telegramToken, setTelegramToken] = useState('');
    
    const [openaiKey, setOpenaiKey] = useState('');
    const [anthropicKey, setAnthropicKey] = useState('');
    const [googleKey, setGoogleKey] = useState('');
    
    const [documents, setDocuments] = useState<DocumentMeta[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            const savedSettings = localStorage.getItem('thrx_rag_config');
            if (savedSettings) {
                try {
                    const parsed = JSON.parse(savedSettings);
                    if (parsed.chunkSize) setChunkSize(parsed.chunkSize);
                    if (parsed.chunkOverlap) setChunkOverlap(parsed.chunkOverlap);
                    if (parsed.topK) setTopK(parsed.topK);
                } catch(e) {}
            }
            
            const savedToken = localStorage.getItem('thrx_telegram_token');
            if (savedToken) setTelegramToken(savedToken);
            
            setOpenaiKey(localStorage.getItem('thrx_openai_key') || '');
            setAnthropicKey(localStorage.getItem('thrx_anthropic_key') || '');
            setGoogleKey(localStorage.getItem('thrx_google_key') || '');
            
            loadDocuments();
        }
    }, [isOpen]);

    const loadDocuments = async () => {
        try {
            const docs = await db.documents.filter(d => d.isUniversal !== false).toArray();
            setDocuments(docs.sort((a, b) => new Date(b.parsedAt).getTime() - new Date(a.parsedAt).getTime()));
        } catch (e) {
            console.error("Failed to load DB docs:", e);
        }
    };

    const handleSave = () => {
        const oldToken = localStorage.getItem('thrx_telegram_token');

        localStorage.setItem('thrx_rag_config', JSON.stringify({ chunkSize, chunkOverlap, topK }));
        
        if (telegramToken) localStorage.setItem('thrx_telegram_token', telegramToken);
        else localStorage.removeItem('thrx_telegram_token');
        
        if (openaiKey) localStorage.setItem('thrx_openai_key', openaiKey);
        else localStorage.removeItem('thrx_openai_key');
        
        if (anthropicKey) localStorage.setItem('thrx_anthropic_key', anthropicKey);
        else localStorage.removeItem('thrx_anthropic_key');
        
        if (googleKey) localStorage.setItem('thrx_google_key', googleKey);
        else localStorage.removeItem('thrx_google_key');
        
        onClose();

        if (telegramToken !== (oldToken || '')) {
             window.location.reload();
        }
    };

    const handleReset = () => {
        setChunkSize(1000);
        setChunkOverlap(200);
        setTopK(3);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsUploading(true);
            setUploadStatus('Starting processing...');
            try {
                const files = Array.from(e.target.files);
                for (const file of files) {
                    await uploadFile(file, (msg) => setUploadStatus(`${file.name}: ${msg}`));
                }
                await loadDocuments();
            } catch (error) {
                console.error("Upload failed", error);
                setUploadStatus('Upload failed');
            } finally {
                setIsUploading(false);
                setTimeout(() => setUploadStatus(''), 3000);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteDoc = async (docId: string) => {
        if (confirm("Delete this document and all its indexed chunks?")) {
            await db.documents.delete(docId);
            await db.documentChunks.where('documentId').equals(docId).delete();
            await loadDocuments();
        }
    };

    const handleClearAllDocs = async () => {
        if (confirm("Are you sure you want to delete ALL documents from the universal knowledge base?")) {
            const universalDocs = await db.documents.filter(d => d.isUniversal !== false).toArray();
            const ids = universalDocs.map(d => d.id);
            await db.documents.bulkDelete(ids);
            await db.documentChunks.where('documentId').anyOf(ids).delete();
            await loadDocuments();
        }
    };

    const TabButton: React.FC<{ id: TabType, label: string, icon: React.ReactNode }> = ({ id, label, icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={cn(
                "flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2",
                activeTab === id 
                    ? "text-primary border-primary bg-primary/5" 
                    : "text-muted-foreground border-transparent hover:text-white hover:bg-white/5"
            )}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <>
            <div
                className={cn(
                    "fixed inset-0 bg-black/80 z-[60] transition-opacity backdrop-blur-md",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            <div
                className={cn(
                    "fixed top-0 right-0 h-full w-full sm:w-[450px] bg-[#0B0F1A] border-l border-white/10 z-[70] transform transition-transform duration-300 ease-out shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0 bg-secondary/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Settings2 size={24} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">System Configuration</h2>
                            <p className="text-xs text-muted-foreground">Manage your AI brain and integrations</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-white rounded-full hover:bg-white/5 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-white/5 bg-secondary/10 overflow-x-auto scrollbar-hide">
                    <TabButton id="rag" label="Brain" icon={<Brain size={14} />} />
                    <TabButton id="knowledge" label="Library" icon={<Database size={14} />} />
                    <TabButton id="keys" label="Keys" icon={<Key size={14} />} />
                    <TabButton id="integrations" label="Links" icon={<Globe size={14} />} />
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        
                        {activeTab === 'rag' && (
                            <div className="space-y-8">
                                <section className="space-y-4">
                                    <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                        <Cpu size={14} /> Local RAG Intelligence
                                    </h3>
                                    <div className="grid gap-6 bg-secondary/20 p-4 rounded-2xl border border-white/5">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium text-slate-300">Chunk Size</label>
                                                <span className="text-[10px] font-mono bg-primary/20 text-primary px-2 py-1 rounded-md">{chunkSize} tokens</span>
                                            </div>
                                            <input type="range" min="200" max="2000" step="100" value={chunkSize} onChange={(e) => setChunkSize(Number(e.target.value))} className="w-full accent-primary h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                                            <p className="text-[10px] text-muted-foreground italic">Size of document fragments. Larger chunks mean more context.</p>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium text-slate-300">Overlap</label>
                                                <span className="text-[10px] font-mono bg-primary/20 text-primary px-2 py-1 rounded-md">{chunkOverlap} tokens</span>
                                            </div>
                                            <input type="range" min="0" max="500" step="50" value={chunkOverlap} onChange={(e) => setChunkOverlap(Number(e.target.value))} className="w-full accent-primary h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                                            <p className="text-[10px] text-muted-foreground italic">Preserves sentence continuity between fragments.</p>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium text-slate-300">Top-K Retrieval</label>
                                                <span className="text-[10px] font-mono bg-primary/20 text-primary px-2 py-1 rounded-md">{topK} chunks</span>
                                            </div>
                                            <input type="range" min="1" max="10" step="1" value={topK} onChange={(e) => setTopK(Number(e.target.value))} className="w-full accent-primary h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                                            <p className="text-[10px] text-muted-foreground italic">Number of relevant pieces injected into the prompt.</p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'knowledge' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                        <Database size={14} /> Knowledge Library
                                    </h3>
                                    {documents.length > 0 && (
                                        <button onClick={handleClearAllDocs} className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase transition-colors">Wipe All</button>
                                    )}
                                </div>

                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-full group relative overflow-hidden flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-white/10 rounded-2xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                                >
                                    <div className="p-3 bg-white/5 rounded-full group-hover:scale-110 transition-transform">
                                        <Upload size={24} className="text-emerald-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-white">{isUploading ? "Processing..." : "Drop or Click to Index"}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">PDF, CSV, XLSX, TXT supported</p>
                                    </div>
                                </button>
                                <input type="file" multiple accept=".pdf,.csv,.xlsx,.xls,.txt" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />

                                {isUploading && uploadStatus && (
                                    <div className="text-[10px] text-emerald-400 bg-emerald-400/10 p-2 rounded-lg border border-emerald-400/20 text-center animate-pulse">
                                        {uploadStatus}
                                    </div>
                                )}

                                <div className="space-y-3 mt-4">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Indexed Documents ({documents.length})</p>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                                        {documents.length === 0 ? (
                                            <div className="text-center py-10 bg-black/20 rounded-2xl border border-white/5 text-muted-foreground italic text-xs">
                                                Your library is empty.
                                            </div>
                                        ) : (
                                            documents.map(doc => (
                                                <div key={doc.id} className="flex justify-between items-center bg-white/5 border border-white/5 p-3 rounded-xl group hover:border-emerald-500/30 transition-all hover:bg-white/[0.07]">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                                                            <FileText size={16} className="text-emerald-400" />
                                                        </div>
                                                        <div className="truncate">
                                                            <p className="text-xs font-bold text-slate-200 truncate">{doc.name}</p>
                                                            <p className="text-[9px] text-muted-foreground">{new Date(doc.parsedAt).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleDeleteDoc(doc.id)} className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'keys' && (
                            <div className="space-y-6">
                                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                    <Key size={14} /> AI Credentials
                                </h3>
                                <div className="space-y-4 bg-secondary/20 p-4 rounded-2xl border border-white/5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">OpenAI Key (GPT-4)</label>
                                        <input type="password" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} placeholder="sk-..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-amber-500/50 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Anthropic Key (Claude 3)</label>
                                        <input type="password" value={anthropicKey} onChange={(e) => setAnthropicKey(e.target.value)} placeholder="sk-ant-..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-amber-500/50 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Google Gemini Key</label>
                                        <input type="password" value={googleKey} onChange={(e) => setGoogleKey(e.target.value)} placeholder="AIza..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-amber-500/50 outline-none transition-all" />
                                    </div>
                                </div>
                                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[10px] text-amber-200/70 leading-relaxed italic">
                                    Keys are stored safely in your browser's local storage and are never uploaded to our servers.
                                </div>
                            </div>
                        )}

                        {activeTab === 'integrations' && (
                            <div className="space-y-6">
                                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                    <MessageCircle size={14} /> Messaging Hub
                                </h3>
                                <div className="bg-secondary/20 p-4 rounded-2xl border border-white/5 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                            <Globe size={20} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">Telegram Gateway</p>
                                            <p className="text-[10px] text-muted-foreground">Enable long-polling for your agent</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Bot Token</label>
                                        <input type="password" value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} placeholder="123456789:ABC..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-blue-500/50 outline-none transition-all" />
                                    </div>
                                    <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                                        Consult <a href="https://t.me/botfather" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">@BotFather</a> to create a bot.
                                    </p>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                <div className="p-6 border-t border-white/5 bg-secondary/10 flex gap-3 shrink-0">
                    <button 
                        onClick={handleReset}
                        className="flex-1 flex justify-center items-center gap-2 py-3 rounded-xl border border-white/10 text-muted-foreground hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest"
                    >
                        <RotateCcw size={16} />
                        Reset
                    </button>
                    <button 
                        onClick={handleSave}
                        className="flex-[2] flex justify-center items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-widest shadow-xl shadow-primary/20"
                    >
                        <Save size={16} />
                        Commit Changes
                    </button>
                </div>
            </div>
        </>
    );
};
