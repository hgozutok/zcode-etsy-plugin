import { z } from "zod";
export function registerReturnPoliciesTools(server, client) {
    server.registerTool("get_return_policies", {
        description: "Get all return policies for a shop",
        inputSchema: { shop_id: z.number().describe("The shop ID") },
    }, async (args) => {
        const data = await client.get(`/shops/${args.shop_id}/policies/return`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    });
    server.registerTool("manage_return_policy", {
        description: "Create, update, or delete a return policy for a shop",
        inputSchema: {
            shop_id: z.number().describe("The shop ID"),
            action: z.enum(["create", "update", "delete"]).describe("Action to perform"),
            return_policy_id: z.number().optional().describe("Policy ID (for update/delete)"),
            accepts_returns: z.boolean().optional().describe("Whether returns are accepted"),
            accepts_exchanges: z.boolean().optional().describe("Whether exchanges are accepted"),
            return_deadline: z.number().optional().describe("Return deadline in days"),
        },
    }, async (args) => {
        if ((args.action === "update" || args.action === "delete") && !args.return_policy_id) {
            return { content: [{ type: "text", text: "Error: 'return_policy_id' is required for update/delete actions." }], isError: true };
        }
        const basePath = `/shops/${args.shop_id}/policies/return`;
        let data;
        switch (args.action) {
            case "create":
                data = await client.post(basePath, { accepts_returns: args.accepts_returns, accepts_exchanges: args.accepts_exchanges, return_deadline: args.return_deadline });
                break;
            case "update":
                data = await client.put(`${basePath}/${args.return_policy_id}`, { accepts_returns: args.accepts_returns, accepts_exchanges: args.accepts_exchanges, return_deadline: args.return_deadline });
                break;
            case "delete":
                await client.delete(`${basePath}/${args.return_policy_id}`);
                data = { deleted: true, return_policy_id: args.return_policy_id };
                break;
        }
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    });
}
//# sourceMappingURL=return-policies.js.map