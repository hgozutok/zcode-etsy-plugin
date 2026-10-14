export function paginationParams(opts) {
    const limit = Math.min(opts.limit ?? 25, 100);
    const offset = opts.offset ?? 0;
    return { limit: String(limit), offset: String(offset) };
}
export function formatPaginatedResponse(data, limit, offset) {
    return JSON.stringify({
        count: data.count,
        showing: data.results.length,
        offset,
        limit,
        has_more: offset + data.results.length < data.count,
        results: data.results,
    }, null, 2);
}
//# sourceMappingURL=pagination.js.map