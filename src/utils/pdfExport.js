import { jsPDF } from 'jspdf';
import { calculateTradePnL } from './tradeMath';

export function getISOWeekId(date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
  return `${target.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function getWeekDates(weekId) {
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return { start: '2024-06-17', end: '2024-06-23' };
  const year = Number(match[1]);
  const week = Number(match[2]);
  
  const simple = new Date(year, 0, 4);
  const day = simple.getDay() || 7;
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - day + 1);
  
  const targetMonday = new Date(monday);
  targetMonday.setDate(monday.getDate() + (week - 1) * 7);
  
  const targetSunday = new Date(targetMonday);
  targetSunday.setDate(targetMonday.getDate() + 6);
  
  return {
    start: targetMonday.toISOString().split('T')[0],
    end: targetSunday.toISOString().split('T')[0]
  };
}

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
