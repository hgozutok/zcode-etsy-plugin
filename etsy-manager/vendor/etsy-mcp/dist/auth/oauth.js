import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
const ETSY_AUTH_URL = "https://www.etsy.com/oauth/connect";
const ETSY_TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";
export class OAuthClient {
    config;
    constructor(config) {
        this.config = config;
    }
    generateCodeVerifier() {
        return randomBytes(32).toString("base64url");
    }
    async generateCodeChallenge(verifier) {
        const hash = createHash("sha256").update(verifier).digest();
        return hash.toString("base64url");
    }
    async buildAuthorizationUrl(redirectUri) {
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        const state = randomBytes(16).toString("hex");
        const params = new URLSearchParams({
            response_type: "code",
            client_id: this.config.apiKey,
            redirect_uri: redirectUri,
            scope: this.config.scopes.join(" "),
            state,
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
        });
        return {
            url: `${ETSY_AUTH_URL}?${params.toString().replace(/\+/g, "%20")}`,
            codeVerifier,
            state,
        };
    }
    async exchangeCode(code, codeVerifier, redirectUri) {
        const body = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: this.config.apiKey,
            redirect_uri: redirectUri,
            code,
            code_verifier: codeVerifier,
        });
        const response = await fetch(ETSY_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Token exchange failed (${response.status}): ${text}`);
        }
        const data = (await response.json());
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: Date.now() + data.expires_in * 1000,
        };
    }
    async refreshAccessToken(refreshToken) {
        const body = new URLSearchParams({
            grant_type: "refresh_token",
            client_id: this.config.apiKey,
            refresh_token: refreshToken,
        });
        const response = await fetch(ETSY_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Token refresh failed (${response.status}): ${text}`);
        }
        const data = (await response.json());
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: Date.now() + data.expires_in * 1000,
        };
    }
    async startLocalAuthFlow(onAuthUrl) {
        return new Promise((resolve, reject) => {
            // Generate PKCE verifier and state before starting the server
            // to avoid race conditions with the callback handler
            let expectedState;
            let codeVerifier;
            const server = createServer((req, res) => {
                const url = new URL(req.url, `http://localhost`);
                const code = url.searchParams.get("code");
                const returnedState = url.searchParams.get("state");
                if (!code) {
                    res.writeHead(400, { "Content-Type": "text/html" });
                    res.end("<html><body><h1>Authorization failed</h1></body></html>");
                    server.close();
                    reject(new Error(`OAuth callback missing code. State: ${returnedState}`));
                    return;
                }
                if (returnedState !== expectedState) {
                    res.writeHead(403, { "Content-Type": "text/html" });
                    res.end("<html><body><h1>State mismatch — possible CSRF attack</h1></body></html>");
                    server.close();
                    reject(new Error("OAuth state mismatch: possible CSRF attack"));
                    return;
                }
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end("<html><body><h1>Authorization successful!</h1><p>You can close this window.</p></body></html>");
                server.close();
                resolve({
                    code,
                    redirectUri: `http://localhost:${server.address().port}/callback`,
                    codeVerifier,
                });
            });
            // Fixed callback port so the redirect URI matches what is registered
            // in the Etsy app dashboard (default http://localhost:3737/callback).
            // Binds to loopback only: safe on a VPS and reachable through an SSH
            // tunnel (ssh -L 3737:localhost:3737 user@host).
            const callbackPort = Number(process.env.ETSY_CALLBACK_PORT) || 3737;
            const redirectUri = `http://localhost:${callbackPort}/callback`;
            // Reject fast (instead of crashing on an unhandled 'error' event)
            // when the callback port is already taken.
            server.once("error", (err) => reject(err));
            const listening = new Promise((res, rej) => {
                server.once("error", rej);
                server.listen(callbackPort, "127.0.0.1", () => res());
            });
            this.buildAuthorizationUrl(redirectUri)
                .then(async (authData) => {
                codeVerifier = authData.codeVerifier;
                expectedState = authData.state;
                // Print and report the URL before any browser launch so headless
                // machines still get a copy-pasteable link even if `open` fails.
                console.error(`\nOpen this URL to authorize:\n${authData.url}\n`);
                onAuthUrl?.(authData.url);
                await listening;
                if (process.env.ETSY_NO_BROWSER) {
                    console.error("ETSY_NO_BROWSER is set — skipping browser launch (headless mode).");
                    return;
                }
                try {
                    const { default: open } = await import("open");
                    await open(authData.url);
                }
                catch {
                    console.error("Could not open a browser (headless machine?). Open the URL above manually.");
                }
            })
                .catch(reject);
            setTimeout(() => {
                server.close();
                reject(new Error("OAuth flow timed out after 120 seconds"));
            }, 120_000);
        });
    }
}
//# sourceMappingURL=oauth.js.map