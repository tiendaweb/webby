import { Head } from '@inertiajs/react';
import { useTranslation } from '@/contexts/LanguageContext';
import { Navbar, Footer, ScrollToTop } from '@/components/Landing';
import { PageProps } from '@/types';

interface LegalPageProps extends PageProps {
    canLogin: boolean;
    canRegister: boolean;
}

export default function Privacy({ auth, canLogin, canRegister }: LegalPageProps) {
    const { t } = useTranslation();
    const contactEmail = `privacy@${window.location.hostname}`;
    return (
        <>
            <Head title={t("Privacy Policy")} />
            <Navbar auth={auth} canLogin={canLogin} canRegister={canRegister} />
            <main className="pt-24 pb-16">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

                    <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
                        <p className="text-muted-foreground">
                            Last updated: January 2026
                        </p>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
                            <p>
                                We collect information you provide directly to us, such as when you create an account,
                                use our services, or contact us for support. This may include your name, email address,
                                and any other information you choose to provide.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
                            <p>
                                We use the information we collect to provide, maintain, and improve our services,
                                to process transactions, send you technical notices and support messages, and to
                                respond to your comments and questions.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">3. Information Sharing</h2>
                            <p>
                                We do not share your personal information with third parties except as described
                                in this policy. We may share information with vendors, consultants, and other
                                service providers who need access to such information to carry out work on our behalf.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">4. Data Security</h2>
                            <p>
                                We take reasonable measures to help protect your personal information from loss,
                                theft, misuse, unauthorized access, disclosure, alteration, and destruction.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">5. Your Rights</h2>
                            <p>
                                You may access, update, or delete your account information at any time by logging
                                into your account settings. You may also contact us to request access to, correction
                                of, or deletion of any personal information.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">6. Contact Us</h2>
                            <p>
                                If you have any questions about this Privacy Policy, please contact us at{' '}
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
