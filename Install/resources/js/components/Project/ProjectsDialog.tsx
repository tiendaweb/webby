import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/contexts/LanguageContext';
import { FolderOpen, Globe, Search, Star, Plus } from 'lucide-react';

interface ProjectResumen {
    id: string;
    name: string;
    type: string | null;
    thumbnail: string | null;
    subdomain: string | null;
    is_starred: boolean;
    is_published: boolean;
    updated_at: string | null;
}

interface ProjectsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Se marca en la lista y no navega a sí mismo. */
    currentProjectId?: string;
}

/**
 * Selector rápido de proyectos.
 *
 * Reemplaza al enlace que sacaba del builder para ir a /projects: cambiar de
 * proyecto es algo que se hace a mitad de trabajo, y perder la pantalla entera
 * para elegir a dónde ir era una vuelta de más.
 *
 * La lista se pide una sola vez por apertura y se filtra en el navegador: son
 * unas pocas decenas de proyectos y así escribir en el buscador no espera al
 * servidor en cada tecla.
 */
export function ProjectsDialog({ open, onOpenChange, currentProjectId }: ProjectsDialogProps) {
    const { t } = useTranslation();
    const [proyectos, setProyectos] = useState<ProjectResumen[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const buscadorRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;

        let vigente = true;
        setError(null);
        setBusqueda('');

        axios
            .get<{ projects: ProjectResumen[] }>('/projects/switcher')
            .then((r) => { if (vigente) setProyectos(r.data.projects); })
            .catch(() => { if (vigente) setError(t('Could not load your projects.')); });

        // El foco va al buscador: con el modal abierto, lo primero que uno
        // quiere hacer es escribir el nombre del proyecto.
        const foco = setTimeout(() => buscadorRef.current?.focus(), 80);

        return () => { vigente = false; clearTimeout(foco); };
    }, [open, t]);

    const visibles = useMemo(() => {
        const lista = proyectos ?? [];
        const q = busqueda.trim().toLowerCase();
        const filtrados = q ? lista.filter((p) => p.name.toLowerCase().includes(q)) : lista;

        // Los favoritos primero; dentro de cada grupo se respeta el orden por
        // última edición que ya trae el servidor.
        return [...filtrados].sort((a, b) => Number(b.is_starred) - Number(a.is_starred));
    }, [proyectos, busqueda]);

    const abrir = (id: string) => {
        onOpenChange(false);
        if (id !== currentProjectId) router.visit(`/project/${id}`);
    };

    const miniatura = (p: ProjectResumen) => {
        if (!p.thumbnail) return null;
        if (p.thumbnail.startsWith('http') || p.thumbnail.startsWith('/storage/')) return p.thumbnail;
        return `/storage/${p.thumbnail}`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('Projects')}</DialogTitle>
                    <DialogDescription>{t('Switch to another project without leaving the builder.')}</DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        ref={buscadorRef}
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder={t('Search projects...')}
                        className="ps-9"
                    />
                </div>

                <ScrollArea className="-mx-2 max-h-[50vh] px-2">
                    <div className="space-y-1 py-1">
                        {error && (
                            <p className="px-2 py-6 text-center text-sm text-destructive">{error}</p>
                        )}

                        {!error && proyectos === null && (
                            [0, 1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3 rounded-lg p-2">
                                    <Skeleton className="h-10 w-14 rounded-md" />
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <Skeleton className="h-3.5 w-1/2" />
                                        <Skeleton className="h-3 w-1/4" />
                                    </div>
                                </div>
                            ))
                        )}

                        {!error && proyectos !== null && visibles.length === 0 && (
                            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                                {busqueda ? t('No projects match your search.') : t('No projects yet')}
                            </p>
                        )}

                        {visibles.map((p) => {
                            const src = miniatura(p);
                            const actual = p.id === currentProjectId;

                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => abrir(p.id)}
                                    className={`flex w-full items-center gap-3 rounded-lg p-2 text-start transition-colors hover:bg-muted ${
                                        actual ? 'bg-muted' : ''
                                    }`}
                                >
                                    <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                                        {src ? (
                                            <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                                        ) : (
                                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="truncate text-sm font-medium">{p.name}</span>
                                            {p.is_starred && <Star className="h-3 w-3 shrink-0 fill-current text-amber-500" />}
                                        </div>
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            {p.is_published && <Globe className="h-3 w-3 shrink-0" />}
                                            <span className="truncate">
                                                {p.is_published && p.subdomain ? p.subdomain : t('Draft')}
                                            </span>
                                        </span>
                                    </div>

                                    {actual && (
                                        <span className="shrink-0 text-xs text-muted-foreground">{t('Current')}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>

                <div className="flex items-center justify-between gap-2 border-t pt-3">
                    <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); router.visit('/projects'); }}>
                        <FolderOpen className="h-4 w-4 me-1.5" />
                        {t('All Projects')}
                    </Button>
                    <Button size="sm" onClick={() => { onOpenChange(false); router.visit('/create'); }}>
                        <Plus className="h-4 w-4 me-1.5" />
                        {t('New project')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default ProjectsDialog;
