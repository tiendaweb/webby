import { Head } from '@inertiajs/react';
import { useTranslation } from '@/contexts/LanguageContext';
import { Navbar, Footer, ScrollToTop } from '@/components/Landing';
import { PageProps } from '@/types';

interface LegalPageProps extends PageProps {
    canLogin: boolean;
    canRegister: boolean;
}

export default function Terms({ auth, canLogin, canRegister }: LegalPageProps) {
    const { t } = useTranslation();
    const contactEmail = `legal@${window.location.hostname}`;
    return (
        <>
            <Head title={t("Terms of Service")} />
            <Navbar auth={auth} canLogin={canLogin} canRegister={canRegister} />
            <main className="pt-24 pb-16">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

                    <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
                        <p className="text-muted-foreground">
                            Last updated: January 2026
                        </p>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
                            <p>
                                By accessing or using our services, you agree to be bound by these Terms of Service
                                and all applicable laws and regulations. If you do not agree with any of these terms,
                                you are prohibited from using or accessing our services.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">2. Use License</h2>
                            <p>
                                Permission is granted to temporarily use our services for personal, non-commercial
                                transitory viewing only. This is the grant of a license, not a transfer of title,
                                and under this license you may not modify or copy the materials, use the materials
                                for any commercial purpose, or attempt to decompile or reverse engineer any software
                                contained in our services.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">3. User Accounts</h2>
                            <p>
                                When you create an account with us, you must provide accurate, complete, and current
                                information. You are responsible for safeguarding the password and for all activities
                                that occur under your account. You agree to notify us immediately of any unauthorized
                                use of your account.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">4. Intellectual Property</h2>
                            <p>
                                The content, features, and functionality of our services are owned by us and are
                                protected by international copyright, trademark, patent, trade secret, and other
                                intellectual property laws.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">5. Limitation of Liability</h2>
                            <p>
                                In no event shall we be liable for any indirect, incidental, special, consequential,
                                or punitive damages, including without limitation, loss of profits, data, use,
                                goodwill, or other intangible losses, resulting from your access to or use of or
                                inability to access or use the services.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">6. Changes to Terms</h2>
                            <p>
                                We reserve the right to modify or replace these terms at any time. If a revision
                                is material, we will try to provide at least 30 days notice prior to any new terms
                                taking effect.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">7. Contact Us</h2>
                            <p>
                                If you have any questions about these Terms of Service, please contact us at{' '}
                                {contactEmail}.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
            <Footer />
            <ScrollToTop />
        </>
    );
}
