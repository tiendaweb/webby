export function GradientBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Gradient orbs - warm colors at bottom right */}
            <div
                className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full bg-orange-200/50 dark:bg-orange-500/20 blur-3xl animate-blob"
            />
            <div
                className="absolute -bottom-20 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl animate-blob animation-delay-2000 bg-amber-200/40 dark:bg-amber-500/15"
            />
            <div
                className="absolute -bottom-40 right-1/2 w-[550px] h-[550px] rounded-full blur-3xl animate-blob animation-delay-4000 bg-rose-100/50 dark:bg-rose-500/20"
            />

            {/* Subtle grid pattern - offset so first box is complete */}
            <div
                className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                                      linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                    backgroundPosition: '59px -1px',
                }}
            />
        </div>
    );
}
