import { initializeApp, FirebaseApp, getApps, deleteApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import type { FirebaseConfig } from '@/types/storage';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let currentConfigKey: string | null = null;

function getConfigKey(config: FirebaseConfig): string {
    return `${config.projectId}-${config.apiKey}`;
}

export function initFirebase(config: FirebaseConfig): Firestore {
    const configKey = getConfigKey(config);

    // If already initialized with same config, return existing instance
    if (db && currentConfigKey === configKey) {
        return db;
    }

    // If different config, cleanup and reinitialize
    if (app) {
        resetFirebase();
    }

    // Check for existing app with same name
    const existingApps = getApps();
    if (existingApps.length > 0) {
        // Delete all existing apps
        existingApps.forEach(existingApp => {
            try {
                deleteApp(existingApp);
            } catch {
                // Ignore errors
            }
        });
    }

    app = initializeApp(config);
    db = getFirestore(app);
    currentConfigKey = configKey;

    return db;
}

export function getDb(): Firestore | null {
    return db;
}

export function resetFirebase(): void {
    if (app) {
        try {
            deleteApp(app);
        } catch {
            // Ignore errors
        }
    }
    app = null;
    db = null;
    currentConfigKey = null;
}

export function isFirebaseInitialized(): boolean {
    return db !== null;
}
