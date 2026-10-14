import type { TokenStore } from "./token-store.js";
import type { OAuthClient } from "./oauth.js";
export declare class AuthManager {
    private tokenStore;
    private oauthClient;
    constructor(tokenStore: TokenStore, oauthClient: OAuthClient);
    getAccessToken(): Promise<string | null>;
    handleTokenExpired(): Promise<void>;
    authenticate(): Promise<string>;
}
