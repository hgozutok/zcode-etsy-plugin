export class AuthManager {
    tokenStore;
    oauthClient;
    constructor(tokenStore, oauthClient) {
        this.tokenStore = tokenStore;
        this.oauthClient = oauthClient;
    }
    async getAccessToken() {
        const tokens = await this.tokenStore.load();
        if (!tokens)
            return null;
        if (!this.tokenStore.isAccessTokenExpired(tokens)) {
            return tokens.access_token;
        }
        try {
            const refreshed = await this.oauthClient.refreshAccessToken(tokens.refresh_token);
            await this.tokenStore.save(refreshed);
            return refreshed.access_token;
        }
        catch {
            return null;
        }
    }
    async handleTokenExpired() {
        const tokens = await this.tokenStore.load();
        if (!tokens)
            return;
        try {
            const refreshed = await this.oauthClient.refreshAccessToken(tokens.refresh_token);
            await this.tokenStore.save(refreshed);
        }
        catch {
            await this.tokenStore.clear();
        }
    }
    async authenticate(onAuthUrl) {
        const existing = await this.getAccessToken();
        if (existing)
            return existing;
        const { code, redirectUri, codeVerifier } = await this.oauthClient.startLocalAuthFlow(onAuthUrl);
        const tokens = await this.oauthClient.exchangeCode(code, codeVerifier, redirectUri);
        await this.tokenStore.save(tokens);
        return tokens.access_token;
    }
}
//# sourceMappingURL=auth-manager.js.map