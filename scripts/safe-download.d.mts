export function safeDownload(source: string, destination: string, options?: { maxBytes?: number }): Promise<{ url: string; contentType: string; bytes: number }>;
