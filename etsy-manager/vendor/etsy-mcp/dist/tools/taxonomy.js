import { z } from "zod";
export function registerTaxonomyTools(server, client) {
    server.registerTool("get_buyer_taxonomy", {
        description: "Get the full buyer taxonomy tree (categories)",
    }, async () => {
        const data = await client.get("/buyer-taxonomy/nodes");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    });
    server.registerTool("get_taxonomy_properties", {
        description: "Get properties for a specific taxonomy/category node",
        inputSchema: { taxonomy_id: z.number().describe("The taxonomy node ID") },
    }, async (args) => {
        const data = await client.get(`/buyer-taxonomy/nodes/${args.taxonomy_id}/properties`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    });
}
//# sourceMappingURL=taxonomy.js.map