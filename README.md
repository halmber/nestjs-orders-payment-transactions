# Payment Transactions Service

A robust NestJS microservice for managing payment transactions in an order processing system. This service handles payment operations, transaction tracking, and provides comprehensive transaction analytics for orders.

## 🎯 Main Features

- **Payment Transaction Management** - Create and track payment transactions for orders
- **Multi-Currency Support** - Handle transactions in USD, EUR, UAH, and GBP
- **Transaction Types** - Support for PAYMENT and REFUND operations
- **Transaction Status Tracking** - Track transaction lifecycle (PENDING, COMPLETED, FAILED)
- **Multiple Payment Methods** - Support CARD, CASH, and PAYPAL payment methods
- **Order Validation** - Integrates with Orders Service to validate orders before transaction creation
- **Transaction Analytics** - Bulk transaction count aggregation for multiple orders
- **MongoDB Integration** - Persistent transaction storage with MongoDB
- **Comprehensive Testing** - Unit, integration, and E2E tests with Jest
- **API Documentation** - Auto-generated Swagger documentation
- **Docker Support** - Pre-configured Docker Compose for dev, test, and production environments

## 📋 Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker & Docker Compose (for running with containers)
- MongoDB (if running without Docker)

## 🚀 Quick Start

### Option 1: Local Development

1. **Clone the repository**

```bash
git clone <repository-url>
cd nestjs-orders-payment-transactions
```

2. **Install dependencies**

```bash
npm install
```

3. **Setup environment variables**
   Create a `.env` file in the root directory:

```
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/transactions
ORDERS_SERVICE_URL=http://localhost:8080
```

4. **Run the application**

```bash
# Development mode with watch
npm run start:dev

# Production mode
npm run start:prod
```

The application will start on `http://localhost:3000`

### Option 2: Docker Compose (recommended)

#### Development Environment

```bash
docker compose --profile dev up --build
```

Starts the app in watch mode with MongoDB. Access at `http://localhost:3000`

After development, clean up:

```bash
docker compose down -v
```

#### Test Environment (Run all tests)

```bash
docker compose --profile test up --build --abort-on-container-exit
```

Runs integration, E2E and Unit tests against a MongoDB instance.

#### Production Environment

```bash
docker compose --profile prod up --build
```

Or run in detached mode:

```bash
docker compose --profile prod up -d --build
```

## 📚 API Endpoints

### Base URL

```
http://localhost:3000/api/transactions
```

### 1. Create Payment Transaction

**POST** `/api/transactions`

Creates a new payment transaction for an order. Validates that the order exists in the main service.

**Request Body:**

```json
{
  "orderId": "e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc",
  "amount": 150.5,
  "currency": "UAH",
  "type": "PAYMENT",
  "status": "COMPLETED",
  "paymentMethod": "CARD",
  "transactionReference": "REF123456",
  "description": "Payment for order",
  "transactionTime": "2024-12-07T10:30:00Z",
  "processedBy": "user123",
  "metadata": {
    "cardLast4": "1234",
    "authCode": "ABC123"
  }
}
```

**Response:** `201 Created`

```json
{
  "id": "507f1f77bcf86cd799439011",
  "orderId": "e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc",
  "amount": 150.5,
  "currency": "UAH",
  "type": "PAYMENT",
  "status": "COMPLETED",
  "paymentMethod": "CARD",
  "transactionReference": "REF123456",
  "description": "Payment for order",
  "transactionTime": "2024-12-07T10:30:00Z",
  "processedBy": "user123",
  "metadata": {
    "cardLast4": "1234",
    "authCode": "ABC123"
  },
  "createdAt": "2024-12-07T10:30:00.000Z",
  "updatedAt": "2024-12-07T10:30:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid input data
- `404 Not Found` - Order not found in the main service

---

### 2. Get Transactions for an Order

**GET** `/api/transactions?orderId=<ORDER_ID>&size=10&from=0`

Returns list of transactions for a specific order, sorted by transaction time (most recent first). Supports pagination.

**Query Parameters:**

- `orderId` (required) - Order ID (UUID)
- `size` (optional) - Maximum number of items to return (default: 10)
- `from` (optional) - Starting index for pagination (default: 0)

**Example:**

```bash
curl "http://localhost:3000/api/transactions?orderId=e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc&size=10&from=0"
```

**Response:** `200 OK`

```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "orderId": "e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc",
    "amount": 150.5,
    "currency": "UAH",
    "type": "PAYMENT",
    "status": "COMPLETED",
    "paymentMethod": "CARD",
    "transactionTime": "2024-12-07T10:30:00Z",
    "createdAt": "2024-12-07T10:30:00.000Z",
    "updatedAt": "2024-12-07T10:30:00.000Z"
  }
]
```

**Error Responses:**

- `400 Bad Request` - Invalid query parameters

---

### 3. Get Transaction Counts for Multiple Orders

**POST** `/api/transactions/_counts`

Accepts an array of order IDs and returns the total count of transactions for each order. Uses efficient aggregation queries without loading actual transaction objects.

**Request Body:**

```json
{
  "orderIds": [
    "e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc",
    "e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dd"
  ]
}
```

**Response:** `200 OK`

```json
{
  "counts": {
    "e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc": 5,
    "e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dd": 3
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid input data

---

### 4. Health Check

**GET** `/`

Simple health check endpoint.

**Response:** `200 OK`

```json
{
  "message": "Hello World!"
}
```

---

## 📖 Enum Reference

### Transaction Type

- `PAYMENT` - Regular payment transaction
- `REFUND` - Refund transaction

### Transaction Status

- `PENDING` - Transaction is pending
- `COMPLETED` - Transaction completed successfully
- `FAILED` - Transaction failed

### Payment Method

- `CARD` - Credit/Debit card
- `CASH` - Cash payment
- `PAYPAL` - PayPal payment

### Currency

- `USD` - US Dollar
- `EUR` - Euro
- `UAH` - Ukrainian Hryvnia
- `GBP` - British Pound

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Unit Tests Only

```bash
npm run test:unit
```

### Run Integration Tests

```bash
npm run test:integration
```

### Run E2E Tests

```bash
npm run test:e2e
```

### Run Tests with Coverage

```bash
npm run test:cov
```

### Watch Mode

```bash
npm run test:watch
```

### Debug Tests

```bash
npm run test:debug
```

---

## 🏗️ Project Structure

```
src/
├── app.controller.ts          # Main app controller
├── app.service.ts             # Main app service
├── app.module.ts              # Main app module
├── main.ts                    # Application entry point
├── constants/                 # Application constants
├── orders/                    # Orders integration module
│   ├── orders-client.service.ts
│   └── orders.module.ts
├── transactions/              # Payment transactions module
│   ├── transactions.controller.ts
│   ├── transactions.controller.spec.ts # Unit tests
│   ├── transactions.service.ts
│   ├── transactions.service.spec.ts # Unit tests
│   ├── transactions.integration.spec.ts # Transactions integration tests
│   ├── transactions.module.ts
│   ├── dto/                   # Data Transfer Objects
│   │   ├── request/
│   │   │   ├── create-transaction.dto.ts
│   │   │   ├── get-transactions.dto.ts
│   │   │   └── transaction-counts-request.dto.ts
│   │   └── response/
│   │       ├── transaction-response.dto.ts
│   │       └── transaction-counts-response.dto.ts
│   └── schemas/               # MongoDB schemas
│       └── payment-transaction.schema.ts
└── seedData/                  # Database seed data
    ├── seed-data.module.ts
    └── seed-data.service.ts

test/
├── jest.config.ts
e2e/
│   ├── jest.config.ts           # E2E tests config
│   ├── transactions.e2e-spec.ts
│   └── app.e2e-spec.ts          # App E2E tests
integration/
│   └── jest.config.ts           # Integration tests config
unit/
└── jest.config.ts               # Unit tests config

```

---

## 🔗 Dependencies

### Core

- `@nestjs/core` - NestJS core framework
- `@nestjs/common` - NestJS common utilities
- `@nestjs/mongoose` - MongoDB integration
- `mongoose` - MongoDB ODM
- `class-validator` - Request validation
- `class-transformer` - DTO transformation

### Documentation & API

- `@nestjs/swagger` - Swagger/OpenAPI documentation
- `@nestjs/platform-express` - Express adapter

### Configuration

- `@nestjs/config` - Environment configuration
- `@nestjs/axios` - HTTP client for external services
- `axios` - HTTP requests

### Testing

- `jest` - Testing framework
- `@nestjs/testing` - NestJS testing utilities
- `supertest` - HTTP assertion library
- `ts-jest` - TypeScript support for Jest

---

## 🔧 Configuration

Create `.env` file in the root directory:

```env
# Environment
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/transactions

# External Services
ORDERS_SERVICE_URL=http://localhost:8080

# Server
PORT=3000
```

For testing, create `.env.test`:

```env
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/transactions-integration-test
ORDERS_SERVICE_URL=http://localhost:8080
```

---

## 📊 Database

The service uses MongoDB with the following collections:

### PaymentTransaction

Stores all payment and refund transactions with automatic timestamp tracking.

**Indexes:**

- `orderId` + `transactionTime` (descending) - For querying transactions by order
- `status` - For filtering by transaction status
- `type` - For filtering by transaction type
- `transactionTime` (descending) - For time-based queries

---

## 🐳 Docker Architecture

### Development Profile (`dev`)

- Live code reloading with watch mode
- Volume mount for local development
- Exposed MongoDB port for inspection

### Test Profile (`test`)

- Runs all tests (integration + E2E + Unit)
- Isolated MongoDB instance with in-memory storage
- Automatic exit after test completion
- Disabled MongoDB logging for cleaner output

### Production Profile (`prod`)

- Optimized build with only runtime dependencies
- Persistent MongoDB volume
- No unnecessary logging or debugging

---

## 🛠️ Development Workflow

1. **Start development environment:**

   ```bash
   docker compose --profile dev up --build
   ```

2. **Make code changes** - They will be hot-reloaded

3. **Test your changes:**

   ```bash
   npm run test:integration
   npm run test:e2e
   ```

4. **Clean up:**
   ```bash
   docker compose down -v
   ```

---

## 📖 API Documentation

Once the application is running, visit Swagger UI:

```
http://localhost:3000/api/docs
```

---

## 📄 License

MIT
