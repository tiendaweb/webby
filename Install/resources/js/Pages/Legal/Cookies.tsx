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
                    <h1 className="text-3xl font-bold mb-8">Política de Cookies</h1>

                    <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
                        <p className="text-muted-foreground">
                            Última actualización: enero 2026
                        </p>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">1. Qué son las cookies</h2>
                            <p>
                                Las cookies son pequeños archivos de texto que se colocan en tu computadora o dispositivo móvil
                                cuando visitás un sitio web. Se utilizan ampliamente para que los sitios web funcionen más
                                eficientemente y para proporcionar información a los propietarios del sitio.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">2. Cómo usamos las cookies</h2>
                            <p>
                                Usamos cookies para los siguientes propósitos:
                            </p>
                            <ul className="list-disc pl-6 mt-2 space-y-2">
                                <li><strong>Cookies esenciales:</strong> Requeridas para el funcionamiento de nuestro sitio web, incluyendo cookies que te permiten iniciar sesión en áreas seguras.</li>
                                <li><strong>Cookies analíticas:</strong> Nos permiten reconocer y contar el número de visitantes y ver cómo se desplazan por nuestro sitio web.</li>
                                <li><strong>Cookies de funcionalidad:</strong> Se utilizan para reconocerte cuando regresas a nuestro sitio web y permitirnos personalizar nuestro contenido para ti.</li>
                                <li><strong>Cookies de preferencia:</strong> Permiten que nuestro sitio web recuerde tus preferencias como la configuración del tema.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">3. Cookies de terceros</h2>
                            <p>
                                Además de nuestras propias cookies, también podemos usar varias cookies de terceros para
                                informar estadísticas de uso del servicio y entregar publicidad en el servicio.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">4. Gestionar cookies</h2>
                            <p>
                                La mayoría de los navegadores web te permiten controlar las cookies a través de sus preferencias de configuración.
                                Sin embargo, si limitás la capacidad de los sitios web para establecer cookies, podés afectar tu
                                experiencia general del usuario. Algunas características de nuestro servicio pueden no funcionar correctamente
                                si se deshabilita la capacidad de aceptar cookies.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">5. Retención de cookies</h2>
                            <p>
                                Las cookies de sesión se eliminan cuando cerrás tu navegador. Las cookies persistentes permanecen
                                en tu dispositivo durante un período de tiempo especificado en la cookie o hasta que
                                las elimines manualmente.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">6. Actualizaciones de esta política</h2>
                            <p>
                                Podemos actualizar esta Política de Cookies de vez en cuando. Te notificaremos de cualquier
                                cambio publicando la nueva Política de Cookies en esta página y actualizando la
                                fecha de &quot;Última actualización&quot;.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mt-8 mb-4">7. Contáctanos</h2>
                            <p>
                                Si tenés alguna pregunta sobre nuestra Política de Cookies, contáctanos en{' '}
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
