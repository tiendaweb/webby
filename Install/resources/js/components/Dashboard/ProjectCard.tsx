import { Link } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface Project {
    id: number;
    name: string;
    description?: string | null;
    thumbnail?: string | null;
    status: 'draft' | 'published' | 'archived';
    updated_at: string;
}

interface ProjectCardProps {
    project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
    const statusColors = {
        draft: 'bg-muted text-muted-foreground',
        published: 'bg-primary/10 text-primary',
        archived: 'bg-secondary text-secondary-foreground',
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <Link href={`/project/${project.id}`}>
            <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden bg-card/80 backdrop-blur-sm">
                <div className="aspect-video bg-muted overflow-hidden">
                    {project.thumbnail ? (
                        <img
                            src={project.thumbnail}
                            alt={project.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="h-12 w-12 rounded-lg bg-primary/20" />
                        </div>
                    )}
                </div>
                <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                            {project.name}
                        </h3>
                        <Badge
                            variant="secondary"
                            className={`text-xs capitalize shrink-0 ${statusColors[project.status]}`}
                        >
                            {project.status}
                        </Badge>
                    </div>
                    {project.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {project.description}
                        </p>
                    )}
                    <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(project.updated_at)}</span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
