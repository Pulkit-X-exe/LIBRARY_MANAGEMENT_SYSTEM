const bcrypt = require('bcryptjs');
const { 
  User, StudentProfile, Book, BookCopy, BookIssue, BookReturn, Fine, FinePayment 
} = require('../models');

const firstNames = [
  'Aarav', 'Ananya', 'Arjun', 'Diya', 'Ishaan', 'Kavya', 'Rohan', 'Saanvi', 
  'Aditya', 'Pooja', 'Vihaan', 'Sneha', 'Kabir', 'Riya', 'Reyansh', 'Meera', 
  'Dhruv', 'Isha', 'Aryan', 'Tanvi', 'Shaurya', 'Anushka', 'Atharv', 'Prisha', 
  'Krishna', 'Anika', 'Aayush', 'Avani', 'Rudra', 'Navya', 'Yash', 'Sara', 
  'Dev', 'Tara', 'Harsh', 'Bhavya', 'Kunal', 'Simran', 'Varun', 'Nandini',
  'Manav', 'Khushi', 'Sahil', 'Vanshika', 'Gaurav', 'Pari', 'Chirag', 'Akanksha'
];

const lastNames = [
  'Sharma', 'Verma', 'Singh', 'Gupta', 'Patel', 'Yadav', 'Choudhary', 'Kumar',
  'Joshi', 'Mishra', 'Rao', 'Nair', 'Bhatia', 'Mehta', 'Reddy', 'Malhotra',
  'Kapoor', 'Bansal', 'Agarwal', 'Saxena', 'Pandey', 'Srivastava', 'Dubey', 'Tiwari'
];

const avatarUrls = [
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80'
];

const sequelize = require('../config/database');

async function seedStudents(options = { log: true }) {
  // Ensure database columns exist
  try {
    const queryInterface = sequelize.getQueryInterface();
    const { DataTypes } = require('sequelize');
    const studentTable = await queryInterface.describeTable('StudentProfiles').catch(() => null);
    if (studentTable) {
      if (!studentTable.student_id) {
        await queryInterface.addColumn('StudentProfiles', 'student_id', {
          type: DataTypes.STRING,
          defaultValue: ''
        });
      }
      if (!studentTable.library_card_number) {
        await queryInterface.addColumn('StudentProfiles', 'library_card_number', {
          type: DataTypes.STRING,
          defaultValue: ''
        });
      }
    }
  } catch (mErr) {
    console.warn('StudentProfiles migration note:', mErr.message);
  }

  const classes = ['9', '10', '11', '12'];
  const sections = ['A', 'B', 'C', 'D'];
  const studentsPerSection = 32; // 4 classes * 4 sections * 32 = 512 students total

  const defaultPassword = await bcrypt.hash('Password@123', 10);
  const books = await Book.findAll({ include: [{ model: BookCopy, as: 'copies' }] });
  const librarian = await User.findOne({ where: { role: 'librarian' } });
  const librarianId = librarian ? librarian.id : 1;

  let createdCount = 0;
  let updatedCount = 0;

  for (let cIdx = 0; cIdx < classes.length; cIdx++) {
    const cls = classes[cIdx];
    const className = `Class ${cls}`;

    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const sec = sections[sIdx];
      const sectionOffset = (cIdx * 4 + sIdx) * studentsPerSection;

      for (let roll = 1; roll <= studentsPerSection; roll++) {
        const studentIndex = sectionOffset + roll;
        const firstName = firstNames[(studentIndex * 3) % firstNames.length];
        const lastName = lastNames[(studentIndex * 5) % lastNames.length];
        const fullName = `${firstName} ${lastName}`;

        const rollStr = String(roll).padStart(2, '0');
        const codeSuffix = `${cls.padStart(2, '0')}${sec}${rollStr}`;
        const studentId = `STU${codeSuffix}`;
        const admissionNo = `ADM2026-${codeSuffix}`;
        const libraryCardNo = `LIB-${codeSuffix}`;
        const barcodeId = `BAR-${codeSuffix}`;
        const email = `student.${cls}${sec.toLowerCase()}${rollStr}@adarsh.edu`;
        const phone = `+91 98${cls}${sec.charCodeAt(0)}${String(roll + 1000).slice(-4)}`;
        const avatar = avatarUrls[(studentIndex) % avatarUrls.length];

        // Safe idempotent check
        let user = await User.findOne({ where: { email } });
        if (!user) {
          user = await User.create({
            name: fullName,
            email,
            password: defaultPassword,
            role: 'student',
            phone,
            avatar,
            profile_picture: avatar,
            status: 'active'
          });

          await StudentProfile.create({
            user_id: user.id,
            student_id: studentId,
            roll_number: String(roll),
            class_name: className,
            section: sec,
            admission_number: admissionNo,
            barcode_id: barcodeId,
            library_card_number: libraryCardNo
          });

          createdCount++;
        } else {
          // Update profile fields if missing
          let profile = await StudentProfile.findOne({ where: { user_id: user.id } });
          if (!profile) {
            await StudentProfile.create({
              user_id: user.id,
              student_id: studentId,
              roll_number: String(roll),
              class_name: className,
              section: sec,
              admission_number: admissionNo,
              barcode_id: barcodeId,
              library_card_number: libraryCardNo
            });
          } else {
            await profile.update({
              student_id: profile.student_id || studentId,
              library_card_number: profile.library_card_number || libraryCardNo,
              class_name: className,
              section: sec,
              roll_number: String(roll)
            });
          }
          updatedCount++;
        }

        // Attach realistic Book Issues and Fines to students in each section
        if (books.length > 0) {
          const now = new Date();

          // Roll 1: 1 Active book issue
          if (roll === 1) {
            const hasIssue = await BookIssue.findOne({ where: { user_id: user.id } });
            if (!hasIssue) {
              const book = books[studentIndex % books.length];
              const copy = book.copies?.[0] || null;
              const dueDate = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000); // 12 days in future

              await BookIssue.create({
                user_id: user.id,
                book_id: book.id,
                copy_id: copy ? copy.id : null,
                issued_by_id: librarianId,
                issue_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
                due_date: dueDate,
                status: 'issued',
                renewal_count: 0
              });
            }
          }

          // Roll 2: 1 Overdue book issue + 1 Pending Fine
          if (roll === 2) {
            const hasIssue = await BookIssue.findOne({ where: { user_id: user.id } });
            if (!hasIssue) {
              const book = books[(studentIndex + 1) % books.length];
              const copy = book.copies?.[0] || null;
              const issueDate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000); // 20 days ago
              const dueDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000); // 6 days overdue

              const overdueIssue = await BookIssue.create({
                user_id: user.id,
                book_id: book.id,
                copy_id: copy ? copy.id : null,
                issued_by_id: librarianId,
                issue_date: issueDate,
                due_date: dueDate,
                status: 'overdue',
                renewal_count: 1
              });

              // Create pending fine
              await Fine.create({
                user_id: user.id,
                issue_id: overdueIssue.id,
                amount: 30.0,
                fine_type: 'late_return',
                status: 'pending'
              });
            }
          }

          // Roll 3: Past returned book history + Paid fine
          if (roll === 3) {
            const hasIssue = await BookIssue.findOne({ where: { user_id: user.id } });
            if (!hasIssue) {
              const book1 = books[(studentIndex + 2) % books.length];
              const book2 = books[(studentIndex + 3) % books.length];

              const return1 = await BookIssue.create({
                user_id: user.id,
                book_id: book1.id,
                issued_by_id: librarianId,
                issue_date: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
                due_date: new Date(now.getTime() - 26 * 24 * 60 * 60 * 1000),
                return_date: new Date(now.getTime() - 24 * 24 * 60 * 60 * 1000),
                status: 'returned'
              });
              await BookReturn.create({
                issue_id: return1.id,
                return_date: return1.return_date,
                overdue_days: 2,
                fine_amount: 10.0,
                condition_on_return: 'good'
              });
              const fineRecord = await Fine.create({
                user_id: user.id,
                issue_id: return1.id,
                amount: 10.0,
                fine_type: 'late_return',
                status: 'paid',
                paid_at: return1.return_date
              });
              await FinePayment.create({
                fine_id: fineRecord.id,
                amount_paid: 10.0,
                payment_method: 'cash',
                transaction_reference: `CASH-REC-${Date.now().toString().slice(-6)}`,
                paid_at: return1.return_date
              });

              const return2 = await BookIssue.create({
                user_id: user.id,
                book_id: book2.id,
                issued_by_id: librarianId,
                issue_date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
                due_date: new Date(now.getTime() - 46 * 24 * 60 * 60 * 1000),
                return_date: new Date(now.getTime() - 47 * 24 * 60 * 60 * 1000),
                status: 'returned'
              });
              await BookReturn.create({
                issue_id: return2.id,
                return_date: return2.return_date,
                overdue_days: 0,
                fine_amount: 0.0,
                condition_on_return: 'good'
              });
            }
          }
        }
      }
    }
  }

  if (options.log) {
    console.log(`✅ Seeded students: ${createdCount} created, ${updatedCount} verified.`);
    console.log(`📊 Total student body: 4 classes (9, 10, 11, 12) × 4 sections (A, B, C, D) × 32 = 512 students.`);
  }

  return { createdCount, updatedCount };
}

if (require.main === module) {
  seedStudents()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed students error:', err);
      process.exit(1);
    });
}

module.exports = seedStudents;
