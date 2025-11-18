import { applyDecorators } from '@nestjs/common';
import { ApiExtension } from '@nestjs/swagger';

/**
 * ApiSort decorator
 * Adds a vendor extension (x-sort) to the Swagger operation so we can sort
 * endpoints inside the same tag/section in Swagger UI.
 *
 * Usage:
 *  @ApiSort(1)
 *  @Get('...')
 *
 * Then configure operationsSorter in Swagger setup to sort by x-sort.
 */
export function ApiSort(order: number): MethodDecorator {
  return applyDecorators(ApiExtension('x-sort', order));
}
