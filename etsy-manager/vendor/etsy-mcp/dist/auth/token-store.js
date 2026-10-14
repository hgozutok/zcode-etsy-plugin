import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { dirname } from "node:path";
export class TokenStore {
    filePath;
    constructor(filePath) {
        this.filePath = filePath;
    }
    async load() {
        try {
            const data = await readFile(this.filePath, "utf-8");
            return JSON.parse(data);
        }
        catch {
            return null;
        }
    }
    async save(tokens) {
        await mkdir(dirname(this.filePath), { recursive: true });
        await writeFile(this.filePath, JSON.stringify(tokens, null, 2), { encoding: "utf-8", mode: 0o600 });
    }
    async clear() {
        try {
            await unlink(this.filePath);
        }
        catch {
            // file doesn't exist, that's fine
        }
    }
    isAccessTokenExpired(tokens) {
        return Date.now() >= tokens.expires_at;
    }
}
//# sourceMappingURL=token-store.js.map