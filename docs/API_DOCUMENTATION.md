# Nest RedisLock - NestJS Backend API

## Overview

This is a NestJS backend application with authentication and authorization for both Users and Admins, connected to MongoDB with JWT-based authentication.

## Features

- ✅ User Authentication & Authorization (JWT)
- ✅ Admin Authentication & Authorization (JWT)
- ✅ MongoDB Integration with Mongoose
- ✅ Email Verification
- ✅ Password Reset
- ✅ Two-Factor Authentication (2FA) support
- ✅ Refresh Token mechanism
- ✅ MailerSend Integration
- ✅ Validation with class-validator
- ✅ Environment-based configuration

## Tech Stack

- **Framework**: NestJS 11.x
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: class-validator, class-transformer
- **Email Service**: MailerSend

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
NODE_ENV=development
MONGO_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_ACCESS_TOKEN_EXPIRATION=3600
JWT_REFRESH_TOKEN_EXPIRATION=2592000
AUTH_SALT_ROUNDS=10
RESET_PASSWORD_EXPIRATION=300
EMAIL_VERIFICATION_EXPIRATION=1800
MAILERSEND_API_KEY=your_mailersend_api_key
MAILERSEND_SENDER_EMAIL=your_sender_email
MAILERSEND_SENDER_NAME=your_sender_name
FRONTEND_URL=http://localhost:3000
```

## Installation

```bash
npm install
```

## Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Endpoints

### User Authentication

#### Register User

```http
POST /users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

#### Logout

```http
POST /auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

#### Verify Email

```http
POST /auth/verify-email
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}
```

#### Forgot Password

```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password

```http
POST /auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newPassword123"
}
```

### User Management

#### Get Current User Profile

```http
GET /users/me
Authorization: Bearer <access_token>
```

#### Update Current User

```http
PATCH /users/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

#### Update Password

```http
PATCH /users/me/password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "oldPassword": "oldPassword123",
  "newPassword": "newPassword123"
}
```

#### Delete Account

```http
DELETE /users/me
Authorization: Bearer <access_token>
```

#### List Users (Admin/Protected)

```http
GET /users?page=0&limit=10
Authorization: Bearer <access_token>
```

#### Get User by ID

```http
GET /users/:id
Authorization: Bearer <access_token>
```

---

### Admin Authentication

#### Admin Login

```http
POST /admin/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "adminPassword123"
}

Response (if 2FA disabled):
{
  "admin": {...},
  "accessToken": {
    "token": "jwt_token",
    "expiresAt": "2025-01-01T00:00:00.000Z"
  },
  "refreshToken": {
    "token": "refresh_token",
    "expiresAt": "2025-01-30T00:00:00.000Z"
  }
}

Response (if 2FA enabled):
{
  "require2FA": true,
  "tempToken": {
    "token": "temp_jwt_token",
    "expiresAt": "2025-01-01T01:00:00.000Z"
  }
}
```

#### Verify 2FA

```http
POST /admin/auth/verify-2fa
Authorization: Bearer <temp_token>
Content-Type: application/json

{
  "code": "123456"
}
```

#### Admin Refresh Token

```http
POST /admin/auth/refresh
Content-Type: application/json

{
  "refreshToken": "admin_refresh_token"
}
```

#### Admin Logout

```http
POST /admin/auth/logout
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "refreshToken": "admin_refresh_token"
}
```

### Admin Management

#### Create Admin

```http
POST /admin/admins
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "email": "newadmin@example.com",
  "password": "adminPassword123",
  "firstName": "Admin",
  "lastName": "User"
}
```

#### List Admins

```http
GET /admin/admins?page=0&limit=10
Authorization: Bearer <admin_access_token>
```

#### Get Current Admin Profile

```http
GET /admin/admins/me
Authorization: Bearer <admin_access_token>
```

#### Get Admin by ID

```http
GET /admin/admins/:id
Authorization: Bearer <admin_access_token>
```

#### Update Current Admin

```http
PATCH /admin/admins/me
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "firstName": "Updated",
  "lastName": "Name"
}
```

#### Delete Admin

```http
DELETE /admin/admins/:id
Authorization: Bearer <admin_access_token>
```

## Project Structure

```
src/
├── common/
│   ├── enums/
│   │   ├── user.enum.ts
│   │   └── index.ts
│   └── services/
│       └── mail.service.ts
├── config/
│   └── (configuration files)
├── database/
│   └── database.module.ts
├── modules/
│   ├── auth/
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── strategies/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── users/
│   │   ├── dto/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   └── admin/
│       ├── dto/
│       ├── guards/
│       ├── strategies/
│       ├── admin.controller.ts
│       ├── admin-auth.controller.ts
│       ├── admin.service.ts
│       ├── admin-auth.service.ts
│       └── admin.module.ts
├── schemas/
│   ├── user.schema.ts
│   ├── user-refresh-token.schema.ts
│   ├── admin.schema.ts
│   └── admin-refresh-token.schema.ts
├── app.module.ts
└── main.ts
```

## Security Features

1. **Password Hashing**: Uses bcrypt with configurable salt rounds
2. **JWT Tokens**: Secure token-based authentication
3. **Refresh Tokens**: Stored in database with expiration tracking
4. **Token Revocation**: Ability to revoke refresh tokens
5. **2FA Support**: Two-factor authentication for enhanced security
6. **Email Verification**: Email verification workflow
7. **Password Reset**: Secure password reset with time-limited codes

## Notes

- All timestamps are managed automatically by Mongoose
- Soft delete is implemented for Users and Admins (deletedAt field)
- Token expiration is configurable via environment variables
- CORS is enabled by default
- Global validation pipe is enabled

## Development

```bash
# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Lint
npm run lint

# Format
npm run format
```

## License

UNLICENSED
