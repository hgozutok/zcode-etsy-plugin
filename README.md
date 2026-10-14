# gozutok-plugins

A [ZCode](https://zcode.z.ai) plugin marketplace by [Hugo](https://gozutok.info).

## Plugins

| Plugin | Version | Description |
|---|---|---|
| [etsy-manager](./etsy-manager) | 0.1.1 | Manage Etsy shop listings, images, inventory, shipping and orders via the Etsy Open API v3 (41 tools, standalone MCP server) |

## Install

1. In ZCode open **Settings → Plugin Management → Discover → `+`** (Add Plugin Marketplace).
2. Paste this repository URL: `https://github.com/<owner>/gozutok-plugins`
3. Install **etsy-manager** under the marketplace's name in the **Personal** section.
4. For first-time Etsy setup (API keys, OAuth, headless/VPS usage) see the
   [plugin README](./etsy-manager/README.md).

## Requirements

- ZCode (Desktop or CLI)
- Node.js ≥ 20 on `PATH` (the MCP server runs with `node`; no `npm install` needed —
  production dependencies are vendored inside the plugin)

## License

MIT — see [LICENSE](./LICENSE). The etsy-manager plugin vendors
[aserper/etsy-mcp](https://github.com/aserper/etsy-mcp) (MIT) with headless/VPS patches;
see [etsy-manager/vendor/etsy-mcp/LICENSE](./etsy-manager/vendor/etsy-mcp/LICENSE).
