const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');
const {
  User, StudentProfile, TeacherProfile, LibrarianProfile,
  Category, Subject, Author, Publisher, Book, BookCopy,
  BookIssue, BookReturn, Reservation, Fine, FinePayment,
  Wishlist, Review, DigitalResource, Announcement, Notification,
  LibraryRule, LibrarySetting, ActivityLog
} = require('../models');

async function seed() {
  try {
    console.log('🔄 Syncing database tables...');
    await sequelize.sync({ force: true });
    console.log('✅ Database schema synchronized.');

    const defaultPassword = await bcrypt.hash('Password@123', 10);

    // --- 1. Settings ---
    console.log('🌱 Seeding settings and rules...');
    await LibrarySetting.bulkCreate([
      { key: 'school_name', value: 'Adarsh Senior Secondary School', group: 'school' },
      { key: 'school_address', value: 'Garhi Bazidpur, Gurugram, Haryana - 122105', group: 'school' },
      { key: 'school_phone', value: '+91 98123 45678', group: 'school' },
      { key: 'school_email', value: 'info@adarshseniorsecondaryschool.in', group: 'school' },
      { key: 'library_name', value: 'Adarsh Central Library & Learning Hub', group: 'library' },
      { key: 'opening_hours', value: '08:00 AM - 04:30 PM (Mon-Sat)', group: 'library' },
      { key: 'weekend_hours', value: 'Closed (Sunday)', group: 'library' },
      { key: 'currency_symbol', value: '₹', group: 'finance' },
      { key: 'maintenance_mode', value: 'false', group: 'system' }
    ]);

    // --- 2. Rules ---
    await LibraryRule.bulkCreate([
      { rule_key: 'student_max_books', rule_value: '3', description: 'Maximum books a student can borrow concurrently', role_target: 'student' },
      { rule_key: 'teacher_max_books', rule_value: '10', description: 'Maximum books a teacher can borrow concurrently', role_target: 'teacher' },
      { rule_key: 'borrow_duration_days', rule_value: '14', description: 'Standard loan duration in days', role_target: 'all' },
      { rule_key: 'fine_per_day', rule_value: '5', description: 'Overdue fine per day in currency units', role_target: 'all' },
      { rule_key: 'grace_period_days', rule_value: '1', description: 'Grace days before overdue fine starts', role_target: 'all' },
      { rule_key: 'max_renewals', rule_value: '2', description: 'Maximum allowable renewals per book loan', role_target: 'all' },
      { rule_key: 'reservation_expiry_hours', rule_value: '48', description: 'Hours a reserved book is held once returned', role_target: 'all' }
    ]);

    // --- 3. Users ---
    console.log('🌱 Seeding users...');
    const adminUser = await User.create({
      name: 'Dr. Arthur Pendelton',
      email: 'admin@school.edu',
      password: defaultPassword,
      role: 'admin',
      phone: '+1 (555) 001-1122',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      profile_picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      status: 'active'
    });

    const librarianUser = await User.create({
      name: 'Sarah Jenkins',
      email: 'librarian@school.edu',
      password: defaultPassword,
      role: 'librarian',
      phone: '+1 (555) 002-2233',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
      profile_picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
      status: 'active'
    });
    await LibrarianProfile.create({
      user_id: librarianUser.id,
      employee_id: 'LIB-1001'
    });

    const teacherUser1 = await User.create({
      name: 'Prof. Robert Langdon',
      email: 'teacher@school.edu',
      password: defaultPassword,
      role: 'teacher',
      phone: '+1 (555) 003-3344',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
      profile_picture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
      status: 'active'
    });
    await TeacherProfile.create({
      user_id: teacherUser1.id,
      employee_id: 'TCH-2001',
      department: 'Computer Science & Engineering'
    });

    const teacherUser2 = await User.create({
      name: 'Dr. Evelyn Reed',
      email: 'teacher2@school.edu',
      password: defaultPassword,
      role: 'teacher',
      phone: '+1 (555) 003-5566',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
      profile_picture: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
      status: 'active'
    });
    await TeacherProfile.create({
      user_id: teacherUser2.id,
      employee_id: 'TCH-2002',
      department: 'Physics & Astronomy'
    });

    const studentUser1 = await User.create({
      name: 'Alex Morgan',
      email: 'student@school.edu',
      password: defaultPassword,
      role: 'student',
      phone: '+1 (555) 004-4455',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
      profile_picture: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
      status: 'active'
    });
    await StudentProfile.create({
      user_id: studentUser1.id,
      roll_number: '1001',
      class_name: 'Grade 10',
      section: 'A',
      admission_number: 'ADM-2024-101',
      barcode_id: 'STU-1001-A'
    });

    const studentUser2 = await User.create({
      name: 'Maya Lin',
      email: 'student2@school.edu',
      password: defaultPassword,
      role: 'student',
      phone: '+1 (555) 004-7788',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
      profile_picture: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
      status: 'active'
    });
    await StudentProfile.create({
      user_id: studentUser2.id,
      roll_number: '1105',
      class_name: 'Grade 11',
      section: 'B',
      admission_number: 'ADM-2024-205',
      barcode_id: 'STU-1105-B'
    });

    const studentUser3 = await User.create({
      name: 'Liam Johnson',
      email: 'student3@school.edu',
      password: defaultPassword,
      role: 'student',
      phone: '+1 (555) 004-9911',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
      profile_picture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
      status: 'active'
    });
    await StudentProfile.create({
      user_id: studentUser3.id,
      roll_number: '1208',
      class_name: 'Grade 12',
      section: 'A',
      admission_number: 'ADM-2024-308',
      barcode_id: 'STU-1208-A'
    });

    // --- 4. Master Catalogs ---
    console.log('🌱 Seeding categories, subjects, authors & publishers...');
    const catCS = await Category.create({ name: 'Computer Science', code: 'CS', description: 'Programming, Software Engineering, AI & Algorithms' });
    const catSci = await Category.create({ name: 'Science & Physics', code: 'SCI', description: 'Theoretical and Applied Sciences' });
    const catMath = await Category.create({ name: 'Mathematics', code: 'MATH', description: 'Pure & Applied Mathematics, Statistics' });
    const catLit = await Category.create({ name: 'Literature & Fiction', code: 'LIT', description: 'Classic and Modern World Literature' });
    const catHist = await Category.create({ name: 'World History', code: 'HIST', description: 'Historical civilizations and geopolitical analysis' });
    const catBio = await Category.create({ name: 'Biology & Life Sciences', code: 'BIO', description: 'Genetics, Ecology and Human Physiology' });

    const subAlgo = await Subject.create({ name: 'Algorithms & Data Structures', code: 'CS-201' });
    const subWeb = await Subject.create({ name: 'Web Architecture', code: 'CS-301' });
    const subQuantum = await Subject.create({ name: 'Quantum Mechanics', code: 'PHY-401' });
    const subCalc = await Subject.create({ name: 'Multivariable Calculus', code: 'MATH-102' });
    const subClassics = await Subject.create({ name: 'English Classics', code: 'LIT-101' });

    const authMartin = await Author.create({ name: 'Robert C. Martin', biography: 'Known as Uncle Bob, author of Clean Code and software craftsman.' });
    const authCormen = await Author.create({ name: 'Thomas H. Cormen', biography: 'Co-author of Introduction to Algorithms, MIT professor.' });
    const authHawking = await Author.create({ name: 'Stephen Hawking', biography: 'Theoretical physicist, cosmologist, and acclaimed author of A Brief History of Time.' });
    const authStewart = await Author.create({ name: 'James Stewart', biography: 'Mathematician renowned for worldwide university calculus textbooks.' });
    const authOrwell = await Author.create({ name: 'George Orwell', biography: 'English novelist and essayist, author of 1984 and Animal Farm.' });
    const authAusten = await Author.create({ name: 'Jane Austen', biography: 'Major English novelist known for Pride and Prejudice.' });

    const pubPearson = await Publisher.create({ name: 'Pearson Education', address: 'London, UK', contact: 'contact@pearson.com' });
    const pubMIT = await Publisher.create({ name: 'The MIT Press', address: 'Cambridge, MA', contact: 'info@mitpress.edu' });
    const pubOReilly = await Publisher.create({ name: "O'Reilly Media", address: 'Sebastopol, CA', contact: 'support@oreilly.com' });
    const pubPenguin = await Publisher.create({ name: 'Penguin Classics', address: 'New York, NY', contact: 'orders@penguinrandomhouse.com' });

    // --- 5. Books & Copies ---
    console.log('🌱 Seeding books and physical inventory copies...');
    const booksData = [
      {
        isbn: '978-0132350884',
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        author_id: authMartin.id,
        publisher_id: pubPearson.id,
        category_id: catCS.id,
        subject_id: subAlgo.id,
        edition: '1st Edition',
        publication_year: 2008,
        language: 'English',
        description: 'Even bad code can function. But if code isn’t clean, it can bring a development organization to its knees. Every year, countless hours and significant resources are lost because of poorly written code.',
        cover_image: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=500&q=80',
        total_copies: 5,
        available_copies: 3,
        shelf_number: 'Shelf 3',
        rack_number: 'Rack B',
        row_number: 'Row 2',
        price: 49.99,
        status: 'available'
      },
      {
        isbn: '978-0262033848',
        title: 'Introduction to Algorithms (CLRS)',
        author_id: authCormen.id,
        publisher_id: pubMIT.id,
        category_id: catCS.id,
        subject_id: subAlgo.id,
        edition: '3rd Edition',
        publication_year: 2009,
        language: 'English',
        description: 'Comprehensive update of the leading algorithms text, with new chapters on trees, multithreaded algorithms, dynamic programming, and edge-based flow networks.',
        cover_image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=500&q=80',
        total_copies: 4,
        available_copies: 1,
        shelf_number: 'Shelf 4',
        rack_number: 'Rack B',
        row_number: 'Row 1',
        price: 89.50,
        status: 'available'
      },
      {
        isbn: '978-0553380163',
        title: 'A Brief History of Time',
        author_id: authHawking.id,
        publisher_id: pubPenguin.id,
        category_id: catSci.id,
        subject_id: subQuantum.id,
        edition: 'Updated Illustrated Edition',
        publication_year: 1998,
        language: 'English',
        description: 'A landmark volume in science writing by one of the great minds of our time, Stephen Hawking explores such profound questions as: How did the universe begin—and what made its beginning possible?',
        cover_image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=500&q=80',
        total_copies: 3,
        available_copies: 3,
        shelf_number: 'Shelf 1',
        rack_number: 'Rack A',
        row_number: 'Row 3',
        price: 24.95,
        status: 'available'
      },
      {
        isbn: '978-1285740621',
        title: 'Calculus: Early Transcendentals',
        author_id: authStewart.id,
        publisher_id: pubPearson.id,
        category_id: catMath.id,
        subject_id: subCalc.id,
        edition: '8th Edition',
        publication_year: 2015,
        language: 'English',
        description: 'Success in your calculus course starts here! James Stewart’s CALCULUS: EARLY TRANSCENDENTALS texts are world-wide best-sellers for a reason: they are clear, accurate, and filled with realistic examples.',
        cover_image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=500&q=80',
        total_copies: 3,
        available_copies: 2,
        shelf_number: 'Shelf 2',
        rack_number: 'Rack C',
        row_number: 'Row 1',
        price: 110.00,
        status: 'available'
      },
      {
        isbn: '978-0451524935',
        title: '1984',
        author_id: authOrwell.id,
        publisher_id: pubPenguin.id,
        category_id: catLit.id,
        subject_id: subClassics.id,
        edition: 'Centennial Edition',
        publication_year: 1949,
        language: 'English',
        description: 'Written more than 70 years ago, 1984 was George Orwell’s chilling prophecy about the future. And while 1984 has come and gone, his dystopian vision of a government that will do anything to control thought remains prescient.',
        cover_image: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=500&q=80',
        total_copies: 6,
        available_copies: 5,
        shelf_number: 'Shelf 5',
        rack_number: 'Rack D',
        row_number: 'Row 2',
        price: 14.99,
        status: 'available'
      },
      {
        isbn: '978-0141439518',
        title: 'Pride and Prejudice',
        author_id: authAusten.id,
        publisher_id: pubPenguin.id,
        category_id: catLit.id,
        subject_id: subClassics.id,
        edition: 'Penguin Classics',
        publication_year: 1813,
        language: 'English',
        description: 'Few have failed to be charmed by the witty and independent spirit of Elizabeth Bennet in Austen’s beloved masterpiece. As Elizabeth encounters Darcy, vanity and prejudice battle with mutual attraction.',
        cover_image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=500&q=80',
        total_copies: 4,
        available_copies: 4,
        shelf_number: 'Shelf 6',
        rack_number: 'Rack D',
        row_number: 'Row 3',
        price: 12.50,
        status: 'available'
      }
    ];

    let barcodeCounter = 1000;
    const createdBooks = [];

    for (const b of booksData) {
      const book = await Book.create(b);
      createdBooks.push(book);

      // Create copies for each book
      for (let i = 1; i <= b.total_copies; i++) {
        barcodeCounter++;
        const barcode = `LIB-BOOK-${barcodeCounter}`;
        // Mark first copy of Book 1 and Book 2 as 'issued' to reflect available copies count
        let copyStatus = 'available';
        if (b.title.includes('Clean Code') && i <= 2) {
          copyStatus = 'issued';
        } else if (b.title.includes('Algorithms') && i <= 3) {
          copyStatus = 'issued';
        } else if (b.title.includes('Calculus') && i === 1) {
          copyStatus = 'issued';
        } else if (b.title.includes('1984') && i === 1) {
          copyStatus = 'issued';
        }

        await BookCopy.create({
          book_id: book.id,
          barcode: barcode,
          condition: i === b.total_copies ? 'fair' : 'good',
          status: copyStatus
        });
      }
    }

    // --- 6. Active & Historical Issues, Fines ---
    console.log('🌱 Seeding circulation transactions and fines...');
    const now = new Date();
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    // Get copies
    const cleanCodeCopies = await BookCopy.findAll({ where: { book_id: createdBooks[0].id } });
    const clrsCopies = await BookCopy.findAll({ where: { book_id: createdBooks[1].id } });
    const calculusCopies = await BookCopy.findAll({ where: { book_id: createdBooks[3].id } });

    // 1. Alex Morgan: Active Loan on Clean Code (Due in 5 days)
    await BookIssue.create({
      book_id: createdBooks[0].id,
      copy_id: cleanCodeCopies[0].id,
      user_id: studentUser1.id,
      issued_by_id: librarianUser.id,
      issue_date: tenDaysAgo,
      due_date: fiveDaysFromNow,
      status: 'issued',
      renewal_count: 0,
      notes: 'Issued in pristine condition'
    });

    // 2. Alex Morgan: OVERDUE Loan on Algorithms (Due 6 days ago -> Overdue by 5 days considering 1 grace day)
    const overdueIssue = await BookIssue.create({
      book_id: createdBooks[1].id,
      copy_id: clrsCopies[0].id,
      user_id: studentUser1.id,
      issued_by_id: librarianUser.id,
      issue_date: twentyDaysAgo,
      due_date: sixDaysAgo,
      status: 'overdue',
      renewal_count: 1,
      notes: 'Extended once, currently overdue'
    });

    // Create overdue Fine for Alex Morgan (5 late days * ₹5 = ₹25)
    await Fine.create({
      issue_id: overdueIssue.id,
      user_id: studentUser1.id,
      amount: 25.00,
      fine_type: 'late_return',
      status: 'pending'
    });

    // 3. Prof. Robert Langdon: Active Loan on Calculus
    await BookIssue.create({
      book_id: createdBooks[3].id,
      copy_id: calculusCopies[0].id,
      user_id: teacherUser1.id,
      issued_by_id: librarianUser.id,
      issue_date: fourDaysAgo,
      due_date: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000), // Teachers get 28 days or extended
      status: 'issued',
      renewal_count: 0,
      notes: 'Curriculum reference material'
    });

    // 4. Past Returned Transaction for Maya Lin
    const returnedIssue = await BookIssue.create({
      book_id: createdBooks[0].id,
      copy_id: cleanCodeCopies[1].id,
      user_id: studentUser2.id,
      issued_by_id: librarianUser.id,
      issue_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      due_date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      return_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      status: 'returned',
      renewal_count: 0
    });
    await BookReturn.create({
      issue_id: returnedIssue.id,
      return_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      received_by_id: librarianUser.id,
      overdue_days: 0,
      fine_amount: 0.0,
      condition_on_return: 'good'
    });

    // --- 7. Reservations ---
    console.log('🌱 Seeding reservations...');
    await Reservation.create({
      book_id: createdBooks[1].id, // Algorithms has only 1 available copy
      user_id: studentUser2.id, // Maya Lin
      reservation_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'waiting',
      queue_position: 1
    });

    // --- 8. Wishlist ---
    await Wishlist.bulkCreate([
      { user_id: studentUser1.id, book_id: createdBooks[2].id }, // Hawking
      { user_id: studentUser1.id, book_id: createdBooks[4].id }, // 1984
      { user_id: studentUser2.id, book_id: createdBooks[0].id }
    ]);

    // --- 9. Reviews & Ratings ---
    await Review.bulkCreate([
      {
        book_id: createdBooks[0].id,
        user_id: studentUser1.id,
        rating: 5,
        review_text: 'Essential reading for any aspiring programmer! Uncle Bob breaks down code cleanliness with clear examples.'
      },
      {
        book_id: createdBooks[0].id,
        user_id: teacherUser1.id,
        rating: 5,
        review_text: 'I recommend this textbook to all sophomore students in my software engineering course.'
      },
      {
        book_id: createdBooks[1].id,
        user_id: studentUser3.id,
        rating: 4,
        review_text: 'The mathematical rigor is intimidating at first, but it is undoubtedly the Bible of computer algorithms.'
      },
      {
        book_id: createdBooks[2].id,
        user_id: studentUser2.id,
        rating: 5,
        review_text: 'Mind-bending explanation of black holes, space-time, and quantum cosmology for general students.'
      }
    ]);

    // --- 10. Digital Resources ---
    console.log('🌱 Seeding digital library assets...');
    await DigitalResource.bulkCreate([
      {
        title: 'AP Computer Science Past Examination Papers (2020-2024)',
        description: 'Comprehensive collection of solved past question papers with scoring guidelines and algorithm breakdown.',
        resource_type: 'question_paper',
        file_url: '/uploads/sample_cs_exam_papers.pdf',
        file_size: '4.8 MB',
        access_role: 'all',
        downloads_count: 142
      },
      {
        title: 'Quantum Physics Lecture Notes - Adarsh Science Dept.',
        description: 'Complete lecture slides, derivations of Schrödinger wave equation, and experimental problem sets.',
        resource_type: 'notes',
        file_url: '/uploads/quantum_physics_lecture_notes.pdf',
        file_size: '6.2 MB',
        access_role: 'all',
        downloads_count: 89
      },
      {
        title: 'The Turing Review: Student Science & Tech Journal Vol. 12',
        description: 'Annual peer-reviewed high school and collegiate research papers on artificial intelligence and robotics.',
        resource_type: 'magazine',
        file_url: '/uploads/turing_review_vol12.pdf',
        file_size: '12.5 MB',
        access_role: 'all',
        downloads_count: 215
      }
    ]);

    // --- 11. Announcements ---
    console.log('🌱 Seeding announcements...');
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await Announcement.bulkCreate([
      {
        title: 'Extended Study Hours During Midterm Examination Week',
        content: 'The Central Academic Library will remain open until 08:30 PM starting next Monday. Silent study halls A & B are fully air-conditioned and Wi-Fi enabled.',
        priority: 'high',
        category: 'timings',
        start_date: new Date(),
        expiry_date: thirtyDaysFromNow,
        created_by_id: librarianUser.id
      },
      {
        title: 'Annual Scholastic Book Fair & Author Interaction',
        content: 'Join us on October 15th in the main auditorium. Renowned STEM authors and literature laureates will be hosting interactive Q&A sessions.',
        priority: 'medium',
        category: 'general',
        start_date: new Date(),
        expiry_date: thirtyDaysFromNow,
        created_by_id: adminUser.id
      },
      {
        title: 'New Computer Science & Artificial Intelligence Shelf Added',
        content: 'Over 50 newly acquired titles covering Python, Machine Learning, Rust, and Cloud Architecture are now available on Rack B.',
        priority: 'low',
        category: 'new_arrivals',
        start_date: new Date(),
        expiry_date: thirtyDaysFromNow,
        created_by_id: librarianUser.id
      }
    ]);

    // --- 12. Notifications ---
    await Notification.bulkCreate([
      {
        user_id: studentUser1.id,
        title: 'Overdue Alert: Introduction to Algorithms',
        message: 'Your loan for Introduction to Algorithms is overdue by 5 days. Accumulated fine: ₹25. Please return or contact the circulation desk.',
        type: 'overdue',
        is_read: false
      },
      {
        user_id: studentUser1.id,
        title: 'Loan Confirmation: Clean Code',
        message: 'You have borrowed Clean Code (Copy LIB-BOOK-1001). Due date is 5 days from now.',
        type: 'issue',
        is_read: true
      },
      {
        user_id: studentUser2.id,
        title: 'Reservation Confirmed',
        message: 'You are currently #1 in queue for Introduction to Algorithms (CLRS). You will receive an alert once returned.',
        type: 'reservation_available',
        is_read: false
      }
    ]);

    // --- 13. Activity Logs ---
    await ActivityLog.bulkCreate([
      {
        user_id: adminUser.id,
        user_name: 'Dr. Arthur Pendelton',
        user_role: 'admin',
        action: 'SYSTEM_INITIALIZATION',
        entity_type: 'System',
        entity_id: 1,
        details: 'Initial system configuration and rules loaded into relational database',
        ip_address: '127.0.0.1'
      },
      {
        user_id: librarianUser.id,
        user_name: 'Sarah Jenkins',
        user_role: 'librarian',
        action: 'BOOK_ISSUED',
        entity_type: 'BookIssue',
        entity_id: 1,
        details: 'Issued "Clean Code" to Alex Morgan (Roll: 1001)',
        ip_address: '192.168.1.10'
      },
      {
        user_id: librarianUser.id,
        user_name: 'Sarah Jenkins',
        user_role: 'librarian',
        action: 'BOOK_ISSUED',
        entity_type: 'BookIssue',
        entity_id: 2,
        details: 'Issued "Introduction to Algorithms" to Alex Morgan',
        ip_address: '192.168.1.10'
      },
      {
        user_id: studentUser1.id,
        user_name: 'Alex Morgan',
        user_role: 'student',
        action: 'REVIEW_SUBMITTED',
        entity_type: 'Review',
        entity_id: 1,
        details: 'Rated "Clean Code" 5/5 stars',
        ip_address: '192.168.1.45'
      }
    ]);

    console.log('🌱 Seeding class students (Classes 9, 10, 11, 12 | Sections A, B, C, D)...');
    const seedStudents = require('./seedStudents');
    await seedStudents({ log: true });

    console.log('🎉 Seeding successfully completed!');
    console.log('--------------------------------------------------');
    console.log('Preset Login Credentials (Password: Password@123):');
    console.log('• Admin:     admin@school.edu');
    console.log('• Librarian: librarian@school.edu');
    console.log('• Teacher:   teacher@school.edu');
    console.log('• Student:   student@school.edu');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seed().then(() => process.exit(0));
}

module.exports = seed;
