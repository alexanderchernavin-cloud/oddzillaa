import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';

export interface OddsChangeMsg {
  product: number;
  event_id: string;
  timestamp: number;
  request_id?: number;
  odds?: {
    market: OddsChangeMarket[] | OddsChangeMarket;
  };
  sport_event_status?: {
    status: number;
    home_score?: number;
    away_score?: number;
  };
}

export interface OddsChangeMarket {
  id: number;
  specifiers?: string;
  status: number;
  favourite?: number;
  outcome: OddsChangeOutcome[] | OddsChangeOutcome;
}

export interface OddsChangeOutcome {
  id: string;
  odds: number;
  probabilities?: number;
  active: number;
}

export interface BetSettlementMsg {
  product: number;
  event_id: string;
  timestamp: number;
  outcomes?: {
    market: BetSettlementMarket[] | BetSettlementMarket;
  };
}

export interface BetSettlementMarket {
  id: number;
  specifiers?: string;
  outcome: BetSettlementOutcome[] | BetSettlementOutcome;
}

export interface BetSettlementOutcome {
  id: string;
  result: number; // 1=won, 0=lost, -1=void
}

export interface BetCancelMsg {
  product: number;
  event_id: string;
  timestamp: number;
  market: BetCancelMarket[] | BetCancelMarket;
}

export interface BetCancelMarket {
  id: number;
  specifiers?: string;
  void_reason?: number;
}

@Injectable()
export class XmlParserService {
  private readonly parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true,
      isArray: (_name, jpath) => {
        return (
          jpath === 'odds_change.odds.market' ||
          jpath === 'odds_change.odds.market.outcome' ||
          jpath === 'bet_settlement.outcomes.market' ||
          jpath === 'bet_settlement.outcomes.market.outcome' ||
          jpath === 'bet_cancel.market'
        );
      },
    });
  }

  parseOddsChange(xml: string): OddsChangeMsg | null {
    try {
      const parsed = this.parser.parse(xml);
      return parsed.odds_change ?? null;
    } catch {
      return null;
    }
  }

  parseBetSettlement(xml: string): BetSettlementMsg | null {
    try {
      const parsed = this.parser.parse(xml);
      return parsed.bet_settlement ?? null;
    } catch {
      return null;
    }
  }

  parseBetCancel(xml: string): BetCancelMsg | null {
    try {
      const parsed = this.parser.parse(xml);
      return parsed.bet_cancel ?? null;
    } catch {
      return null;
    }
  }

  detectMessageType(xml: string): string | null {
    const match = xml.match(/<(\w+)[\s>]/);
    return match?.[1] ?? null;
  }
}
