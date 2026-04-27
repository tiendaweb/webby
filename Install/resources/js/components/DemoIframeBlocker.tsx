import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';

export function DemoIframeBlocker() {
    const { isDemo } = usePage<PageProps>().props;
    const [showBlocker, setShowBlocker] = useState(false);

    useEffect(() => {
        if (!isDemo) return;

        try {
            const isInIframe = window.self !== window.top;
            const referrer = document.referrer.toLowerCase();
            const isCodeCanyon =
                referrer.includes('codecanyon.net') ||
                referrer.includes('preview.codecanyon.net') ||
                referrer.includes('envato.com');

            if (isInIframe && isCodeCanyon) {
                setShowBlocker(true);
            }
        } catch {
            // Cross-origin iframe - show modal as fallback
            setShowBlocker(true);
        }
    }, [isDemo]);

    const handleOpenInNewTab = () => {
        window.open(window.location.href, '_blank');
    };

    if (!showBlocker) return null;

    return (
        <Dialog open={showBlocker} onOpenChange={() => {}}>
            <DialogContent
                className="sm:max-w-md"
                showClose={false}
                overlayClassName="backdrop-blur-sm"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <ExternalLink className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center">
                        Open Demo in New Tab
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        For the best experience with all features working properly, please open the demo in a new browser tab.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 pt-4">
                    <Button onClick={handleOpenInNewTab} className="w-full">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Demo
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
