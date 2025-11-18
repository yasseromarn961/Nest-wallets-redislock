import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PAGINATION_WRAPPED_KEY } from '../decorators/api-pagination.decorator';

/**
 * Interface for paginated response data
 */
interface PaginatedData {
  items: unknown[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Type guard to check if data is a paginated response
 */
function isPaginatedData(data: unknown): data is PaginatedData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'items' in data &&
    'pagination' in data &&
    Array.isArray((data as PaginatedData).items) &&
    typeof (data as PaginatedData).pagination === 'object'
  );
}

/**
 * Interceptor to transform pagination responses based on decorator metadata
 * Reads the 'wrapped' metadata from @ApiPagination decorator and transforms
 * the response accordingly
 *
 * This interceptor runs AFTER ResponseEnvelopeInterceptor, so it needs to
 * handle both enveloped responses { message, data } and direct responses
 */
@Injectable()
export class PaginationTransformInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Get the wrapped metadata from the decorator
    const wrapped = this.reflector.get<boolean>(
      PAGINATION_WRAPPED_KEY,
      context.getHandler(),
    );

    // If no pagination decorator or wrapped is not set, pass through
    if (wrapped === undefined) {
      return next.handle();
    }

    return next.handle().pipe(
      map((response: unknown) => {
        // Check if this is an enveloped response { message, data }
        if (
          response &&
          typeof response === 'object' &&
          'data' in response &&
          'message' in response
        ) {
          const envelopedResponse = response as {
            message: string;
            data: unknown;
          };
          const data = envelopedResponse.data;

          // Transform the data inside the envelope
          if (isPaginatedData(data)) {
            if (wrapped) {
              // Keep wrapped format
              return response;
            }

            // Unwrap pagination metadata
            const { items, pagination } = data;
            return {
              message: envelopedResponse.message,
              data: {
                items,
                ...pagination,
              },
            };
          }

          // Not paginated data, return as is
          return response;
        }

        // Direct response (no envelope)
        if (!isPaginatedData(response)) {
          return response;
        }

        // If wrapped is true, keep the current structure
        if (wrapped) {
          return response;
        }

        // If wrapped is false, unwrap the pagination metadata
        const { items, pagination } = response;
        return {
          items,
          ...pagination,
        };
      }),
    );
  }
}
