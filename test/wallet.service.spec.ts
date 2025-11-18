import { Types } from 'mongoose';
import { WalletService } from '../src/modules/wallet/wallet.service';
import { I18nService } from 'nestjs-i18n';

class FakeAccountModel {
  static store: any[] = [];
  static async findOne(query: any) {
    if (query._id) {
      return (
        this.store.find(
          (a) => String(a._id) === String(query._id) && a.deletedAt === null,
        ) || null
      );
    }
    if (
      query.type === 'SYSTEM' &&
      query.subtype === 'TREASURY' &&
      query.deletedAt === null
    ) {
      return (
        this.store.find(
          (a) =>
            a.type === 'SYSTEM' &&
            a.subtype === 'TREASURY' &&
            a.deletedAt === null,
        ) || null
      );
    }
    return null;
  }
  _doc: any;
  constructor(doc: any) {
    this._doc = { ...doc, _id: new Types.ObjectId(), deletedAt: null };
  }
  async save() {
    FakeAccountModel.store.push(this._doc);
    return this._doc;
  }
}

class FakeBalanceModel {
  static store: any[] = [];
  static async findOne(query: any) {
    return (
      this.store.find(
        (b) =>
          String(b.accountId) === String(query.accountId) &&
          b.assetSymbol === query.assetSymbol,
      ) || null
    );
  }
  static async findOneAndUpdate(query: any, update: any, opts: any) {
    let existing = await this.findOne(query);
    if (!existing && opts.upsert) {
      existing = {
        accountId: query.accountId,
        assetSymbol: query.assetSymbol,
        available: 0,
        locked: 0,
      };
      this.store.push(existing);
    }
    existing.available += update.$inc.available || 0;
    if (update.$inc.locked) existing.locked += update.$inc.locked;
    return existing;
  }
}

class FakeJournalModel {
  static store: any[] = [];
  static async findOne(query: any) {
    return (
      this.store.find((j) => j.idempotencyKey === query.idempotencyKey) || null
    );
  }
  _doc: any;
  constructor(doc: any) {
    this._doc = { ...doc, _id: new Types.ObjectId() };
  }
  async save() {
    FakeJournalModel.store.push(this._doc);
    return this._doc;
  }
}

describe('WalletService deposit idempotency', () => {
  it('returns same journal on repeated idempotent deposit', async () => {
    const walletId = new Types.ObjectId();
    FakeAccountModel.store.push({
      _id: walletId,
      type: 'WALLET',
      userId: new Types.ObjectId(),
      subtype: 'MAIN',
      deletedAt: null,
    });

    const mongo: any = {
      startSession: async () => ({
        withTransaction: async (fn: any) => {
          await fn();
        },
        endSession: () => {},
      }),
    };
    const i18n: Partial<I18nService> = { t: (k: string) => k };

    const fakeLock = {
      acquire: async (_key: string, _ttl: number) => 'tok',
      release: async (_key: string, _token: string) => true,
    };
    const service = new WalletService(
      FakeAccountModel as any,
      FakeBalanceModel as any,
      FakeJournalModel as any,
      mongo,
      i18n as I18nService,
      fakeLock as any,
    );

    const dto = {
      walletAccountId: String(walletId),
      assetSymbol: 'USD',
      amount: 100,
      idempotencyKey: 'abc-123',
    };
    const first = await service.deposit(dto);
    const second = await service.deposit(dto);

    expect(first.journal.idempotencyKey).toBe('abc-123');
    expect(second.journal.idempotencyKey).toBe('abc-123');
    expect(FakeJournalModel.store.length).toBe(1);
    const bal = await service.getBalance(String(walletId), 'USD');
    expect(bal.available).toBe(100);
  });
});
