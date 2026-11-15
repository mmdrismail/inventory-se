# StockLine REST API Reference

The backend exposes a RESTful API listening on `http://localhost:5000/api`. All requests and responses use JSON format.

---

## 1. Authentication Endpoints

### `POST /api/auth/login`
Authenticate a user and return a signed JSON Web Token (JWT).
- **Request Body**:
  ```json
  {
    "email": "admin@stockline.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "673f1a2b...",
      "name": "Super Admin",
      "email": "admin@stockline.com",
      "role": "admin"
    }
  }
  ```

### `POST /api/auth/register`
Register a new system user (admin role required).
- **Headers**: `Authorization: Bearer <token>`
- **Response (201 Created)**

---

## 2. Product Management

### `GET /api/products`
Retrieve a paginated list of products with optional search and category filters.
- **Query Parameters**:
  - `page` (default: `1`)
  - `limit` (default: `20`)
  - `search` (optional keyword)
  - `category` (optional category filter)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 45,
    "data": [
      {
        "_id": "673f1b...",
        "name": "Industrial Ball Bearing 6205",
        "sku": "BRG-6205-IND",
        "category": "Bearings",
        "price": 450,
        "costPrice": 280,
        "stock": 120,
        "reorderLevel": 30
      }
    ]
  }
  ```

### `POST /api/products`
Create a new product catalog item.
- **Request Body**: `name`, `sku`, `category`, `price`, `costPrice`, `stock`, `reorderLevel`

### `PUT /api/products/:id`
Update an existing product by MongoDB ObjectId.

### `DELETE /api/products/:id`
Soft-delete or purge a product record.

---

## 3. Inventory & Lot Management

### `GET /api/lots`
Fetch active warehouse lots, expiration timestamps, and scrap devaluation statuses.

### `POST /api/lots`
Create a new production or import lot with batch tracking.

### `POST /api/lots/:id/bid`
Submit an auction scrap bid for a devalued or near-expiry inventory lot.

---

## 4. Orders & Invoicing

### `GET /api/orders`
Retrieve customer sales orders and order fulfillment statuses (`Pending`, `Processing`, `Delivered`, `Cancelled`).

### `POST /api/orders`
Submit a new sales order with automated stock deduction and invoice generation.

---

## 5. System Health & Analytics

### `GET /api/health`
Return runtime diagnostics and database connectivity state.
- **Response (200 OK)**:
  ```json
  {
    "status": "healthy",
    "uptime": 14205,
    "timestamp": "2026-11-21T12:00:00.000Z",
    "database": "connected"
  }
  ```
