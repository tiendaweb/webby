// Builder event types - mirrors Go builder event types

export const EventTypes = {
    STATUS: 'status',
    THINKING: 'thinking',
    REASONING: 'reasoning',
    ACTION: 'action',
    TOOL_CALL: 'tool_call',
    TOOL_RESULT: 'tool_result',
    MESSAGE: 'message',
    ERROR: 'error',
    COMPLETE: 'complete',
    SUMMARIZATION_COMPLETE: 'summarization_complete',
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];

// Status event data
export interface StatusData {
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'compacting' | 'compaction_warning';
    message: string;
}

// Thinking event data (internal AI reasoning)
export interface ThinkingData {
    content: string;
    iteration: number;
}

// Reasoning event data (extended thinking)
export interface ReasoningData {
    content: string;
    iteration: number;
}

// Action event data (human-friendly activity description)
export interface ActionData {
    action: string;    // e.g., "Creating", "Modifying", "Reading"
    target: string;    // e.g., "src/App.tsx"
    details: string;   // Optional additional details
    category: string;  // e.g., "creating", "modifying", "reading", "deleting"
}

// Tool call event data
export interface ToolCallData {
    id: string;
    tool: string;
    params: Record<string, unknown>;
}

// Tool result event data
export interface ToolResultData {
    id: string;
    tool: string;
    success: boolean;
    output: string;
    duration_ms?: number;
    iteration?: number;
}

// Message event data (AI response text)
export interface MessageData {
    content: string;
}

// Error event data
export interface ErrorData {
    error: string;
}

// Complete event data
export interface CompleteData {
    iterations: number;
    tokens_used: number;
    files_changed: boolean;
    preview_url: string | null;
}

// Summarization complete event data
export interface SummarizationData {
    old_tokens: number;
    new_tokens: number;
    reduction_percent: number;
    turns_compacted: number;
    turns_kept: number;
    message: string;
}

// Union type for all event data
export type BuilderEventData =
    | { type: 'status'; data: StatusData }
    | { type: 'thinking'; data: ThinkingData }
    | { type: 'reasoning'; data: ReasoningData }
    | { type: 'action'; data: ActionData }
    | { type: 'tool_call'; data: ToolCallData }
    | { type: 'tool_result'; data: ToolResultData }
    | { type: 'message'; data: MessageData }
    | { type: 'error'; data: ErrorData }
    | { type: 'complete'; data: CompleteData }
    | { type: 'summarization_complete'; data: SummarizationData };

// Activity item for display
export interface ActivityItem {
    id: string;
    type: EventType;
    timestamp: Date;
    data: BuilderEventData['data'];
}

// Action category icons mapping
export const ActionIcons: Record<string, string> = {
    creating: 'file-plus',
    modifying: 'file-edit',
    reading: 'file-search',
    deleting: 'file-x',
    thinking: 'brain',
    analyzing: 'search',
    building: 'hammer',
    testing: 'test-tube',
    compacting: 'scissors',
    summarizing: 'scissors',
    default: 'activity',
};

// Status colors mapping
export const StatusColors: Record<string, string> = {
    pending: 'text-yellow-500',
    running: 'text-blue-500',
    completed: 'text-green-500',
    failed: 'text-red-500',
    cancelled: 'text-gray-500',
    compacting: 'text-blue-500',
    compaction_warning: 'text-yellow-500',
};
