import { PropsWithChildren } from 'react';
import { Link, InertiaLinkProps } from '@inertiajs/react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Dropdown = ({ children }: PropsWithChildren) => {
    return <DropdownMenu>{children}</DropdownMenu>;
};

const Trigger = ({ children }: PropsWithChildren) => {
    return <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>;
};

const Content = ({
    align = 'end',
    children,
}: PropsWithChildren<{
    align?: 'start' | 'center' | 'end';
    width?: '48';
    contentClasses?: string;
}>) => {
    return (
        <DropdownMenuContent align={align} className="w-48">
            {children}
        </DropdownMenuContent>
    );
};

const DropdownLink = ({
    className = '',
    children,
    ...props
}: InertiaLinkProps) => {
    return (
        <DropdownMenuItem asChild>
            <Link
                {...props}
                className={className}
            >
                {children}
            </Link>
        </DropdownMenuItem>
    );
};

Dropdown.Trigger = Trigger;
Dropdown.Content = Content;
Dropdown.Link = DropdownLink;

export default Dropdown;

// Re-export the shadcn DropdownMenu for direct use
export { DropdownMenu };
