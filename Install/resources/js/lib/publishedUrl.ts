export function buildPublishedUrl(subdomain: string | null | undefined, baseDomain: string | null | undefined): string | null {
    if (!subdomain || !baseDomain) return null;

    if (typeof window === 'undefined') {
        return `https://${subdomain}.${baseDomain}`;
    }

    const currentHost = window.location.hostname;
    const isLocalHost = currentHost === 'localhost'
        || currentHost === '127.0.0.1'
        || currentHost === '::1'
        || currentHost.endsWith('.lvh.me')
        || currentHost.endsWith('.localhost');

    const protocol = isLocalHost ? 'http:' : window.location.protocol;
    const port = isLocalHost && window.location.port ? `:${window.location.port}` : '';

    return `${protocol}//${subdomain}.${baseDomain}${port}`;
}
