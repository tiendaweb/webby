# Revisión de seguridad (malware / backdoors)

Fecha de revisión: 2026-04-27 (UTC)

## Alcance
- Revisión estática del repositorio en `/workspace/webby`.
- Búsqueda de patrones comunes de malware/puertas traseras.
- Revisión de rutas y middlewares de autenticación en API sensible.
- Verificación básica de binarios precompilados (`Builder/prebuilt/*`) mediante hashes.

## Comandos ejecutados

```bash
rg -n "(base64_decode\(|eval\(|assert\(|shell_exec\(|passthru\(|proc_open\(|popen\(|system\(|exec\()" Install/app Install/routes Install/resources/js
rg -n "(gzinflate\(|str_rot13\(|create_function\(|preg_replace\s*\(.*/e|fromCharCode\(|atob\(|document\.write\(|child_process|curl\s+http|wget\s+http|nc\s+-e)" Install/app Install/routes Install/resources/js
composer audit --no-interaction
npm audit --omit=dev --audit-level=high --json
sha256sum Builder/prebuilt/webby-builder-linux Builder/prebuilt/webby-builder-macos Builder/prebuilt/webby-builder-arm64
```

## Hallazgos

### 1) Patrones de ejecución remota / ofuscación
- No se detectaron patrones típicos de puerta trasera/ofuscación (`eval`, `gzinflate`, `str_rot13`, `preg_replace /e`, etc.) en el código revisado.
- Solo se encontró un uso de `base64_decode` en `ProjectSettingsController` para procesar una imagen en formato Data URL (uso funcional esperado).

### 2) Endpoints sensibles y autenticación
- El webhook del builder (`/api/builder/webhook`) está protegido por middleware `verify.server.key`.
- API de archivos para apps generadas se protege con middleware `verify.project.token` y comparación segura (`hash_equals`).

### 3) Dependencias
- `composer audit` no reportó paquetes auditables en este entorno (`No packages - skipping audit`).
- `npm audit` no pudo completarse por restricción de acceso al endpoint de advisories (`403 Forbidden`), por lo que no se pudo verificar CVEs NPM en esta ejecución.

### 4) Binarios precompilados
Hashes SHA-256 actuales:

- `Builder/prebuilt/webby-builder-linux` → `b968db8157ea39251624b5f1452fd49c2e96f76e5999b72f767d943a7f2ed7d8`
- `Builder/prebuilt/webby-builder-macos` → `1eb3935c9a61a25a4dc19fd321068420294f880694031ba529632e33aa4ff063`
- `Builder/prebuilt/webby-builder-arm64` → `a773eb27e9993387807170aefd3aaf8f04448efbfd8f2ac9920828e4ad8f943a`

> Recomendación: comparar estos hashes con una fuente oficial/versionada del proveedor antes de despliegues productivos.

## Conclusión
- **No se encontraron evidencias directas de malware ni puertas traseras obvias** en la revisión estática realizada.
- Aun así, esta revisión **no equivale** a una auditoría formal completa (SAST/DAST/SCA + pentest).

## Recomendaciones para elevar seguridad
1. Ejecutar `npm audit` en un entorno con acceso permitido al endpoint de advisories.
2. Añadir escaneo SCA/SAST en CI (por ejemplo, Dependabot + CodeQL + Trivy/Semgrep).
3. Firmar o verificar criptográficamente los binarios `Builder/prebuilt/*`.
4. Revisar hardening de canales en tiempo real para sesiones de builder (aislamiento estricto por usuario/proyecto).
