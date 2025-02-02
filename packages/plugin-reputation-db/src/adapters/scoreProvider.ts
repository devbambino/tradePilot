export interface ScoreProvider {
    getScore(identifier: string, refresh?: boolean): Promise<number>;
}
