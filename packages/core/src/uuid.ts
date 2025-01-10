import { sha1 } from "js-sha1";
import { UUID } from "./types.ts";

export function stringToUuid(target: string | number): UUID {
    // Convert number to string if needed
    const inputStr = String(target);

    if (typeof target !== "string" && typeof target !== "number") {
        throw TypeError("Value must be string or number");
    }

    // Convert byte to hex using modern array methods
    const HEX_DIGITS = Object.freeze("0123456789abcdef".split(""));
    const uint8ToHex = (ubyte: number): string => {
        const first = ubyte >> 4;
        const second = ubyte & 0x0F; // Using bitwise AND instead of subtraction
        return `${HEX_DIGITS[first]}${HEX_DIGITS[second]}`;
    };

    const uint8ArrayToHex = (buf: Uint8Array): string =>
        Array.from(buf).map(uint8ToHex).join("");

    const escapedStr = encodeURIComponent(inputStr);
    const buffer = Uint8Array.from(escapedStr, char => char.charCodeAt(0));

    const hash = sha1(buffer);
    const hashBuffer = new Uint8Array(
        Array.from({ length: hash.length / 2 }, (_, i) =>
            parseInt(hash.slice(i * 2, i * 2 + 2), 16)
        )
    );

    // Use template string for better readability
    return `${uint8ArrayToHex(hashBuffer.slice(0, 4))}-${
        uint8ArrayToHex(hashBuffer.slice(4, 6))}-${
        uint8ToHex(hashBuffer[6] & 0x0f)}${
        uint8ToHex(hashBuffer[7])}-${
        uint8ToHex((hashBuffer[8] & 0x3f) | 0x80)}${
        uint8ToHex(hashBuffer[9])}-${
        uint8ArrayToHex(hashBuffer.slice(10, 16))}` as UUID;
}
