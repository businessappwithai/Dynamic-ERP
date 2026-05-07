/**
 * Transform Interceptor
 *
 * Standardizes API responses with consistent format.
 * Generated: 2026-03-20T16:41:26.574Z
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data already has proper format, return as-is
        if (data && typeof data === 'object' && 'data' in data) {
          return data;
        }

        // Wrap response in standard format
        return { data };
      })
    );
  }
}
