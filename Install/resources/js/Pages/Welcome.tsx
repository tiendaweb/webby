import { Head, Link } from '@inertiajs/react';
import { useTranslation } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { PageProps } from '@/types';

export default function Welcome({
    auth,
}: PageProps<{ canLogin: boolean; canRegister: boolean }>) {
    const { t } = useTranslation();
    return (
        <>
            <Head title={t("Welcome")} />

            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <div className="prose dark:prose-invert">
                    <h1 className="text-4xl font-bold text-foreground mb-8">Hello world</h1>
                </div>

                <div className="flex gap-4">
                    {auth.user ? (
                        <Button asChild>
                            <Link href="/create">Create</Link>
                        </Button>
                    ) : (
                        <>
                            <Button asChild variant="outline">
                                <Link href="/login">Log in</Link>
                            </Button>
                            <Button asChild>
                                <Link href="/register">Get Started</Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
