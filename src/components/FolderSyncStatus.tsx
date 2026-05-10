import React, { useState } from 'react';
import { fsSync } from '@/lib/fileSystemSync';
import { FolderSync, FolderCheck, AlertCircle } from 'lucide-react';

export const FolderSyncStatus = () => {
    const [isSynced, setIsSynced] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        // Try to restore access silently on load
        fsSync.initFromStorage().then(success => {
            if (success) setIsSynced(true);
        });
    }, []);

    const handleSyncClick = async () => {
        setError(null);
        
        // 1. Try to request access to stored handle first (less disruptive)
        let result = await fsSync.requestStoredAccess();
        
        // 2. If that fails (no handle or permission denied), fall back to picker
        if (!result.success) {
            console.log("Stored access failed or unavailable, opening picker...");
            const pickerResult = await fsSync.requestAccess();
            result = { 
                success: pickerResult.success, 
                error: pickerResult.error 
            };
            if (pickerResult.cancelled) return;
        }

        if (result.success) {
            setIsSynced(true);
            setError(null);
            // Optionally initialize HEARTBEAT.md if it doesn't exist
            const heartbeat = await fsSync.readFile('HEARTBEAT.md');
            if (heartbeat === null) {
                const initialContent = `## State\nlast_run: 0\n\n## Tasks\n- [ ] Initial task list created.\n`;
                await fsSync.writeFile('HEARTBEAT.md', initialContent);
            }
        } else {
            setError("Access denied or unsupported.");
        }
    };

    return (
        <button
            onClick={handleSyncClick}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isSynced
                    ? 'border-green-500/30 bg-green-500/10 text-green-400'
                    : 'border-white/10 bg-secondary/30 text-muted-foreground hover:text-white'
            }`}
            title={isSynced ? "Local folder synced" : "Sync to local folder"}
        >
            {isSynced ? <FolderCheck size={14} /> : <FolderSync size={14} />}
            <span className="hidden sm:inline">
                {isSynced ? 'Brain Synced' : 'Sync Brain Folder'}
            </span>
            {error && (
                <span className="text-red-400 ml-2" title={error}>
                    <AlertCircle size={14} />
                </span>
            )}
        </button>
    );
};
