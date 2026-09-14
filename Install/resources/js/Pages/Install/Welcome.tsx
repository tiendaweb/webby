import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import InstallerLayout from '@/Layouts/InstallerLayout';
import { Sparkles, Database, Shield, Zap } from 'lucide-react';

export default function Welcome() {
    return (
        <InstallerLayout title="Bienvenido al asistente de instalación">
            <Head title="Instalación" />

            <div className="text-center mb-8">
                <p className="text-muted-foreground">
                    Este asistente te guiará durante el proceso de instalación.
                    Solo debería llevar unos minutos completarlo.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="p-2 rounded-md bg-primary/10">
                        <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-medium text-sm">Verificación de requisitos</h3>
                        <p className="text-xs text-muted-foreground">Comprueba la compatibilidad del servidor</p>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="p-2 rounded-md bg-primary/10">
                        <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-medium text-sm">Permisos</h3>
                        <p className="text-xs text-muted-foreground">Revisa los permisos de archivos</p>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="p-2 rounded-md bg-primary/10">
                        <Database className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-medium text-sm">Configuración de base de datos</h3>
                        <p className="text-xs text-muted-foreground">Configura tu base de datos</p>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="p-2 rounded-md bg-primary/10">
                        <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-medium text-sm">Cuenta de administrador</h3>
                        <p className="text-xs text-muted-foreground">Crea tu usuario administrador</p>
                    </div>
                </div>
            </div>

                <a href={route('install.requirements')}>
                    <Button className="w-full" size="lg">
                    Empezar
                    </Button>
                </a>
            </InstallerLayout>
    );
}
