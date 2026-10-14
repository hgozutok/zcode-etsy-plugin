import { EtsyApiError } from "../utils/errors.js";
const BASE_URL = "https://openapi.etsy.com/v3/application";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
export { EtsyApiError } from "../utils/errors.js";
export class EtsyClient {
    config;
    lastRequestTime = 0;
    minRequestInterval = 100; // 10 req/sec
    rateLimitQueue = Promise.resolve();
    constructor(config) {
        this.config = config;
    }
    async get(path, params) {
        return this.request("GET", path, undefined, params);
    }
    async post(path, body) {
        return this.request("POST", path, body);
    }
    async put(path, body) {
        return this.request("PUT", path, body);
    }
    async patch(path, body) {
        return this.request("PATCH", path, body);
    }
    async delete(path) {
        return this.request("DELETE", path);
    }
    async uploadFile(path, formData) {
        return this.request("POST", path, formData, undefined, true);
    }
    async request(method, path, body, params, isFormData = false) {
        let lastError;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            if (attempt > 0) {
                const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                await new Promise((r) => setTimeout(r, delay));
            }
            await this.rateLimit();
            const url = new URL(`${BASE_URL}${path}`);
            if (params) {
                for (const [key, value] of Object.entries(params)) {
                    url.searchParams.set(key, value);
                }
            }
            const token = await this.config.getAccessToken();
            const headers = {
                "x-api-key": `${this.config.apiKey}:${this.config.sharedSecret}`,
            };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            if (body && !isFormData) {
                headers["Content-Type"] = "application/json";
            }
            const fetchOptions = { method, headers };
            if (body) {
                fetchOptions.body = isFormData ? body : JSON.stringify(body);
            }
            try {
                const response = await fetch(url.toString(), fetchOptions);
                if (response.ok) {
                    if (response.status === 204)
                        return null;
                    return (await response.json());
                }
                if (response.status === 401) {
                    if (attempt === 0) {
                        await this.config.onTokenExpired();
                        continue;
                    }
                    const errorBody = await response.json().catch(() => null);
                    throw new EtsyApiError(401, errorBody, "Authentication failed after token refresh");
                }
                if (response.status === 429) {
                    const retryAfter = response.headers.get("Retry-After");
                    if (retryAfter) {
                        await new Promise((r) => setTimeout(r, parseInt(retryAfter, 10) * 1000));
                    }
                    continue;
                }
                if (response.status >= 500) {
                    lastError = new EtsyApiError(response.status, await response.json().catch(() => null));
                    continue;
                }
                const errorBody = await response.json().catch(() => null);
                throw new EtsyApiError(response.status, errorBody);
            }
            catch (err) {
                if (err instanceof EtsyApiError)
                    throw err;
                lastError = err;
                if (attempt === MAX_RETRIES)
                    throw lastError;
            }
        }
        throw lastError ?? new Error("Request failed after retries");
    }
    rateLimit() {
        this.rateLimitQueue = this.rateLimitQueue.then(async () => {
            const now = Date.now();
            const elapsed = now - this.lastRequestTime;
            if (elapsed < this.minRequestInterval) {
                await new Promise((r) => setTimeout(r, this.minRequestInterval - elapsed));
            }
            this.lastRequestTime = Date.now();
        });
        return this.rateLimitQueue;
    }
}
//# sourceMappingURL=etsy-client.js.map