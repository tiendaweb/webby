import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
    currentStep: number;
    steps?: string[];
}

const defaultSteps = ['Requirements', 'Permissions', 'Database', 'Admin', 'Complete'];

export default function StepIndicator({ currentStep, steps = defaultSteps }: StepIndicatorProps) {
    return (
        <div className="flex items-center justify-center gap-2">
            {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isCompleted = stepNumber < currentStep;
                const isCurrent = stepNumber === currentStep;

                return (
                    <div key={step} className="flex items-center">
                        {/* Step circle */}
                        <div className="flex flex-col items-center">
                            <div
                                className={cn(
                                    'flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors',
                                    isCompleted && 'bg-primary border-primary text-primary-foreground',
                                    isCurrent && 'border-primary text-primary bg-primary/10',
                                    !isCompleted && !isCurrent && 'border-muted-foreground/30 text-muted-foreground/50'
                                )}
                            >
                                {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                ) : (
                                    stepNumber
                                )}
                            </div>
                            <span
                                className={cn(
                                    'text-xs mt-1 whitespace-nowrap',
                                    isCurrent && 'text-foreground font-medium',
                                    isCompleted && 'text-primary',
                                    !isCompleted && !isCurrent && 'text-muted-foreground/50'
                                )}
                            >
                                {step}
                            </span>
                        </div>

                        {/* Connector line */}
                        {index < steps.length - 1 && (
                            <div
                                className={cn(
                                    'w-8 h-0.5 mx-1',
                                    stepNumber < currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
