import { z } from "zod";
import { paginationParams, formatPaginatedResponse } from "../utils/pagination.js";
export function registerReviewsTools(server, client) {
    server.registerTool("get_reviews_by_listing", {
        description: "Get reviews for a specific listing",
        inputSchema: {
            listing_id: z.number().describe("The listing ID"),
            limit: z.number().optional().describe("Results per page"),
            offset: z.number().optional().describe("Offset for pagination"),
        },
    }, async (args) => {
        const params = paginationParams({ limit: args.limit, offset: args.offset });
        const data = await client.get(`/listings/${args.listing_id}/reviews`, params);
        return { content: [{ type: "text", text: formatPaginatedResponse(data, args.limit ?? 25, args.offset ?? 0) }] };
    });
    server.registerTool("get_reviews_by_shop", {
        description: "Get reviews for a shop",
        inputSchema: {
            shop_id: z.number().describe("The shop ID"),
            limit: z.number().optional().describe("Results per page"),
            offset: z.number().optional().describe("Offset for pagination"),
        },
    }, async (args) => {
        const params = paginationParams({ limit: args.limit, offset: args.offset });
        const data = await client.get(`/shops/${args.shop_id}/reviews`, params);
        return { content: [{ type: "text", text: formatPaginatedResponse(data, args.limit ?? 25, args.offset ?? 0) }] };
    });
}
//# sourceMappingURL=reviews.js.map