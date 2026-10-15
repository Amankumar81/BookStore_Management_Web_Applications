// Usage (run from your backend folder, next to models/ and book_Data.js):
//   MONGO_URI="mongodb://127.0.0.1:27017/yourdb" ADMIN_ID="<admin user _id>" node Initilize_data.js
//
// Windows PowerShell:
//   $env:MONGO_URI="mongodb://127.0.0.1:27017/yourdb"; $env:ADMIN_ID="<id>"; node Initilize_data.js
//
// Use the SAME database name your backend connects to (check your .env MONGO_URI).

const mongoose = require("mongoose");
const Book = require("./models/Book"); // fix this path if your model is elsewhere
const books = require("./book_Data");

const { MONGO_URI, ADMIN_ID } = process.env;

const countByCategory = async () => {
  const rows = await Book.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  console.table(rows.map((r) => ({ category: r._id, books: r.count })));
};

(async () => {
  if (!MONGO_URI || !ADMIN_ID) {
    console.error("Set MONGO_URI and ADMIN_ID environment variables first.");
    process.exit(1);
  }

  if (!mongoose.Types.ObjectId.isValid(ADMIN_ID)) {
    console.error("ADMIN_ID is not a valid MongoDB ObjectId:", ADMIN_ID);
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to database:", mongoose.connection.name);

    console.log("\nBooks in DB BEFORE seeding:");
    await countByCategory();

    // 1. Validate every book against your schema and report problems per category
    const valid = [];
    const invalid = {};

    for (const book of books) {
      const doc = new Book({ ...book, createdBy: ADMIN_ID });
      const err = doc.validateSync();

      if (err) {
        const key = `${book.category}: ${Object.values(err.errors)
          .map((e) => e.message)
          .join("; ")}`;
        invalid[key] = (invalid[key] || 0) + 1;
      } else {
        valid.push(doc);
      }
    }

    console.log(`\nValid books: ${valid.length} / ${books.length}`);

    if (Object.keys(invalid).length) {
      console.log("Rejected by your schema (fix the model, then run again):");
      console.table(
        Object.entries(invalid).map(([reason, count]) => ({ reason, count }))
      );
    }

    // 2. Insert the valid ones; existing ISBNs are skipped
    let inserted = 0;
    let skipped = 0;

    try {
      const result = await Book.insertMany(valid, { ordered: false });
      inserted = result.length;
    } catch (err) {
      inserted = err.insertedDocs?.length ?? err.result?.insertedCount ?? 0;
      skipped = err.writeErrors?.length ?? valid.length - inserted;
      console.log("Insert warning:", err.message.slice(0, 200));
    }

    console.log(`\nInserted: ${inserted}   Skipped (already exist / errors): ${skipped}`);

    console.log("\nBooks in DB AFTER seeding:");
    await countByCategory();
  } catch (err) {
    console.error("Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
  }
})();
