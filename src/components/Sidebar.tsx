import React from 'react';
import { MessageSquare, Plus, Settings, LogOut, PanelLeftClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Chat } from '@/types';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    chats: Chat[];
    currentChatId?: string;
    onSelectChat: (chatId: string) => void;
    onNewChat: () => void;
    onClearChats: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onClose,
    chats,
    currentChatId,
    onSelectChat,
    onNewChat,
    onClearChats
}) => {
    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <div className={cn(
                "fixed md:relative inset-y-0 left-0 z-50 w-72 bg-gray-900 border-r border-gray-800 transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col",
                isOpen ? "translate-x-0" : "-translate-x-full md:hidden" // Allow hidden on desktop if implemented later, but for now fixed
            )}>
                <div className="p-4 flex items-center justify-between">
                    <button
                        onClick={onNewChat}
                        className="flex-1 flex items-center gap-2 px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors duration-200 border border-primary/20"
                    >
                        <Plus size={18} />
                        <span className="font-semibold text-sm">New Chat</span>
                    </button>

                    <button
                        onClick={onClose}
                        className="md:hidden ml-2 p-2 text-muted-foreground hover:text-foreground"
                    >
                        <PanelLeftClose size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 space-y-2 scrollbar-thumb-gray-700 scrollbar-track-transparent scrollbar-thin">
                    <div className="text-xs font-medium text-muted-foreground px-4 py-2 uppercase tracking-wider">
                        History
                    </div>
                    {chats.map(chat => (
                        <button
                            key={chat.id}
                            onClick={() => onSelectChat(chat.id)}
                            className={cn(
                                "w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors text-sm truncate",
                                currentChatId === chat.id
                                    ? "bg-secondary text-secondary-foreground"
                                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                            )}
                        >
                            <MessageSquare size={16} className="shrink-0" />
                            <span className="truncate">{chat.title}</span>
                        </button>
                    ))}

                    {chats.length === 0 && (
                        <div className="text-center text-muted-foreground text-sm py-10 opacity-50">
                            No history yet
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-800 space-y-1">
                    <button
                        onClick={() => {
                            if (window.confirm('Are you sure you want to delete all chats? This cannot be undone.')) {
                                onClearChats();
                            }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                    >
                        <LogOut size={18} />
                        <span>Clear All Chats</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground rounded-lg transition-colors">
                        <Settings size={18} />
                        <span>Settings</span>
                    </button>
                </div>
            </div>
        </>
    );
};
