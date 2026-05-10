// telegramPoller.ts

export class TelegramPoller {
    private botToken: string | null = null;
    private lastUpdateId: number = 0;
    private isPolling: boolean = false;
    private failCount: number = 0;

    constructor() {
        // Retrieve token from local storage if previously saved
        if (typeof window !== 'undefined') {
            this.botToken = localStorage.getItem('thrx_telegram_token');
            const savedOffset = localStorage.getItem('thrx_telegram_offset');
            if (savedOffset) {
                this.lastUpdateId = parseInt(savedOffset, 10);
            }
        }
    }

    setToken(token: string) {
        this.botToken = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('thrx_telegram_token', token);
        }
    }

    async poll(onMessage?: (chatId: string, text: string) => Promise<string>) {
        if (!this.botToken) return;
        if (this.isPolling) return;
        
        // Exponential backoff if failing
        if (this.failCount > 0) {
            const backoffDelay = Math.min(Math.pow(2, this.failCount) * 1000, 60000);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }

        this.isPolling = true;
        try {
            const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=5`;
            const response = await fetch(url);
            
            if (response.ok) {
                this.failCount = 0; // Reset on success
                const data = await response.json();
                if (data.ok && data.result.length > 0) {
                    for (const update of data.result) {
                        // Duplicate message protection is handled by Telegram API strictly honoring offset.
                        // We still track it locally to ensure we don't re-fetch on reload.
                        this.lastUpdateId = update.update_id;
                        localStorage.setItem('thrx_telegram_offset', this.lastUpdateId.toString());
                        this.handleMessage(update.message, onMessage);
                    }
                }
            } else {
                this.failCount++;
            }
        } catch (error) {
            this.failCount++;
            console.error(`[Telegram Poller] Polling error (Fail count: ${this.failCount}):`, error);
        } finally {
            this.isPolling = false;
        }
    }

    private async handleMessage(message: any, onMessage?: (chatId: string, text: string) => Promise<string>) {
        if (!message) return;
        
        if (message.document || message.photo) {
            await this.sendMessage(message.chat.id, "Sorry, I currently cannot process files or images uploaded directly through Telegram. Please upload them in the main Thrx web interface!");
            return;
        }

        if (!message.text) return;
        
        console.log(`[Telegram] Received: ${message.text} from ${message.from.first_name}`);
        
        if (onMessage) {
            await this.sendChatAction(message.chat.id, 'typing');
            
            // Telegram 'typing' expires after 5s, so we refresh it while generating
            const typingInterval = setInterval(() => {
                this.sendChatAction(message.chat.id, 'typing');
            }, 4000);

            try {
                const reply = await onMessage(message.chat.id, message.text);
                clearInterval(typingInterval);
                await this.sendMessage(message.chat.id, reply);
            } catch (error: any) {
                clearInterval(typingInterval);
                console.error("[Telegram Poller] Callback error:", error);
                await this.sendMessage(message.chat.id, `Agent failed: ${error.message || "Unknown error processing request."}`);
            }
        } else {
            // MVP Fallback
            await this.sendMessage(message.chat.id, `Agent failed: Brain is not connected to LLM.`);
        }
    }

    async sendChatAction(chatId: string | number, action: string) {
        if (!this.botToken) return;
        try {
            const url = `https://api.telegram.org/bot${this.botToken}/sendChatAction`;
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    action: action
                })
            });
        } catch (error) {
            console.error("[Telegram Poller] Action error:", error);
        }
    }

    async sendMessage(chatId: string | number, text: string) {
        if (!this.botToken) return;
        try {
            const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: text
                })
            });
        } catch (error) {
            console.error("[Telegram Poller] Send error:", error);
        }
    }
}

export const telegramPoller = new TelegramPoller();
