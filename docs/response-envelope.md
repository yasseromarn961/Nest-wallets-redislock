# Response Envelope Interceptor

Standardizes successful HTTP responses across the API to a unified envelope shape and integrates internationalized messages via `nestjs-i18n`.

Envelope shape:

```
{
  "message": string, // translated via i18n
  "data": any | null // the actual payload
}
```

This interceptor applies globally and only affects successful responses. Error responses (exceptions) are NOT wrapped and already use i18n-aware messages throughout the codebase.

---

## Files & Locations

- Interceptor: `src/common/interceptors/response-envelope.interceptor.ts`
- Success message decorator: `src/common/decorators/success-message.decorator.ts`
- Opt-out decorator: `src/common/decorators/skip-envelope.decorator.ts`
- Global registration: `src/app.module.ts` (via `APP_INTERCEPTOR`)
- i18n success key:
  - English: `src/i18n/en/common.json` → `common.messages.success`
  - Arabic: `src/i18n/ar/common.json` → `common.messages.success`

---

## Default Behavior

When a controller method returns a value, the interceptor transforms it as follows:

1. Already in envelope: If the value is an object containing both `message` and `data` properties, it is returned unchanged.
2. Object with `message`: If the value is an object with a `message` string property, that message is used and the rest of the properties are wrapped into `data`. If there are no other properties, `data` will be `null`.
3. Any other value (array, primitive, object without `message`): It is wrapped into `{ message: i18n.t('common.messages.success'), data: <value> }`.
4. `null` or `undefined`: Returns `{ message: i18n.t('common.messages.success'), data: null }`.
5. 204 No Content: Should be opt-out using `@SkipEnvelope()` to ensure an empty response body.

Language resolution follows your i18n configuration (Accept-Language header, `x-lang` header, and JWT language resolver). The interceptor reads the current language via `I18nContext.current()?.lang` and uses `I18nService` to translate the message.

---

## Customizing Success Messages (Per Route)

Use the `@SuccessMessage()` decorator to assign a specific i18n translation key for a route:

```ts
import { SuccessMessage } from '../../common/decorators/success-message.decorator';

@Get('countries')
@SuccessMessage('common.messages.countries_list')
async listCountries() {
  return this.countriesService.findAll();
}
```

The interceptor will translate the provided key using the current locale and set it as the `message` in the envelope.

You can also apply `@SuccessMessage()` at the controller class level to affect all routes in that controller (method-level decorators still override class-level ones).

---

## Opting Out (Per Route or Class)

Use the `@SkipEnvelope()` decorator to bypass the envelope wrapping:

```ts
import { SkipEnvelope } from '../../common/decorators/skip-envelope.decorator';
import { HttpCode, HttpStatus } from '@nestjs/common';

@Patch('me/password')
@HttpCode(HttpStatus.NO_CONTENT)
@SkipEnvelope() // important for 204
async updatePassword(...) {
  await this.usersService.updatePassword(...);
}
```

Apply `@SkipEnvelope()` at the controller class level if you want all routes in that controller to bypass the envelope (method-level decorators still override class-level ones).

---

## Examples

### 1) Array payload with a custom success message

```ts
// users of CountriesController for example
@Get()
@SuccessMessage('common.messages.countries_list')
async list() {
  return this.countriesService.findAll(); // returns Country[]
}
```

Response (English):

```json
{
  "message": "Countries list retrieved successfully",
  "data": [ /* array of countries */ ]
}
```

If the request sets `Accept-Language: ar`, the message will be localized automatically:

```json
{
  "message": "تم جلب قائمة الدول بنجاح",
  "data": [ /* array of countries */ ]
}
```

### 2) Service returns an object with `message`

```ts
@Post('register')
async register(@Body() dto: CreateUserDto, @Request() req) {
  const browserInfo = extractBrowserInfoFromRequest(req);
  return this.usersService.create(dto, req.ip, browserInfo);
  // service returns: { message: i18n.t('common.messages.user_registered_success'), user: { ... } }
}
```

Interceptor behavior:

```json
{
  "message": "User registered successfully. Please check your email for verification code.",
  "data": { "user": { /* created user */ } }
}
```

### 3) 204 No Content

```ts
@Delete('me')
@HttpCode(HttpStatus.NO_CONTENT)
@SkipEnvelope()
async remove(@Request() req) {
  await this.usersService.remove(req.user.id);
}
```

Response:

```
HTTP/1.1 204 No Content
```

No envelope body is sent.

### 4) Default message without decorator

```ts
@Get('me')
async getProfile(@Request() req) {
  return this.usersService.findOne(req.user.id); // returns a user object
}
```

Response (English):

```json
{
  "message": "Operation completed successfully",
  "data": { /* user object */ }
}
```

---

## Swagger (OpenAPI) Integration (Optional)

To reflect the envelope shape in your API docs, define a DTO and use it in your Swagger decorators:

```ts
// Example DTO
class ResponseEnvelopeDto<T> {
  message!: string;
  data!: T | null;
}

// Usage
@ApiOkResponse({ description: 'Profile retrieved successfully' /*, type: ResponseEnvelopeDto */ })
```

You may also use `@ApiExtraModels` and generics handling strategies to document the inner `data` model while indicating the envelope shape.

---

## Testing Tips

- Unit tests can assert the response shape `{ message, data }`.
- Ensure endpoints that should be empty (204) use `@SkipEnvelope()`.
- Verify localization by setting `Accept-Language` or `x-lang` headers and checking that `message` changes accordingly.

---

## Edge Cases & Guidance

- Raw streams, file downloads, or manual responses using `@Res()` should typically opt-out with `@SkipEnvelope()`.
- The interceptor does not wrap thrown exceptions; error handling and i18n messaging occur in your services/strategies.
- If a controller returns `{ message: string }` only, the interceptor will set `data` to `null`.
- Class-level decorators (`@SuccessMessage`, `@SkipEnvelope`) affect all methods in a controller; method-level decorators override class-level settings.

---

## Internationalization Keys

- Default success key: `common.messages.success`
- Common per-route keys (examples already in the project):
  - `common.messages.countries_list`
  - `common.messages.user_registered_success`

Add or adjust keys in:

- English: `src/i18n/en/common.json`
- Arabic: `src/i18n/ar/common.json`

---

## Summary

- Global interceptor ensures consistent envelopes for successful responses.
- `@SuccessMessage(key)` customizes the per-route i18n success message.
- `@SkipEnvelope()` opts out (recommended for 204 No Content, file downloads, or custom responses).
- Error handling remains unchanged and already uses i18n.