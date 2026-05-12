/**
 * Business Module
 *
 * Handles all bus_ prefixed business entity tables.
 * Provides dynamic CRUD operations for all business entities.
 *
 * Generated: 2026-05-12T09:13:14.956Z
 */

import { Module } from '@nestjs/common';
import { BusController } from './bus.controller';
import { BusService } from './bus.service';

@Module({
  controllers: [BusController],
  providers: [BusService],
  exports: [BusService],
})
export class BusModule {}
