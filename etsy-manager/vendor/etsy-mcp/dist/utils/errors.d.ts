export declare class EtsyApiError extends Error {
    status: number;
    errorBody: unknown;
    constructor(status: number, errorBody: unknown, message?: string);
}
