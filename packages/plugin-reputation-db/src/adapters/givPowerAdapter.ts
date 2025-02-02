import { ScoreProvider } from "./scoreProvider";

export class GivPowerAdapter implements ScoreProvider {
    async getScore(walletAddress: string, refresh = false): Promise<number> {
        console.log(`Fetching GivPower score for ${walletAddress}...`);
        return Math.random() * 100; // Replace with actual API call
    }
}
