const cron = require('node-cron');
const { Op } = require('sequelize');
const { 
  BookIssue, Book, User, StudentProfile, Fine, BookIssueReminder 
} = require('../models');
const { evaluateIssueCirculation, getKolkataDateString } = require('./circulationDateUtils');
const { sendDueReminderEmail } = require('./emailService');

/**
 * Main Daily Library Audit Task
 * Runs every day at 00:05 AM (Asia/Kolkata)
 * Can also be triggered on startup or on-demand
 */
async function runDailyLibraryAudit() {
  console.log(`\n⏳ [DAILY LIBRARY AUDIT] Starting circulation status & reminder audit at ${new Date().toISOString()}...`);
  let remindersSent = 0;
  let overdueUpdated = 0;
  let finesRecorded = 0;

  try {
    const todayStr = getKolkataDateString();

    // 1. Fetch all active (unreturned) issues
    const activeIssues = await BookIssue.findAll({
      where: {
        status: { [Op.in]: ['issued', 'overdue'] }
      },
      include: [
        {
          model: User,
          as: 'user',
          include: [{ model: StudentProfile, as: 'student_profile' }]
        },
        {
          model: Book,
          as: 'book'
        },
        {
          model: Fine,
          as: 'fine'
        }
      ]
    });

    for (const issue of activeIssues) {
      const evaluation = evaluateIssueCirculation(issue.due_date, issue.status, new Date(), 5);

      // --- STEP A: DUE TOMORROW AUTOMATIC REMINDER ---
      if (evaluation.isDueTomorrow) {
        // Check if reminder was already sent today or for this due_date cycle
        const existingReminder = await BookIssueReminder.findOne({
          where: {
            issue_id: issue.id,
            reminder_type: 'DUE_TOMORROW'
          }
        });

        if (!existingReminder && issue.user && issue.user.email) {
          const studentName = issue.user.name || 'Student';
          const bookTitle = issue.book?.title || 'Library Resource';
          const bookId = issue.book?.isbn || `BOOK-${issue.book_id}`;

          const mailResult = await sendDueReminderEmail({
            studentName,
            studentEmail: issue.user.email,
            bookTitle,
            bookId,
            issueDate: issue.issue_date,
            dueDate: issue.due_date,
            isTomorrow: true
          });

          await BookIssueReminder.create({
            issue_id: issue.id,
            student_id: issue.user_id,
            reminder_type: 'DUE_TOMORROW',
            recipient_email: issue.user.email,
            sent_at: new Date(),
            status: mailResult.success ? 'sent' : 'failed',
            notes: mailResult.simulated ? 'Simulated delivery (local dev)' : `MessageId: ${mailResult.messageId || 'ok'}`
          });

          remindersSent++;
        }
      }

      // --- STEP B: OVERDUE IDENTIFICATION & FINE SYNCHRONIZATION ---
      if (evaluation.isOverdue) {
        if (issue.status !== 'overdue') {
          await issue.update({ status: 'overdue' });
          overdueUpdated++;
        }

        const requiredFine = evaluation.fineAmount;

        // Check if fine record exists
        let fineRecord = issue.fine;
        if (!fineRecord) {
          fineRecord = await Fine.findOne({ where: { issue_id: issue.id } });
        }

        if (!fineRecord && requiredFine > 0) {
          await Fine.create({
            issue_id: issue.id,
            user_id: issue.user_id,
            amount: requiredFine,
            fine_type: 'late_return',
            status: 'pending'
          });
          finesRecorded++;
        } else if (fineRecord && fineRecord.status === 'pending' && fineRecord.amount !== requiredFine) {
          await fineRecord.update({ amount: requiredFine });
          finesRecorded++;
        }
      }
    }

    console.log(`✅ [DAILY LIBRARY AUDIT COMPLETE] Checked: ${activeIssues.length}, Reminders Sent: ${remindersSent}, Overdue Loans: ${overdueUpdated}, Fines Synced: ${finesRecorded}`);
    return {
      success: true,
      totalChecked: activeIssues.length,
      remindersSent,
      overdueUpdated,
      finesRecorded
    };
  } catch (error) {
    console.error('❌ [DAILY LIBRARY AUDIT FAILED]:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Initializes Cron Scheduler (Daily at midnight: 00:05 IST)
 */
function initScheduler() {
  // Schedule to run every day at 00:05 (India timezone)
  cron.schedule('5 0 * * *', async () => {
    await runDailyLibraryAudit();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  console.log('⏰ [SCHEDULER INITIALIZED] Automated daily library audit scheduled for 00:05 IST.');
}

module.exports = {
  initScheduler,
  runDailyLibraryAudit
};
