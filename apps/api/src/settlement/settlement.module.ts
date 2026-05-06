import { Module } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { WalletModule } from '../wallet/wallet.module';
import { CommunityModule } from '../community/community.module';

@Module({
  imports: [WalletModule, CommunityModule],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
