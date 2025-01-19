import { describe, it, expect } from 'vitest';
import { parseAccessPath } from '../utils';

describe('parseAccessPath', () => {
    it('should parse a valid rooch URI correctly', () => {
        const uri = 'rooch://object/0xd858ebbc8e0e5c2128800b9a715e3bd8ceae2fb8a75df5cc40b58b86f1dc77ee';
        const expected = '/object/0xd858ebbc8e0e5c2128800b9a715e3bd8ceae2fb8a75df5cc40b58b86f1dc77ee';
        expect(parseAccessPath(uri)).toBe(expected);
    });

    it('should throw an error for invalid URI with missing scheme', () => {
        const uri = 'object/0xd858ebbc8e0e5c2128800b9a715e3bd8ceae2fb8a75df5cc40b58b86f1dc77ee';
        expect(() => parseAccessPath(uri)).toThrowError('Invalid URI format');
    });

    it('should throw an error for invalid URI with incorrect structure', () => {
        const uri = 'rooch://invalid/0xd858ebbc8e0e5c2128800b9a715e3bd8ceae2fb8a75df5cc40b58b86f1dc77ee';
        expect(() => parseAccessPath(uri)).toThrowError('Invalid URI format');
    });

    it('should throw an error for URI with missing object path', () => {
        const uri = 'rooch://object/';
        expect(() => parseAccessPath(uri)).toThrowError('Invalid URI format');
    });

    it('should throw an error for URI with invalid hex string', () => {
        const uri = 'rooch://object/invalid_hex_string';
        expect(() => parseAccessPath(uri)).toThrowError('Invalid URI format');
    });
});
