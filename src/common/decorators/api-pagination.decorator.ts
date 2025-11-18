import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

/**
 * Metadata key for pagination configuration
 */
export const PAGINATION_WRAPPED_KEY = 'pagination:wrapped';

/**
 * ApiPagination decorator
 * Adds standardized pagination query parameters to Swagger documentation
 * and sets metadata for pagination response format
 *
 * @param options - Optional configuration
 * @param options.defaultPage - Default page number (default: 0)
 * @param options.defaultLimit - Default items per page (default: 10)
 * @param options.maxLimit - Maximum items per page (default: 100)
 * @param options.wrapped - Whether to wrap pagination metadata in 'pagination' property (default: true)
 *
 * Usage:
 *  @ApiPagination() // wrapped format (default)
 *  @ApiPagination({ wrapped: false }) // unwrapped format
 *  @Get('...')
 *  async findAll(@Query() query: PaginationQueryDto) { ... }
 */
export interface ApiPaginationOptions {
  defaultPage?: number;
  defaultLimit?: number;
  maxLimit?: number;
  wrapped?: boolean;
}

export function ApiPagination(
  options: ApiPaginationOptions = {},
): MethodDecorator {
  const {
    defaultPage = 0,
    defaultLimit = 10,
    maxLimit = 100,
    wrapped = true,
  } = options;

  return applyDecorators(
    SetMetadata(PAGINATION_WRAPPED_KEY, wrapped),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: `Page number (0-indexed, default: ${defaultPage})`,
      example: 0,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: `Items per page (default: ${defaultLimit}, max: ${maxLimit})`,
      example: defaultLimit,
    }),
  );
}
