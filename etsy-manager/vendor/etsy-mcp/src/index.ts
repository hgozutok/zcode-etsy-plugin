#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TokenStore } from "./auth/token-store.js";
import { OAuthClient } from "./auth/oauth.js";
import { AuthManager } from "./auth/auth-manager.js";
import { EtsyClient } from "./client/etsy-client.js";
import { registerListingsTools } from "./tools/listings.js";
import { registerShopTools } from "./tools/shop.js";
import { registerOrdersTools } from "./tools/orders.js";
import { registerTransactionsTools } from "./tools/transactions.js";
import { registerShippingTools } from "./tools/shipping.js";
import { registerReviewsTools } from "./tools/reviews.js";
import { registerUsersTools } from "./tools/users.js";
import { registerTaxonomyTools } from "./tools/taxonomy.js";
import { registerImagesTools } from "./tools/images.js";
import { registerInventoryTools } from "./tools/inventory.js";
import { registerPaymentsTools } from "./tools/payments.js";
import { registerReturnPoliciesTools } from "./tools/return-policies.js";
import { join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const ALL_SCOPES = [
  "address_r", "address_w", "billing_r", "cart_r", "cart_w",
  "email_r", "favorites_r", "favorites_w", "feedback_r",
  "listings_d", "listings_r", "listings_w",
  "profile_r", "profile_w", "recommend_r", "recommend_w",
  "shops_r", "shops_w", "transactions_r", "transactions_w",
];

export interface ServerConfig {
  apiKey: string;
  sharedSecret: string;
  tokenStorePath?: string;
  scopes?: string[];
}

export function createEtsyMcpServer(config: ServerConfig): McpServer {
  const server = new McpServer({
    name: "etsy-mcp",
    version: "1.0.0",
  });

  const tokenStorePath =
    config.tokenStorePath ?? join(homedir(), ".etsy-mcp", "tokens.json");

  const tokenStore = new TokenStore(tokenStorePath);
  const oauthClient = new OAuthClient({
    apiKey: config.apiKey,
    sharedSecret: config.sharedSecret,
    scopes: config.scopes ?? ALL_SCOPES,
  });
  const authManager = new AuthManager(tokenStore, oauthClient);

  const client = new EtsyClient({
    apiKey: config.apiKey,
    sharedSecret: config.sharedSecret,
    getAccessToken: () => authManager.getAccessToken(),
    onTokenExpired: () => authManager.handleTokenExpired(),
  });

  // Non-blocking OAuth state so the consent URL can reach the chat (stderr is
  // invisible to CLI users and headless boxes have no browser to open).
  let pendingAuth: { url: string | null; settled: boolean; error: string | null } | null = null;

  const textResult = (text: string) => ({
    content: [{ type: "text" as const, text }],
  });

  server.registerTool(
    "authenticate",
    {
      description:
        "Authenticate with Etsy via OAuth 2.0 (PKCE). Starts a local callback server on port 3737 and returns the consent URL to open in a browser. On headless machines (VPS) use an SSH tunnel: ssh -L 3737:localhost:3737 user@server, or set ETSY_NO_BROWSER=1 to skip launching a browser. Call again to check the result. Required before using tools that need user authorization.",
    },
    async () => {
      const existing = await authManager.getAccessToken();
      if (existing) {
        pendingAuth = null;
        return textResult(
          "Already authenticated with Etsy — a valid OAuth token is present. No action needed."
        );
      }

      if (!pendingAuth) {
        const state = { url: null as string | null, settled: false, error: null as string | null };
        pendingAuth = state;
        authManager
          .authenticate((url) => {
            if (pendingAuth === state) state.url = url;
          })
          .then(() => {
            if (pendingAuth === state) state.settled = true;
          })
          .catch((err: unknown) => {
            if (pendingAuth === state) {
              state.settled = true;
              state.error = err instanceof Error ? err.message : String(err);
            }
          });
      }

      // Give the callback server a moment to come up so the URL is available.
      const deadline = Date.now() + 5000;
      while (pendingAuth && !pendingAuth.url && !pendingAuth.settled && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 50));
      }

      if (pendingAuth?.settled && !pendingAuth.error) {
        pendingAuth = null;
        return textResult("Successfully authenticated with Etsy!");
      }
      if (pendingAuth?.settled && pendingAuth.error) {
        const error = pendingAuth.error;
        pendingAuth = null;
        return textResult(`Authentication failed: ${error}\nCall authenticate again to retry.`);
      }
      if (pendingAuth?.url) {
        return textResult(
          "Etsy OAuth is waiting for approval. Open this URL in a browser and grant access:\n\n" +
            pendingAuth.url +
            "\n\nIf this machine has no browser (VPS/headless):\n" +
            "1. From your local computer run:  ssh -L 3737:localhost:3737 <user>@<this-server>\n" +
            "2. Open the URL above in your local browser — it redirects to localhost:3737, which the tunnel forwards to this server.\n\n" +
            "The consent window stays open for ~2 minutes. This call returned immediately; call authenticate again (or run any Etsy tool) after approving."
        );
      }
      return textResult("OAuth flow is starting — call authenticate again in a few seconds.");
    }
  );

  registerListingsTools(server, client);
  registerShopTools(server, client);
  registerOrdersTools(server, client);
  registerTransactionsTools(server, client);
  registerShippingTools(server, client);
  registerReviewsTools(server, client);
  registerUsersTools(server, client);
  registerTaxonomyTools(server, client);
  registerImagesTools(server, client);
  registerInventoryTools(server, client);
  registerPaymentsTools(server, client);
  registerReturnPoliciesTools(server, client);

  return server;
}

// CLI entry point - only run when executed directly
const currentFile = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] && currentFile === process.argv[1];

if (isDirectRun) {
  // Load .env file when running as CLI
  await import("dotenv/config");
  const apiKey = process.env.ETSY_API_KEY;
  const sharedSecret = process.env.ETSY_SHARED_SECRET;

  if (!apiKey || !sharedSecret) {
    console.error("Error: ETSY_API_KEY and ETSY_SHARED_SECRET environment variables are required.");
    console.error("See .env.example for the expected format.");
    process.exit(1);
  }

  const server = createEtsyMcpServer({ apiKey, sharedSecret });
  const transport = new StdioServerTransport();
  server.connect(transport).catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
