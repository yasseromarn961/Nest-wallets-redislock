#  Auto-Invest Backend

A robust NestJS-based backend application for the  trading platform, providing comprehensive API services for user management, location services, and address management.

## Description

This is a production-ready backend built with [NestJS](https://github.com/nestjs/nest) framework using TypeScript, MongoDB, and modern backend development practices.

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Logging**: Winston
- **Internationalization**: i18n (Arabic/English)
- **API Documentation**: Swagger/OpenAPI
- **Validation**: class-validator, class-transformer

## Key Features

- 🔐 **Authentication & Authorization**: JWT-based authentication with separate user and admin guards
- 🌍 **Multi-language Support**: Full i18n support for Arabic and English
- 📍 **Location Management**: Hierarchical location system (Country → Region → City)
- 🏠 **Address Management**: Smart address system with automatic location hierarchy
- 👥 **User Management**: Complete user lifecycle management
- 📧 **Email Service**: Automated email notifications
- 📝 **Logging**: Structured logging with Winston
- 🔍 **Soft Delete**: Data preservation with soft delete functionality
- 📄 **Pagination**: Built-in pagination for all list endpoints
- 🛡️ **Security**: Request validation, error handling, and security best practices

## Project Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB instance

### Installation

```bash
npm install
```

### Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# Admin JWT
ADMIN_JWT_SECRET=your-admin-secret
ADMIN_JWT_EXPIRES_IN=8h

# Email Configuration
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=your-email@example.com
MAIL_PASSWORD=your-password
MAIL_FROM=noreply@example.com

# Other
SALT_ROUNDS=10
EMAIL_VERIFICATION_EXPIRATION=1800
```

## Running the Application

### Development Mode

```bash
# Start in watch mode
npm run start:dev

# Start in debug mode
npm run start:debug
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

### Standard Mode

```bash
npm run start
```

## Using Make (Optional)

Alternative commands using GNU Make:

```bash
# Install dependencies
make install

# Build/compile the project
make compile

# Development
make start      # Standard start
make dev        # Watch mode
make debug      # Debug mode

# Production
make prod

# Tests
make test
make test-e2e
make test-cov
make test-watch
make test-debug

# Linting and formatting
make lint
make format

# Clean build output
make clean
```

**Note**: On Windows, install Make via:

- Chocolatey: `choco install make`
- Scoop: `scoop install make`
- Or use Git Bash with GNU Make

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## API Documentation

Once the application is running, access the Swagger documentation at:

```
http://localhost:3000/api
```

The API documentation includes:

- All available endpoints
- Request/response schemas
- Authentication requirements
- Examples for each endpoint

## Project Structure

```
src/
├── common/              # Shared modules, utilities, decorators
│   ├── decorators/      # Custom decorators
│   ├── dto/             # Common DTOs
│   ├── enums/           # Enums
│   ├── filters/         # Exception filters
│   ├── interceptors/    # Interceptors
│   ├── middleware/      # Middleware
│   ├── services/        # Common services
│   └── utils/           # Utility functions
├── config/              # Configuration files
├── database/            # Database module
├── i18n/                # Internationalization
│   ├── ar/              # Arabic translations
│   └── en/              # English translations
├── modules/             # Feature modules
│   ├── admin/           # Admin authentication and management
│   ├── address/         # Address management
│   ├── auth/            # User authentication
│   ├── city/            # City management
│   ├── country/         # Country management
│   ├── region/          # Region management
│   ├── users/           # User management
│   └── winston_logger/  # Logging module
├── app.module.ts        # Root module
└── main.ts              # Application entry point
```

## Core Modules

### Authentication

- User registration and login
- Email verification
- Password reset
- JWT token management
- Refresh tokens

### Location Services

- **Countries**: Manage countries with localized names
- **Regions**: Regions linked to countries
- **Cities**: Cities with postal codes, linked to regions and countries

### Address Management

- One address per user
- Automatic country/region extraction from city
- Full location hierarchy validation
- Soft delete support

### Admin Panel

- Separate admin authentication
- User monitoring and management
- Location data management
- Logs viewing

## Available Scripts

| Command               | Description                     |
| --------------------- | ------------------------------- |
| `npm run build`       | Build the application           |
| `npm run start`       | Start the application           |
| `npm run start:dev`   | Start in development/watch mode |
| `npm run start:debug` | Start in debug mode             |
| `npm run start:prod`  | Start in production mode        |
| `npm run lint`        | Run ESLint                      |
| `npm run format`      | Format code with Prettier       |
| `npm run test`        | Run unit tests                  |
| `npm run test:e2e`    | Run end-to-end tests            |
| `npm run test:cov`    | Run tests with coverage         |

## Documentation

Additional documentation is available in the `docs/` directory:

- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Address Management](./docs/ADDRESS_MANAGEMENT.md)
- [Pagination Guide](./docs/PAGINATION.md)
- [Response Envelope](./docs/response-envelope.md)

## Best Practices

- All business logic resides in services, not controllers
- DTOs for request validation
- Proper error handling with i18n messages
- Soft delete for data preservation
- Pagination for list endpoints
- Request logging with Winston
- Type safety throughout the application

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Request validation
- Rate limiting ready
- CORS configuration
- Error sanitization
- SQL injection prevention (MongoDB)

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Ensure all tests pass
5. Submit a pull request

## Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Run all checks
npm run lint && npm run test && npm run build
```

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**

- Ensure MongoDB is running
- Check MONGODB_URI in `.env`
- Verify network connectivity

**Port Already in Use**

- Change PORT in `.env`
- Kill process using the port

**Build Errors**

- Clear `dist/` folder
- Run `npm install` again
- Check TypeScript version compatibility

## Performance Tips

- Use indexes for frequently queried fields
- Implement caching for static data
- Use pagination for large datasets
- Optimize MongoDB queries
- Enable compression

## License

This project is licensed under the MIT License.

## Support

For issues and questions:

- Check the documentation in `docs/`
- Review API documentation at `/api`
- Contact the development team
