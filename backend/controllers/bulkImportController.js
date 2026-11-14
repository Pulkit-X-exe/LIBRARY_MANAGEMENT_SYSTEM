const xlsx = require('xlsx');
const { Book, BookCopy, Category, Author, Publisher } = require('../models');
const { logActivity } = require('../middleware/logger');

// Phase 15: Excel / CSV Bulk Book Import
exports.bulkImportBooks = async (req, res) => {
  try {
    let rows = [];

    // Check if file was uploaded via multer
    if (req.file) {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = xlsx.utils.sheet_to_json(sheet);
    } else if (req.body.csv_text) {
      // Support raw CSV text paste
      const workbook = xlsx.read(req.body.csv_text, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else if (Array.isArray(req.body.books)) {
      // Support direct JSON array
      rows = req.body.books;
    } else {
      return res.status(400).json({
        success: false,
        message: 'No file or data provided. Please upload an Excel (.xlsx/.xls) file, CSV file, or provide CSV text.'
      });
    }

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'The uploaded file is empty or contains no readable rows.' });
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // 1-based index including header row

      // Normalize keys (case insensitive / trimmed)
      const normalized = {};
      Object.keys(row).forEach(k => {
        normalized[k.trim().toLowerCase().replace(/[\s_-]+/g, '')] = row[k];
      });

      const title = row.Title || row.title || normalized.title;
      const isbn = row.ISBN || row.isbn || normalized.isbn || normalized.isbnn;
      const authorName = row.Author || row.author || normalized.author || 'Academic Faculty';
      const publisherName = row.Publisher || row.publisher || normalized.publisher || 'NCERT';
      const categoryName = row.Category || row.category || normalized.category || 'General';
      const language = row.Language || row.language || normalized.language || 'English';
      const pubYear = parseInt(row['Publication Year'] || row.publication_year || normalized.publicationyear || 2024);
      const totalCopies = Math.max(1, parseInt(row.Copies || row.copies || normalized.copies || 1));

      // Validation
      if (!title || String(title).trim() === '') {
        errors.push({ row: rowNumber, error: 'Missing Title' });
        continue;
      }

      if (!isbn || String(isbn).trim() === '') {
        errors.push({ row: rowNumber, error: 'Missing ISBN' });
        continue;
      }

      const cleanIsbn = String(isbn).trim();

      // Check if duplicate ISBN
      const existing = await Book.findOne({ where: { isbn: cleanIsbn } });
      if (existing) {
        skippedCount++;
        errors.push({ row: rowNumber, error: `Duplicate ISBN "${cleanIsbn}" (Title: "${title}") already exists.` });
        continue;
      }

      try {
        // Find or create Category
        const [category] = await Category.findOrCreate({
          where: { name: String(categoryName).trim() },
          defaults: { name: String(categoryName).trim(), code: String(categoryName).slice(0, 4).toUpperCase() }
        });

        // Find or create Author
        const [author] = await Author.findOrCreate({
          where: { name: String(authorName).trim() },
          defaults: { name: String(authorName).trim() }
        });

        // Find or create Publisher
        const [publisher] = await Publisher.findOrCreate({
          where: { name: String(publisherName).trim() },
          defaults: { name: String(publisherName).trim() }
        });

        // Create Book
        const book = await Book.create({
          isbn: cleanIsbn,
          title: String(title).trim(),
          category_id: category.id,
          author_id: author.id,
          publisher_id: publisher.id,
          language: String(language).trim(),
          publication_year: isNaN(pubYear) ? 2024 : pubYear,
          total_copies: totalCopies,
          available_copies: totalCopies,
          issued_copies: 0,
          reserved_copies: 0,
          shelf_number: 'Shelf 1',
          rack_number: 'Rack A',
          row_number: 'Row 1',
          condition: 'Good',
          status: 'available',
          borrow_count: 0
        });

        // Create Book Copies with unique barcodes
        for (let c = 1; c <= totalCopies; c++) {
          const barcode = `LIB-${book.id}-${cleanIsbn.slice(-4)}-${c}`;
          await BookCopy.create({
            book_id: book.id,
            barcode,
            condition: 'good',
            status: 'available'
          });
        }

        importedCount++;
      } catch (err) {
        errors.push({ row: rowNumber, error: err.message });
      }
    }

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BULK_BOOKS_IMPORTED',
      entityType: 'Book',
      entityId: null,
      details: `Bulk imported books: ${importedCount} added, ${skippedCount} skipped, ${errors.length} issues`,
      ip: req.ip
    });

    return res.json({
      success: true,
      summary: {
        totalRows: rows.length,
        imported: importedCount,
        skipped: skippedCount,
        errorCount: errors.length
      },
      message: `Bulk Import Complete: ${importedCount} imported, ${skippedCount} skipped, ${errors.length} errors.`,
      errors
    });
  } catch (error) {
    console.error('bulkImportBooks error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process bulk import: ' + error.message });
  }
};

