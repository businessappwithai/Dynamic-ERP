/**
 * Rules Module
 *
 * Business rules engine module for crm-app
 *
 * Generated: 2026-05-12T09:13:14.944Z
 */

import { Module } from '@nestjs/common';
import { RulesController } from './rules.controller';
import { RulesService } from './rules.service';
import { RulesEngine } from './rules-engine.service';

@Module({
  controllers: [RulesController],
  providers: [RulesService, RulesEngine],
  exports: [RulesService, RulesEngine],
})
export class RulesModule {}
