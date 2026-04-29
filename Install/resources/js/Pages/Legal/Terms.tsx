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
                    <h1 className="text-3xl font-bold mb-8">Términos de Servicio</h1>

                    <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
                        <p className="text-muted-foreground">
                            Última actualización: enero 2026
                        </p>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">1. Aceptación de términos</h2>
                            <p>
                                Al acceder o utilizar nuestros servicios, aceptás estar sujeto a estos Términos de Servicio
                                y todas las leyes y regulaciones aplicables. Si no estás de acuerdo con ninguno de estos términos,
                                te prohíbe usar o acceder a nuestros servicios.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">2. Licencia de uso</h2>
                            <p>
                                Se otorga permiso para usar temporalmente nuestros servicios solo para visualización personal y no comercial.
                                Esta es una concesión de licencia, no una transferencia de título,
                                y bajo esta licencia no podés modificar ni copiar los materiales, utilizar los materiales
                                para ningún propósito comercial, o intentar descompilar o hacer ingeniería inversa de ningún software
                                contenido en nuestros servicios.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">3. Cuentas de usuario</h2>
                            <p>
                                Cuando creás una cuenta con nosotros, debes proporcionar información precisa, completa y actual.
                                Sos responsable de salvaguardar la contraseña y de todas las actividades
                                que ocurran en tu cuenta. Aceptás notificarnos inmediatamente de cualquier uso no autorizado
                                de tu cuenta.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">4. Propiedad intelectual</h2>
                            <p>
                                El contenido, las características y la funcionalidad de nuestros servicios nos pertenecen y están
                                protegidos por leyes internacionales de derechos de autor, marca registrada, patente, secreto comercial y otras
                                leyes de propiedad intelectual.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">5. Limitación de responsabilidad</h2>
                            <p>
                                En ningún caso seremos responsables por daños indirectos, incidentales, especiales, consecuentes,
                                o punitivos, incluyendo sin limitación, pérdida de ganancias, datos, uso,
                                buena voluntad u otras pérdidas intangibles, resultantes de tu acceso o uso o
                                incapacidad para acceder o usar los servicios.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">6. Cambios en los términos</h2>
                            <p>
                                Nos reservamos el derecho de modificar o reemplazar estos términos en cualquier momento. Si una revisión
                                es material, intentaremos proporcionar al menos 30 días de notificación previo a que se efectúen los nuevos términos.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">7. Contáctanos</h2>
                            <p>
                                Si tenés preguntas sobre estos Términos de Servicio, contáctanos en{' '}
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
