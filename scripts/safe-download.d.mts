type ResolvedAddress = { address: string; family: number };
type PinnedTarget = { url: URL; address: string; family: number };
type PinnedResponse = AsyncIterable<Uint8Array> & {
  statusCode?: number;
  headers: Record<string, string | string[] | undefined>;
  resume(): unknown;
  destroy(error?: Error): unknown;
};

export function blockedAddress(address: string): boolean;
export function safeDownload(source: string, destination: string, options?: {
  maxBytes?: number;
  resolver?: (hostname: string, options: { all: true; verbatim: true }) => Promise<ResolvedAddress[]>;
  request?: (target: PinnedTarget) => Promise<PinnedResponse>;
}): Promise<{ url: string; contentType: string; bytes: number }>;
