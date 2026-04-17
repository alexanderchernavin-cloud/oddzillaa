import { Module } from '@nestjs/common';
import { FeedConsumerService } from './feed-consumer.service';
import { XmlParserService } from './xml-parser.service';
import { FeedProjectorService } from './feed-projector.service';
import { PricingService } from './pricing.service';
import { MockProducerService } from './mock/mock-producer.service';
import { SettlementModule } from '../settlement/settlement.module';

@Module({
  imports: [SettlementModule],
  providers: [
    XmlParserService,
    FeedProjectorService,
    PricingService,
    FeedConsumerService,
    MockProducerService,
  ],
  exports: [PricingService],
})
export class FeedModule {}
