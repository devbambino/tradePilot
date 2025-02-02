import { ScoreProvider } from "./scoreProvider";

export class TwitterAdapter implements ScoreProvider {
    async getScore(twitterHandle: string, refresh = false): Promise<number> {
        console.log(`Fetching Twitter score for ${twitterHandle}...`);
        return Math.random() * 100; // Replace with actual API call
    }
}
