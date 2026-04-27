import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
    const { theme, resolvedTheme, setTheme } = useTheme();

    const cycleTheme = () => {
        if (theme === 'light') {
            setTheme('dark');
        } else if (theme === 'dark') {
            setTheme('system');
        } else {
            setTheme('light');
        }
    };

    const getAriaLabel = () => {
        if (theme === 'system') {
            return 'Switch to light mode (currently using system preference)';
        }
        if (resolvedTheme === 'dark') {
            return 'Switch to light mode';
        }
        return 'Switch to dark mode';
    };

    const getIcon = () => {
        if (theme === 'system') {
            return <Monitor className="h-4 w-4" />;
        }
        if (resolvedTheme === 'dark') {
            return <Sun className="h-4 w-4" />;
        }
        return <Moon className="h-4 w-4" />;
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            aria-label={getAriaLabel()}
        >
            {getIcon()}
        </Button>
    );
}
