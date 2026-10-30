require('dotenv').config();
const jwt = require('jsonwebtoken');
const { Book, BookCopy, BookIssue, Reservation, Wishlist, User, StudentProfile } = require('../models');

async function runEndToEndTests() {
  console.log('====================================================');
  console.log('🧪 ADARSH SCHOOL LIBRARY SYSTEM: END-TO-END AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraInfo = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${extraInfo}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${extraInfo}`);
      failed++;
    }
  }

  try {
    // 1. Verify 200 Books in Catalog
    const totalTitles = await Book.count();
    const totalCopies = await BookCopy.count();
    assert(totalTitles >= 200, `Catalogue contains ~200 books (${totalTitles} titles found)`);
    assert(totalCopies >= 500, `Physical copies stocked across titles (${totalCopies} copies found)`);

    // 2. Verify Discovery Stats API
    const statsRes = await fetch('http://localhost:5000/api/books/discovery-stats');
    const statsData = await statsRes.json();
    assert(statsData.success === true, 'GET /books/discovery-stats returns success');
    assert(statsData.stats.total_titles >= 200, 'Discovery stats returns >= 200 titles');
    assert(statsData.popular_books && statsData.popular_books.length > 0, 'Discovery stats returns popular books');
    assert(statsData.recently_added && statsData.recently_added.length > 0, 'Discovery stats returns recently added books');

    // 3. Mathematical Consistency Check: Available + Issued + Reserved <= Total
    const allBooks = await Book.findAll();
    let mathConsistent = true;
    for (const b of allBooks) {
      const avail = b.available_copies || 0;
      const issued = b.issued_copies || 0;
      const reserved = b.reserved_copies || 0;
      const total = b.total_copies || 0;

      if (avail < 0 || issued < 0 || reserved < 0 || (avail + issued + reserved > total)) {
        mathConsistent = false;
        console.error(`Inconsistency on book ID ${b.id}: Avail=${avail}, Issued=${issued}, Reserved=${reserved}, Total=${total}`);
        break;
      }
    }
    assert(mathConsistent, 'Stock integrity: 0 <= Available, Issued, Reserved and Sum <= Total for all titles');

    // 4. Test Search API
    const searchRes = await fetch('http://localhost:5000/api/books?search=Physics&limit=5');
    const searchData = await searchRes.json();
    assert(searchData.success && searchData.books.length > 0, `Search for "Physics" returned ${searchData.books?.length} matches`);

    // 5. Test Filters (Category & Availability)
    const catRes = await fetch('http://localhost:5000/api/books?category=Science&availability=available_now&limit=5');
    const catData = await catRes.json();
    assert(catData.success && catData.books.length > 0, `Category filter "Science" with availability filter returned ${catData.books?.length} books`);

    // 6. Test Authentication & Tokens for Student and Librarian
    let studentUser = await User.findOne({ where: { role: 'student' } });
    let librarianUser = await User.findOne({ where: { role: 'librarian' } });

    const studentToken = jwt.sign(
      { id: studentUser.id, email: studentUser.email, role: 'student', name: studentUser.name },
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production'
    );

    const librarianToken = jwt.sign(
      { id: librarianUser.id, email: librarianUser.email, role: 'librarian', name: librarianUser.name },
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production'
    );

    // 7. Test STRICT RULE: Students CANNOT directly issue books online
    const targetBook = await Book.findOne({ where: { available_copies: { [require('sequelize').Op.gt]: 1 } } });
    const directIssueRes = await fetch('http://localhost:5000/api/circulation/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({ book_id: targetBook.id })
    });
    assert(directIssueRes.status === 403, 'Direct online book issue by student is strictly FORBIDDEN (HTTP 403)');

    // 8. Test Wishlist Flow (Add, Duplicate Prevention, List, Remove)
    // Clear previous wishlist for this test book
    await Wishlist.destroy({ where: { user_id: studentUser.id, book_id: targetBook.id } });

    // Add to wishlist
    const wishAddRes = await fetch('http://localhost:5000/api/wishlist/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({ book_id: targetBook.id })
    });
    const wishAddData = await wishAddRes.json();
    assert(wishAddData.success && wishAddData.isWishlisted === true, 'Student added book to wishlist');

    // Verify in wishlist
    const wishListRes = await fetch('http://localhost:5000/api/wishlist', {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const wishListData = await wishListRes.json();
    const hasItem = wishListData.wishlist.some(w => w.book_id === targetBook.id);
    assert(hasItem, 'Wishlist contains the added book with live stock details');

    // Remove from wishlist
    const wishRemoveRes = await fetch('http://localhost:5000/api/wishlist/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({ book_id: targetBook.id })
    });
    const wishRemoveData = await wishRemoveRes.json();
    assert(wishRemoveData.success && wishRemoveData.isWishlisted === false, 'Student toggled and removed book from wishlist');

    // 9. Test Student Reservation Flow:
    // A. Submit Reservation Request -> Status "Pending"
    // Clean any prior pending reservations for targetBook
    await Reservation.destroy({ where: { user_id: studentUser.id, book_id: targetBook.id } });

    const reserveRes = await fetch('http://localhost:5000/api/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        book_id: targetBook.id,
        notes: 'Testing 2-day reservation request flow'
      })
    });
    const reserveData = await reserveRes.json();
    assert(reserveData.success && reserveData.reservation.status === 'Pending', 'Student reservation created with status "Pending"');

    const reservationId = reserveData.reservation.id;

    // B. Student checks "My Requests"
    const studentReqRes = await fetch('http://localhost:5000/api/reservations', {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const studentReqData = await studentReqRes.json();
    const studentReq = studentReqData.reservations.find(r => r.id === reservationId);
    assert(studentReq && studentReq.status === 'Pending', 'Student can see pending request in "My Book Requests"');

    // C. Librarian sees request in Book Requests queue
    const libReqRes = await fetch('http://localhost:5000/api/reservations', {
      headers: { 'Authorization': `Bearer ${librarianToken}` }
    });
    const libReqData = await libReqRes.json();
    const libReq = libReqData.reservations.find(r => r.id === reservationId);
    assert(libReq !== undefined, 'Librarian sees student request in central queue');

    // Initial stock before approval
    const preApprovalBook = await Book.findByPk(targetBook.id);
    const preReserved = preApprovalBook.reserved_copies || 0;
    const preAvailable = preApprovalBook.available_copies;

    // D. Librarian Approves request
    const approveRes = await fetch(`http://localhost:5000/api/reservations/${reservationId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${librarianToken}` }
    });
    const approveData = await approveRes.json();
    assert(approveData.success && approveData.reservation.status === 'Approved', 'Librarian approved reservation');

    // Verify 2-day expiry window set
    const expiry = new Date(approveData.reservation.reservation_expiry);
    const start = new Date(approveData.reservation.reservation_start);
    const diffDays = Math.round((expiry - start) / (1000 * 60 * 60 * 24));
    assert(diffDays === 2, `Reservation expiry is set to exactly 2 days (diff = ${diffDays} days)`);

    // Verify inventory updated: reserved_copies is 1, available_copies is total - 1
    const postApprovalBook = await Book.findByPk(targetBook.id);
    assert(
      postApprovalBook.reserved_copies === 1,
      `Inventory: reserved_copies is 1 after approval (${postApprovalBook.reserved_copies})`
    );
    assert(
      postApprovalBook.available_copies === postApprovalBook.total_copies - 1,
      `Inventory: available_copies is total - 1 (${postApprovalBook.available_copies} of ${postApprovalBook.total_copies})`
    );

    // E. Librarian marks Ready for Pickup
    const readyRes = await fetch(`http://localhost:5000/api/reservations/${reservationId}/ready`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${librarianToken}` }
    });
    const readyData = await readyRes.json();
    assert(readyData.success && readyData.reservation.status === 'Ready for Pickup', 'Librarian marked request "Ready for Pickup"');

    // F. Librarian marks Collected / Issues physical copy
    const collectRes = await fetch(`http://localhost:5000/api/reservations/${reservationId}/collect`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${librarianToken}` }
    });
    const collectData = await collectRes.json();
    assert(collectData.success && collectData.reservation.status === 'Collected', 'Librarian issued book & marked reservation "Collected"');
    assert(collectData.issue && collectData.issue.status === 'issued', 'Official BookIssue loan record created with due date');

    // Verify inventory after collection: reserved_copies back to 0, issued_copies is 1
    const postCollectBook = await Book.findByPk(targetBook.id);
    assert(
      postCollectBook.reserved_copies === 0,
      `Inventory: reserved_copies decremented back on collection (${postCollectBook.reserved_copies})`
    );
    assert(
      postCollectBook.issued_copies === 1,
      `Inventory: issued_copies incremented on issue (${postCollectBook.issued_copies})`
    );

    // G. Book Return Flow: Return issued book and verify inventory restoration
    const returnRes = await fetch(`http://localhost:5000/api/library/issues/${collectData.issue.id}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${librarianToken}`
      },
      body: JSON.stringify({ condition: 'good' })
    });
    const returnData = await returnRes.json();
    assert(returnData.success, 'Librarian processed book return successfully');

    // Verify inventory restored after return
    const postReturnBook = await Book.findByPk(targetBook.id);
    assert(
      postReturnBook.available_copies === postReturnBook.total_copies,
      `Inventory: available_copies fully restored to total (${postReturnBook.available_copies}/${postReturnBook.total_copies}) after return`
    );
    assert(
      postReturnBook.issued_copies === 0,
      `Inventory: issued_copies returned to 0 (${postReturnBook.issued_copies})`
    );

    console.log('\n====================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Unhandled test runner error:', err);
    process.exit(1);
  }
}

runEndToEndTests();
