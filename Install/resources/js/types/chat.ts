import { PageProps, User } from '@/types';

export interface AttachedFile {
    id: number;
    filename: string;
    mime_type: string;
    size: number;
    human_size: string;
    is_image: boolean;
    url: string;
}

export interface ChatMessage {
    id: string;
    type: 'user' | 'assistant' | 'system' | 'activity';
    content: string;
    timestamp: Date;
    activityType?: string;
    thinkingDuration?: number;
    attachedFiles?: AttachedFile[];
}

export interface ChatProps extends PageProps {
    user: User;
}
