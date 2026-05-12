/**
 * Public Decorator
 *
 * Marks routes that don't require authentication
 *
 * Generated: 2026-05-12T10:10:06.679Z
 */

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
