export declare const UserRole: {
    readonly user: "user";
    readonly admin: "admin";
};
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export declare const UserStatus: {
    readonly active: "active";
    readonly blocked: "blocked";
};
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
export declare const TicketStatus: {
    readonly pending: "pending";
    readonly accepted: "accepted";
    readonly rejected: "rejected";
    readonly won: "won";
    readonly lost: "lost";
    readonly void: "void";
    readonly cashout: "cashout";
};
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];
export declare const MarketStatus: {
    readonly open: "open";
    readonly suspended: "suspended";
    readonly settled: "settled";
    readonly cancelled: "cancelled";
};
export type MarketStatus = (typeof MarketStatus)[keyof typeof MarketStatus];
export declare const OutcomeResult: {
    readonly unsettled: "unsettled";
    readonly won: "won";
    readonly lost: "lost";
    readonly void: "void";
};
export type OutcomeResult = (typeof OutcomeResult)[keyof typeof OutcomeResult];
export declare const FeedMessageType: {
    readonly alive: "alive";
    readonly odds_change: "odds_change";
    readonly fixture_change: "fixture_change";
    readonly bet_cancel: "bet_cancel";
    readonly bet_settlement: "bet_settlement";
    readonly rollback_bet_cancel: "rollback_bet_cancel";
    readonly rollback_bet_settlement: "rollback_bet_settlement";
    readonly snapshot_complete: "snapshot_complete";
};
export type FeedMessageType = (typeof FeedMessageType)[keyof typeof FeedMessageType];
export declare const ProducerStatus: {
    readonly up: "up";
    readonly down: "down";
    readonly unknown: "unknown";
};
export type ProducerStatus = (typeof ProducerStatus)[keyof typeof ProducerStatus];
//# sourceMappingURL=enums.d.ts.map