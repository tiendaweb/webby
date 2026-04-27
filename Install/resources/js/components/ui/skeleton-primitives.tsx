import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

// Size mappings for consistent sizing across components
const textSizes = {
    sm: 'h-3',
    base: 'h-4',
    lg: 'h-5',
    xl: 'h-6',
} as const;

const buttonSizes = {
    sm: 'h-8',
    md: 'h-9',
    lg: 'h-10',
} as const;

const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
} as const;

const avatarSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
} as const;

// SkeletonText - Text line placeholder
interface SkeletonTextProps extends React.ComponentProps<'div'> {
    size?: keyof typeof textSizes;
    width?: string;
}

export function SkeletonText({
    size = 'base',
    width = 'w-24',
    className,
    ...props
}: SkeletonTextProps) {
    return (
        <Skeleton
            className={cn(textSizes[size], width, className)}
            {...props}
        />
    );
}

// SkeletonButton - Button placeholder
interface SkeletonButtonProps extends React.ComponentProps<'div'> {
    size?: keyof typeof buttonSizes;
    variant?: 'default' | 'icon';
}

export function SkeletonButton({
    size = 'md',
    variant = 'default',
    className,
    ...props
}: SkeletonButtonProps) {
    const isIcon = variant === 'icon';
    const height = buttonSizes[size];
    const width = isIcon ? buttonSizes[size].replace('h-', 'w-') : 'w-24';

    return (
        <Skeleton
            className={cn(height, width, 'rounded-md', className)}
            {...props}
        />
    );
}

// SkeletonBadge - Badge/tag placeholder
interface SkeletonBadgeProps extends React.ComponentProps<'div'> {
    width?: string;
}

export function SkeletonBadge({
    width = 'w-16',
    className,
    ...props
}: SkeletonBadgeProps) {
    return (
        <Skeleton
            className={cn('h-5 rounded-full', width, className)}
            {...props}
        />
    );
}

// SkeletonInput - Form input placeholder
interface SkeletonInputProps extends React.ComponentProps<'div'> {
    width?: string;
}

export function SkeletonInput({
    width = 'w-full',
    className,
    ...props
}: SkeletonInputProps) {
    return (
        <Skeleton
            className={cn('h-9 rounded-md', width, className)}
            {...props}
        />
    );
}

// SkeletonIcon - Icon placeholder
interface SkeletonIconProps extends React.ComponentProps<'div'> {
    size?: keyof typeof iconSizes;
    shape?: 'square' | 'circle';
}

export function SkeletonIcon({
    size = 'md',
    shape = 'square',
    className,
    ...props
}: SkeletonIconProps) {
    const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-md';

    return (
        <Skeleton
            className={cn(iconSizes[size], roundedClass, className)}
            {...props}
        />
    );
}

// SkeletonAvatar - User avatar placeholder
interface SkeletonAvatarProps extends React.ComponentProps<'div'> {
    size?: keyof typeof avatarSizes;
}

export function SkeletonAvatar({
    size = 'md',
    className,
    ...props
}: SkeletonAvatarProps) {
    return (
        <Skeleton
            className={cn(avatarSizes[size], 'rounded-full', className)}
            {...props}
        />
    );
}
