import crypto from 'crypto';
export function calcBlockHash(index, prevHash, timestamp, data) {
    const text = index + prevHash + timestamp + JSON.stringify(data);
    return crypto.createHash('sha256').update(text).digest('hex');
}
export function calcFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}
//# sourceMappingURL=hash.js.map