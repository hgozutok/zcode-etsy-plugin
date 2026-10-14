export declare function paginationParams(opts: {
    limit?: number;
    offset?: number;
}): Record<string, string>;
export declare function formatPaginatedResponse(data: {
    count: number;
    results: unknown[];
}, limit: number, offset: number): string;
