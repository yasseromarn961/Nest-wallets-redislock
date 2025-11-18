import { connect, connection } from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

/**
 * Migration script to update existing Balance and Transaction records
 * to include assetType, assetId, and balanceId fields.
 *
 * Run this script using:
 * npx ts-node scripts/migrate-balance-transaction.ts
 */

async function migrate() {
  try {
    const mongoUri =
      process.env.MONGO_URI || 'mongodb://localhost:27017/example';
    console.log('Connecting to MongoDB...');
    await connect(mongoUri);
    console.log('Connected successfully.\n');

    const db = connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Step 1: Update Balance records
    console.log('=== Updating Balance records ===');
    const balanceCollection = db.collection('Balance');
    const balancesWithoutType = await balanceCollection
      .find({ assetType: { $exists: false } })
      .toArray();

    console.log(
      `Found ${balancesWithoutType.length} Balance records to update`,
    );

    let balanceUpdated = 0;
    let balanceSkipped = 0;

    for (const balance of balancesWithoutType) {
      // Find currency by symbol
      const currency = await db.collection('Currency').findOne({
        symbol: balance.assetSymbol,
        deletedAt: null,
      });

      if (currency) {
        await balanceCollection.updateOne(
          { _id: balance._id },
          {
            $set: {
              assetType: 'CURRENCY',
              assetId: currency._id,
              reserved: balance.reserved || 0,
            },
          },
        );
        balanceUpdated++;
        console.log(
          `✓ Updated Balance ${String(balance._id)} - ${balance.assetSymbol} -> Currency ${String(currency._id)}`,
        );
      } else {
        // Check if it's a metal
        const metal = await db.collection('Metal').findOne({
          symbol: balance.assetSymbol,
          deletedAt: null,
        });

        if (metal) {
          await balanceCollection.updateOne(
            { _id: balance._id },
            {
              $set: {
                assetType: 'METAL',
                assetId: metal._id,
                reserved: balance.reserved || 0,
              },
            },
          );
          balanceUpdated++;
          console.log(
            `✓ Updated Balance ${String(balance._id)} - ${balance.assetSymbol} -> Metal ${String(metal._id)}`,
          );
        } else {
          balanceSkipped++;
          console.warn(
            `⚠ Skipped Balance ${String(balance._id)} - Currency/Metal not found for symbol: ${balance.assetSymbol}`,
          );
        }
      }
    }

    console.log(
      `\nBalance Summary: ${balanceUpdated} updated, ${balanceSkipped} skipped\n`,
    );

    // Step 2: Update Transaction records
    console.log('=== Updating Transaction records ===');
    const transactionCollection = db.collection('Transaction');
    const transactionsWithoutType = await transactionCollection
      .find({ assetType: { $exists: false } })
      .toArray();

    console.log(
      `Found ${transactionsWithoutType.length} Transaction records to update`,
    );

    let transactionUpdated = 0;
    let transactionSkipped = 0;

    for (const transaction of transactionsWithoutType) {
      // Find currency by symbol
      const currency = await db.collection('Currency').findOne({
        symbol: transaction.assetSymbol,
        deletedAt: null,
      });

      if (currency) {
        // Find corresponding balance record
        const balance = await balanceCollection.findOne({
          accountId: transaction.accountId,
          assetType: 'CURRENCY',
          assetId: currency._id,
          assetSymbol: transaction.assetSymbol,
        });

        await transactionCollection.updateOne(
          { _id: transaction._id },
          {
            $set: {
              assetType: 'CURRENCY',
              assetId: currency._id,
              balanceId: balance ? balance._id : null,
            },
          },
        );
        transactionUpdated++;
        console.log(
          `✓ Updated Transaction ${String(transaction._id)} - ${transaction.assetSymbol} -> Currency ${String(currency._id)}`,
        );
      } else {
        // Check if it's a metal
        const metal = await db.collection('Metal').findOne({
          symbol: transaction.assetSymbol,
          deletedAt: null,
        });

        if (metal) {
          // Find corresponding balance record
          const balance = await balanceCollection.findOne({
            accountId: transaction.accountId,
            assetType: 'METAL',
            assetId: metal._id,
            assetSymbol: transaction.assetSymbol,
          });

          await transactionCollection.updateOne(
            { _id: transaction._id },
            {
              $set: {
                assetType: 'METAL',
                assetId: metal._id,
                balanceId: balance ? balance._id : null,
              },
            },
          );
          transactionUpdated++;
          console.log(
            `✓ Updated Transaction ${String(transaction._id)} - ${transaction.assetSymbol} -> Metal ${String(metal._id)}`,
          );
        } else {
          transactionSkipped++;
          console.warn(
            `⚠ Skipped Transaction ${String(transaction._id)} - Currency/Metal not found for symbol: ${transaction.assetSymbol}`,
          );
        }
      }
    }

    console.log(
      `\nTransaction Summary: ${transactionUpdated} updated, ${transactionSkipped} skipped\n`,
    );

    // Step 3: Update JournalEntry records
    console.log('=== Updating JournalEntry records ===');
    const journalCollection = db.collection('JournalEntry');
    const journalsWithoutType = await journalCollection
      .find({ assetType: { $exists: false } })
      .toArray();

    console.log(
      `Found ${journalsWithoutType.length} JournalEntry records to update`,
    );

    let journalUpdated = 0;
    let journalSkipped = 0;

    for (const journal of journalsWithoutType) {
      // Find currency by symbol
      const currency = await db.collection('Currency').findOne({
        symbol: journal.assetSymbol,
        deletedAt: null,
      });

      if (currency) {
        await journalCollection.updateOne(
          { _id: journal._id },
          {
            $set: {
              assetType: 'CURRENCY',
              assetId: currency._id,
            },
          },
        );
        journalUpdated++;
        console.log(
          `✓ Updated JournalEntry ${String(journal._id)} - ${journal.assetSymbol} -> Currency ${String(currency._id)}`,
        );
      } else {
        // Check if it's a metal
        const metal = await db.collection('Metal').findOne({
          symbol: journal.assetSymbol,
          deletedAt: null,
        });

        if (metal) {
          await journalCollection.updateOne(
            { _id: journal._id },
            {
              $set: {
                assetType: 'METAL',
                assetId: metal._id,
              },
            },
          );
          journalUpdated++;
          console.log(
            `✓ Updated JournalEntry ${String(journal._id)} - ${journal.assetSymbol} -> Metal ${String(metal._id)}`,
          );
        } else {
          journalSkipped++;
          console.warn(
            `⚠ Skipped JournalEntry ${String(journal._id)} - Currency/Metal not found for symbol: ${journal.assetSymbol}`,
          );
        }
      }
    }

    console.log(
      `\nJournalEntry Summary: ${journalUpdated} updated, ${journalSkipped} skipped\n`,
    );

    // Step 4: Verify indexes
    console.log('=== Verifying Indexes ===');
    const balanceIndexes = await balanceCollection.indexes();
    const transactionIndexes = await transactionCollection.indexes();
    const journalIndexes = await journalCollection.indexes();

    console.log('Balance indexes:');
    balanceIndexes.forEach((idx) => {
      console.log(
        `  - ${(idx as { name: string }).name}:`,
        JSON.stringify((idx as { key: any }).key),
      );
    });

    console.log('\nTransaction indexes:');
    transactionIndexes.forEach((idx) => {
      console.log(
        `  - ${(idx as { name: string }).name}:`,
        JSON.stringify((idx as { key: any }).key),
      );
    });

    console.log('\nJournalEntry indexes:');
    journalIndexes.forEach((idx) => {
      console.log(
        `  - ${(idx as { name: string }).name}:`,
        JSON.stringify((idx as { key: any }).key),
      );
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('\nFinal Summary:');
    console.log(`  Balance records updated: ${balanceUpdated}`);
    console.log(`  Balance records skipped: ${balanceSkipped}`);
    console.log(`  Transaction records updated: ${transactionUpdated}`);
    console.log(`  Transaction records skipped: ${transactionSkipped}`);
    console.log(`  JournalEntry records updated: ${journalUpdated}`);
    console.log(`  JournalEntry records skipped: ${journalSkipped}`);

    if (balanceSkipped > 0 || transactionSkipped > 0 || journalSkipped > 0) {
      console.log(
        '\n⚠ Warning: Some records were skipped. Please review the logs above.',
      );
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run migration
void migrate();
