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
                    <h1 className="text-3xl font-bold mb-8">Política de Privacidad</h1>

                    <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
                        <p className="text-muted-foreground">
                            Última actualización: enero 2026
                        </p>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">1. Información que recopilamos</h2>
                            <p>
                                Recopilamos información que nos proporcionás directamente, como cuando creás una cuenta,
                                utilizás nuestros servicios o nos contactás para obtener soporte. Esto puede incluir tu nombre, dirección de correo electrónico,
                                y cualquier otra información que elijas proporcionarnos.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">2. Cómo usamos tu información</h2>
                            <p>
                                Utilizamos la información que recopilamos para proporcionar, mantener y mejorar nuestros servicios,
                                procesar transacciones, enviarte notificaciones técnicas y mensajes de soporte, y
                                responder a tus comentarios y preguntas.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">3. Compartir información</h2>
                            <p>
                                No compartimos tu información personal con terceros excepto según se describe
                                en esta política. Podemos compartir información con proveedores, consultores y otros
                                proveedores de servicios que necesitan acceso a tal información para realizar trabajos en nuestro nombre.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">4. Seguridad de datos</h2>
                            <p>
                                Tomamos medidas razonables para ayudar a proteger tu información personal de pérdida,
                                robo, mal uso, acceso no autorizado, divulgación, alteración y destrucción.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">5. Tus derechos</h2>
                            <p>
                                Podés acceder, actualizar o eliminar la información de tu cuenta en cualquier momento iniciando sesión
                                en la configuración de tu cuenta. También podés contactarnos para solicitar acceso, corrección
                                o eliminación de cualquier información personal.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">6. Contáctanos</h2>
                            <p>
                                Si tenés preguntas sobre esta Política de Privacidad, contáctanos en{' '}
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
