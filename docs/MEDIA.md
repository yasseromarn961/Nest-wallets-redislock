# Media Module

## Overview

The Media module provides file uploads with full integration to AWS S3 and supports:
- Direct backend upload (Backend Direct Upload)
- Direct upload from the client to S3 via Presigned URLs (two modes: POST or PUT)

All non-204 responses are automatically wrapped in the shape: `{ message: string, data: any }` by the ResponseEnvelopeInterceptor, unless `SkipEnvelope` is used.

## Authentication

- User routes: protected by JwtAuthGuard and require a Bearer user-access-token
- Admin routes: protected by AdminJwtAuthGuard and require a Bearer admin-access-token

## Upload Methods

### 1) Backend Direct Upload

Routes: `POST /media/upload/direct` (User) | `POST /admin/media/upload/direct` (Admin)

Mechanism:
1. The client sends the file as multipart/form-data
2. The backend receives the file and uploads it to S3 using the AWS SDK
3. A media record is saved in the database

Example request (User):
```bash
curl -X POST http://localhost:3000/media/upload/direct \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -F "file=@/path/to/file.jpg" \
  -F "type=image" \
  -F 'metadata={"description":"Profile picture"}'
```

Response (201 - enveloped):
```json
{
  "message": "Success",
  "data": {
    "id": "673e0c4e1f0a1f001234abcd",
    "url": "https://your-bucket.s3.us-east-1.amazonaws.com/media/user/2025/11/1731500000-xyz123.jpg",
    "key": "media/user/2025/11/1731500000-xyz123.jpg",
    "originalName": "file.jpg",
    "mimeType": "image/jpeg",
    "size": 102400,
    "type": "image",
    "uploaderId": "673d1234567890abcdef1234",
    "uploaderType": "user",
    "metadata": { "description": "Profile picture" },
    "deletedAt": null,
    "createdAt": "2025-11-13T11:00:00.000Z",
    "updatedAt": "2025-11-13T11:00:00.000Z"
  }
}
```

Notes:
- The `metadata` field is optional and can be stored in S3 as custom metadata under the key `x-amz-meta-*` (implementation-dependent).

### 2) Direct Upload to S3 via Presigned URL

User routes:
- `POST /media/upload/presigned-url` to create the presigned URL
- `POST /media/upload/confirm` to confirm the upload and persist the record in the database

Admin routes:
- `POST /admin/media/upload/presigned-url`
- `POST /admin/media/upload/confirm`

New query parameter for presigned-url:
- Query: `type` can be `post` or `put` (default: `post`).

Request body to create the URL (GeneratePresignedUrlDto):
```json
{
  "fileName": "profile.jpg",
  "mimeType": "image/jpeg",
  "type": "image",
  "metadata": { "description": "User profile picture" }
}
```

Response shapes:

1) When `type=post` (Presigned POST):
Enveloped response with fields required for building FormData:
```json
{
  "message": "Success",
  "data": {
    "url": "https://your-bucket.s3.amazonaws.com",
    "fields": {
      "bucket": "your-bucket",
      "key": "media/user/2025/11/1731500000-xyz123.jpg",
      "Content-Type": "image/jpeg",
      "x-amz-meta-uploaderId": "673d1234567890abcdef1234",
      "x-amz-meta-uploaderType": "user",
      "x-amz-meta-originalName": "profile.jpg",
      "Policy": "...",
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": "...",
      "X-Amz-Date": "...",
      "X-Amz-Signature": "..."
    }
  }
}
```

Example upload using FormData:
```js
const { url, fields } = presignedPostResponse.data;
const form = new FormData();
Object.entries(fields).forEach(([k, v]) => form.append(k, v));
form.append('file', fileBlob);
await fetch(url, { method: 'POST', body: form });
```

2) When `type=put` (Presigned PUT):
Enveloped response with a direct upload URL:
```json
{
  "message": "Success",
  "data": {
    "url": "https://your-bucket.s3.us-east-1.amazonaws.com/media/user/2025/11/1731500000-xyz123.jpg?X-Amz-Algorithm=...",
    "key": "media/user/2025/11/1731500000-xyz123.jpg",
    "expiresIn": 3600
  }
}
```

Example upload using PUT:
```js
await fetch(presignedPutResponse.data.url, {
  method: 'PUT',
  headers: { 'Content-Type': 'image/jpeg' },
  body: fileBlob,
});
```

Confirm upload:

Request:
```bash
curl -X POST http://localhost:3000/media/upload/confirm \
  -H "Authorization: Bearer <USER_OR_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "media/user/2025/11/1731500000-xyz123.jpg",
    "originalName": "profile.jpg",
    "mimeType": "image/jpeg",
    "size": 102400,
    "type": "image",
    "metadata": { "description": "User profile picture" }
  }'
```

Response (201 - enveloped, includes the persisted media record):
```json
{
  "message": "Success",
  "data": {
    "id": "673e0c4e1f0a1f001234abcd",
    "url": "https://your-bucket.s3.us-east-1.amazonaws.com/media/user/2025/11/1731500000-xyz123.jpg",
    "key": "media/user/2025/11/1731500000-xyz123.jpg",
    "originalName": "profile.jpg",
    "mimeType": "image/jpeg",
    "size": 102400,
    "type": "image",
    "uploaderId": "673d1234567890abcdef1234",
    "uploaderType": "user",
    "metadata": { "description": "User profile picture" },
    "deletedAt": null,
    "createdAt": "2025-11-13T11:05:00.000Z",
    "updatedAt": "2025-11-13T11:05:00.000Z"
  }
}
```

Note: The existence of the file in S3 is verified before creating the record; if the file does not exist, a 400 error is returned.

## Query & Management

### Media list

- User: `GET /media` returns only the user's media
- Admin: `GET /admin/media` returns all media with optional filters

Query parameters:
- `page` page number (0-indexed)
- `limit` number of items per page (1-100)
- `type` media type
- `uploaderType` uploader type (user/admin)
- `uploaderId` uploader identifier

Response shape (User) — note the MediaService returns a simple format, only wrapped by the envelope:
```json
{
  "message": "Success",
  "data": {
    "data": [
      {
        "id": "673e0c4e1f0a1f001234abcd",
        "url": "https://...",
        "key": "media/user/2025/11/1731500000-xyz123.jpg",
        "originalName": "profile.jpg",
        "mimeType": "image/jpeg",
        "size": 102400,
        "type": "image",
        "uploaderId": "673d1234567890abcdef1234",
        "uploaderType": "user",
        "metadata": { "description": "..." },
        "deletedAt": null,
        "createdAt": "2025-11-13T11:05:00.000Z",
        "updatedAt": "2025-11-13T11:05:00.000Z"
      }
    ],
    "total": 1,
    "page": 0,
    "limit": 10
  }
}
```

Admin responses follow the same wrapping pattern, with flexible filters as needed.

### Get a single media item

`GET /media/:id` or `GET /admin/media/:id`

Response (200 - enveloped):
```json
{
  "message": "Success",
  "data": {
    "id": "673e0c4e1f0a1f001234abcd",
    "url": "https://...",
    "key": "media/user/2025/11/1731500000-xyz123.jpg",
    "originalName": "profile.jpg",
    "mimeType": "image/jpeg",
    "size": 102400,
    "type": "image",
    "uploaderId": "673d1234567890abcdef1234",
    "uploaderType": "user",
    "metadata": null,
    "deletedAt": null,
    "createdAt": "2025-11-13T11:05:00.000Z",
    "updatedAt": "2025-11-13T11:05:00.000Z"
  }
}
```

### Deletion

- User: `DELETE /media/:id` — soft delete
- Admin: `DELETE /admin/media/:id` — soft delete
- Admin: `DELETE /admin/media/:id/permanent` — permanent deletion from DB and S3

Soft delete success (200):
```json
{
  "message": "Media deleted successfully",
  "data": null
}
```

Permanent delete success (200):
```json
{
  "message": "Media permanently deleted successfully",
  "data": null
}
```

## Database Model (Media)

```typescript
{
  id: string;              // Derived from _id
  url: string;             // File URL in S3
  key: string;             // S3 object key (unique)
  originalName: string;    // Original filename
  mimeType: string;        // MIME type
  size: number;            // Size in bytes
  type: 'image'|'video'|'document'|'other';
  uploaderId: string;      // Uploader ID (User/Admin)
  uploaderType: 'user'|'admin';
  metadata?: Record<string, unknown>;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

## S3 File Organization

Files are organized as follows:
- Uploader type (user/admin)
- Year/Month
- Randomly generated filename

Example: `media/user/2025/11/1731500000-xyz123.jpg`

## Configuration

Values are read only from `src/config/configuration.ts`. The variables used in MediaService:
- `aws.accessKeyId`
- `aws.secretAccessKey`
- `aws.region` (fallback when `s3.region` is missing)
- `s3.region`
- `s3.bucketName` (and `aws.mediaFilesS3Bucket` may be used as a fallback if present)

Relevant environment variables:
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
MEDIA_FILES_S3_BUCKET=your-media-bucket
S3_BUCKET_NAME=your-media-bucket
S3_REGION=us-east-1
```

## i18n Messages

Examples of error/success message keys:
- `common.errors.file_required`
- `common.errors.invalid_media_type`
- `common.errors.file_not_found`
- `common.errors.upload_failed`
- `common.messages.media_deleted_success`
- `common.messages.media_permanently_deleted_success`
- Default success message key: `common.messages.success`

## Swagger

Full documentation is available via Swagger at `/docs`.

Tag: 9- Media Management