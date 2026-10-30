/**
 * Timezone-aware date calculations for Indian Standard Time (Asia/Kolkata)
 */

function getKolkataDateString(date = new Date()) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;

  // Format to YYYY-MM-DD strictly in Asia/Kolkata
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * Returns integer day difference: (targetDate - baseDate)
 * Positive means targetDate is in the future.
 * 0 means targetDate is today.
 * Negative means targetDate is in the past.
 */
function getDaysDifference(targetDate, baseDate = new Date()) {
  const targetStr = getKolkataDateString(targetDate);
  const baseStr = getKolkataDateString(baseDate);

  if (!targetStr || !baseStr) return 0;

  const dTarget = new Date(`${targetStr}T00:00:00+05:30`);
  const dBase = new Date(`${baseStr}T00:00:00+05:30`);

  const diffMs = dTarget.getTime() - dBase.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculates book issue status, days remaining, overdue days, and fine amount
 */
function evaluateIssueCirculation(dueDate, issueStatus = 'issued', currentDate = new Date(), finePerDay = 5) {
  if (issueStatus === 'returned') {
    return {
      status: 'RETURNED',
      daysRemaining: 0,
      daysOverdue: 0,
      fineAmount: 0,
      daysRemainingText: 'Returned',
      isOverdue: false,
      isDueTomorrow: false,
      isDueToday: false
    };
  }

  const diffDays = getDaysDifference(dueDate, currentDate);

  if (diffDays > 1) {
    return {
      status: 'ACTIVE',
      daysRemaining: diffDays,
      daysOverdue: 0,
      fineAmount: 0,
      daysRemainingText: `${diffDays} days left`,
      isOverdue: false,
      isDueTomorrow: false,
      isDueToday: false
    };
  } else if (diffDays === 1) {
    return {
      status: 'DUE SOON',
      daysRemaining: 1,
      daysOverdue: 0,
      fineAmount: 0,
      daysRemainingText: '1 day left',
      isOverdue: false,
      isDueTomorrow: true,
      isDueToday: false
    };
  } else if (diffDays === 0) {
    return {
      status: 'DUE TODAY',
      daysRemaining: 0,
      daysOverdue: 0,
      fineAmount: 0,
      daysRemainingText: 'Due today',
      isOverdue: false,
      isDueTomorrow: false,
      isDueToday: true
    };
  } else {
    // diffDays < 0: Overdue
    const daysOverdue = Math.abs(diffDays);
    const fineAmount = daysOverdue * finePerDay;
    return {
      status: 'OVERDUE',
      daysRemaining: diffDays,
      daysOverdue,
      fineAmount,
      daysRemainingText: `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
      isOverdue: true,
      isDueTomorrow: false,
      isDueToday: false
    };
  }
}

module.exports = {
  getKolkataDateString,
  getDaysDifference,
  evaluateIssueCirculation
};
