# Pagination System Documentation

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Controller Usage](#controller-usage)
- [Service Usage](#service-usage)
- [Response Formats](#response-formats)
- [Examples](#examples)
- [API Reference](#api-reference)
- [Migration Guide](#migration-guide)
- [Best Practices](#best-practices)

---

## Overview

This project implements a standardized pagination system with the following characteristics:

- **Zero-indexed pages**: Page numbering starts at 0
- **Flexible format**: Supports both wrapped and unwrapped pagination metadata
- **Decorator-based**: Simple `@ApiPagination()` decorator for Swagger documentation
- **Type-safe**: Full TypeScript support with validation
- **Consistent**: Uniform response structure across all endpoints

---

## Features

✅ Zero-indexed pagination (page starts at 0)  
✅ Comprehensive pagination metadata (total, page, limit, totalPages, hasNext, hasPrevious)  
✅ Decorator-based Swagger documentation  
✅ Type-safe DTOs with validation  
✅ Helper functions for easy implementation  
✅ Wrapped and unwrapped response formats  
✅ Automatic transformation via interceptor  
✅ Works with ResponseEnvelopeInterceptor

---

## Architecture

### Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ 1. Client Request                                       │
│    GET /users/admin?page=0&limit=10                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Controller (with @ApiPagination decorator)          │
│    @ApiPagination({ wrapped: false })                   │
│    Decorator sets metadata: wrapped = false             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Service returns wrapped format                       │
│    return { items: [...], pagination: {...} }           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. ResponseEnvelopeInterceptor                          │
│    Wraps: { message: "...", data: {...} }               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. PaginationTransformInterceptor                       │
│    - Reads metadata (wrapped = false)                   │
│    - Transforms data inside envelope if needed          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Client receives final response                       │
│    { message: "...", data: { items, total, page, ... }} │
└─────────────────────────────────────────────────────────┘
```

### Components

1. **@ApiPagination Decorator** (`src/common/decorators/api-pagination.decorator.ts`)
   - Adds Swagger documentation
   - Sets metadata for response format control
   - Options: `defaultPage`, `defaultLimit`, `maxLimit`, `wrapped`

2. **PaginationTransformInterceptor** (`src/common/interceptors/pagination-transform.interceptor.ts`)
   - Reads decorator metadata
   - Transforms response based on `wrapped` setting
   - Handles both enveloped and direct responses

3. **Helper Functions** (`src/common/dto/pagination.dto.ts`)
   - `createPaginatedResponse()`: Creates paginated response
   - `createPaginationMetadata()`: Generates pagination metadata

4. **DTOs** (`src/common/dto/pagination.dto.ts`)
   - `PaginationQueryDto`: Query parameters validation
   - `PaginationMetadata`: Metadata structure
   - `PaginatedResponseDto<T>`: Wrapped response type
   - `UnwrappedPaginatedResponseDto<T>`: Unwrapped response type

---

## Quick Start

### 1. Controller

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { ApiPagination } from '../../common/decorators/api-pagination.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiPagination() // Default: wrapped format
  async findAll(@Query() query: PaginationQueryDto) {
    return this.productsService.findAll(query.page, query.limit);
  }
}
```

### 2. Service

```typescript
import { Injectable } from '@nestjs/common';
import { createPaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  async findAll(page = 0, limit = 10) {
    const items = await this.model
      .find()
      .skip(page * limit)
      .limit(limit)
      .exec();

    const total = await this.model.countDocuments();

    // Always return wrapped format - interceptor handles transformation
    return createPaginatedResponse(items, page, limit, total);
  }
}
```

---

## Controller Usage

### Import Dependencies

```typescript
import { ApiPagination } from '../../common/decorators/api-pagination.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
```

### Basic Usage (Wrapped Format)

```typescript
@Get()
@ApiPagination()
async findAll(@Query() query: PaginationQueryDto) {
  return this.service.findAll(query.page, query.limit);
}
```

**Response:**

```json
{
  "message": "Operation completed successfully",
  "data": {
    "items": [...],
    "pagination": {
      "total": 50,
      "page": 0,
      "limit": 10,
      "totalPages": 5,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### Unwrapped Format

```typescript
@Get()
@ApiPagination({ wrapped: false })
async findAll(@Query() query: PaginationQueryDto) {
  return this.service.findAll(query.page, query.limit);
}
```

**Response:**

```json
{
  "message": "Operation completed successfully",
  "data": {
    "items": [...],
    "total": 50,
    "page": 0,
    "limit": 10,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Custom Options

```typescript
@Get()
@ApiPagination({
  defaultPage: 0,
  defaultLimit: 20,    // 20 items per page by default
  maxLimit: 100,       // Maximum 100 items per page
  wrapped: false,      // Unwrapped format
})
async findAll(@Query() query: PaginationQueryDto) {
  return this.service.findAll(query.page, query.limit);
}
```

### Different Formats for Different Endpoints

```typescript
@Controller('users')
export class UsersController {
  // Public endpoint - Wrapped format
  @Get()
  @ApiPagination()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query.page, query.limit);
  }

  // Admin endpoint - Unwrapped format
  @Get('admin')
  @ApiPagination({ wrapped: false })
  @UseGuards(AdminAuthGuard)
  async findAllAdmin(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query.page, query.limit);
  }
}
```

---

## Service Usage

### Import Helper Function

```typescript
import { createPaginatedResponse } from '../../common/dto/pagination.dto';
```

### Implementation

```typescript
async findAll(page = 0, limit = 10) {
  // Fetch items with pagination
  const items = await this.model
    .find()
    .skip(page * limit)
    .limit(limit)
    .exec();

  // Get total count
  const total = await this.model.countDocuments();

  // Always return wrapped format
  // Interceptor transforms it based on decorator setting
  return createPaginatedResponse(items, page, limit, total);
}
```

### With Filters

```typescript
async findAll(page = 0, limit = 10, filters = {}) {
  const query = this.buildQuery(filters);

  const items = await this.model
    .find(query)
    .skip(page * limit)
    .limit(limit)
    .exec();

  const total = await this.model.countDocuments(query);

  return createPaginatedResponse(items, page, limit, total);
}
```

### With Sorting

```typescript
async findAll(page = 0, limit = 10, orderDirection: 'asc' | 'desc' = 'desc') {
  const sortDir = orderDirection === 'asc' ? 1 : -1;

  const items = await this.model
    .find()
    .sort({ createdAt: sortDir })
    .skip(page * limit)
    .limit(limit)
    .exec();

  const total = await this.model.countDocuments();

  return createPaginatedResponse(items, page, limit, total);
}
```

---

## Response Formats

### Query Parameters

All paginated endpoints accept:

- `page` (optional, default: 0): Zero-indexed page number
- `limit` (optional, default: 10): Number of items per page

### Wrapped Format (Default)

**Structure:**

```json
{
  "message": "Operation completed successfully",
  "data": {
    "items": [...],
    "pagination": {
      "total": 100,
      "page": 0,
      "limit": 10,
      "totalPages": 10,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

**Use When:**

- Building new APIs
- Following REST best practices
- Clear separation between data and metadata needed
- Frontend expects nested structure

### Unwrapped Format

**Structure:**

```json
{
  "message": "Operation completed successfully",
  "data": {
    "items": [...],
    "total": 100,
    "page": 0,
    "limit": 10,
    "totalPages": 10,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

**Use When:**

- Migrating from legacy APIs
- Frontend expects flat structure
- Maintaining backward compatibility
- Simpler response structure preferred

### Metadata Fields

| Field         | Type    | Description                                |
| ------------- | ------- | ------------------------------------------ |
| `total`       | number  | Total number of items across all pages     |
| `page`        | number  | Current page number (0-indexed)            |
| `limit`       | number  | Number of items per page                   |
| `totalPages`  | number  | Total number of pages                      |
| `hasNext`     | boolean | Whether there is a next page available     |
| `hasPrevious` | boolean | Whether there is a previous page available |

---

## Examples

### Example 1: First Page

**Request:**

```
GET /users/admin?page=0&limit=10
```

**Response (Wrapped):**

```json
{
  "message": "Operation completed successfully",
  "data": {
    "items": [
      { "id": "1", "name": "User 1", "email": "user1@example.com" },
      { "id": "2", "name": "User 2", "email": "user2@example.com" }
    ],
    "pagination": {
      "total": 50,
      "page": 0,
      "limit": 10,
      "totalPages": 5,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### Example 2: Middle Page

**Request:**

```
GET /users/admin?page=2&limit=10
```

**Response (Unwrapped):**

```json
{
  "message": "Operation completed successfully",
  "data": {
    "items": [...],
    "total": 50,
    "page": 2,
    "limit": 10,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": true
  }
}
```

### Example 3: Last Page

**Request:**

```
GET /users/admin?page=4&limit=10
```

**Response:**

```json
{
  "message": "Operation completed successfully",
  "data": {
    "items": [...],
    "total": 50,
    "page": 4,
    "limit": 10,
    "totalPages": 5,
    "hasNext": false,
    "hasPrevious": true
  }
}
```

---

## API Reference

### @ApiPagination Decorator

```typescript
@ApiPagination(options?: ApiPaginationOptions)
```

**Options:**

| Option         | Type    | Default | Description                         |
| -------------- | ------- | ------- | ----------------------------------- |
| `defaultPage`  | number  | 0       | Default page number                 |
| `defaultLimit` | number  | 10      | Default items per page              |
| `maxLimit`     | number  | 100     | Maximum items per page              |
| `wrapped`      | boolean | true    | Whether to wrap pagination metadata |

### PaginationQueryDto

```typescript
class PaginationQueryDto {
  page?: number = 0; // 0-indexed, default: 0, min: 0
  limit?: number = 10; // default: 10, min: 1, max: 100
}
```

### createPaginatedResponse

```typescript
function createPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResponseDto<T>;
```

**Parameters:**

- `items`: Array of items for current page
- `page`: Current page number (0-indexed)
- `limit`: Items per page
- `total`: Total number of items

**Returns:** Paginated response with items and metadata

---

## Migration Guide

### Breaking Changes

**Old Format:**

```json
{
  "users": [...],
  "total": 50
}
```

**New Format:**

```json
{
  "items": [...],
  "pagination": {
    "total": 50,
    "page": 0,
    "limit": 10,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Frontend Migration

**Before:**

```typescript
const response = await api.getUsers();
const users = response.users;
const total = response.total;
```

**After (Wrapped):**

```typescript
const response = await api.getUsers();
const users = response.data.items;
const total = response.data.pagination.total;
const hasMore = response.data.pagination.hasNext;
```

**After (Unwrapped):**

```typescript
const response = await api.getUsers();
const users = response.data.items;
const total = response.data.total;
const hasMore = response.data.hasNext;
```

### Updated Endpoints

The following endpoints use the new pagination system:

- `GET /users/admin` - List all users (Admin)
- `GET /regions` - List regions (Public)
- `GET /regions/admin` - List regions (Admin)
- `GET /cities` - List cities (Public)
- `GET /cities/admin` - List cities (Admin)
- `GET /countries` - List countries (Public)
- `GET /countries/admin` - List countries (Admin)
- `GET /admin/logs` - List application logs (Admin)

---

## Best Practices

### 1. Always Use the Decorator

Use `@ApiPagination()` for consistent Swagger documentation:

```typescript
@Get()
@ApiPagination()
async findAll(@Query() query: PaginationQueryDto) {
  // ...
}
```

### 2. Use Helper Functions

Always use `createPaginatedResponse()` for consistency:

```typescript
return createPaginatedResponse(items, page, limit, total);
```

### 3. Validate Inputs

Let `PaginationQueryDto` handle validation automatically:

```typescript
async findAll(@Query() query: PaginationQueryDto) {
  // query.page and query.limit are already validated
}
```

### 4. Set Appropriate Limits

Consider data size when setting `maxLimit`:

```typescript
@ApiPagination({ maxLimit: 200 }) // For larger datasets
```

### 5. Document Custom Options

Add comments for non-default values:

```typescript
@ApiPagination({
  defaultLimit: 20,  // Higher default for performance reasons
  maxLimit: 100,
  wrapped: false,    // Flat structure for legacy clients
})
```

### 6. Use Consistent Format

Choose wrapped or unwrapped format consistently within related endpoints:

```typescript
// Good: Same format for public and admin
@Get()
@ApiPagination()
async findAll() { }

@Get('admin')
@ApiPagination()
async findAllAdmin() { }
```

### 7. Handle Edge Cases

```typescript
async findAll(page = 0, limit = 10) {
  // Ensure page is not negative
  page = Math.max(0, page);

  // Ensure limit is within bounds
  limit = Math.min(Math.max(1, limit), 100);

  // ... rest of implementation
}
```

---

## Type Definitions

### PaginationQueryDto

```typescript
class PaginationQueryDto {
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
```

### PaginationMetadata

```typescript
class PaginationMetadata {
  @ApiProperty({ description: 'Total number of items across all pages' })
  total: number;

  @ApiProperty({ description: 'Current page number (0-indexed)' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page available' })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page available' })
  hasPrevious: boolean;
}
```

### PaginatedResponseDto

```typescript
class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Array of items for the current page',
    isArray: true,
  })
  items: T[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMetadata })
  pagination: PaginationMetadata;
}
```

### UnwrappedPaginatedResponseDto

```typescript
class UnwrappedPaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Array of items for the current page',
    isArray: true,
  })
  items: T[];

  @ApiProperty({ description: 'Total number of items across all pages' })
  total: number;

  @ApiProperty({ description: 'Current page number (0-indexed)' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page available' })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page available' })
  hasPrevious: boolean;
}
```

---

## Quick Reference Table

| Decorator                            | Format            | Response Structure                                      |
| ------------------------------------ | ----------------- | ------------------------------------------------------- |
| `@ApiPagination()`                   | Wrapped (default) | `{ message, data: { items, pagination: { ... } } }`     |
| `@ApiPagination({ wrapped: true })`  | Wrapped           | `{ message, data: { items, pagination: { ... } } }`     |
| `@ApiPagination({ wrapped: false })` | Unwrapped         | `{ message, data: { items, total, page, limit, ... } }` |

---

## Testing

### Test Cases

1. **First Page** - Verify `hasPrevious = false`, `hasNext = true`
2. **Middle Page** - Verify both `hasPrevious` and `hasNext` are `true`
3. **Last Page** - Verify `hasNext = false`, `hasPrevious = true`
4. **Single Page** - Verify both `hasNext` and `hasPrevious` are `false`
5. **Invalid Page** - Test negative page numbers
6. **Different Limits** - Test various limit values
7. **Wrapped Format** - Verify nested structure
8. **Unwrapped Format** - Verify flat structure

### Example Test

```typescript
describe('Pagination', () => {
  it('should return correct metadata for first page', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/admin?page=0&limit=10')
      .expect(200);

    expect(response.body.data.pagination).toEqual({
      total: expect.any(Number),
      page: 0,
      limit: 10,
      totalPages: expect.any(Number),
      hasNext: expect.any(Boolean),
      hasPrevious: false,
    });
  });
});
```

---

**Last Updated:** November 12, 2025  
**Version:** 2.0
