# Address Management API Documentation

## Table of Contents

- [Overview](#overview)
- [Data Model](#data-model)
- [Business Rules](#business-rules)
- [API Endpoints](#api-endpoints)
  - [User Endpoints](#user-endpoints)
  - [Admin Endpoints](#admin-endpoints)
- [Request/Response Examples](#requestresponse-examples)
- [Error Handling](#error-handling)
- [Database Indexes](#database-indexes)

---

## Overview

The Address Management system provides a comprehensive solution for managing user addresses within the application. It integrates seamlessly with the existing location hierarchy (Country → Region → City) and ensures data integrity through automatic relationship validation.

**Key Features:**

- **One Address Per User**: Each user can have only one active address
- **Automatic Relationship Management**: Country and Region IDs are automatically extracted from the selected City
- **Soft Delete Support**: Addresses are soft-deleted, maintaining data history
- **Multi-language Support**: Full i18n support for error messages and responses (Arabic/English)
- **Population Support**: Address responses include full details of related Country, Region, and City

---

## Data Model

### Address Schema

```typescript
{
  userId: ObjectId,        // Reference to User (unique)
  countryId: ObjectId,     // Reference to Country (auto-extracted from city)
  regionId: ObjectId,      // Reference to Region (auto-extracted from city)
  cityId: ObjectId,        // Reference to City (user-provided)
  addressLine1: string,    // Required - Street, building number, etc.
  addressLine2?: string,   // Optional - Apartment, floor, etc.
  postalCode?: string,     // Optional - ZIP/Postal code
  deletedAt: Date | null,  // Soft delete timestamp
  createdAt: Date,         // Auto-generated
  updatedAt: Date          // Auto-generated
}
```

### Field Descriptions

| Field          | Type     | Required | Description                                              |
| -------------- | -------- | -------- | -------------------------------------------------------- |
| `userId`       | ObjectId | Yes      | Unique reference to the user who owns this address       |
| `countryId`    | ObjectId | Yes      | Auto-populated from the selected city                    |
| `regionId`     | ObjectId | Yes      | Auto-populated from the selected city                    |
| `cityId`       | ObjectId | Yes      | User-selected city (must be active and not deleted)      |
| `addressLine1` | String   | Yes      | Primary address line (street, building)                  |
| `addressLine2` | String   | No       | Secondary address line (apartment, floor)                |
| `postalCode`   | String   | No       | Postal/ZIP code                                          |
| `deletedAt`    | Date     | No       | Timestamp when address was soft-deleted (null if active) |

---

## Business Rules

### 1. One Address Per User

- Each user can create **only one** address
- Attempting to create a second address will return a `409 Conflict` error
- Users must update or delete their existing address if they want to change it

### 2. Automatic Country & Region Extraction

**When Creating an Address:**

- User provides only the `cityId` in the request body
- The system automatically:
  1. Validates that the city exists and is active
  2. Extracts the `countryId` from the city record
  3. Extracts the `regionId` from the city record
  4. Stores all IDs as MongoDB ObjectIds (not strings)

**When Updating an Address:**

- If user changes the `cityId`, the system automatically updates `countryId` and `regionId`
- This ensures **zero possibility** of mismatched location relationships

### 3. Validation Rules

- City must be active (`isActive: true`)
- City must not be soft-deleted (`deletedAt: null`)
- User must be authenticated (JWT required)
- All IDs are validated as valid MongoDB ObjectIds

### 4. Soft Delete

- Addresses are never permanently deleted
- Delete operation sets `deletedAt` to current timestamp
- Soft-deleted addresses are excluded from normal queries
- Admins can view soft-deleted addresses using query parameters

---

## API Endpoints

### Base URL

```
/addresses        (User endpoints)
/admin/addresses  (Admin endpoints)
```

---

## User Endpoints

All user endpoints require JWT authentication via Bearer token.

### 1. Create Address

**Endpoint:** `POST /addresses`

**Authentication:** Required (JWT)

**Request Body:**

```json
{
  "cityId": "60f7b2f6a8b1c60012d4c8e3",
  "addressLine1": "123 King Fahd Street, Building 5",
  "addressLine2": "Apartment 12, Floor 3",
  "postalCode": "12345"
}
```

**Required Fields:**

- `cityId` (string) - MongoDB ObjectId of the city
- `addressLine1` (string) - Primary address line

**Optional Fields:**

- `addressLine2` (string) - Secondary address line
- `postalCode` (string) - Postal/ZIP code

**Success Response:** `201 Created`

```json
{
  "message": "Address created successfully",
  "data": {
    "address": {
      "id": "673d45a89c1234567890abcd",
      "userId": "673d1234567890abcdef1234",
      "countryId": "60f7b2f6a8b1c60012d4c8e1",
      "country": {
        "id": "60f7b2f6a8b1c60012d4c8e1",
        "name": { "en": "Saudi Arabia", "ar": "المملكة العربية السعودية" },
        "code": "SA",
        "dialCode": "+966",
        "flagImageUrl": "https://...",
        "isActive": true
      },
      "regionId": "60f7b2f6a8b1c60012d4c8e2",
      "region": {
        "id": "60f7b2f6a8b1c60012d4c8e2",
        "name": { "en": "Makkah", "ar": "مكة المكرمة" },
        "countryId": "60f7b2f6a8b1c60012d4c8e1",
        "isActive": true
      },
      "cityId": "60f7b2f6a8b1c60012d4c8e3",
      "city": {
        "id": "60f7b2f6a8b1c60012d4c8e3",
        "name": { "en": "Jeddah", "ar": "جدة" },
        "countryId": "60f7b2f6a8b1c60012d4c8e1",
        "regionId": "60f7b2f6a8b1c60012d4c8e2",
        "postalCode": "21442",
        "isActive": true
      },
      "addressLine1": "123 King Fahd Street, Building 5",
      "addressLine2": "Apartment 12, Floor 3",
      "postalCode": "12345",
      "createdAt": "2024-11-12T10:30:00.000Z",
      "updatedAt": "2024-11-12T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**

- `409 Conflict` - User already has an address
- `404 Not Found` - City not found or not active
- `401 Unauthorized` - Invalid or missing JWT token

---

### 2. Update Address

**Endpoint:** `PATCH /addresses`

**Authentication:** Required (JWT)

**Request Body:**

```json
{
  "cityId": "60f7b2f6a8b1c60012d4c8e4",
  "addressLine1": "456 New Street",
  "postalCode": "54321"
}
```

**Notes:**

- All fields are optional
- If `cityId` is changed, `countryId` and `regionId` are automatically updated
- Only the authenticated user's address can be updated

**Success Response:** `200 OK`

```json
{
  "message": "Address updated successfully",
  "data": {
    "address": {
      "id": "673d45a89c1234567890abcd",
      "userId": "673d1234567890abcdef1234",
      "countryId": "60f7b2f6a8b1c60012d4c8e5",
      "country": {
        "id": "60f7b2f6a8b1c60012d4c8e5",
        "name": { "en": "Saudi Arabia", "ar": "المملكة العربية السعودية" },
        "code": "SA",
        "dialCode": "+966",
        "flagImageUrl": "https://...",
        "isActive": true
      },
      "regionId": "60f7b2f6a8b1c60012d4c8e6",
      "region": {
        "id": "60f7b2f6a8b1c60012d4c8e6",
        "name": { "en": "Some Region", "ar": "منطقة" },
        "countryId": "60f7b2f6a8b1c60012d4c8e5",
        "isActive": true
      },
      "cityId": "60f7b2f6a8b1c60012d4c8e4",
      "city": {
        "id": "60f7b2f6a8b1c60012d4c8e4",
        "name": { "en": "Some City", "ar": "مدينة" },
        "countryId": "60f7b2f6a8b1c60012d4c8e5",
        "regionId": "60f7b2f6a8b1c60012d4c8e6",
        "postalCode": "54321",
        "isActive": true
      },
      "addressLine1": "456 New Street",
      "addressLine2": "Apartment 12, Floor 3",
      "postalCode": "54321",
      "createdAt": "2024-11-12T10:30:00.000Z",
      "updatedAt": "2024-11-12T11:45:00.000Z"
    }
  }
}
```

**Error Responses:**

- `404 Not Found` - Address not found for this user
- `404 Not Found` - City not found or not active (if cityId provided)
- `401 Unauthorized` - Invalid or missing JWT token

---

### 3. Get Current User Address

**Endpoint:** `GET /addresses`

**Authentication:** Required (JWT)

**Query Parameters:** None

**Success Response:** `200 OK`

```json
{
  "message": "Success",
  "data": {
    "id": "673d45a89c1234567890abcd",
    "userId": "673d1234567890abcdef1234",
    "addressLine1": "123 King Fahd Street, Building 5",
    "addressLine2": "Apartment 12, Floor 3",
    "postalCode": "12345",
    "countryId": "60f7b2f6a8b1c60012d4c8e1",
    "country": {
      "id": "60f7b2f6a8b1c60012d4c8e1",
      "name": {
        "en": "Saudi Arabia",
        "ar": "المملكة العربية السعودية"
      },
      "code": "SA",
      "dialCode": "+966",
      "flagImageUrl": "https://...",
      "isActive": true
    },
    "regionId": "60f7b2f6a8b1c60012d4c8e2",
    "region": {
      "id": "60f7b2f6a8b1c60012d4c8e2",
      "name": {
        "en": "Makkah",
        "ar": "مكة المكرمة"
      },
      "countryId": "60f7b2f6a8b1c60012d4c8e1",
      "isActive": true
    },
    "cityId": "60f7b2f6a8b1c60012d4c8e3",
    "city": {
      "id": "60f7b2f6a8b1c60012d4c8e3",
      "name": {
        "en": "Jeddah",
        "ar": "جدة"
      },
      "countryId": "60f7b2f6a8b1c60012d4c8e1",
      "regionId": "60f7b2f6a8b1c60012d4c8e2",
      "postalCode": "21442",
      "isActive": true
    },
    "createdAt": "2024-11-12T10:30:00.000Z",
    "updatedAt": "2024-11-12T10:30:00.000Z"
  }
}
```

**Notes:**

- Returns `null` if user has no address
- Country, Region, and City are fully populated with their details

**Error Responses:**

- `401 Unauthorized` - Invalid or missing JWT token

---

### 4. Delete Address

**Endpoint:** `DELETE /addresses`

**Authentication:** Required (JWT)

**Success Response:** `204 No Content`

No response body (soft delete performed)

**Error Responses:**

- `404 Not Found` - Address not found for this user
- `401 Unauthorized` - Invalid or missing JWT token

---

## Admin Endpoints

All admin endpoints require Admin JWT authentication.

### 1. Get All Addresses (with filters)

**Endpoint:** `GET /admin/addresses`

**Authentication:** Required (Admin JWT)

**Query Parameters:**

| Parameter        | Type    | Required | Description                                      |
| ---------------- | ------- | -------- | ------------------------------------------------ |
| `page`           | number  | No       | Page number (0-indexed), default: 0              |
| `limit`          | number  | No       | Items per page, default: 10                      |
| `orderDirection` | string  | No       | Sort direction: 'asc' or 'desc', default: 'desc' |
| `userId`         | string  | No       | Filter by user ID                                |
| `countryId`      | string  | No       | Filter by country ID                             |
| `regionId`       | string  | No       | Filter by region ID                              |
| `cityId`         | string  | No       | Filter by city ID                                |
| `includeDeleted` | boolean | No       | Include soft-deleted records, default: false     |
| `deletedOnly`    | boolean | No       | Return only soft-deleted records, default: false |

**Example Request:**

```
GET /admin/addresses?page=0&limit=10&countryId=60f7b2f6a8b1c60012d4c8e1&orderDirection=desc
```

**Success Response:** `200 OK`

```json
{
  "message": "Success",
  "data": {
    "items": [
      {
        "id": "673d45a89c1234567890abcd",
        "userId": "673d1234567890abcdef1234",
        "addressLine1": "123 King Fahd Street, Building 5",
        "addressLine2": "Apartment 12, Floor 3",
        "postalCode": "12345",
        "countryId": "60f7b2f6a8b1c60012d4c8e1",
        "country": { /* populated country data */ },
        "regionId": "60f7b2f6a8b1c60012d4c8e2",
        "region": { /* populated region data */ },
        "cityId": "60f7b2f6a8b1c60012d4c8e3",
        "city": { /* populated city data */ },
        "createdAt": "2024-11-12T10:30:00.000Z",
        "updatedAt": "2024-11-12T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 0,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  }
}
```

---

### 2. Get Address by ID

**Endpoint:** `GET /admin/addresses/:id`

**Authentication:** Required (Admin JWT)

**Path Parameters:**

- `id` (string) - Address ID (MongoDB ObjectId)

**Example Request:**

```
GET /admin/addresses/673d45a89c1234567890abcd
```

**Success Response:** `200 OK`

```json
{
  "message": "Success",
  "data": {
    "id": "673d45a89c1234567890abcd",
    "userId": "673d1234567890abcdef1234",
    "addressLine1": "123 King Fahd Street, Building 5",
    "addressLine2": "Apartment 12, Floor 3",
    "postalCode": "12345",
    "countryId": "60f7b2f6a8b1c60012d4c8e1",
    "country": { /* populated country data */ },
    "regionId": "60f7b2f6a8b1c60012d4c8e2",
    "region": { /* populated region data */ },
    "cityId": "60f7b2f6a8b1c60012d4c8e3",
    "city": { /* populated city data */ },
    "deletedAt": null,
    "createdAt": "2024-11-12T10:30:00.000Z",
    "updatedAt": "2024-11-12T10:30:00.000Z"
  }
}
```

**Error Responses:**

- `404 Not Found` - Address not found
- `401 Unauthorized` - Invalid or missing Admin JWT token

---

## Request/Response Examples

### Complete User Flow Example

#### 1. User Creates Address

**Request:**

```bash
POST /addresses
Authorization: Bearer <user-jwt-token>
Content-Type: application/json

{
  "cityId": "60f7b2f6a8b1c60012d4c8e3",
  "addressLine1": "789 Al Madinah Street",
  "addressLine2": "Villa 15",
  "postalCode": "23456"
}
```

**Response:**

```json
{
  "message": "Address created successfully",
  "data": {
    "address": {
      "id": "673d45a89c1234567890abcd",
      "userId": "673d1234567890abcdef1234",
      "countryId": "60f7b2f6a8b1c60012d4c8e1",
      "regionId": "60f7b2f6a8b1c60012d4c8e2",
      "cityId": "60f7b2f6a8b1c60012d4c8e3",
      "addressLine1": "789 Al Madinah Street",
      "addressLine2": "Villa 15",
      "postalCode": "23456",
      "createdAt": "2024-11-12T10:30:00.000Z",
      "updatedAt": "2024-11-12T10:30:00.000Z"
    }
  }
}
```

#### 2. User Updates Address (Changes City)

**Request:**

```bash
PATCH /addresses
Authorization: Bearer <user-jwt-token>
Content-Type: application/json

{
  "cityId": "60f7b2f6a8b1c60012d4c8e7",
  "addressLine1": "100 King Abdullah Road"
}
```

**Response:**

```json
{
  "message": "Address updated successfully",
  "data": {
    "address": {
      "id": "673d45a89c1234567890abcd",
      "userId": "673d1234567890abcdef1234",
      "countryId": "60f7b2f6a8b1c60012d4c8e1",
      "regionId": "60f7b2f6a8b1c60012d4c8e8",
      "cityId": "60f7b2f6a8b1c60012d4c8e7",
      "addressLine1": "100 King Abdullah Road",
      "addressLine2": "Villa 15",
      "postalCode": "23456",
      "createdAt": "2024-11-12T10:30:00.000Z",
      "updatedAt": "2024-11-12T12:00:00.000Z"
    }
  }
}
```

**Note:** The `regionId` was automatically updated when the city changed.

#### 3. User Gets Profile (includes address)

**Request:**

```bash
GET /users/me
Authorization: Bearer <user-jwt-token>
```

**Response:**

```json
{
  "message": "Success",
  "data": {
    "id": "673d1234567890abcdef1234",
    "firstName": "Ahmed",
    "lastName": "Mohammed",
    "email": "ahmed@example.com",
    "phoneNumber": "+966501234567",
    "isEmailVerified": true,
    "address": {
      "id": "673d45a89c1234567890abcd",
      "addressLine1": "100 King Abdullah Road",
      "addressLine2": "Villa 15",
      "postalCode": "23456",
      "countryId": "60f7b2f6a8b1c60012d4c8e1",
      "country": {
        "id": "60f7b2f6a8b1c60012d4c8e1",
        "name": { "en": "Saudi Arabia", "ar": "المملكة العربية السعودية" },
        "code": "SA"
      },
      "regionId": "60f7b2f6a8b1c60012d4c8e8",
      "region": {
        "id": "60f7b2f6a8b1c60012d4c8e8",
        "name": { "en": "Riyadh", "ar": "الرياض" }
      },
      "cityId": "60f7b2f6a8b1c60012d4c8e7",
      "city": {
        "id": "60f7b2f6a8b1c60012d4c8e7",
        "name": { "en": "Riyadh City", "ar": "مدينة الرياض" },
        "postalCode": "11564"
      }
    }
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow a standard format:

```json
{
  "statusCode": 404,
  "message": "Address not found",
  "timestamp": "2024-11-12T10:30:00.000Z",
  "path": "/addresses"
}
```

### Common Error Messages

#### English Messages

| Code                     | Message                                                      | Description                                    |
| ------------------------ | ------------------------------------------------------------ | ---------------------------------------------- |
| `address_not_found`      | Address not found                                            | User has no address or address doesn't exist   |
| `address_already_exists` | User already has an address. Please update the existing one. | User tried to create a second address          |
| `city_not_found`         | City not found                                               | Provided cityId is invalid or city is inactive |
| `user_not_found`         | User not found                                               | User doesn't exist or is deleted               |

#### Arabic Messages (i18n)

| Code                     | Message                                                | Description                         |
| ------------------------ | ------------------------------------------------------ | ----------------------------------- |
| `address_not_found`      | العنوان غير موجود                                      | User has no address                 |
| `address_already_exists` | لدى المستخدم عنوان بالفعل. يرجى تحديث العنوان الموجود. | User tried to create second address |
| `city_not_found`         | المدينة غير موجودة                                     | City not found or inactive          |
| `user_not_found`         | المستخدم غير موجود                                     | User not found                      |

### HTTP Status Codes

- `200 OK` - Successful GET/PATCH
- `201 Created` - Address created successfully
- `204 No Content` - Address deleted successfully
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Missing or invalid JWT token
- `404 Not Found` - Resource not found
- `409 Conflict` - User already has an address

---

## Database Indexes

The following indexes are automatically created for optimal query performance:

```javascript
// Soft delete index
{ deletedAt: 1 }, { partialFilterExpression: { deletedAt: null } }

// Unique user index (one address per user)
{ userId: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } }

// Location filter indexes
{ countryId: 1 }
{ regionId: 1 }
{ cityId: 1 }
```

### Index Benefits

- **Fast user address lookup**: O(1) lookup via userId index
- **Efficient location filtering**: Admin can filter by country/region/city
- **Unique constraint enforcement**: Prevents duplicate addresses per user
- **Soft delete optimization**: Excludes deleted records from unique constraint

---

## Integration with User Profile

The user profile API (`GET /users/me`) automatically includes the user's address with full population of Country, Region, and City details. This provides a complete view of the user's information in a single request.

**No additional API calls needed** - the address is seamlessly integrated into the user response.

---

## Best Practices

### For Frontend Developers

1. **City Selection First**: Always let users select City first. Country and Region will be handled automatically.

2. **Handle Null Addresses**: Check if address exists before displaying (user might not have created one yet).

3. **Update vs Create**: Check if user has an address before deciding to call POST or PATCH.

4. **Error Handling**: Always handle the `409 Conflict` error when creating addresses.

5. **Populated Data**: Leverage the populated Country/Region/City data in responses - no need for additional lookups.

### For Backend Developers

1. **ObjectId Storage**: All IDs are stored as MongoDB ObjectIds, not strings.

2. **Automatic Population**: Use `.populate()` to include related data in responses.

3. **Soft Delete**: Never hard delete addresses - always set `deletedAt` timestamp.

4. **Validation**: City validation automatically ensures valid location hierarchy.

5. **Indexes**: Rely on existing indexes for efficient queries.

---

## Changelog

### Version 1.0.0 (Current)

- Initial implementation of Address Management system
- One address per user constraint
- Automatic Country/Region extraction from City
- Soft delete support
- Full i18n support (English/Arabic)
- Admin monitoring endpoints
- Integration with User profile API

---

## Support

For API issues or questions, please contact the development team or refer to the main API documentation.

**Related Documentation:**

- [City Management](./CITIES.md)
- [Region Management](./REGIONS.md)
- [Country Management](./COUNTRIES.md)
- [User Management](./USERS.md)
