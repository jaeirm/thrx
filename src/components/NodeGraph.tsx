import React, { useMemo } from 'react';
import { Chat } from '@/types';
import { cn } from '@/lib/utils';
import { MessageSquare, GitBranch, Crown } from 'lucide-react';

interface NodeGraphProps {
    chats: Chat[];
    currentChatId?: string;
    onSelectChat: (chatId: string) => void;
}

interface GraphNode extends Chat {
    x: number;
    y: number;
    children: GraphNode[];
}

export const NodeGraph: React.FC<NodeGraphProps> = ({
    chats,
    currentChatId,
    onSelectChat
}) => {
    // 1. Build the tree and calculate positions
    const { nodes, connections } = useMemo(() => {
        const map = new Map<string, GraphNode>();
        const roots: GraphNode[] = [];

        // Create nodes
        chats.forEach(chat => {
            map.set(chat.id, { ...chat, x: 0, y: 0, children: [] });
        });

        // Link children
        chats.forEach(chat => {
            const node = map.get(chat.id)!;
            if (chat.parentId && map.has(chat.parentId)) {
                map.get(chat.parentId)!.children.push(node);
            } else {
                roots.push(node);
            }
        });

        const allNodes: GraphNode[] = [];
        const allConnections: { x1: number, y1: number, x2: number, y2: number }[] = [];

        // Vertical spacing
        const levelHeight = 120;
        // Horizontal spacing base
        const nodeWidth = 200;

        const layout = (node: GraphNode, x: number, y: number, width: number) => {
            node.x = x;
            node.y = y;
            allNodes.push(node);

            if (node.children.length > 0) {
                const totalChildrenWidth = width;
                const childWidth = totalChildrenWidth / node.children.length;
                let startX = x - (totalChildrenWidth / 2) + (childWidth / 2);

                node.children.forEach(child => {
                    layout(child, startX, y + levelHeight, childWidth);
                    allConnections.push({
                        x1: node.x,
                        y1: node.y + 30, // Connect from bottom of node
                        x2: child.x,
                        y2: child.y - 30  // Connect to top of node
                    });
                    startX += childWidth;
                });
            }
        };

        // Layout each root (root groups are effectively independent graphs in this view)
        // For now, let's just layout the tree belonging to the current group
        const currentChat = chats.find(c => c.id === currentChatId);
        let rootGroup: GraphNode | undefined;

        if (currentChat) {
            let curr = currentChat;
            while (curr.parentId) {
                const parent = chats.find(c => c.id === curr.parentId);
                if (!parent) break;
                curr = parent;
            }
            rootGroup = map.get(curr.id);
        }

        if (rootGroup) {
            layout(rootGroup, 400, 100, 600);
        } else if (roots.length > 0) {
            // Default to first root if nothing selected or group not found
            layout(roots[0], 400, 100, 600);
        }

        return { nodes: allNodes, connections: allConnections };
    }, [chats, currentChatId]);

    if (nodes.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground italic">
                Select a group to view its structure
            </div>
        );
    }

    return (
        <div className="flex-1 w-full h-full overflow-auto bg-background/50 relative p-10 scrollbar-hide">
            <svg className="absolute inset-0 w-[2000px] h-[2000px] pointer-events-none">
                <defs>
                    <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="0"
                        refY="3.5"
                        orient="auto"
                    >
                        <polygon points="0 0, 10 3.5, 0 7" fill="rgba(59, 130, 246, 0.4)" />
                    </marker>
                </defs>
                {connections.map((conn, i) => (
                    <line
                        key={i}
                        x1={conn.x1}
                        y1={conn.y1}
                        x2={conn.x2}
                        y2={conn.y2}
                        stroke="rgba(59, 130, 246, 0.2)"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                    />
                ))}
            </svg>

            <div className="relative w-[2000px] h-[2000px]">
                {nodes.map(node => {
                    const isActive = node.id === currentChatId;
                    const isRoot = !node.parentId;

                    return (
                        <button
                            key={node.id}
                            onClick={() => onSelectChat(node.id)}
                            style={{
                                left: node.x - 80,
                                top: node.y - 30,
                                width: 160,
                            }}
                            className={cn(
                                "absolute h-[60px] rounded-xl border flex flex-col items-center justify-center transition-all duration-300 p-2 text-center group",
                                isActive
                                    ? "bg-primary/20 border-primary shadow-[0_0_20px_rgba(59,130,246,0.3)] z-20 scale-105"
                                    : "bg-card/50 border-border hover:border-primary/50 hover:bg-card/80 z-10"
                            )}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                {isRoot ? (
                                    <Crown size={12} className="text-yellow-500" />
                                ) : (
                                    <GitBranch size={12} className="text-primary/70" />
                                )}
                                <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-widest",
                                    isActive ? "text-primary" : "text-muted-foreground"
                                )}>
                                    {isRoot ? "Root Node" : "Branch"}
                                </span>
                            </div>
                            <span className={cn(
                                "text-[11px] font-medium truncate w-full",
                                isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                            )}>
                                {node.title || "Untitled"}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
