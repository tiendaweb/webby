import { Head } from '@inertiajs/react';
import { useTranslation } from '@/contexts/LanguageContext';
import { Navbar, Footer, ScrollToTop } from '@/components/Landing';
import { PageProps } from '@/types';

interface LegalPageProps extends PageProps {
    canLogin: boolean;
    canRegister: boolean;
}

export default function Cookies({ auth, canLogin, canRegister }: LegalPageProps) {
    const { t } = useTranslation();
    const contactEmail = `privacy@${window.location.hostname}`;
    return (
        <>
            <Head title={t("Cookie Policy")} />
            <Navbar auth={auth} canLogin={canLogin} canRegister={canRegister} />
            <main className="pt-24 pb-16">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold mb-8">Cookie Policy</h1>

                    <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
                        <p className="text-muted-foreground">
                            Last updated: January 2026
                        </p>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">1. What Are Cookies</h2>
                            <p>
                                Cookies are small text files that are placed on your computer or mobile device
                                when you visit a website. They are widely used to make websites work more
                                efficiently and to provide information to the owners of the site.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">2. How We Use Cookies</h2>
                            <p>
                                We use cookies for the following purposes:
                            </p>
                            <ul className="list-disc pl-6 mt-2 space-y-2">
                                <li><strong>Essential cookies:</strong> Required for the operation of our website, including cookies that enable you to log into secure areas.</li>
                                <li><strong>Analytical cookies:</strong> Allow us to recognize and count the number of visitors and see how visitors move around our website.</li>
                                <li><strong>Functionality cookies:</strong> Used to recognize you when you return to our website and enable us to personalize our content for you.</li>
                                <li><strong>Preference cookies:</strong> Enable our website to remember your preferences such as theme settings.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">3. Third-Party Cookies</h2>
                            <p>
                                In addition to our own cookies, we may also use various third-party cookies to
                                report usage statistics of the service and deliver advertisements on and through
                                the service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">4. Managing Cookies</h2>
                            <p>
                                Most web browsers allow you to control cookies through their settings preferences.
                                However, if you limit the ability of websites to set cookies, you may impact your
                                overall user experience. Some features of our service may not function properly
                                if the ability to accept cookies is disabled.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">5. Cookie Retention</h2>
                            <p>
                                Session cookies are deleted when you close your browser. Persistent cookies remain
                                on your device for a set period of time specified in the cookie or until you
                                delete them manually.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">6. Updates to This Policy</h2>
                            <p>
                                We may update this Cookie Policy from time to time. We will notify you of any
                                changes by posting the new Cookie Policy on this page and updating the
                                &quot;Last updated&quot; date.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">7. Contact Us</h2>
                            <p>
                                If you have any questions about our Cookie Policy, please contact us at{' '}
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
