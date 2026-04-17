import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { DepositService } from './deposit.service';
import { WithdrawalService } from './withdrawal.service';

@Module({
  controllers: [WalletController],
  providers: [WalletService, DepositService, WithdrawalService],
  exports: [WalletService, DepositService, WithdrawalService],
})
export class WalletModule {}
