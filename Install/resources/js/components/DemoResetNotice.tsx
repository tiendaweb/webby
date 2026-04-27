import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Clock, Shield } from 'lucide-react';

interface DemoResetNoticeProps {
    variant?: 'user' | 'admin';
}

const STORAGE_KEYS = {
    user: 'demo-reset-notice-dismissed',
    admin: 'demo-admin-notice-dismissed',
};

export function DemoResetNotice({ variant = 'user' }: DemoResetNoticeProps) {
    const { isDemo } = usePage<PageProps>().props;
    const storageKey = STORAGE_KEYS[variant];

    const [open, setOpen] = useState(() => {
        if (!isDemo) return false;
        return !localStorage.getItem(storageKey);
    });

    const handleDismiss = () => {
        localStorage.setItem(storageKey, 'true');
        setOpen(false);
    };

    if (!isDemo) return null;

    const isAdmin = variant === 'admin';
    const Icon = isAdmin ? Shield : Clock;

    return (
        <Dialog open={open} onOpenChange={(value) => {
            if (!value) handleDismiss();
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center">
                        Demo Mode
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {isAdmin
                            ? 'This admin panel is for demo viewing only. Settings are read-only and the environment resets every 3 hours. Register your own account to test the AI website builder.'
                            : 'This demo environment resets every 3 hours. Any projects or changes will be cleared automatically.'
                        }
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-center">
                    <Button onClick={handleDismiss}>
                        Got it
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
