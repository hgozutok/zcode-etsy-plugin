import { z } from "zod";
export function registerUsersTools(server, client) {
    server.registerTool("get_me", {
        description: "Get the currently authenticated Etsy user",
    }, async () => {
        const data = await client.get("/users/me");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    });
    server.registerTool("get_user", {
        description: "Get an Etsy user by ID",
        inputSchema: { user_id: z.number().describe("The user ID") },
    }, async (args) => {
        const data = await client.get(`/users/${args.user_id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    });
    server.registerTool("get_user_addresses", {
        description: "Get shipping addresses for a user",
        inputSchema: { user_id: z.number().describe("The user ID") },
    }, async (args) => {
        const data = await client.get(`/users/${args.user_id}/addresses`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    });
}
//# sourceMappingURL=users.js.map