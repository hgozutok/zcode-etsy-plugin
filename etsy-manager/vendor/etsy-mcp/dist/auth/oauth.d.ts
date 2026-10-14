import type { StoredTokens } from "./token-store.js";
export interface OAuthConfig {
    apiKey: string;
    sharedSecret: string;
    scopes: string[];
}
export declare class OAuthClient {
    private config;
    constructor(config: OAuthConfig);
    generateCodeVerifier(): string;
    generateCodeChallenge(verifier: string): Promise<string>;
    buildAuthorizationUrl(redirectUri: string): Promise<{
        url: string;
        codeVerifier: string;
        state: string;
    }>;
    exchangeCode(code: string, codeVerifier: string, redirectUri: string): Promise<StoredTokens>;
    refreshAccessToken(refreshToken: string): Promise<StoredTokens>;
    startLocalAuthFlow(): Promise<{
        code: string;
        redirectUri: string;
        codeVerifier: string;
    }>;
}
