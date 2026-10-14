export class EtsyApiError extends Error {
    status;
    errorBody;
    constructor(status, errorBody, message) {
        super(message ?? `Etsy API error (${status})`);
        this.status = status;
        this.errorBody = errorBody;
        this.name = "EtsyApiError";
    }
}
//# sourceMappingURL=errors.js.map