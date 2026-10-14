import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { StoredTokens } from "./token-store.js";

const ETSY_AUTH_URL = "https://www.etsy.com/oauth/connect";
const ETSY_TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";

// Dependency-free cross-platform browser launch (replaces the `open` package
// so the server can ship as a self-contained bundle).
function openInBrowser(url: string): void {
  const child =
    process.platform === "win32"
      ? spawn("cmd", ["/c", "start", "", url], {
          detached: true,
          stdio: "ignore",
          windowsHide: true,
        })
      : process.platform === "darwin"
        ? spawn("open", [url], { stdio: "ignore" })
        : spawn("xdg-open", [url], { stdio: "ignore" });
  // A missing opener (headless machine) is not fatal — the URL is already
  // printed and returned to the caller.
  child.on("error", () => {});
  child.unref();
}

export interface OAuthConfig {
  apiKey: string;
  sharedSecret: string;
  scopes: string[];
}

export class OAuthClient {
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  generateCodeVerifier(): string {
    return randomBytes(32).toString("base64url");
  }

  async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = createHash("sha256").update(verifier).digest();
    return hash.toString("base64url");
  }

  async buildAuthorizationUrl(
    redirectUri: string
  ): Promise<{ url: string; codeVerifier: string; state: string }> {
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

  async exchangeCode(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<StoredTokens> {
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

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<StoredTokens> {
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

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };
  }

  async startLocalAuthFlow(
    onAuthUrl?: (url: string) => void
  ): Promise<{ code: string; redirectUri: string; codeVerifier: string }> {
    return new Promise((resolve, reject) => {
      // Generate PKCE verifier and state before starting the server
      // to avoid race conditions with the callback handler
      let expectedState: string;
      let codeVerifier: string;

      const server = createServer(
        (req: IncomingMessage, res: ServerResponse) => {
          const url = new URL(req.url!, `http://localhost`);
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
          res.end(
            "<html><body><h1>Authorization successful!</h1><p>You can close this window.</p></body></html>"
          );
          server.close();
          resolve({
            code,
            redirectUri: `http://localhost:${(server.address() as any).port}/callback`,
            codeVerifier,
          });
        }
      );

      // Fixed callback port so the redirect URI matches what is registered
      // in the Etsy app dashboard (default http://localhost:3737/callback).
      // Binds to loopback only: safe on a VPS and reachable through an SSH
      // tunnel (ssh -L 3737:localhost:3737 user@host).
      const callbackPort = Number(process.env.ETSY_CALLBACK_PORT) || 3737;
      const redirectUri = `http://localhost:${callbackPort}/callback`;

      // Reject fast (instead of crashing on an unhandled 'error' event)
      // when the callback port is already taken.
      server.once("error", (err) => reject(err));

      const listening = new Promise<void>((res, rej) => {
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
            openInBrowser(authData.url);
          } catch {
            console.error(
              "Could not open a browser (headless machine?). Open the URL above manually."
            );
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
