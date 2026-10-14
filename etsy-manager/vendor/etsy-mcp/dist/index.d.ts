#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export interface ServerConfig {
    apiKey: string;
    sharedSecret: string;
    tokenStorePath?: string;
    scopes?: string[];
}
export declare function createEtsyMcpServer(config: ServerConfig): McpServer;
