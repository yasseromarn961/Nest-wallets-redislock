# Balance and Transaction Schema Update Summary

## Overview

Updated Balance and Transaction schemas to support both currencies and metals with proper asset type identification.

## Schema Changes

### Balance Schema (`src/modules/wallet/schemas/balance.schema.ts`)

**New Fields:**

- `assetType`: enum ['CURRENCY', 'METAL'] - Identifies the type of asset
- `assetId`: ObjectId ref - Reference to the Currency or Metal document
- `reserved`: number - Amount reserved for pending operations (e.g., withdrawals)

**Updated Indexes:**

```typescript
{ accountId: 1, assetType: 1, assetId: 1 }
{ assetType: 1, assetId: 1 }
```

### Transaction Schema (`src/modules/wallet/schemas/transaction.schema.ts`)

**New Fields:**

- `assetType`: enum ['CURRENCY', 'METAL'] - Identifies the type of asset
- `assetId`: ObjectId ref - Reference to the Currency or Metal document
- `balanceId`: ObjectId ref to Balance - Links transaction to specific balance record

## Code Updates

### 1. WalletDepositOrder Schema

**File:** `src/modules/wallet/schemas/wallet-deposit-order.schema.ts`

- Added `assetId` field to store the currency/metal ID

### 2. Wallet Service

**File:** `src/modules/wallet/wallet.service.ts`

**New Helper Method:**

```typescript
private async getAssetIdBySymbol(assetSymbol: string): Promise<Types.ObjectId>
```

Fetches the currency ID from the symbol (currently supports currencies only).

**Updated Functions:**

1. **createDepositViaPayTabs**: Added `assetId: currency._id` when creating deposit order
2. **processPayTabsDeposit**: Updated all Balance/Transaction operations:
   - User wallet deposit
   - Platform fees deposit
   - Tax deposit
   - All now include `assetType: 'CURRENCY'`, `assetId`, and `balanceId`

3. **deposit** (Admin): Updated Balance queries and Transaction creation
4. **depositForUser** (User): Updated Balance queries and Transaction creation

### 3. Bank Deposit Service

**File:** `src/modules/bank-deposit/bank-deposit.service.ts`

**Updated Functions:**

1. **processDeposit**: Updated all Balance/Transaction operations:
   - User wallet credit
   - Platform fees credit
   - Tax credit
   - All now include `assetType: 'CURRENCY'`, `assetId: deposit.currencyId`, and `balanceId`

### 4. Withdrawal Service

**File:** `src/modules/withdrawal/withdrawal.service.ts`

**Updated Functions:**

1. **reserveBalance**: Changed signature to include `assetId` parameter

   ```typescript
   private async reserveBalance(
     accountId: Types.ObjectId,
     assetId: Types.ObjectId,
     assetSymbol: string,
     amount: number,
     session: ClientSession,
   ): Promise<void>
   ```

   - Updated Balance query to include `assetType: 'CURRENCY'`, `assetId`

2. **unreserveBalance**: Changed signature to include `assetId` parameter
   - Updated Balance query to include `assetType: 'CURRENCY'`, `assetId`

3. **debitWallet**: Updated all Balance/Transaction operations:
   - User wallet debit (withdrawal)
   - Platform fees credit
   - Tax credit
   - All now include `assetType: 'CURRENCY'`, `assetId: withdrawal.currencyId`, and `balanceId`

4. **rejectWithdrawal**: Updated `unreserveBalance` call to pass `assetId`
5. **cancelWithdrawal**: Updated `unreserveBalance` call to pass `assetId`

## Pattern for Updates

All Balance queries now follow this pattern:

```typescript
const balance = await this.balanceModel.findOne({
  accountId: someAccountId,
  assetType: 'CURRENCY', // or 'METAL'
  assetId: someAssetId,
  assetSymbol: someSymbol,
});
```

All Transaction creations now follow this pattern:

```typescript
const tx = await new this.transactionModel({
  accountId: someAccountId,
  assetType: 'CURRENCY', // or 'METAL'
  assetId: someAssetId,
  balanceId: balance._id,
  assetSymbol: someSymbol,
  type: TransactionType.DEPOSIT, // or WITHDRAWAL
  amount: someAmount,
  balanceBefore: previousBalance,
  balanceAfter: newBalance,
  title: { en: '...', ar: '...' },
  journalEntryId: null, // or journal._id
}).save({ session });
```

## Files Modified

1. `src/modules/wallet/schemas/balance.schema.ts` - Schema definition
2. `src/modules/wallet/schemas/transaction.schema.ts` - Schema definition
3. `src/modules/wallet/schemas/wallet-deposit-order.schema.ts` - Added assetId
4. `src/modules/wallet/wallet.service.ts` - All deposit operations
5. `src/modules/bank-deposit/bank-deposit.service.ts` - Deposit processing
6. `src/modules/withdrawal/withdrawal.service.ts` - Withdrawal operations

## Next Steps

### 1. Database Migration (Required)

Create a migration script to update existing Balance and Transaction records:

```typescript
// For Balance records
db.Balance.find({}).forEach((record) => {
  const currency = db.Currency.findOne({ symbol: record.assetSymbol });
  if (currency) {
    db.Balance.updateOne(
      { _id: record._id },
      {
        $set: {
          assetType: 'CURRENCY',
          assetId: currency._id,
          reserved: 0,
        },
      },
    );
  }
});

// For Transaction records
db.Transaction.find({}).forEach((record) => {
  const currency = db.Currency.findOne({ symbol: record.assetSymbol });
  const balance = db.Balance.findOne({
    accountId: record.accountId,
    assetSymbol: record.assetSymbol,
  });
  if (currency) {
    db.Transaction.updateOne(
      { _id: record._id },
      {
        $set: {
          assetType: 'CURRENCY',
          assetId: currency._id,
          balanceId: balance ? balance._id : null,
        },
      },
    );
  }
});
```

### 2. Future Enhancements

- Add Metal model to WalletModule for metal support
- Update `getAssetIdBySymbol` to support both currencies and metals
- Add support for metal deposits and withdrawals

## Testing Checklist

- [ ] Test PayTabs deposits with new schema fields
- [ ] Test bank deposits with new schema fields
- [ ] Test withdrawals (create, approve, process, reject, cancel)
- [ ] Test balance queries and transaction history
- [ ] Verify all indexes are created properly
- [ ] Run database migration on staging environment
- [ ] Verify backward compatibility with existing records (after migration)

## Notes

- All changes maintain backward compatibility with existing code that only reads data
- System treasury transactions have `balanceId: null` as they don't track specific balance records
- Reserved balance tracking is now supported for withdrawal operations
- The `assetType` field uses string literal array ['CURRENCY', 'METAL'] instead of enum for Mongoose compatibility
