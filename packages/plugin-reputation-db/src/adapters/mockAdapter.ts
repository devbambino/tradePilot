import { ScoreProvider } from "./scoreProvider";

export class MockAdapter implements ScoreProvider {
    async getScore(identifier: string, refresh = false): Promise<number> {
        console.log(`Returning mock score for ${identifier}...`);
        return 50; // Fixed mock score
    }
}
