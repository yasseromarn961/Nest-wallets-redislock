# Localization and Internationalization (i18n)

## Overview

The application supports full internationalization (i18n) with Arabic and English languages. This includes:

- **Automatic Language Detection**: From headers, JWT tokens, or query parameters
- **Localized Error Messages**: All error messages are translated
- **Localized Content**: Database fields containing multilingual content (like country/city names) are automatically returned in the requested language

## Supported Languages

- **English** (en) - Default
- **Arabic** (ar)

## How Language is Determined

The system uses multiple resolvers to determine the user's preferred language, in this priority order:

1. **Accept-Language Header**: Standard HTTP header
2. **x-lang Header**: Custom header for explicit language selection
3. **JWT Token**: Language preference stored in user's JWT token
4. **Default**: Falls back to English (en)

### Examples

#### Using Accept-Language Header

```bash
GET /countries
Accept-Language: ar
```

#### Using x-lang Header

```bash
GET /cities
x-lang: ar
```

#### Using JWT Token

If the user's language preference is set in their profile, all requests will use that language automatically.

## Localized Database Fields

Certain database entities contain multilingual fields (e.g., country names, city names, region names). These fields are stored as objects with both `en` and `ar` properties:

```json
{
  "name": {
    "en": "Saudi Arabia",
    "ar": "المملكة العربية السعودية"
  }
}
```

### Automatic Localization Transform

The `LocalizationTransformInterceptor` automatically transforms these multilingual objects to return only the value for the requested language.

#### Request with English (default)

```bash
GET /countries/60f7b2f6a8b1c60012d4c8e1
```

**Response:**

```json
{
  "id": "60f7b2f6a8b1c60012d4c8e1",
  "name": "Saudi Arabia",
  "code": "SA",
  "dialCode": "+966",
  "isActive": true
}
```

#### Request with Arabic

```bash
GET /countries/60f7b2f6a8b1c60012d4c8e1
Accept-Language: ar
```

**Response:**

```json
{
  "id": "60f7b2f6a8b1c60012d4c8e1",
  "name": "المملكة العربية السعودية",
  "code": "SA",
  "dialCode": "+966",
  "isActive": true
}
```

## Entities with Localized Content

The following entities have multilingual `name` fields:

1. **Countries** (`/countries`)
   - `name.en`: English name
   - `name.ar`: Arabic name

2. **Regions** (`/regions`)
   - `name.en`: English name
   - `name.ar`: Arabic name

3. **Cities** (`/cities`)
   - `name.en`: English name
   - `name.ar`: Arabic name

4. **Addresses** (`/addresses`)
   - When populated, includes localized names for country, region, and city

## Error Messages

All error messages are also localized and returned in the requested language.

### English Error Example

```bash
GET /countries/invalid-id
Accept-Language: en
```

**Response:**

```json
{
  "statusCode": 404,
  "message": "Country not found",
  "timestamp": "2024-11-12T10:30:00.000Z",
  "path": "/countries/invalid-id"
}
```

### Arabic Error Example

```bash
GET /countries/invalid-id
Accept-Language: ar
```

**Response:**

```json
{
  "statusCode": 404,
  "message": "الدولة غير موجودة",
  "timestamp": "2024-11-12T10:30:00.000Z",
  "path": "/countries/invalid-id"
}
```

## Translation Files

Translation files are located in `src/i18n/`:

```
src/i18n/
├── ar/
│   └── common.json
└── en/
    └── common.json
```

### Common Translation Keys

#### Success Messages

- `messages.address_created_success`
- `messages.address_updated_success`
- `messages.address_deleted_success`
- `messages.user_registered_success`
- `messages.email_verified_success`
- `messages.password_reset_success`

#### Error Messages

- `errors.user_not_found`
- `errors.address_not_found`
- `errors.address_already_exists`
- `errors.country_not_found`
- `errors.region_not_found`
- `errors.city_not_found`
- `errors.invalid_credentials`
- `errors.email_not_verified`

## Nested Localization

When retrieving data with populated relationships (e.g., address with country, region, and city), all nested localized fields are automatically transformed.

### Example: Get User Profile with Address

**Request:**

```bash
GET /users/me
Accept-Language: ar
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "id": "673d1234567890abcdef1234",
  "firstName": "أحمد",
  "lastName": "محمد",
  "email": "ahmed@example.com",
  "address": {
    "id": "673d45a89c1234567890abcd",
    "addressLine1": "123 شارع الملك فهد",
    "addressLine2": "شقة 12",
    "postalCode": "12345",
    "countryId": {
      "id": "60f7b2f6a8b1c60012d4c8e1",
      "name": "المملكة العربية السعودية",
      "code": "SA"
    },
    "regionId": {
      "id": "60f7b2f6a8b1c60012d4c8e2",
      "name": "مكة المكرمة"
    },
    "cityId": {
      "id": "60f7b2f6a8b1c60012d4c8e3",
      "name": "جدة",
      "postalCode": "21442"
    }
  }
}
```

Notice how all `name` fields are automatically returned in Arabic, including nested objects.

## Implementation Details

### Interceptor Order

The `LocalizationTransformInterceptor` is registered before the `ResponseEnvelopeInterceptor` to ensure localization happens before the response is wrapped.

```typescript
// app.module.ts
providers: [
  {
    provide: APP_INTERCEPTOR,
    useClass: LoggingInterceptor,
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: LocalizationTransformInterceptor, // Applied second
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: ResponseEnvelopeInterceptor, // Applied third
  },
  // ...
];
```

### How It Works

1. **Request arrives** with language preference
2. **Controller processes** the request
3. **Service returns** data with multilingual objects
4. **LocalizationTransformInterceptor** transforms multilingual fields
5. **ResponseEnvelopeInterceptor** wraps the response
6. **Client receives** localized data

### Transformation Logic

```typescript
// Before transformation (from database)
{
  "name": {
    "en": "Saudi Arabia",
    "ar": "المملكة العربية السعودية"
  }
}

// After transformation (to client) - for ar language
{
  "name": "المملكة العربية السعودية"
}
```

## Best Practices

### For Frontend Developers

1. **Always send language preference**: Use `Accept-Language` or `x-lang` header
2. **Don't expect nested language objects**: The API returns the selected language directly
3. **Handle fallbacks**: If a language is not available, English is returned by default
4. **Consistent language**: Use the same language preference across all requests for consistency

### For Backend Developers

1. **Use i18n service**: Always use `i18n.t()` for translatable strings
2. **Store multilingual data properly**: Use the `LocalizedName` schema for all translatable fields
3. **Don't bypass the interceptor**: All responses go through the localization interceptor
4. **Add new translations**: Update both `ar/common.json` and `en/common.json` when adding new messages

## Testing Localization

### Test Arabic Response

```bash
curl -X GET http://localhost:3000/countries \
  -H "Accept-Language: ar"
```

### Test English Response

```bash
curl -X GET http://localhost:3000/countries \
  -H "Accept-Language: en"
```

### Test Default (No Header)

```bash
curl -X GET http://localhost:3000/countries
# Returns English by default
```

## Adding New Translations

To add a new translatable message:

1. **Add to English file** (`src/i18n/en/common.json`):

```json
{
  "messages": {
    "new_feature_success": "Feature created successfully"
  }
}
```

2. **Add to Arabic file** (`src/i18n/ar/common.json`):

```json
{
  "messages": {
    "new_feature_success": "تم إنشاء الميزة بنجاح"
  }
}
```

3. **Use in code**:

```typescript
return {
  data: result,
  message: this.i18n.t('common.messages.new_feature_success'),
};
```

## Summary

- ✅ Automatic language detection from multiple sources
- ✅ All database content with `name` fields is localized
- ✅ Error messages are fully translated
- ✅ Nested objects are recursively localized
- ✅ Fallback to English if translation is missing
- ✅ Works seamlessly with all endpoints
- ✅ No client-side transformation needed
