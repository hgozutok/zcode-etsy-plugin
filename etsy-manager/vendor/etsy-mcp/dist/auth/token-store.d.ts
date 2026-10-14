export interface StoredTokens {
    access_token: string;
    refresh_token: string;
    expires_at: number;
}
export declare class TokenStore {
    private filePath;
    constructor(filePath: string);
    load(): Promise<StoredTokens | null>;
    save(tokens: StoredTokens): Promise<void>;
    clear(): Promise<void>;
    isAccessTokenExpired(tokens: StoredTokens): boolean;
}
