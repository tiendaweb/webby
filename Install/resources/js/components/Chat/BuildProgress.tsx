import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    ChevronDown,
    ChevronUp,
    FileCode2,
    Eye,
    Settings,
    Search,
    Wrench,
    Check,
    X,
    Loader2,
    Brain,
    FilePlus,
    FileEdit,
    FileX,
    Activity,
} from 'lucide-react';
import type { BuildProgress as BuildProgressType, ActionEvent } from '@/hooks/useBuilderChat';

interface BuildProgressProps {
    progress: BuildProgressType;
    className?: string;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
    creating: FilePlus,
    modifying: FileEdit,
    reading: Eye,
    deleting: FileX,
    thinking: Brain,
    analyzing: Search,
    building: Wrench,
    testing: Settings,
    default: Activity,
};

export function BuildProgress({ progress, className }: BuildProgressProps) {
    const [showThinking, setShowThinking] = useState(false);
    const [showActions, setShowActions] = useState(false);
    // Track duration with associated start time to auto-reset when thinking stops
    const [durationState, setDurationState] = useState<{
        duration: number;
        forStartTime: number | null;
    }>({ duration: 0, forStartTime: null });

    // Compute actual duration: 0 when start time doesn't match (thinking stopped or changed)
    const thinkingDuration =
        durationState.forStartTime === progress.thinkingStartTime ? durationState.duration : 0;

    const isActive = progress.status === 'running' || progress.status === 'connecting';
    const hasThinking = progress.thinkingContent && progress.thinkingContent.length > 0;
    const hasActions = progress.actions.length > 0;
    const currentAction = hasActions ? progress.actions[progress.actions.length - 1] : null;

    // Update thinking duration via interval
    useEffect(() => {
        if (!progress.thinkingStartTime) return;

        const interval = setInterval(() => {
            setDurationState({
                duration: Math.floor((Date.now() - progress.thinkingStartTime!) / 1000),
                forStartTime: progress.thinkingStartTime,
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [progress.thinkingStartTime]);

    if (progress.status === 'idle') {
        return null;
    }

    return (
        <Card className={cn('border-primary/20', className)}>
            <CardContent className="p-4 space-y-3">
                {/* Status Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isActive ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : progress.status === 'completed' ? (
                            <Check className="h-4 w-4 text-primary" />
                        ) : progress.status === 'failed' ? (
                            <X className="h-4 w-4 text-destructive" />
                        ) : null}
                        <span className="text-sm font-medium">
                            {progress.status === 'connecting' && 'Connecting...'}
                            {progress.status === 'running' && 'Building...'}
                            {progress.status === 'completed' && 'Build Complete'}
                            {progress.status === 'failed' && 'Build Failed'}
                            {progress.status === 'cancelled' && 'Build Cancelled'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {progress.iterations > 0 && (
                            <Badge variant="outline" className="text-xs">
                                Iteration {progress.iterations}
                            </Badge>
                        )}
                        {progress.tokensUsed > 0 && (
                            <Badge variant="outline" className="text-xs">
                                {progress.tokensUsed.toLocaleString()} tokens
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Thinking Indicator with Shimmer */}
                {hasThinking && (
                    <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-3">
                        <div className="absolute inset-0 shimmer-animation" />
                        <div className="relative flex items-center gap-3">
                            <Brain className="h-4 w-4 text-primary animate-pulse" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Thinking</span>
                                    {thinkingDuration > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                            {thinkingDuration}s
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                    {progress.thinkingContent}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowThinking(!showThinking)}
                                className="h-6 px-2"
                            >
                                {showThinking ? (
                                    <ChevronUp className="h-3 w-3" />
                                ) : (
                                    <ChevronDown className="h-3 w-3" />
                                )}
                            </Button>
                        </div>
                        {showThinking && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                                    {progress.thinkingContent}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Current Action */}
                {currentAction && !hasThinking && (
                    <CurrentAction action={currentAction} />
                )}

                {/* Error Message */}
                {progress.error && (
                    <p className="text-sm text-destructive">{progress.error}</p>
                )}

                {/* Actions History Section */}
                {hasActions && (
                    <div className="space-y-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowActions(!showActions)}
                            className="w-full justify-between h-auto py-2 px-3"
                        >
                            <span className="flex items-center gap-2 text-xs font-medium">
                                <Activity className="h-3 w-3" />
                                Activity ({progress.actions.length})
                            </span>
                            {showActions ? (
                                <ChevronUp className="h-3 w-3" />
                            ) : (
                                <ChevronDown className="h-3 w-3" />
                            )}
                        </Button>

                        {showActions && (
                            <div className="pl-4 border-l-2 border-muted space-y-2 max-h-48 overflow-y-auto">
                                {progress.actions.map((action, index) => (
                                    <ActionItem key={index} action={action} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Completion Info */}
                {progress.status === 'completed' && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {progress.hasFileChanges && (
                            <Badge variant="secondary" className="text-xs">
                                <FileCode2 className="h-3 w-3 mr-1" />
                                Files changed
                            </Badge>
                        )}
                        {progress.previewUrl && (
                            <Badge variant="secondary" className="text-xs">
                                <Eye className="h-3 w-3 mr-1" />
                                Project ready
                            </Badge>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function CurrentAction({ action }: { action: ActionEvent }) {
    const Icon = ACTION_ICONS[action.category] || ACTION_ICONS.default;

    return (
        <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg">
            <div className="mt-0.5 text-primary">
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{action.action}</span>
                    <Badge variant="outline" className="text-xs">
                        {action.category}
                    </Badge>
                </div>
                {action.target && (
                    <p className="text-xs text-muted-foreground truncate">{action.target}</p>
                )}
                {action.details && (
                    <p className="text-xs text-muted-foreground">{action.details}</p>
                )}
            </div>
        </div>
    );
}

function ActionItem({ action }: { action: ActionEvent }) {
    const Icon = ACTION_ICONS[action.category] || ACTION_ICONS.default;

    return (
        <div className="flex items-center gap-2 text-xs">
            <Icon className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{action.action}</span>
            {action.target && (
                <span className="text-muted-foreground truncate">{action.target}</span>
            )}
        </div>
    );
}
