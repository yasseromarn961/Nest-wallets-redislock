# Withdrawal Module

## Overview

This module handles bank withdrawal requests from users' MAIN wallets. It implements a comprehensive workflow for processing withdrawals including balance reservation, admin approval, and transaction recording.

## Features

### User Features

- **Create Withdrawal Request**: Users can request to withdraw funds from their MAIN wallet
- **View Withdrawal Requests**: Users can view their withdrawal history with filtering
- **Calculate Withdrawal Fees**: Calculate fees and taxes before requesting withdrawal

### Admin Features

- **View All Withdrawals**: Admin can view all withdrawal requests with comprehensive filtering
- **Approve Withdrawal**: Move withdrawal from PENDING to PROCESSING state
- **Reject Withdrawal**: Reject withdrawal and return reserved balance to user
- **Complete Withdrawal**: Complete the withdrawal and debit wallet (requires PROCESSING state)
- **Cancel Withdrawal**: Cancel withdrawal in PROCESSING state and return reserved balance

## Withdrawal Workflow

### 1. User Creates Withdrawal Request (Status: PENDING)

- User submits withdrawal request with amount, bank, and currency
- System validates:
  - Bank exists and is active
  - Currency is supported
  - Withdrawal is enabled for the currency
  - User has sufficient balance
- System calculates fees and taxes
- System reserves total amount (withdrawal amount + fees + taxes)
- Balance is moved from `available` to `reserved`
- Withdrawal record is created with status PENDING
- WalletWithdrawalOrder is created for tracking

### 2. Admin Approves (Status: PROCESSING)

- Admin reviews the withdrawal request
- Admin can approve the withdrawal
- Status changes from PENDING to PROCESSING
- Reserved balance remains locked
- Optional admin notes can be added

### 3. Admin Completes (Status: COMPLETED)

- Admin confirms money has been sent to user
- Provides transaction reference
- Optionally uploads transfer receipt
- System performs atomic transaction:
  - Debits reserved balance from user wallet
  - Credits platform FEES account if feeAmount > 0
  - Credits platform TAX account if taxAmount > 0
  - Records journal entries and transactions
- Reserved balance is removed (not returned)
- Status changes to COMPLETED

### Alternative Flows

#### Admin Rejects (Status: REJECTED)

- Admin can reject withdrawal at PENDING state
- Must provide rejection reason
- Reserved balance is returned to available balance
- Status changes to REJECTED

#### Admin Cancels (Status: CANCELLED)

- Admin can cancel withdrawal at PROCESSING state
- Must provide cancellation reason
- Reserved balance is returned to available balance
- Status changes to CANCELLED

## Database Schemas

### BankWithdrawal

Stores the main withdrawal request information:

- `userId`: Reference to user
- `bankId`: Reference to bank
- `currencyId`: Reference to currency
- `amount`: Withdrawal amount requested by user
- `taxAmount`: Calculated tax amount
- `feeAmount`: Calculated fee amount
- `reservedAmount`: Total amount reserved (amount + tax + fee)
- `status`: PENDING | APPROVED | PROCESSING | COMPLETED | REJECTED | CANCELLED
- `transferReceiptUrl`: URL to transfer proof (optional)
- `transactionReference`: Bank transaction reference
- `rejectionReason`: Reason if rejected
- `cancellationReason`: Reason if cancelled
- `adminNotes`: Admin notes
- `processedBy`: Admin who processed (approved/rejected)
- `completedBy`: Admin who completed/cancelled
- `walletDebited`: Boolean flag if wallet was debited
- `journalEntryIds`: Array of journal entry references

### WalletWithdrawalOrder

Tracks the withdrawal order:

- `orderId`: Unique order identifier
- `withdrawalMethod`: BANK_TRANSFER (can be extended)
- `bankWithdrawalId`: Reference to BankWithdrawal
- `walletAccountId`: User's wallet account
- `userId`: Reference to user
- `baseAmount`: Original withdrawal amount
- `feesAmount`: Fee amount
- `taxAmount`: Tax amount
- `assetSymbol`: Currency symbol
- `processed`: Boolean flag

## API Endpoints

### User Endpoints

#### POST /withdrawals/request

Create new withdrawal request

- **Auth**: User JWT required
- **Body**: `CreateWithdrawalRequestDto`
  - `bankId`: string (MongoDB ObjectId)
  - `currencyId`: string (MongoDB ObjectId)
  - `amount`: number
  - `notes`: string (optional)

#### GET /withdrawals/my

Get user's withdrawal requests

- **Auth**: User JWT required
- **Query**: `QueryWithdrawalDto`
  - `page`: number (optional)
  - `limit`: number (optional)
  - `status`: BankWithdrawalStatus (optional)
  - `bankId`: string (optional)
  - `currencyId`: string (optional)
  - `fromDate`: string (optional)
  - `toDate`: string (optional)

#### GET /withdrawals/my/:withdrawalId

Get specific withdrawal details

- **Auth**: User JWT required
- **Param**: `withdrawalId`

#### POST /withdrawals/calculate-fees

Calculate withdrawal fees

- **Auth**: Not required
- **Body**: `CalculateWithdrawalFeesDto`
  - `bankId`: string
  - `currencyId`: string
  - `amount`: number

### Admin Endpoints

#### GET /admin/withdrawals

Get all withdrawal requests (with filters)

- **Auth**: Admin JWT required
- **Query**: `AdminQueryWithdrawalDto` (extends QueryWithdrawalDto)
  - All user query params plus:
  - `userId`: string (optional)
  - `processedBy`: string (optional)
  - `completedBy`: string (optional)

#### GET /admin/withdrawals/:withdrawalId

Get withdrawal details

- **Auth**: Admin JWT required
- **Param**: `withdrawalId`

#### PATCH /admin/withdrawals/:withdrawalId/approve

Approve withdrawal request

- **Auth**: Admin JWT required
- **Param**: `withdrawalId`
- **Body**: `ApproveWithdrawalDto`
  - `adminNotes`: string (optional)

#### PATCH /admin/withdrawals/:withdrawalId/reject

Reject withdrawal request

- **Auth**: Admin JWT required
- **Param**: `withdrawalId`
- **Body**: `RejectWithdrawalDto`
  - `rejectionReason`: string (required)
  - `adminNotes`: string (optional)

#### PATCH /admin/withdrawals/:withdrawalId/complete

Complete withdrawal

- **Auth**: Admin JWT required
- **Param**: `withdrawalId`
- **Body**: `CompleteWithdrawalDto`
  - `transactionReference`: string (required)
  - `transferReceiptUrl`: string (optional)
  - `adminNotes`: string (optional)

#### PATCH /admin/withdrawals/:withdrawalId/cancel

Cancel withdrawal

- **Auth**: Admin JWT required
- **Param**: `withdrawalId`
- **Body**: `CancelWithdrawalDto`
  - `cancellationReason`: string (required)
  - `adminNotes`: string (optional)

## Balance Management

The module uses a `reserved` balance field to lock funds during withdrawal processing:

1. **Available Balance**: User's spendable balance
2. **Reserved Balance**: Locked balance for pending withdrawals
3. **Total Balance**: available + reserved

When withdrawal is:

- **Created**: amount moves from available to reserved
- **Rejected/Cancelled**: amount moves from reserved back to available
- **Completed**: amount is removed from reserved (deducted from wallet)

## Transaction Recording

On withdrawal completion, the system creates:

1. **User Transaction**: WITHDRAWAL type, debits user wallet
2. **Fee Transaction**: DEPOSIT type to platform FEES account (if feeAmount > 0)
3. **Tax Transaction**: DEPOSIT type to platform TAX account (if taxAmount > 0)
4. **Journal Entries**: One for each transaction linking all movements

All operations are performed in a MongoDB session with transaction support for atomicity.

## Localization

All success and error messages are localized in:

- `src/i18n/en/common.json`
- `src/i18n/ar/common.json`

Key message keys:

- `common.messages.withdrawal_request_created`
- `common.messages.withdrawal_approved`
- `common.messages.withdrawal_rejected`
- `common.messages.withdrawal_completed`
- `common.messages.withdrawal_cancelled`
- `common.errors.withdrawal_not_found`
- `common.errors.insufficient_balance`
- `common.errors.withdrawal_not_enabled_for_currency`

## Dependencies

- **Bank Module**: For bank information and fee configuration
- **Currency Module**: For currency information
- **Wallet Module**: For account and balance schemas
- **MongoService**: For transaction support
- **RedisLockService**: For distributed locking during balance operations

## Future Enhancements

The `WithdrawalMethod` enum is designed to be extensible:

```typescript
export enum WithdrawalMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  // Can add: CRYPTO, MOBILE_WALLET, etc.
}
```

Additional withdrawal methods can be added by:

1. Adding to the enum
2. Creating corresponding schemas (like BankWithdrawal)
3. Implementing specific processing logic
