import { get, set } from 'idb-keyval';

export class FileSystemSync {
    private dirHandle: FileSystemDirectoryHandle | null = null;
    private initialized = false;

    // Call this from a user gesture (e.g., button click)
    async requestAccess(): Promise<{ success: boolean; cancelled?: boolean; error?: string }> {
        try {
            if (!window.showDirectoryPicker) {
                console.warn("File System Access API is not supported in this browser.");
                return { success: false, error: "Not supported" };
            }
            this.dirHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
            });
            this.initialized = true;
            // Save to IndexedDB
            await set('thrx_dir_handle', this.dirHandle);
            return { success: true };
        } catch (error: any) {
            if (error.name === 'AbortError') {
                return { success: false, cancelled: true };
            }
            console.error("User cancelled or failed to grant directory access:", error);
            return { success: false, error: error.message };
        }
    }

    isReady() {
        return this.initialized && this.dirHandle !== null;
    }

    async writeFile(filename: string, content: string): Promise<boolean> {
        if (!this.dirHandle) return false;
        try {
            const fileHandle = await this.dirHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            return true;
        } catch (error) {
            console.error(`Failed to write file ${filename}:`, error);
            return false;
        }
    }

    async readFile(filename: string): Promise<string | null> {
        if (!this.dirHandle) return null;
        try {
            const fileHandle = await this.dirHandle.getFileHandle(filename);
            const file = await fileHandle.getFile();
            return await file.text();
        } catch (error) {
            // File might not exist yet
            return null;
        }
    }

    async appendToFile(filename: string, content: string): Promise<boolean> {
        if (!this.dirHandle) return false;
        try {
            let existingContent = await this.readFile(filename);
            if (existingContent === null) existingContent = '';
            const newContent = existingContent + (existingContent.endsWith('\n') ? '' : '\n') + content;
            return await this.writeFile(filename, newContent);
        } catch (error) {
            console.error(`Failed to append to file ${filename}:`, error);
            return false;
        }
    }

    // Attempt to verify permission. promptIfNeeded should only be true if called from a user gesture.
    async verifyPermission(fileHandle: FileSystemHandle, readWrite: boolean = true, promptIfNeeded: boolean = false): Promise<boolean> {
        const options: FileSystemHandlePermissionDescriptor = {
            mode: readWrite ? 'readwrite' : 'read'
        };
        
        // Query current status
        const status = await fileHandle.queryPermission(options);
        if (status === 'granted') {
            return true;
        }

        // Only request if explicitly asked AND it's from a user gesture (checked by browser)
        if (promptIfNeeded && status === 'prompt') {
            try {
                if ((await (fileHandle as any).requestPermission(options)) === 'granted') {
                    return true;
                }
            } catch (error) {
                console.error("Permission request failed (likely missing user activation):", error);
            }
        }
        
        return false;
    }

    async initFromStorage(): Promise<boolean> {
        try {
            const handle = await get('thrx_dir_handle');
            if (handle) {
                // Silently check if we still have permission. Never prompt here.
                const hasPermission = await this.verifyPermission(handle, true, false);
                if (hasPermission) {
                    this.dirHandle = handle as FileSystemDirectoryHandle;
                    this.initialized = true;
                    return true;
                }
            }
        } catch (e) {
            console.error("Failed to init from storage:", e);
        }
        return false;
    }

    // Try to restore access using the stored handle, requesting permission if needed.
    // This MUST be called from a user gesture.
    async requestStoredAccess(): Promise<{ success: boolean; error?: string }> {
        try {
            const handle = await get('thrx_dir_handle');
            if (handle) {
                const hasPermission = await this.verifyPermission(handle, true, true);
                if (hasPermission) {
                    this.dirHandle = handle as FileSystemDirectoryHandle;
                    this.initialized = true;
                    return { success: true };
                }
            }
            return { success: false, error: "No stored handle or permission denied" };
        } catch (error: any) {
            console.error("Failed to request stored access:", error);
            return { success: false, error: error.message };
        }
    }

    async getFileLastModified(filename: string): Promise<number | null> {
        if (!this.dirHandle) return null;
        try {
            const fileHandle = await this.dirHandle.getFileHandle(filename);
            const file = await fileHandle.getFile();
            return file.lastModified;
        } catch (error) {
            return null;
        }
    }

    async listFiles(): Promise<string[]> {
        if (!this.dirHandle) return [];
        const files: string[] = [];
        try {
            for await (const entry of (this.dirHandle as any).values()) {
                if (entry.kind === 'file') {
                    files.push(entry.name);
                }
            }
        } catch (error) {
            console.error("Failed to list files:", error);
        }
        return files;
    }
}

export const fsSync = new FileSystemSync();
