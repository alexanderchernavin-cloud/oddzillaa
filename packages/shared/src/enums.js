"use strict";
// Enums mirrored from the Prisma schema. Kept string-literal so they serialize
// identically across the wire and remain valid Zod enum inputs.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProducerStatus = exports.FeedMessageType = exports.OutcomeResult = exports.MarketStatus = exports.TicketStatus = exports.UserStatus = exports.UserRole = void 0;
exports.UserRole = { user: 'user', admin: 'admin' };
exports.UserStatus = { active: 'active', blocked: 'blocked' };
exports.TicketStatus = {
    pending: 'pending',
    accepted: 'accepted',
    rejected: 'rejected',
    won: 'won',
    lost: 'lost',
    void: 'void',
    cashout: 'cashout',
};
exports.MarketStatus = {
    open: 'open',
    suspended: 'suspended',
    settled: 'settled',
    cancelled: 'cancelled',
};
exports.OutcomeResult = {
    unsettled: 'unsettled',
    won: 'won',
    lost: 'lost',
    void: 'void',
};
exports.FeedMessageType = {
    alive: 'alive',
    odds_change: 'odds_change',
    fixture_change: 'fixture_change',
    bet_cancel: 'bet_cancel',
    bet_settlement: 'bet_settlement',
    rollback_bet_cancel: 'rollback_bet_cancel',
    rollback_bet_settlement: 'rollback_bet_settlement',
    snapshot_complete: 'snapshot_complete',
};
exports.ProducerStatus = {
    up: 'up',
    down: 'down',
    unknown: 'unknown',
};
//# sourceMappingURL=enums.js.map