const { LibraryRule } = require('../models');

const getRules = async () => {
  const rules = await LibraryRule.findAll();
  const ruleMap = {
    student_max_books: 3,
    teacher_max_books: 10,
    borrow_duration_days: 14,
    fine_per_day: 5,
    grace_period_days: 1,
    max_renewals: 2,
    reservation_expiry_hours: 48
  };

  rules.forEach(r => {
    const num = parseFloat(r.rule_value);
    ruleMap[r.rule_key] = isNaN(num) ? r.rule_value : num;
  });

  return ruleMap;
};

const calculateOverdueFine = (dueDate, returnDate, finePerDay, graceDays = 1) => {
  const due = new Date(dueDate);
  const returned = returnDate ? new Date(returnDate) : new Date();

  // Reset hours to compare calendar days
  due.setHours(0, 0, 0, 0);
  returned.setHours(0, 0, 0, 0);

  const diffTime = returned.getTime() - due.getTime();
  const rawDiffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (rawDiffDays <= graceDays) {
    return { overdueDays: 0, fineAmount: 0 };
  }

  const billableDays = rawDiffDays - graceDays;
  const fineAmount = billableDays * finePerDay;

  return {
    overdueDays: billableDays,
    fineAmount: Math.max(0, fineAmount)
  };
};

module.exports = {
  getRules,
  calculateOverdueFine
};
