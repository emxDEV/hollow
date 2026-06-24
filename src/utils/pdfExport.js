import { jsPDF } from 'jspdf';
import { calculateTradePnL } from './tradeMath';
import { getWeekDates } from './dateUtils';
import Dexie from 'dexie';
import { db } from '../db/hollowDb';

export function exportWeeklyReportPDF(weekId, account, trades, executions) {
  const doc = new jsPDF();
  const dates = getWeekDates(weekId);
  
  const isAllAccounts = !account || account.id === 'all';

  // Filter trades to this week & account
  const weekTrades = trades.filter(t => {
    const isAccountMatch = isAllAccounts || t.accountId === account.id;
    return isAccountMatch && t.date >= dates.start && t.date <= dates.end;
  });

  // Calculate Rollup Metrics
  let totalPnL = 0;
  let wins = 0;
  let losses = 0;
  let grossGains = 0;
  let grossLosses = 0;
  let leaksCount = 0;

  const tradeDetails = weekTrades.map(trade => {
    const tradeExecs = executions.filter(e => e.tradeId === trade.id);
    const { netPnL } = calculateTradePnL(trade, tradeExecs);
    
    totalPnL += netPnL;
    leaksCount += (trade.mistakes || []).length;

    if (netPnL > 0) {
      wins++;
      grossGains += netPnL;
    } else if (netPnL < 0) {
      losses++;
      grossLosses += Math.abs(netPnL);
    }

    return {
      ...trade,
      netPnL
    };
  });

  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const profitFactor = grossLosses > 0 ? (grossGains / grossLosses) : grossGains > 0 ? 99.9 : 0;

  // Colors
  const darkNavy = '#131129';
  const mutedText = '#7d79a0';
  const greenAcc = '#28c76f';
  const redAcc = '#ea5455';
  const yellowAcc = '#feca57';

  // 1. BRAND HEADER BLOCK
  doc.setFillColor(19, 17, 41); // #131129
  doc.rect(0, 0, 210, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('HOLLOW LEDGER REPORT', 15, 20);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(157, 118, 250); // Brand violet
  doc.text('WEEKLY QUANTITATIVE PERFORMANCE JOURNAL', 15, 28);
  
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`Week ID: ${weekId} (${dates.start} to ${dates.end})`, 120, 24);

  // 2. METRICS PANEL
  doc.setFillColor(245, 245, 250);
  doc.rect(15, 55, 180, 28, 'F');
  doc.setDrawColor(220, 220, 230);
  doc.rect(15, 55, 180, 28, 'D');

  // Net PnL Col
  doc.setTextColor(80, 80, 100);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('NET WEEKLY PnL', 22, 63);
  doc.setFontSize(14);
  if (totalPnL >= 0) {
    doc.setTextColor(40, 199, 111); // Green
    doc.text(`+$${Math.round(totalPnL).toLocaleString()}`, 22, 74);
  } else {
    doc.setTextColor(234, 84, 85); // Red
    doc.text(`-$${Math.round(Math.abs(totalPnL)).toLocaleString()}`, 22, 74);
  }

  // Win Rate Col
  doc.setTextColor(80, 80, 100);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('WIN RATE', 65, 63);
  doc.setFontSize(14);
  doc.setTextColor(19, 17, 41);
  doc.text(`${winRate.toFixed(1)}%`, 65, 74);

  // Profit Factor Col
  doc.setTextColor(80, 80, 100);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PROFIT FACTOR', 110, 63);
  doc.setFontSize(14);
  doc.text(profitFactor.toFixed(2), 110, 74);

  // Behavior Leaks Col
  doc.setTextColor(80, 80, 100);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('BEHAVIORAL LEAKS', 150, 63);
  doc.setFontSize(14);
  if (leaksCount > 0) {
    doc.setTextColor(234, 84, 85);
    doc.text(`${leaksCount} Tagged`, 150, 74);
  } else {
    doc.setTextColor(40, 199, 111);
    doc.text('0 Leaks', 150, 74);
  }

  // 3. TABLE OF CLOSED TRADES
  doc.setTextColor(19, 17, 41);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Weekly Trade Ledger', 15, 96);
  
  // Table Headers
  let y = 104;
  doc.setFillColor(230, 230, 240);
  doc.rect(15, y, 180, 8, 'F');
  
  doc.setTextColor(60, 60, 80);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DATE', 18, y + 5);
  doc.text('TICKER', 42, y + 5);
  doc.text('MODEL', 65, y + 5);
  doc.text('BIAS', 105, y + 5);
  doc.text('WL STATUS', 125, y + 5);
  doc.text('RATING', 160, y + 5);
  doc.text('NET PnL', 180, y + 5);

  doc.setLineWidth(0.2);
  doc.setDrawColor(200, 200, 210);
  doc.line(15, y + 8, 195, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  y += 8;

  if (tradeDetails.length === 0) {
    doc.setTextColor(120, 120, 140);
    doc.text('No trades logged during this weekly window.', 18, y + 8);
  } else {
    tradeDetails.forEach(trade => {
      // Row Background alternating
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.setTextColor(40, 40, 50);
      doc.text(trade.date || 'N/A', 18, y + 6);
      
      doc.setFont('helvetica', 'bold');
      doc.text(trade.symbol || 'N/A', 42, y + 6);
      doc.setFont('helvetica', 'normal');
      
      doc.text(trade.model || 'Unmapped', 65, y + 6);
      doc.text(trade.bias || 'LONG', 105, y + 6);
      
      const wlText = trade.wl || (trade.netPnL > 0 ? 'Win' : 'Loss');
      doc.text(wlText, 125, y + 6);

      const ratingText = trade.setupRating || 'A';
      doc.text(ratingText, 160, y + 6);

      if (trade.netPnL >= 0) {
        doc.setTextColor(40, 199, 111);
        doc.text(`+$${Math.round(trade.netPnL).toLocaleString()}`, 180, y + 6);
      } else {
        doc.setTextColor(234, 84, 85);
        doc.text(`-$${Math.round(Math.abs(trade.netPnL)).toLocaleString()}`, 180, y + 6);
      }

      doc.setDrawColor(240, 240, 245);
      doc.line(15, y + 10, 195, y + 10);
      y += 10;
    });
  }

  // 4. DETAILED PSYCHOLOGICAL BREAKDOWN
  y += 10;
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(19, 17, 41);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Psychological & Risk Review', 15, y);
  y += 8;

  // Load week review planner if exists
  const hasLeaks = leaksCount > 0;
  doc.setFillColor(250, 250, 253);
  doc.rect(15, y, 180, 25, 'F');
  doc.setDrawColor(225, 225, 235);
  doc.rect(15, y, 180, 25, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 100);
  doc.text('BEHAVIORAL COMPLIANCE AUDIT', 20, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 80);

  if (hasLeaks) {
    doc.text(`Audited ${leaksCount} instances of trading mistakes. Behavioral leakage has negatively impacted performance.`, 20, y + 14);
    doc.text('Review rules and target size caps during the upcoming weekly open.', 20, y + 20);
  } else {
    doc.text('Perfect behavioral score recorded. Playbook compliance remained at 100%.', 20, y + 14);
    doc.text('Keep executing risk targets consistently.', 20, y + 20);
  }

  // Save the PDF
  doc.save(`hollow_weekly_report_${weekId}.pdf`);
  console.log(`PDF successfully exported: hollow_weekly_report_${weekId}.pdf`);
}

// ----------------------------------------------------
// LOCAL SETTINGS DATABASE FOR DIRECTORY HANDLE STORAGE
// ----------------------------------------------------
const settingsDb = new Dexie('HollowSettings');
settingsDb.version(1).stores({
  backup: 'key'
});

export async function saveBackupDirectoryHandle(handle) {
  try {
    await settingsDb.backup.put({ key: 'directoryHandle', handle });
  } catch (err) {
    console.error('Failed to save backup directory handle:', err);
  }
}

export async function getBackupDirectoryHandle() {
  try {
    const record = await settingsDb.backup.get('directoryHandle');
    return record ? record.handle : null;
  } catch (err) {
    console.error('Failed to get backup directory handle:', err);
    return null;
  }
}

// ----------------------------------------------------
// AUTOMATED WEEKLY BACKUP CHECK & RUN
// ----------------------------------------------------
export async function checkAndRunWeeklyBackup(addToast) {
  try {
    const enableAutoBackup = localStorage.getItem('hollowEnableAutoBackup') !== 'false';
    if (!enableAutoBackup) return;

    const today = new Date();
    const isSunday = today.getDay() === 0;
    if (!isSunday) return;

    const todayStr = today.toISOString().split('T')[0];
    const lastBackupDate = localStorage.getItem('hollowLastWeeklyBackupDate');
    
    if (lastBackupDate === todayStr) {
      return; // Already backed up today
    }

    console.log('Sunday detected! Running automated weekly backup...');
    
    // Fetch all local Dexie database data
    const [accs, trds, execs, jrns, plns, grps, wrkts] = await Promise.all([
      db.accounts.toArray(),
      db.trades.toArray(),
      db.executions.toArray(),
      db.dailyJournals.toArray(),
      db.weeklyPlanners.toArray(),
      db.groups.toArray(),
      db.workouts ? db.workouts.toArray() : []
    ]);

    const doc = exportAllDataBackupPDF(accs, trds, execs, jrns, plns, grps, wrkts);
    const filename = `hollow_backup_${todayStr.replace(/-/g, '_')}.pdf`;

    let savedToCustom = false;
    if (window.showDirectoryPicker) {
      const dirHandle = await getBackupDirectoryHandle();
      if (dirHandle) {
        try {
          const options = { mode: 'readwrite' };
          if ((await dirHandle.queryPermission(options)) === 'granted' || (await dirHandle.requestPermission(options)) === 'granted') {
            const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(doc.output('blob'));
            await writable.close();
            savedToCustom = true;
            if (addToast) addToast(`Weekly backup saved to folder: ${filename}`, 'success');
          }
        } catch (err) {
          console.error('Failed to write weekly backup to custom directory, falling back to download:', err);
        }
      }
    }

    if (!savedToCustom) {
      doc.save(filename);
      if (addToast) addToast('Weekly backup PDF automatically generated and downloaded!', 'success');
    }

    // Also save the backup of ONLY the previous week to LocalStorage
    try {
      const day = today.getDay(); // 0 is Sunday
      const diffToMonday = day === 0 ? 6 : day - 1;

      const startDate = new Date(today);
      startDate.setDate(today.getDate() - diffToMonday);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const prevWeekDoc = generatePreviousWeekBackupPDF(accs, trds, execs, jrns, plns, grps, wrkts, startStr, endStr);
      const prevWeekBase64 = prevWeekDoc.output('datauristring');
      localStorage.setItem('hollow_previous_week_backup_pdf', prevWeekBase64);
      localStorage.setItem('hollow_previous_week_backup_range', `${startStr} to ${endStr}`);
    } catch (pdfErr) {
      console.error('Failed to generate previous week PDF backup for LocalStorage:', pdfErr);
    }

    localStorage.setItem('hollowLastWeeklyBackupDate', todayStr);
  } catch (err) {
    console.error('Failed to run automated weekly backup:', err);
  }
}

// ----------------------------------------------------
// FULL DATA BACKUP GENERATOR (PDF)
// ----------------------------------------------------
export function exportAllDataBackupPDF(accounts, trades, executions, dailyJournals, weeklyPlanners, groups, workouts) {
  dailyJournals = (dailyJournals || []).filter(j => j.date !== 'payouts-data');
  const doc = new jsPDF();
  let y = 15;


  const addPageIfOverflow = (heightNeeded) => {
    if (y + heightNeeded > 275) {
      doc.addPage();
      y = 15;
      return true;
    }
    return false;
  };

  // Colors
  const darkNavy = '#131129';
  const brandPurple = '#9d76fa';
  
  // ----------------------------------------------------
  // Page 1: COVER PAGE
  // ----------------------------------------------------
  doc.setFillColor(19, 17, 41); // #131129
  doc.rect(0, 0, 210, 297, 'F');
  
  // Decorative lines/shapes
  doc.setDrawColor(157, 118, 250);
  doc.setLineWidth(1);
  doc.line(20, 40, 190, 40);
  doc.line(20, 250, 190, 250);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('HOLLOW LEDGER', 25, 80);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(157, 118, 250); // Brand violet
  doc.text('COMPLETE SYSTEM BACKUP & DATA AUDIT', 25, 92);
  
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  doc.setTextColor(200, 200, 220);
  doc.setFontSize(11);
  doc.text(`Backup Date: ${todayStr}`, 25, 140);
  doc.text(`Origin Host: ${window.location.hostname || 'Local Client'}`, 25, 148);
  
  // Summary Stats Card
  doc.setFillColor(28, 26, 54);
  doc.rect(25, 165, 160, 60, 'F');
  doc.setDrawColor(45, 42, 82);
  doc.rect(25, 165, 160, 60, 'D');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SYSTEM DATA INVENTORY', 32, 177);
  doc.line(32, 181, 170, 181);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 200);
  doc.text(`• Trading Accounts: ${accounts.length}`, 35, 191);
  doc.text(`• Logged Trades: ${trades.length}`, 35, 198);
  doc.text(`• Execution Records: ${executions.length}`, 35, 205);
  doc.text(`• Daily Journal Logs: ${dailyJournals.length}`, 35, 212);
  doc.text(`• Weekly Planners: ${weeklyPlanners.length}`, 95, 191);
  doc.text(`• Workouts Logged: ${workouts.length}`, 95, 198);
  doc.text(`• Copy Trading Groups: ${groups.length}`, 95, 205);
  
  doc.addPage();
  y = 20;

  // ----------------------------------------------------
  // SECTION 1: TRADING ACCOUNTS
  // ----------------------------------------------------
  doc.setTextColor(19, 17, 41);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('1. Trading Accounts', 15, y);
  y += 8;

  // Table Header
  doc.setFillColor(230, 230, 240);
  doc.rect(15, y, 180, 8, 'F');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 100);
  doc.text('ACCOUNT NAME', 18, y + 5.5);
  doc.text('TYPE', 75, y + 5.5);
  doc.text('PROP FIRM', 105, y + 5.5);
  doc.text('CAPITAL', 145, y + 5.5);
  doc.text('BALANCE', 170, y + 5.5);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 50);

  if (accounts.length === 0) {
    doc.text('No active trading accounts found.', 18, y + 6);
    y += 10;
  } else {
    accounts.forEach(acc => {
      addPageIfOverflow(10);
      doc.text(acc.name || 'Unnamed', 18, y + 6);
      doc.text(acc.type || 'Live', 75, y + 6);
      doc.text(acc.propFirm || 'N/A', 105, y + 6);
      doc.text(`$${(acc.capital || 0).toLocaleString()}`, 145, y + 6);
      doc.text(`$${(acc.balance || 0).toLocaleString()}`, 170, y + 6);
      
      doc.setDrawColor(240, 240, 245);
      doc.setLineWidth(0.2);
      doc.line(15, y + 10, 195, y + 10);
      y += 10;
    });
  }
  y += 10;

  // ----------------------------------------------------
  // SECTION 2: TRADE RECAPS / LEDGER
  // ----------------------------------------------------
  addPageIfOverflow(25);
  doc.setTextColor(19, 17, 41);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('2. Historical Trade Ledger', 15, y);
  y += 8;

  // Table Header
  doc.setFillColor(230, 230, 240);
  doc.rect(15, y, 180, 8, 'F');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 100);
  doc.text('DATE', 18, y + 5.5);
  doc.text('TICKER', 38, y + 5.5);
  doc.text('MODEL', 58, y + 5.5);
  doc.text('BIAS', 102, y + 5.5);
  doc.text('ACCOUNT', 120, y + 5.5);
  doc.text('RATING', 162, y + 5.5);
  doc.text('NET PnL', 178, y + 5.5);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  if (trades.length === 0) {
    doc.setTextColor(120, 120, 140);
    doc.text('No historical trades found.', 18, y + 6);
    y += 10;
  } else {
    // Sort trades by date descending
    const sortedTrades = [...trades].sort((a,b) => b.date.localeCompare(a.date));
    sortedTrades.forEach(trade => {
      addPageIfOverflow(10);
      const acc = accounts.find(a => a.id === trade.accountId);
      const accName = acc ? acc.name : 'Unknown';
      
      const tradeExecs = executions.filter(e => e.tradeId === trade.id);
      const { netPnL } = calculateTradePnL(trade, tradeExecs);

      doc.setTextColor(40, 40, 50);
      doc.text(trade.date || 'N/A', 18, y + 6);
      doc.text(trade.symbol || 'N/A', 38, y + 6);
      doc.text(trade.model || 'Unmapped', 58, y + 6);
      doc.text(trade.bias || 'LONG', 102, y + 6);
      
      // Truncate account name if too long
      const displayAcc = accName.length > 20 ? accName.substring(0, 18) + '..' : accName;
      doc.text(displayAcc, 120, y + 6);
      doc.text(trade.setupRating || 'N/A', 162, y + 6);

      if (netPnL >= 0) {
        doc.setTextColor(40, 199, 111);
        doc.text(`+$${Math.round(netPnL).toLocaleString()}`, 178, y + 6);
      } else {
        doc.setTextColor(234, 84, 85);
        doc.text(`-$${Math.round(Math.abs(netPnL)).toLocaleString()}`, 178, y + 6);
      }

      doc.setDrawColor(240, 240, 245);
      doc.line(15, y + 10, 195, y + 10);
      y += 10;
    });
  }
  y += 10;

  // ----------------------------------------------------
  // SECTION 3: DAILY JOURNALS
  // ----------------------------------------------------
  addPageIfOverflow(25);
  doc.setTextColor(19, 17, 41);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('3. Daily Journals & Routine Compliance', 15, y);
  y += 8;

  // Table Header
  doc.setFillColor(230, 230, 240);
  doc.rect(15, y, 180, 8, 'F');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 100);
  doc.text('DATE', 18, y + 5.5);
  doc.text('STATUS', 38, y + 5.5);
  doc.text('FOCUS', 68, y + 5.5);
  doc.text('PATIENCE', 88, y + 5.5);
  doc.text('RISK', 110, y + 5.5);
  doc.text('SLEEP', 132, y + 5.5);
  doc.text('HABITS COMPLETED', 155, y + 5.5);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  if (dailyJournals.length === 0) {
    doc.setTextColor(120, 120, 140);
    doc.text('No daily journal entries found.', 18, y + 6);
    y += 10;
  } else {
    const sortedJournals = [...dailyJournals].sort((a,b) => b.date.localeCompare(a.date));
    sortedJournals.forEach(j => {
      addPageIfOverflow(10);
      
      // Calculate habits score
      const habitsList = [
        j.newsChecked, j.htfAnalysisDone, j.liquidityDrawn, j.dailyOpenMapped,
        j.workoutDone, j.dietClean, j.meditationDone, j.homeworkDone
      ];
      const completedCount = habitsList.filter(Boolean).length;
      
      doc.setTextColor(40, 40, 50);
      doc.text(j.date || 'N/A', 18, y + 6);
      doc.text(j.status || 'DRAFT', 38, y + 6);
      doc.text(`${j.mentalFocus || 0}/5`, 68, y + 6);
      doc.text(`${j.patienceLevel || 0}/5`, 88, y + 6);
      doc.text(`${j.riskAdherence || 0}/5`, 110, y + 6);
      doc.text(`${j.sleepHours || 0} hrs (${j.sleepQuality || 0}/5)`, 132, y + 6);
      doc.text(`${completedCount}/${habitsList.length} Habits`, 155, y + 6);

      doc.setDrawColor(240, 240, 245);
      doc.line(15, y + 10, 195, y + 10);
      y += 10;
    });
  }
  y += 10;

  // ----------------------------------------------------
  // SECTION 4: WEEKLY PLANNER STRATEGIES
  // ----------------------------------------------------
  addPageIfOverflow(25);
  doc.setTextColor(19, 17, 41);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('4. Weekly Strategic Planners', 15, y);
  y += 8;

  if (weeklyPlanners.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 140);
    doc.text('No weekly planner entries found.', 18, y + 6);
    y += 10;
  } else {
    const sortedPlanners = [...weeklyPlanners].sort((a,b) => b.weekId.localeCompare(a.weekId));
    sortedPlanners.forEach(p => {
      addPageIfOverflow(45);
      doc.setFillColor(250, 250, 253);
      doc.rect(15, y, 180, 38, 'F');
      doc.setDrawColor(220, 220, 230);
      doc.rect(15, y, 180, 38, 'D');

      doc.setTextColor(19, 17, 41);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(`Week ${p.weekId} (${p.startDate} to ${p.endDate}) - ${p.status || 'ACTIVE'}`, 20, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 75);

      const goals = p.goals || 'No goals specified.';
      const priorities = p.priorities || 'No priorities specified.';
      const review = p.reviewNotes || 'No review notes written.';
      
      const cleanGoals = goals.length > 80 ? goals.substring(0, 78) + '..' : goals;
      const cleanPriorities = priorities.length > 80 ? priorities.substring(0, 78) + '..' : priorities;
      const cleanReview = review.length > 140 ? review.substring(0, 138) + '..' : review;

      doc.text(`• Goals: ${cleanGoals}`, 22, y + 14);
      doc.text(`• Priorities: ${cleanPriorities}`, 22, y + 21);
      doc.text(`• Weekly Review Notes: ${cleanReview}`, 22, y + 28);
      
      y += 44;
    });
  }
  y += 10;

  // ----------------------------------------------------
  // SECTION 5: PHYSICAL WORKOUT LOGS
  // ----------------------------------------------------
  addPageIfOverflow(25);
  doc.setTextColor(19, 17, 41);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('5. Physical Workout History', 15, y);
  y += 8;

  // Table Header
  doc.setFillColor(230, 230, 240);
  doc.rect(15, y, 180, 8, 'F');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 100);
  doc.text('DATE', 18, y + 5.5);
  doc.text('WORKOUT TYPE', 38, y + 5.5);
  doc.text('DURATION', 75, y + 5.5);
  doc.text('EXERCISES COMPLETED & METRICS', 105, y + 5.5);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  if (workouts.length === 0) {
    doc.setTextColor(120, 120, 140);
    doc.text('No physical workouts logged.', 18, y + 6);
    y += 10;
  } else {
    const sortedWorkouts = [...workouts].sort((a,b) => b.date.localeCompare(a.date));
    sortedWorkouts.forEach(w => {
      addPageIfOverflow(15);
      
      doc.setTextColor(40, 40, 50);
      doc.text(w.date || 'N/A', 18, y + 6);
      doc.text(w.type || 'N/A', 38, y + 6);
      doc.text(`${w.duration || 0} mins`, 75, y + 6);
      
      const execString = (w.exercises || []).map(ex => {
        const totalSets = (ex.sets || []).length;
        const bestSet = (ex.sets || []).reduce((best, s) => (s.weight > (best.weight || 0) ? s : best), {});
        return `${ex.name} (${totalSets} sets${bestSet.weight ? `, Max: ${bestSet.weight}kg x ${bestSet.reps}` : ''})`;
      }).join(', ');
      
      const displayExec = execString.length > 60 ? execString.substring(0, 57) + '...' : execString || 'No exercises logged.';
      doc.text(displayExec, 105, y + 6);

      doc.setDrawColor(240, 240, 245);
      doc.line(15, y + 10, 195, y + 10);
      y += 10;
    });
  }

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 170);
    doc.text('HOLLOW INTEGRATED PLATFORM BACKUP — PORTABLE DATA FORMAT', 15, 287);
    doc.text(`Page ${i} of ${totalPages}`, 180, 287);
  }

  return doc;
}

// ----------------------------------------------------
// PREVIOUS WEEK ONLY DATA BACKUP GENERATOR (PDF)
// ----------------------------------------------------
export function generatePreviousWeekBackupPDF(accounts, trades, executions, dailyJournals, weeklyPlanners, groups, workouts, startStr, endStr) {
  const doc = new jsPDF();
  let y = 15;

  const addPageIfOverflow = (heightNeeded) => {
    if (y + heightNeeded > 275) {
      doc.addPage();
      y = 15;
      return true;
    }
    return false;
  };

  // Cover Page or Header
  doc.setFillColor(19, 17, 41); // #131129
  doc.rect(0, 0, 210, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('HOLLOW WEEKLY REPORT', 15, 20);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(157, 118, 250); // Brand violet
  doc.text(`PREVIOUS WEEK DATA: ${startStr} TO ${endStr}`, 15, 28);
  
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 220);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 140, 24);

  y = 55;

  // Filter data to only previous week
  const weekTrades = trades.filter(t => t.date && t.date >= startStr && t.date <= endStr);
  const weekJournals = dailyJournals.filter(j => j.date && j.date >= startStr && j.date <= endStr);
  const weekWorkouts = (workouts || []).filter(w => w.date && w.date >= startStr && w.date <= endStr);
  
  // Weekly planners
  const weekPlannersFiltered = weeklyPlanners.filter(p => {
    return (p.startDate && p.startDate >= startStr && p.startDate <= endStr) ||
           (p.endDate && p.endDate >= startStr && p.endDate <= endStr);
  });

  const tradeIds = new Set(weekTrades.map(t => t.id));
  const weekExecutions = executions.filter(e => tradeIds.has(e.tradeId));

  // 1. Accounts
  doc.setTextColor(19, 17, 41);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Active Accounts', 15, y);
  y += 6;
  
  if (accounts.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('No active accounts.', 18, y + 4);
    y += 10;
  } else {
    accounts.forEach(acc => {
      addPageIfOverflow(10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.text(`• ${acc.name} (${acc.type || 'Live'}) - Balance: $${(acc.balance || 0).toLocaleString()}`, 18, y + 4);
      y += 8;
    });
  }
  
  y += 6;

  // 2. Trades of the week
  addPageIfOverflow(20);
  doc.setTextColor(19, 17, 41);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Trading Ledger (Previous Week)', 15, y);
  y += 6;

  if (weekTrades.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('No trades logged in this period.', 18, y + 4);
    y += 10;
  } else {
    // Table Header
    doc.setFillColor(230, 230, 240);
    doc.rect(15, y, 180, 8, 'F');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 100);
    doc.text('DATE', 18, y + 5.5);
    doc.text('TICKER', 38, y + 5.5);
    doc.text('MODEL', 58, y + 5.5);
    doc.text('BIAS', 102, y + 5.5);
    doc.text('WL STATUS', 125, y + 5.5);
    doc.text('NET PnL', 165, y + 5.5);
    y += 8;

    weekTrades.forEach(trade => {
      addPageIfOverflow(10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 50);
      doc.text(trade.date || 'N/A', 18, y + 5);
      doc.text(trade.symbol || 'N/A', 38, y + 5);
      doc.text(trade.model || 'Unmapped', 58, y + 5);
      doc.text(trade.bias || 'LONG', 102, y + 5);
      
      const wlText = trade.wl || (trade.netPnL > 0 ? 'Win' : 'Loss');
      doc.text(wlText, 125, y + 5);

      const tradeExecs = weekExecutions.filter(e => e.tradeId === trade.id);
      const { netPnL } = calculateTradePnL(trade, tradeExecs);
      
      if (netPnL >= 0) {
        doc.setTextColor(40, 199, 111);
        doc.text(`+$${Math.round(netPnL).toLocaleString()}`, 165, y + 5);
      } else {
        doc.setTextColor(234, 84, 85);
        doc.text(`-$${Math.round(Math.abs(netPnL)).toLocaleString()}`, 165, y + 5);
      }
      y += 8;
    });
  }

  y += 6;

  // 3. Daily Journals
  addPageIfOverflow(20);
  doc.setTextColor(19, 17, 41);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Daily Routine Compliance (Previous Week)', 15, y);
  y += 6;

  if (weekJournals.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('No daily journal entries logged.', 18, y + 4);
    y += 10;
  } else {
    weekJournals.forEach(j => {
      addPageIfOverflow(10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      doc.text(`• ${j.date} (Status: ${j.status || 'DRAFT'}) - Focus: ${j.mentalFocus || 0}/5, Patience: ${j.patienceLevel || 0}/5, Risk: ${j.riskAdherence || 0}/5`, 18, y + 4);
      y += 8;
    });
  }

  y += 6;

  // 4. Weekly Planners
  addPageIfOverflow(20);
  doc.setTextColor(19, 17, 41);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Weekly Strategic Planning', 15, y);
  y += 6;

  if (weekPlannersFiltered.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('No weekly planner configured.', 18, y + 4);
    y += 10;
  } else {
    weekPlannersFiltered.forEach(p => {
      addPageIfOverflow(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.text(`Week ${p.weekId}:`, 18, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Goals: ${p.goals || 'None'}`, 20, y + 10);
      doc.text(`Priorities: ${p.priorities || 'None'}`, 20, y + 16);
      y += 22;
    });
  }

  y += 6;

  // 5. Workouts
  addPageIfOverflow(20);
  doc.setTextColor(19, 17, 41);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Workout History', 15, y);
  y += 6;

  if (weekWorkouts.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('No workouts logged.', 18, y + 4);
    y += 10;
  } else {
    weekWorkouts.forEach(w => {
      addPageIfOverflow(10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      doc.text(`• ${w.date} - Type: ${w.type || 'Workout'}, Duration: ${w.duration || 0} mins`, 18, y + 4);
      y += 8;
    });
  }

  // Page Numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 170);
    doc.text('HOLLOW INTEGRATED PREVIOUS WEEK BACKUP PDF', 15, 287);
    doc.text(`Page ${i} of ${totalPages}`, 180, 287);
  }

  return doc;
}
