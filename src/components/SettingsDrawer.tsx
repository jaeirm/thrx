import React, { useState, useEffect, useRef } from 'react';
import { X, Settings2, Sliders, Database, Save, RotateCcw, Upload, FileText, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db';
import { uploadFile } from '@/lib/upload';
import { DocumentMeta } from '@/types';

interface SettingsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose }) => {
    const [chunkSize, setChunkSize] = useState(1000);
    const [chunkOverlap, setChunkOverlap] = useState(200);
    const [topK, setTopK] = useState(3);
    
    // Knowledge Base State
    const [documents, setDocuments] = useState<DocumentMeta[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Load existing config
            const savedSettings = localStorage.getItem('thrx_rag_config');
            if (savedSettings) {
                try {
                    const parsed = JSON.parse(savedSettings);
                    if (parsed.chunkSize) setChunkSize(parsed.chunkSize);
                    if (parsed.chunkOverlap) setChunkOverlap(parsed.chunkOverlap);
                    if (parsed.topK) setTopK(parsed.topK);
                } catch(e) {}
            }
            
            // Load documents
            loadDocuments();
        }
    }, [isOpen]);

    const loadDocuments = async () => {
        try {
            const docs = await db.documents.toArray();
            setDocuments(docs.sort((a, b) => new Date(b.parsedAt).getTime() - new Date(a.parsedAt).getTime()));
        } catch (e) {
            console.error("Failed to load DB docs:", e);
        }
    };

    const handleSave = () => {
        localStorage.setItem('thrx_rag_config', JSON.stringify({
            chunkSize,
            chunkOverlap,
            topK
        }));
        onClose();
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
            // Also delete associated chunks
            await db.documentChunks.where('documentId').equals(docId).delete();
            await loadDocuments();
        }
    };

    return (
        <>
            <div
                className={cn(
                    "fixed inset-0 bg-black/60 z-50 transition-opacity backdrop-blur-sm",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            <div
                className={cn(
                    "fixed top-0 right-0 h-full w-full sm:w-96 bg-gray-900 border-l border-white/10 z-50 transform transition-transform duration-300 ease-out shadow-2xl flex flex-col",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                        <Settings2 size={18} className="text-primary" />
                        Settings
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {/* Knowledge Base Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-white/5 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                            <Database size={16} />
                            Knowledge Base
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                            Upload documents (.pdf, .csv, .xlsx, .txt) to be parsed, chunked, and embedded into the local RAG database.
                        </p>

                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className={cn(
                                "w-full flex justify-center items-center gap-2 py-3 border-2 border-dashed rounded-lg transition-all",
                                isUploading ? "border-primary/50 bg-primary/5 text-primary opacity-80" : "border-white/20 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground cursor-pointer"
                            )}
                        >
                            <Upload size={18} />
                            <span className="text-sm font-medium">{isUploading ? "Uploading..." : "Upload New Document"}</span>
                        </button>
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.csv,.xlsx,.xls,.txt"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        {isUploading && uploadStatus && (
                            <div className="text-xs text-primary bg-primary/10 p-2 rounded animate-pulse text-center">
                                {uploadStatus}
                            </div>
                        )}

                        <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                            {documents.length === 0 ? (
                                <div className="text-center text-[11px] text-muted-foreground/50 py-4 italic border border-white/5 rounded bg-black/20">
                                    No documents integrated yet.
                                </div>
                            ) : (
                                documents.map(doc => (
                                    <div key={doc.id} className="flex justify-between items-center bg-black/20 border border-white/5 p-2 rounded group hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileText size={14} className="text-primary shrink-0" />
                                            <div className="truncate text-xs" title={doc.name}>
                                                <div className="font-medium text-slate-300 truncate">{doc.name}</div>
                                                <div className="text-[10px] text-muted-foreground">{new Date(doc.parsedAt).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteDoc(doc.id)}
                                            className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                            title="Delete Document"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* RAG Configuration Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-white/5 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                            <Sliders size={16} />
                            RAG Configuration
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                            Tune how local documents are parsed and retrieved for the Llama model.
                        </p>

                        <div className="space-y-5 mt-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <label className="cursor-help" title="Determines how big the paragraphs are when chopping up a document. Use 250-500 for finding specific facts, and 1000-2000 for broad conceptual questions.">Chunk Size <span className="text-muted-foreground/50 text-[10px] ml-1">ⓘ</span></label>
                                    <span className="text-primary font-mono text-xs bg-primary/10 px-2 py-0.5 rounded">{chunkSize} tokens</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="200" max="2000" step="100" 
                                    value={chunkSize}
                                    onChange={(e) => setChunkSize(Number(e.target.value))}
                                    className="w-full accent-primary"
                                    title="Determines how big the paragraphs are when chopping up a document. Use 250-500 for finding specific facts, and 1000-2000 for broad conceptual questions."
                                />
                                <p className="text-[10px] text-muted-foreground/70">Larger chunks provide more context but consume more memory.</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <label className="cursor-help" title="Ensures sentences aren't cut in half at chunk boundaries. Keep this around 10% to 20% of your Chunk Size.">Chunk Overlap <span className="text-muted-foreground/50 text-[10px] ml-1">ⓘ</span></label>
                                    <span className="text-primary font-mono text-xs bg-primary/10 px-2 py-0.5 rounded">{chunkOverlap} tokens</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" max="500" step="50" 
                                    value={chunkOverlap}
                                    onChange={(e) => setChunkOverlap(Number(e.target.value))}
                                    className="w-full accent-primary"
                                    title="Ensures sentences aren't cut in half at chunk boundaries. Keep this around 10% to 20% of your Chunk Size."
                                />
                                <p className="text-[10px] text-muted-foreground/70">Overlap prevents sentences from being cut in half during splitting.</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <label className="cursor-help" title="Max number of chunks injected into the AI's prompt. 1-3 is fast and keeps memory light. 5-10 gives the AI more puzzle pieces for complex questions.">Top-K Results (Retrieval) <span className="text-muted-foreground/50 text-[10px] ml-1">ⓘ</span></label>
                                    <span className="text-primary font-mono text-xs bg-primary/10 px-2 py-0.5 rounded">{topK} chunks</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" max="10" step="1" 
                                    value={topK}
                                    onChange={(e) => setTopK(Number(e.target.value))}
                                    className="w-full accent-primary"
                                    title="Max number of chunks injected into the AI's prompt. 1-3 is fast and keeps memory light. 5-10 gives the AI more puzzle pieces for complex questions."
                                />
                                <p className="text-[10px] text-muted-foreground/70">How many relevant chunks to inject into the LLM context.</p>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="p-4 border-t border-white/10 shrink-0 flex gap-2">
                    <button 
                        onClick={handleReset}
                        className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg border border-white/10 text-muted-foreground hover:bg-white/5 transition-colors text-sm font-medium"
                    >
                        <RotateCcw size={16} />
                        Reset
                    </button>
                    <button 
                        onClick={handleSave}
                        className="flex-1 flex justify-center items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-lg transition-colors text-sm font-medium shadow-lg shadow-primary/20"
                    >
                        <Save size={16} />
                        Save Settings
                    </button>
                </div>
            </div>
        </>
    );
};
