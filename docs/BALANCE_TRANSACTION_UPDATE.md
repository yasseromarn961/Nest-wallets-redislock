# Balance and Transaction Schema Updates

## Overview

تم تحديث جداول Balance و Transaction لدعم كل من العملات والمعادن بشكل موحد.

## التغييرات الرئيسية

### 1. Balance Schema

#### الحقول الجديدة:

**`assetType`** (مطلوب)

- النوع: `assetType` enum
- القيم المحتملة:
  - `CURRENCY`: رصيد عملات
  - `METAL`: رصيد معادن
- الوصف: يحدد نوع الأصل المخزن في الرصيد

**`assetId`** (مطلوب)

- النوع: `ObjectId`
- الوصف: معرف الأصل في الجدول المقابل
  - إذا كان `assetType = CURRENCY`: يشير إلى معرف العملة في جدول `Currency`
  - إذا كان `assetType = METAL`: يشير إلى معرف المعدن في جدول `Metal`

#### الحقول المحتفظ بها:

- `accountId`: معرف الحساب
- `assetSymbol`: رمز الأصل (USD, XAU, إلخ)
- `available`: الرصيد المتاح
- `locked`: الرصيد المقفل
- `reserved`: الرصيد المحجوز

#### الفهارس (Indexes):

```typescript
// Index موجود مسبقاً
{ accountId: 1, assetSymbol: 1 } - unique

// Indexes جديدة
{ accountId: 1, assetType: 1, assetId: 1 }
{ assetType: 1, assetId: 1 }
```

#### مثال على البيانات:

**رصيد عملة (USD):**

```javascript
{
  accountId: ObjectId("..."),
  assetType: "CURRENCY",
  assetId: ObjectId("currency_id_here"),
  assetSymbol: "USD",
  available: 1000,
  locked: 0,
  reserved: 50
}
```

**رصيد معدن (ذهب):**

```javascript
{
  accountId: ObjectId("..."),
  assetType: "METAL",
  assetId: ObjectId("metal_id_here"),
  assetSymbol: "XAU",
  available: 10.5,
  locked: 0,
  reserved: 2.3
}
```

### 2. Transaction Schema

#### الحقول الجديدة:

**`assetType`** (مطلوب)

- النوع: `assetType` enum
- القيم: `CURRENCY` | `METAL`
- الوصف: نوع الأصل المستخدم في المعاملة

**`assetId`** (مطلوب)

- النوع: `ObjectId`
- الوصف: معرف الأصل (عملة أو معدن)

**`balanceId`** (مطلوب)

- النوع: `ObjectId`
- المرجع: `Balance`
- الوصف: معرف السجل المرتبط في جدول Balance

#### الحقول المحتفظ بها:

- `accountId`: معرف الحساب
- `assetSymbol`: رمز الأصل
- `type`: نوع المعاملة (DEPOSIT/WITHDRAWAL)
- `amount`: المبلغ
- `balanceBefore`: الرصيد قبل المعاملة
- `balanceAfter`: الرصيد بعد المعاملة
- `title`: عنوان المعاملة (عربي/إنجليزي)
- `journalEntryId`: معرف القيد الدفتري

#### الفهارس (Indexes):

```typescript
// Indexes موجودة مسبقاً
{ accountId: 1, assetSymbol: 1, createdAt: -1 }
{ journalEntryId: 1 }

// Indexes جديدة
{ balanceId: 1, createdAt: -1 }
{ assetType: 1, assetId: 1 }
```

#### مثال على البيانات:

**معاملة إيداع عملة:**

```javascript
{
  accountId: ObjectId("..."),
  assetType: "CURRENCY",
  assetId: ObjectId("currency_id"),
  balanceId: ObjectId("balance_record_id"),
  assetSymbol: "USD",
  type: "DEPOSIT",
  amount: 100,
  balanceBefore: 500,
  balanceAfter: 600,
  title: {
    en: "Deposit via PayTabs",
    ar: "إيداع عبر باي تابز"
  },
  journalEntryId: ObjectId("...")
}
```

**معاملة سحب معدن:**

```javascript
{
  accountId: ObjectId("..."),
  assetType: "METAL",
  assetId: ObjectId("metal_id"),
  balanceId: ObjectId("balance_record_id"),
  assetSymbol: "XAU",
  type: "WITHDRAWAL",
  amount: 2.5,
  balanceBefore: 10.5,
  balanceAfter: 8.0,
  title: {
    en: "Gold withdrawal",
    ar: "سحب ذهب"
  },
  journalEntryId: ObjectId("...")
}
```

## الفوائد من هذا التحديث

### 1. **دعم موحد للعملات والمعادن**

- نفس الهيكل يعمل لكليهما
- سهولة التوسع لأنواع أصول أخرى في المستقبل

### 2. **تتبع أفضل للبيانات**

- ربط مباشر بين Transaction و Balance المحدد
- إمكانية الوصول السريع لتاريخ الرصيد عبر balanceId
- ربط مباشر بجدول الأصل الأصلي عبر assetId

### 3. **استعلامات أكثر كفاءة**

- الفهارس الجديدة تسمح بالبحث السريع حسب نوع الأصل
- تحسين الأداء عند الاستعلام عن معاملات عملة أو معدن محدد

### 4. **تدقيق محسّن (Auditing)**

- تتبع كامل لكل معاملة مع ربطها بالرصيد المحدد
- سهولة التحقق من صحة البيانات
- إمكانية إعادة بناء سجل الرصيد من المعاملات

## تأثير على الكود الموجود

### ⚠️ ملاحظة هامة

هذه التغييرات تتطلب تحديث الكود الموجود الذي يتعامل مع Balance و Transaction:

### الأماكن التي تحتاج تحديث:

1. **BankDepositService** (`bank-deposit.service.ts`)
   - عند إنشاء/تحديث Balance
   - عند إنشاء Transaction
   - يجب تحديد `assetType` و `assetId` و `balanceId`

2. **WithdrawalService** (`withdrawal.service.ts`)
   - عند إنشاء/تحديث Balance
   - عند إنشاء Transaction
   - يجب تحديد `assetType` و `assetId` و `balanceId`

3. **WalletService** (`wallet.service.ts`)
   - عند إنشاء رصيد جديد
   - عند تسجيل معاملات
   - يجب تحديد `assetType` و `assetId` و `balanceId`

### مثال على التحديث المطلوب:

**قبل:**

```typescript
const balance = await this.balanceModel.findOneAndUpdate(
  { accountId: wallet._id, assetSymbol: 'USD' },
  { $inc: { available: amount } },
  { new: true, upsert: true },
);
```

**بعد:**

```typescript
const balance = await this.balanceModel.findOneAndUpdate(
  {
    accountId: wallet._id,
    assetType: assetType.CURRENCY,
    assetId: currencyId,
    assetSymbol: 'USD',
  },
  { $inc: { available: amount } },
  { new: true, upsert: true },
);
```

**عند إنشاء Transaction:**

```typescript
const transaction = new this.transactionModel({
  accountId: wallet._id,
  assetType: assetType.CURRENCY,
  assetId: currencyId,
  balanceId: balance._id, // من النتيجة أعلاه
  assetSymbol: 'USD',
  type: TransactionType.DEPOSIT,
  amount: amount,
  balanceBefore: previousBalance,
  balanceAfter: balance.available,
  title: { en: 'Deposit', ar: 'إيداع' },
  journalEntryId: journalEntry._id,
});
```

## الخطوات التالية المطلوبة

1. ✅ تحديث Balance Schema
2. ✅ تحديث Transaction Schema
3. ⏳ تحديث WalletService
4. ⏳ تحديث BankDepositService
5. ⏳ تحديث WithdrawalService
6. ⏳ إنشاء Migration Script لتحديث البيانات الموجودة
7. ⏳ تحديث DTOs إذا لزم الأمر
8. ⏳ اختبار شامل للنظام

## Migration Script

سيكون مطلوب script لتحديث البيانات الموجودة:

```typescript
// مثال على Migration Script
async function migrateBalances() {
  const balances = await BalanceModel.find({});

  for (const balance of balances) {
    // تحديد نوع الأصل بناءً على assetSymbol أو بيانات أخرى
    const currency = await CurrencyModel.findOne({
      symbol: balance.assetSymbol,
    });

    if (currency) {
      balance.assetType = assetType.CURRENCY;
      balance.assetId = currency._id;
    } else {
      const metal = await MetalModel.findOne({ symbol: balance.assetSymbol });
      if (metal) {
        balance.assetType = assetType.METAL;
        balance.assetId = metal._id;
      }
    }

    await balance.save();
  }
}
```
