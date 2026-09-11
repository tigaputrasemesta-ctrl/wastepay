# Backend & API Mastery Guide

## 1. REST API Design Standards
- Use plural nouns for resources: `/api/v1/users`, `/api/v1/orders`.
- Use correct HTTP status codes:
  - `200 OK`: Successful read or update.
  - `201 Created`: Resource successfully created (include `Location` header or created object).
  - `204 No Content`: Successful deletion.
  - `400 Bad Request`: Malformed syntax or bad parameters.
  - `401 Unauthorized`: Missing or invalid authentication.
  - `403 Forbidden`: Authenticated user lacks permission.
  - `404 Not Found`: Resource does not exist.
  - `409 Conflict`: Duplicate entry or conflicting state.
  - `422 Unprocessable Entity`: Semantic validation failed.
  - `500 Internal Server Error`: Unhandled server-side fault.

## 2. Error Response Structure
Standardize error responses across all endpoints:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The submitted payload failed validation",
    "details": [
      { "field": "email", "issue": "Invalid email address format" }
    ]
  }
}
```
