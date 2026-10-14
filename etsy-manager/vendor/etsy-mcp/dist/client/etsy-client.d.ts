export { EtsyApiError } from "../utils/errors.js";
export interface EtsyClientConfig {
    apiKey: string;
    sharedSecret: string;
    getAccessToken: () => Promise<string | null>;
    onTokenExpired: () => Promise<void>;
}
export declare class EtsyClient {
    private config;
    private lastRequestTime;
    private minRequestInterval;
    private rateLimitQueue;
    constructor(config: EtsyClientConfig);
    get<T = unknown>(path: string, params?: Record<string, string>): Promise<T>;
    post<T = unknown>(path: string, body?: unknown): Promise<T>;
    put<T = unknown>(path: string, body?: unknown): Promise<T>;
    patch<T = unknown>(path: string, body?: unknown): Promise<T>;
    delete<T = unknown>(path: string): Promise<T>;
    uploadFile<T = unknown>(path: string, formData: FormData): Promise<T>;
    private request;
    private rateLimit;
}
