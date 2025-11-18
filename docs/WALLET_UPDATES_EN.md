# Wallet System Updates - English Documentation

## Table of Contents

1. [Overview](#overview)
2. [Database Schema Changes](#database-schema-changes)
3. [Core Features](#core-features)
4. [API Endpoints](#api-endpoints)
5. [Service Methods](#service-methods)
6. [Error Handling](#error-handling)
7. [Security & Data Integrity](#security--data-integrity)
8. [Usage Examples](#usage-examples)

---

## Overview

This document describes comprehensive updates to the wallet management system, integrating PayTabs payment gateway for deposits with enhanced transaction tracking and reporting capabilities.

### Key Objectives

- **PayTabs Integration**: Exclusive payment gateway for user deposits
- **Enhanced Tracking**: Detailed transaction history with balance snapshots
- **Fee Management**: Platform fees (2.9%) and tax (5%) on deposits
- **Audit Trail**: Complete double-entry bookkeeping for all transactions
- **Reporting**: Transaction reports across wallets with date range filtering

---

## Database Schema Changes

### 1. JournalEntry Schema Update

**File**: `src/modules/wallet/schemas/journal-entry.schema.ts`

#### Before

```typescript
transactionId: { type: String, required: false, default: null }
```

#### After

```typescript
transactionIds: {
  type: [String],
  required: true,
  default: [],
  index: true,
}
```

**Rationale**: Support linking multiple transaction records to a single journal entry (e.g., deposit + fees + tax).

---

### 2. Transaction Schema (NEW)

**File**: `src/modules/wallet/schemas/transaction.schema.ts`

Complete transaction log with balance tracking:

```typescript
{
  accountId: ObjectId,        // Wallet account
  assetSymbol: String,        // Currency (USD, SAR, etc.)
  type: 'DEPOSIT' | 'WITHDRAWAL',
  amount: Number,
  balanceBefore: Number,      // Balance snapshot before transaction
  balanceAfter: Number,       // Balance snapshot after transaction
  title: {
    en: String,              // English title
    ar: String               // Arabic title
  },
  journalEntryId: ObjectId    // Reference to journal entry
}
```

**Indexes**:

- `(accountId, assetSymbol, createdAt)`: Fast queries for transaction history
- `journalEntryId`: Link to accounting records

---

### 3. WalletDepositOrder Schema (NEW)

**File**: `src/modules/wallet/schemas/wallet-deposit-order.schema.ts`

Stores deposit metadata - initial order creation saves minimal info, webhook updates with complete PayTabs payment data:

```typescript
{
  // Initial order data (saved when creating deposit)
  orderId: String,            // Unique order ID (unique)
  walletAccountId: ObjectId,  // Target wallet
  userId: ObjectId,           // Depositing user
  baseAmount: Number,         // User's deposit amount (excluding fees/tax)
  feesAmount: Number,         // Platform fees (calculated from currency settings)
  taxAmount: Number,          // Tax (calculated from currency settings)
  assetSymbol: String,        // Currency symbol
  processed: Boolean,         // Processing status flag
  
  // PayTabs webhook data (populated when payment completes)
  tranRef: String,            // PayTabs transaction reference
  amount: Number,             // Total amount charged (base + fees + tax)
  currency: String,           // Payment currency
  paymentStatus: String,      // Payment result status
  transactionId: String,      // Transaction identifier
  code: String,               // Response code
  cardScheme: String,         // Card network (Visa, MasterCard, etc.)
  cardType: String,           // Card type (Credit, Debit)
  expiryMonth: Number,        // Card expiry month
  expiryYear: Number,         // Card expiry year
  merchantId: Number,         // PayTabs merchant ID
  serviceId: Number,          // Service identifier
  trace: String,              // Transaction trace
  transactionTime: Date,      // Payment completion time
  paymentChannel: String,     // Payment channel used
  paymentMethod: String,      // Payment method (e.g., MasterCard)
  paymentDescription: String, // Payment description
  responseMessage: String,    // Response message
  responseStatus: String,     // Response status
  profileId: Number           // PayTabs profile ID
}
```

**Purpose**:

- Store initial deposit request before PayTabs redirect
- Capture complete payment information from webhook
- Enable idempotent webhook processing
- Preserve all PayTabs transaction data for auditing

---

## Core Features

### 1. Deposit via PayTabs

**Workflow**:

1. User initiates deposit request with currency and amount
2. System calculates fees and tax from currency configuration
3. Creates `WalletDepositOrder` with minimal info (orderId, walletAccountId, userId, amounts, assetSymbol)
4. Generates PayTabs payment page
5. User completes payment on PayTabs
6. Webhook receives payment confirmation
7. System updates `WalletDepositOrder` with all PayTabs data
8. System processes direct deposit with 3 separate journal entries (one per operation)

**Fee Calculation**:

Fees and taxes are **configurable per currency** and support three types:
- **Percentage**: e.g., 2.9% of amount
- **Fixed**: e.g., $5 flat fee
- **Hybrid**: Percentage + Fixed, e.g., 2.9% + $0.30

Example with percentage fees:

```
Deposit: $100
Fees: $2.90 (2.9%)
Tax: $5.00 (5%)
Total: $107.90
```

---

### 2. Journal Entry Creation

Each deposit creates **3 independent journal entries** (direct deposits from external payment gateway):

#### Entry 1: User Deposit (Direct)

```
DR: None (external deposit)
CR: User Wallet
Amount: baseAmount
Transactions: 1 (direct deposit to user wallet)
```

#### Entry 2: Platform Fees (Direct)

```
DR: None (external deposit)
CR: PLATFORM_FEES (system account)
Amount: feesAmount
Transactions: 1 (direct deposit to fees account)
```

#### Entry 3: Tax Collection (Direct)

```
DR: None (external deposit)
CR: PLATFORM_TAX (system account)
Amount: taxAmount
Transactions: 1 (direct deposit to tax account)
```

**Note**: These are **direct deposits** from PayTabs, not internal transfers. No debit account is involved since funds come from external payment gateway.

**Net Effect**:

- User receives: baseAmount
- Platform collects: feesAmount + taxAmount
- All entries auditable and reconcilable

---

### 3. Transaction History

Users can query transaction history with:

- **Wallet-specific**: View transactions for one wallet
- **Cross-wallet reports**: View all transactions across wallets
- **Asset filtering**: Filter by currency (USD, SAR, etc.)
- **Date range**: Filter by start/end dates
- **Pagination**: Limit and offset for large datasets

---

## API Endpoints

### 1. Deposit via PayTabs

```
POST /wallets/deposit?walletSubtype=MAIN
Authorization: Bearer {user-token}
```

**Query Parameters**:

- `walletSubtype` (required): Wallet type - `MAIN` or `TRADING`

**Request Body**:

```json
{
  "amount": 100,
  "currencyId": "64f1e2d3c4b5a6789fedcba0",
  "returnUrl": "https://yourapp.com/payment/callback",
  "customerDetails": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "966500000000",
    "lang": "en"
  }
}
```

**Response**:

```json
{
  "success": true,
  "message": "Payment page created successfully",
  "data": {
    "paymentUrl": "https://secure.paytabs.sa/payment/page/xyz...",
    "tranRef": "TST2234500012345",
    "amount": 107.9,
    "currency": "USD"
  }
}
```

**Process**:

1. Finds user's wallet by type (MAIN or TRADING)
2. Validates wallet ownership
3. Checks currency supports PayTabs
4. Calculates fees and tax
5. Creates deposit order
6. Returns PayTabs payment URL

---

### 2. Get Transaction History

```
GET /wallets/:accountId/transactions
Authorization: Bearer {user-token}
```

**Query Parameters**:

- `assetSymbol` (optional): Filter by currency
- `limit` (default: 50): Number of results
- `offset` (default: 0): Pagination offset

**Response**:

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "_id": "64a1b2c3d4e5f6789abcdef1",
        "type": "DEPOSIT",
        "amount": 100,
        "assetSymbol": "USD",
        "balanceBefore": 50,
        "balanceAfter": 150,
        "title": {
          "en": "Deposit",
          "ar": "إيداع"
        },
        "createdAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "_id": "64a1b2c3d4e5f6789abcdef2",
        "type": "WITHDRAWAL",
        "amount": 2.9,
        "assetSymbol": "USD",
        "balanceBefore": 150,
        "balanceAfter": 147.1,
        "title": {
          "en": "Platform Fee",
          "ar": "رسوم المنصة"
        },
        "createdAt": "2024-01-15T10:30:01.000Z"
      }
    ],
    "total": 15,
    "limit": 50,
    "offset": 0
  }
}
```

---

### 3. Get Transactions Report

```
GET /wallets/my/transactions/report
Authorization: Bearer {user-token}
```

**Query Parameters**:

- `assetSymbol` (optional): Filter by currency
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date
- `limit` (default: 100): Number of results
- `offset` (default: 0): Pagination offset

**Response**:

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "_id": "64a1b2c3d4e5f6789abcdef1",
        "accountId": "64a1b2c3d4e5f6789abcdef0",
        "type": "DEPOSIT",
        "amount": 100,
        "assetSymbol": "USD",
        "balanceBefore": 50,
        "balanceAfter": 150,
        "title": {
          "en": "Deposit",
          "ar": "إيداع"
        },
        "createdAt": "2024-01-15T10:30:00.000Z",
        "journalEntryId": "64a1b2c3d4e5f6789abcdef9"
      }
    ],
    "summary": {
      "totalDeposits": 500,
      "totalWithdrawals": 150,
      "netAmount": 350
    },
    "total": 25,
    "limit": 100,
    "offset": 0
  }
}
```

---

## Service Methods

### 1. depositViaPayTabs()

**File**: `src/modules/wallet/wallet.service.ts`

```typescript
async depositViaPayTabs(
  dto: DepositViaPayTabsDto,
  userId: string
): Promise<PaymentResponseDto>
```

**Logic**:

1. Validates wallet ownership and currency support
2. Fetches currency configuration (fees/tax rates)
3. Calculates total charges
4. Creates `WalletDepositOrder` record
5. Calls PayTabs service to create payment page
6. Returns payment URL for user redirect

**Error Handling**:

- `NotFoundException`: Wallet or currency not found
- `BadRequestException`: PayTabs not enabled for currency
- `ConflictException`: Duplicate order ID

---

### 2. processDepositFromWebhook()

**File**: `src/modules/wallet/wallet.service.ts`

```typescript
async processDepositFromWebhook(
  tranRef: string
): Promise<void>
```

**Logic**:

1. Retrieves `WalletDepositOrder` by `tranRef`
2. Checks idempotency flag to prevent duplicate processing
3. Acquires distributed locks (Redis) on affected accounts
4. Starts MongoDB transaction
5. Creates 3 journal entries with 6 transaction records
6. Updates balances atomically
7. Marks order as processed
8. Releases locks

**Idempotency**:

- Uses `tranRef` as unique key
- Sets `processed: true` after successful completion
- Returns early if already processed

**Concurrency Safety**:

- Redis locks prevent race conditions
- MongoDB transactions ensure atomicity
- Lock ordering (alphabetical) prevents deadlocks

---

### 3. getTransactionHistory()

**File**: `src/modules/wallet/wallet.service.ts`

```typescript
async getTransactionHistory(
  accountId: string,
  userId: string,
  assetSymbol?: string,
  limit = 50,
  offset = 0
): Promise<{ transactions: Transaction[]; total: number }>
```

**Logic**:

1. Validates wallet ownership
2. Builds query with optional asset filter
3. Sorts by creation date (newest first)
4. Applies pagination
5. Returns transactions with total count

---

### 4. getAllTransactionsReport()

**File**: `src/modules/wallet/wallet.service.ts`

```typescript
async getAllTransactionsReport(
  userId: string,
  assetSymbol?: string,
  startDate?: Date,
  endDate?: Date,
  limit = 100,
  offset = 0
): Promise<{ transactions: Transaction[]; total: number }>
```

**Logic**:

1. Fetches all user wallets
2. Builds query across all wallets
3. Applies optional filters (asset, date range)
4. Sorts and paginates results
5. Returns comprehensive report

---

## Error Handling

### 1. Webhook Error Handling

**File**: `src/modules/paytabs/paytabs.service.ts`

Enhanced error logging in `handleWebhook()`:

```typescript
try {
  await this.walletService.processDepositFromWebhook(tranRef);
  this.logger.log(`Wallet deposit processed successfully`);
} catch (depositError) {
  this.logger.error(
    `Failed to process wallet deposit for transaction ${tranRef}:`,
    depositError instanceof Error ? depositError.stack : String(depositError),
  );

  // Log detailed error information
  this.logger.error({
    transaction: tranRef,
    orderId,
    orderType,
    errorMessage:
      depositError instanceof Error
        ? depositError.message
        : String(depositError),
    errorType: depositError?.constructor?.name,
  });

  // Mark payment as FAILED to enable manual intervention
  paymentStatus = PaymentStatus.FAILED;
}
```

**Benefits**:

- Full stack traces logged
- Structured error data for monitoring
- Payment marked as failed for admin review
- Webhook still returns success to prevent PayTabs retries

---

### 2. Lock Timeout Handling

All wallet operations use distributed locks with 5-second timeout:

```typescript
const ttlMs = 5000;
const token1 = await this.lockService.acquire(firstKey, ttlMs);
if (!token1) {
  throw new ConflictException(this.i18n.t('common.errors.deposit_failed'));
}
```

**Ensures**:

- No indefinite blocking
- Graceful failure under high concurrency
- Clear error messages to users

---

## Security & Data Integrity

### 1. Idempotency

**Mechanisms**:

- `WalletDepositOrder.processed` flag
- `JournalEntry.idempotencyKey` unique constraint
- Webhook checks `processed` before execution

**Benefits**:

- Duplicate webhooks safely ignored
- Consistent state even with network retries
- No double-charging users

---

### 2. Distributed Locks

**Implementation**: Redis-based locks via `RedisLockService`

**Lock Ordering**:

```typescript
const keyA = `wallet:${walletIdStr}:${assetSymbol}`;
const keyB = `wallet:${systemIdStr}:${assetSymbol}`;
const [firstKey, secondKey] = keyA < keyB ? [keyA, keyB] : [keyB, keyA];
```

**Benefits**:

- Prevents race conditions on balance updates
- Alphabetical ordering prevents deadlocks
- Automatic release in `finally` block

---

### 3. MongoDB Transactions

All financial operations wrapped in transactions:

```typescript
const session = await this.mongo.startSession();
try {
  await session.withTransaction(async () => {
    // All DB operations with { session }
  });
} finally {
  await session.endSession();
}
```

**Guarantees**:

- Atomicity: All-or-nothing execution
- Consistency: Balances always match journal entries
- Isolation: Concurrent operations don't interfere
- Durability: Committed data persists

---

### 4. Balance Verification

Each transaction stores `balanceBefore` and `balanceAfter`:

```typescript
const balanceBefore = userBalBefore?.available || 0;
const walletBal = await this.balanceModel.findOneAndUpdate(
  { accountId, assetSymbol },
  { $inc: { available: amount } },
  { new: true, session },
);
const balanceAfter = walletBal.available;
```

**Audit Capabilities**:

- Trace balance evolution over time
- Detect discrepancies between journal and balances
- Reconstruct account state at any point

---

## Usage Examples

### Example 1: User Initiates $100 Deposit

**Step 1**: User calls deposit endpoint

```bash
curl -X POST https://api.example.com/wallets/deposit?walletSubtype=MAIN \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currencyId": "64f1e2d3c4b5a6789fedcba0",
    "returnUrl": "https://yourapp.com/payment/callback",
    "customerDetails": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "966500000000",
      "lang": "en"
    }
  }'
```

**Step 2**: System finds user's MAIN wallet, gets currency symbol from database, and calculates charges

```
Base: $100.00
Fees: $2.90 (2.9%)
Tax: $5.00 (5%)
Total: $107.90
```

**Step 3**: System creates deposit order

```json
{
  "orderId": "WALLET_DEPOSIT|676f6a1e18cf6bd458f2d123",
  "tranRef": null,
  "walletAccountId": "64a1b2c3d4e5f6789abcdef0",
  "userId": "64a1b2c3d4e5f6789abcdef5",
  "baseAmount": 100,
  "feesAmount": 2.9,
  "taxAmount": 5,
  "assetSymbol": "USD",
  "processed": false
}
```

**Step 4**: Response with payment URL

```json
{
  "success": true,
  "data": {
    "paymentUrl": "https://secure.paytabs.sa/payment/page/xyz...",
    "tranRef": "TST2234500012345",
    "amount": 107.9,
    "currency": "USD"
  }
}
```

**Step 5**: User completes payment on PayTabs

**Step 6**: PayTabs sends webhook with complete payment data

```json
{
  "tran_ref": "TST2234500012345",
  "cart_id": "WALLET_DEPOSIT|676f6a1e18cf6bd458f2d123",
  "cart_amount": "107.90",
  "cart_currency": "SAR",
  "response_code": "100",
  "response_status": "A",
  "response_message": "Authorised",
  "payment_info": {
    "payment_method": "MasterCard",
    "card_type": "Credit",
    "card_scheme": "MasterCard",
    "expiryMonth": 5,
    "expiryYear": 2028
  },
  "trace": "PMNT0202.691793C0.000477E5",
  "serviceId": 2,
  "merchantId": 65187,
  "profileId": 118688,
  "transactionTime": "2025-11-14T20:40:30.000+00:00"
}
```

**Step 7**: System updates `WalletDepositOrder` with all webhook data

- Stores complete PayTabs transaction information
- Updates tranRef, amount, currency, paymentStatus, card details, etc.

**Step 8**: System processes direct deposit

- Creates 3 **independent** journal entries (one per transaction)
- Creates 3 transaction records (one per account)
- Updates 3 balance records (user wallet, fees account, tax account)
- Marks order as processed

**Step 9**: Final balances

```
User Wallet: +$100.00 (base amount)
Platform Fees: +$2.90 (direct deposit from PayTabs)
Platform Tax: +$5.00 (direct deposit from PayTabs)
```

**Note**: All three deposits are **direct** from PayTabs - no internal transfers between accounts.

---

### Example 2: Query Transaction History

**Request**:

```bash
curl -X GET "https://api.example.com/wallets/64a1b2c3d4e5f6789abcdef0/transactions?assetSymbol=USD&limit=10" \
  -H "Authorization: Bearer USER_TOKEN"
```

**Response**:

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "_id": "676f6a1e18cf6bd458f2d124",
        "accountId": "64a1b2c3d4e5f6789abcdef0",
        "assetSymbol": "USD",
        "type": "DEPOSIT",
        "amount": 100,
        "balanceBefore": 50,
        "balanceAfter": 150,
        "title": {
          "en": "Deposit",
          "ar": "إيداع"
        },
        "journalEntryId": "676f6a1e18cf6bd458f2d125",
        "createdAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "_id": "676f6a1e18cf6bd458f2d126",
        "accountId": "64a1b2c3d4e5f6789abcdef0",
        "assetSymbol": "USD",
        "type": "WITHDRAWAL",
        "amount": 2.9,
        "balanceBefore": 150,
        "balanceAfter": 147.1,
        "title": {
          "en": "Platform Fee",
          "ar": "رسوم المنصة"
        },
        "journalEntryId": "676f6a1e18cf6bd458f2d127",
        "createdAt": "2024-01-15T10:30:01.000Z"
      },
      {
        "_id": "676f6a1e18cf6bd458f2d128",
        "accountId": "64a1b2c3d4e5f6789abcdef0",
        "assetSymbol": "USD",
        "type": "WITHDRAWAL",
        "amount": 5,
        "balanceBefore": 147.1,
        "balanceAfter": 142.1,
        "title": {
          "en": "Tax",
          "ar": "ضريبة"
        },
        "journalEntryId": "676f6a1e18cf6bd458f2d129",
        "createdAt": "2024-01-15T10:30:02.000Z"
      }
    ],
    "total": 3,
    "limit": 10,
    "offset": 0
  }
}
```

---

### Example 3: Generate Monthly Report

**Request**:

```bash
curl -X GET "https://api.example.com/wallets/my/transactions/report?startDate=2024-01-01&endDate=2024-01-31&assetSymbol=USD" \
  -H "Authorization: Bearer USER_TOKEN"
```

**Use Cases**:

- Monthly account statements
- Tax reporting
- Audit trails
- Reconciliation with bank statements

---

## Translation Support

All user-facing messages support English and Arabic via i18n:

### Common Translations

**File**: `src/i18n/en/common.json` & `src/i18n/ar/common.json`

```json
{
  "messages": {
    "payment_page_created": "Payment page created successfully",
    "deposit_processed": "Deposit processed successfully",
    "transactions_retrieved": "Transaction history retrieved",
    "transaction_report_retrieved": "Transaction report retrieved"
  },
  "errors": {
    "wallet_not_found": "Wallet not found",
    "currency_not_found": "Currency not found",
    "paytabs_not_enabled": "PayTabs not enabled for {{symbol}}",
    "deposit_order_not_found": "Deposit order not found",
    "deposit_already_processed": "Deposit already processed",
    "deposit_failed": "Deposit operation failed"
  }
}
```

---

## Testing Checklist

### Unit Tests

- [ ] `depositViaPayTabs()` calculates fees correctly
- [ ] `processDepositFromWebhook()` creates 3 journal entries
- [ ] Idempotency prevents duplicate processing
- [ ] Balance snapshots stored accurately

### Integration Tests

- [ ] End-to-end deposit flow with PayTabs sandbox
- [ ] Webhook processing with duplicate calls
- [ ] Transaction history pagination
- [ ] Cross-wallet reports with filters

### Load Tests

- [ ] Concurrent deposits to same wallet
- [ ] Lock timeout behavior under high load
- [ ] MongoDB transaction performance

### Security Tests

- [ ] Unauthorized access to other users' wallets
- [ ] Invalid webhook signatures
- [ ] SQL/NoSQL injection in query parameters

---

## Migration Guide

### Database Migration

No migration required for existing data. New schemas:

- `transactions` collection auto-created on first insert
- `walletdepositorders` collection auto-created on first deposit

### API Changes

**Breaking Changes**:

- `POST /wallets/deposit` now requires `currencyId` parameter
- Endpoint redirects to PayTabs (no direct balance updates)

**New Endpoints**:

- `GET /wallets/:accountId/transactions`
- `GET /wallets/my/transactions/report`

### Configuration

Add to `.env`:

```bash
PAYTABS_PROFILE_ID=your_profile_id
PAYTABS_SERVER_KEY=your_server_key
PAYTABS_REGION=SAU
PAYTABS_CALLBACK_URL=https://api.example.com/paytabs/webhook
```

---

## Monitoring & Observability

### Key Metrics

- **Deposit Success Rate**: Successful webhooks / Total deposits
- **Average Processing Time**: Webhook to balance update duration
- **Lock Contention**: Failed lock acquisitions per minute
- **Fee Collection**: Total fees/tax collected per day

### Log Analysis

Search for these patterns in logs:

- `Wallet deposit processed successfully` - Successful deposits
- `Failed to process wallet deposit` - Webhook errors
- `Duplicate deposit detected` - Idempotency working
- `Lock acquisition failed` - Concurrency issues

### Alerts

Set up alerts for:

- Webhook processing failures > 5% in 5 minutes
- Lock timeouts > 10% in 5 minutes
- Balance reconciliation mismatches
- Duplicate transaction IDs

---

## Future Enhancements

### Planned Features

1. **Withdrawal Support**: Via bank transfer or PayTabs
2. **Transaction Export**: CSV/PDF reports
3. **Multi-currency Wallets**: Hold multiple assets in one wallet
4. **Scheduled Deposits**: Recurring payment plans
5. **Refund Processing**: Reverse transactions with journal entries

### Performance Optimizations

1. **Read Replicas**: Offload transaction history queries
2. **Materialized Views**: Pre-aggregate monthly reports
3. **Caching**: Redis cache for recent transactions
4. **Archiving**: Move old transactions to cold storage

---

## Support & Troubleshooting

### Common Issues

#### Issue: "Deposit already processed"

**Cause**: Webhook received multiple times  
**Solution**: This is expected - idempotency working correctly

#### Issue: "Lock acquisition failed"

**Cause**: High concurrency on same wallet  
**Solution**: Retry after brief delay, or implement queue

#### Issue: "Balance mismatch detected"

**Cause**: Database corruption or logic error  
**Solution**: Run balance reconciliation script, review journal entries

---

## Conclusion

This wallet system provides:

- ✅ Secure payment processing via PayTabs
- ✅ Complete audit trail with double-entry bookkeeping
- ✅ Accurate fee and tax collection
- ✅ Comprehensive transaction reporting
- ✅ Idempotent webhook handling
- ✅ Concurrent operation safety

For questions or support, contact the development team.

**Last Updated**: January 2025  
**Version**: 1.0.0
