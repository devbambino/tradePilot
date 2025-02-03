export type Signal = {
    signal_id: number;
    symbol: string;
    create_at: number;
    start_at: number;
    end_at: number;
    signal_type: number;
    signal_intensity: number;
    locked_price: string;
    prediction_min_price: string;
    prediction_max_price: string;
    status: string;
    result: number;
    agree_count: number;
    disagree_count: number;
    actual_price: string;
    actual_end_at: number;
    extremum_price: string;
};

export type SignalResponse = {
    status: boolean;
    data: {
        signals: Signal[];
        total_count: number;
        predicted_map: { [key: string]: boolean };
    };
};
