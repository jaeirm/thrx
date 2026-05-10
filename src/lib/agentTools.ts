import * as webllm from "@mlc-ai/web-llm";
import { searchRelevantContext } from "./ragEngine";
import { fsSync } from "./fileSystemSync";

export interface ToolRegistry {
    tools: webllm.ChatCompletionTool[];
    executeTool: (name: string, args: Record<string, any>) => Promise<string>;
}

// 1. Define the Tools for WebLLM
export const agentTools: webllm.ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "web_search",
            description: "Search the web for up-to-date information, news, and facts.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The search query to look up on the internet."
                    }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "calculator",
            description: "Perform mathematical calculations. Supports basic arithmetic.",
            parameters: {
                type: "object",
                properties: {
                    expression: {
                        type: "string",
                        description: "The mathematical expression to evaluate (e.g. '2 + 2 * 5')."
                    }
                },
                required: ["expression"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "knowledge_base_search",
            description: "Search internal documents and knowledge base for relevant information.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The search query for the internal knowledge base."
                    }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "read_file",
            description: "Read the contents of a file from the local workspace.",
            parameters: {
                type: "object",
                properties: {
                    filename: {
                        type: "string",
                        description: "The name of the file to read (e.g., 'notes.txt')."
                    }
                },
                required: ["filename"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "write_file",
            description: "Write or overwrite a file in the local workspace.",
            parameters: {
                type: "object",
                properties: {
                    filename: {
                        type: "string",
                        description: "The name of the file to write."
                    },
                    content: {
                        type: "string",
                        description: "The content to write to the file."
                    }
                },
                required: ["filename", "content"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_system_info",
            description: "Get current system information including time, date, and status.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "list_files",
            description: "List files in the current workspace directory.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "system_command",
            description: "Execute a system command on the host OS. Use for tasks like checking CPU usage, listing processes, or OS-specific operations.",
            parameters: {
                type: "object",
                properties: {
                    command: {
                        type: "string",
                        description: "The command to execute (e.g., 'dir', 'systeminfo', 'ls -la')."
                    }
                },
                required: ["command"]
            }
        }
    }
];


// 2. Implement the Execution Router
export const executeTool = async (name: string, args: Record<string, any>, context?: any): Promise<string> => {

    try {
        switch (name) {
            case "web_search": {
                if (!args.query) return "Error: Missing query parameter for web_search.";
                console.log(`[Agent Tool] Executing web_search with query: ${args.query}`);
                
                const res = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: args.query })
                });
                if (!res.ok) throw new Error("Search API failed");
                const data = await res.json();
                
                if (data.results && data.results.length > 0) {
                    const snippets = data.results.slice(0, 3).map((r: any, i: number) => 
                        `Result ${i+1}: ${r.title}\n${r.content}`
                    ).join('\n\n');
                    return snippets;
                }
                return "No search results found for the query.";
            }

            case "calculator": {
                if (!args.expression) return "Error: Missing expression parameter for calculator.";
                console.log(`[Agent Tool] Executing calculator with expression: ${args.expression}`);
                
                // Safe basic evaluation
                // Allow only numbers and basic operators to prevent execution of arbitrary code
                const sanitized = args.expression.replace(/[^0-9+\-*/().]/g, '');
                if (!sanitized) return "Error: Invalid characters in expression.";
                
                try {
                    // eslint-disable-next-line no-new-func
                    const result = new Function(`return ${sanitized}`)();
                    return String(result);
                } catch (e) {
                    return `Error: Invalid mathematical expression: ${args.expression}`;
                }
            }
            
            case "knowledge_base_search": {
                if (!args.query) return "Error: Missing query parameter for knowledge_base_search.";
                console.log(`[Agent Tool] Executing knowledge_base_search with query: ${args.query}`);
                const context = await searchRelevantContext(args.query);
                return context || "No relevant information found in internal documents.";
            }

            case "read_file": {
                if (!args.filename) return "Error: Missing filename parameter for read_file.";
                if (!fsSync.isReady()) return "Error: File system access not granted. Please click the folder icon to grant access.";
                console.log(`[Agent Tool] Reading file: ${args.filename}`);
                const content = await fsSync.readFile(args.filename);
                return content !== null ? content : `Error: File '${args.filename}' not found.`;
            }

            case "write_file": {
                if (!args.filename || !args.content) return "Error: Missing parameters for write_file.";
                if (!fsSync.isReady()) return "Error: File system access not granted. Please click the folder icon to grant access.";
                console.log(`[Agent Tool] Writing to file: ${args.filename}`);
                const success = await fsSync.writeFile(args.filename, args.content);
                return success ? `Successfully wrote to ${args.filename}.` : `Error: Failed to write to ${args.filename}.`;
            }

            case "get_system_info": {
                const now = new Date();
                return JSON.stringify({
                    currentTime: now.toLocaleTimeString(),
                    currentDate: now.toLocaleDateString(),
                    dayOfWeek: now.toLocaleDateString(undefined, { weekday: 'long' }),
                    fsReady: fsSync.isReady(),
                    platform: navigator.platform,
                    userAgent: navigator.userAgent
                }, null, 2);
            }

            case "list_files": {
                if (!fsSync.isReady()) return "Error: File system access not granted.";
                // We need to implement listFiles in fsSync
                const files = await (fsSync as any).listFiles?.() || ["HEARTBEAT.md"]; // Fallback for now if not implemented
                return files.join(', ');
            }

            case "system_command": {
                if (!args.command) return "Error: Missing command parameter.";
                if (!context?.executeSystemCommand) return "Error: Native bridge not connected or available.";
                
                console.log(`[Agent Tool] Executing system_command: ${args.command}`);
                const res = await context.executeSystemCommand(args.command);
                if (!res) return "Error: Failed to communicate with native bridge.";
                
                return `Status: ${res.status}\nStdout: ${res.stdout}\nStderr: ${res.stderr}`;
            }


            default:
                return `Error: Unknown tool '${name}'`;
        }
    } catch (error: any) {
        console.error(`[Agent Tool] Error executing ${name}:`, error);
        return `Error executing tool ${name}: ${error.message}`;
    }
};
