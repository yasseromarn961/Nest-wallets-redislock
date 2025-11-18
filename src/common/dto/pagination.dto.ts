import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

/**
 * DTO for pagination query parameters
 * Page numbering starts at 0
 */
export class PaginationQueryDto {
  @ApiProperty({
    description: 'Page number (0-indexed)',
    required: false,
    minimum: 0,
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number = 0;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

/**
 * Metadata for paginated responses
 * Contains information about the current page, total items, and navigation
 */
export class PaginationMetadata {
  @ApiProperty({
    description: 'Total number of items across all pages',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number (0-indexed)',
    example: 0,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page available',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page available',
    example: false,
  })
  hasPrevious: boolean;
}

/**
 * Generic paginated response wrapper (wrapped format)
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Array of items for the current page',
    isArray: true,
  })
  items: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetadata,
  })
  pagination: PaginationMetadata;
}

/**
 * Generic paginated response (unwrapped format)
 * Pagination metadata is at the same level as items
 */
export class UnwrappedPaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Array of items for the current page',
    isArray: true,
  })
  items: T[];

  @ApiProperty({
    description: 'Total number of items across all pages',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number (0-indexed)',
    example: 0,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page available',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page available',
    example: false,
  })
  hasPrevious: boolean;
}

/**
 * Utility function to create pagination metadata
 *
 * @param page - Current page number (0-indexed)
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Pagination metadata object
 */
export function createPaginationMetadata(
  page: number,
  limit: number,
  total: number,
): PaginationMetadata {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.max(0, page);

  return {
    total,
    page: currentPage,
    limit,
    totalPages,
    hasNext: currentPage < totalPages - 1,
    hasPrevious: currentPage > 0,
  };
}

/**
 * Utility function to create a paginated response
 * Always returns wrapped format - unwrapping is handled by PaginationTransformInterceptor
 *
 * @param items - Array of items for the current page
 * @param page - Current page number (0-indexed)
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Paginated response with items and metadata (always wrapped)
 */
export function createPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResponseDto<T> {
  const metadata = createPaginationMetadata(page, limit, total);

  return {
    items,
    pagination: metadata,
  };
}
