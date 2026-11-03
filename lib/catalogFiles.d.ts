export function readCatalog(file: string): Record<string, any>;
export function readCatalogBytes(file: string): Buffer;
export function writeCatalog(file: string, catalog: Record<string, unknown>): void;
