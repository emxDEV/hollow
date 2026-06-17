export function getSymbolMultiplier(symbol) {
  if (!symbol) return 1;
  switch (symbol.toUpperCase()) {
    case 'NQ': return 20;     // NQ futures: $20 per full point
    case 'ES': return 50;     // ES futures: $50 per full point
    case 'GC': return 100;    // GC (Gold) futures: $100 per full dollar
    case 'CL': return 1000;   // CL (Crude Oil) futures: $1000 per full dollar
    case 'EURUSD': return 100000; // EURUSD forex: $100,000 per lot (standard sizing)
    default: return 1;        // Stock shares / simple multipliers
  }
}

export function isTradeBE(trade) {
  if (!trade) return false;
  const wl = (trade.wl || '').toLowerCase();
  if (wl.includes('be')) return true;
  // Fallback for older trades without wl populated
  if (trade.netPnL === 0 && trade.status === 'CLOSED') return true;
  return false;
}

export function isTradeWinRateEligible(trade) {
  if (!trade) return false;
  const wl = (trade.wl || '').toLowerCase();
  
  // Explicitly ignore these
  if (wl.includes('be') || wl === 'tape') {
    return false;
  }
  
  // If it's explicitly 'win' or 'loss', it counts
  if (wl === 'win' || wl === 'loss') {
    return true;
  }
  
  // Fallback for older trades without wl explicitly set but with netPnL
  if (trade.netPnL !== undefined && trade.netPnL !== 0) {
    return true;
  }
  return false;
}

export function calculateTradePnL(trade, executions) {
  if (!executions || executions.length === 0) {
    return {
      avgEntry: 0,
      avgExit: 0,
      contracts: 0,
      grossPnL: 0,
      commissions: 0,
      netPnL: 0
    };
  }

  const entries = executions.filter(e => e.type === 'ENTRY');
  const exits = executions.filter(e => e.type === 'EXIT');

  if (entries.length === 0) {
    return {
      avgEntry: 0,
      avgExit: 0,
      contracts: 0,
      grossPnL: 0,
      commissions: 0,
      netPnL: 0
    };
  }

  // Calculate entries metrics
  let totalEntryContracts = 0;
  let totalEntryVal = 0;
  let totalCommissions = 0;

  entries.forEach(e => {
    totalEntryContracts += e.contracts;
    totalEntryVal += e.price * e.contracts;
    totalCommissions += e.commissions;
  });

  // Calculate exits metrics
  let totalExitContracts = 0;
  let totalExitVal = 0;

  exits.forEach(e => {
    totalExitContracts += e.contracts;
    totalExitVal += e.price * e.contracts;
    totalCommissions += e.commissions;
  });

  const avgEntry = totalEntryContracts > 0 ? (totalEntryVal / totalEntryContracts) : 0;
  const avgExit = totalExitContracts > 0 ? (totalExitVal / totalExitContracts) : 0;
  const contracts = Math.max(totalEntryContracts, totalExitContracts);

  const multiplier = getSymbolMultiplier(trade.symbol);
  let grossPnL = 0;

  if (totalExitContracts > 0) {
    // If trade is closed, calculate gross PnL
    const biasFactor = trade.bias === 'LONG' ? 1 : -1;
    
    if (trade.symbol?.toUpperCase() === 'EURUSD') {
      // Forex specific pip-based profit math
      // (Exit Price - Entry Price) * Units (contracts)
      grossPnL = (avgExit - avgEntry) * contracts * biasFactor;
    } else {
      // Futures and standard contracts
      // (Exit Price - Entry Price) * Contracts * Multiplier
      grossPnL = (avgExit - avgEntry) * contracts * multiplier * biasFactor;
    }
  }

  const overridePnL = trade && trade.manualPnL !== undefined && trade.manualPnL !== '' && trade.manualPnL !== null
    ? parseFloat(trade.manualPnL)
    : null;

  const netPnL = overridePnL !== null ? overridePnL : grossPnL - totalCommissions;
  const finalGrossPnL = overridePnL !== null ? overridePnL : grossPnL;

  return {
    avgEntry,
    avgExit,
    contracts,
    grossPnL: finalGrossPnL,
    commissions: totalCommissions,
    netPnL
  };
}

export function calculateAccountStatistics(trades, allExecutions) {
  let winCount = 0;
  let lossCount = 0;
  let totalWinPnL = 0;
  let totalLossPnL = 0;
  let totalNetPnL = 0;
  let totalRMultiple = 0;
  let eligibleTradesCount = 0;

  trades.forEach(trade => {
    const tradeExecs = allExecutions.filter(e => e.tradeId === trade.id);
    const { netPnL } = calculateTradePnL(trade, tradeExecs);
    
    totalNetPnL += netPnL;

    // We augment the trade object temporarily so helpers can work directly on it
    const virtualTrade = { ...trade, netPnL };

    if (netPnL > 0) {
      totalWinPnL += netPnL;
    } else if (netPnL < 0) {
      totalLossPnL += Math.abs(netPnL);
    }

    if (isTradeWinRateEligible(virtualTrade)) {
      eligibleTradesCount++;
      if (netPnL > 0) {
        winCount++;
      } else if (netPnL < 0) {
        lossCount++;
      }
    }

    // Estimate R-Multiple based on mock parameters if populated
    // R = Profit / Risk
    // Let's assume average reward-to-risk sizing based on sl_pips or target
    // If not, we map it to average risk percentage
    const slPips = trade.sl_pips || 20;
    const sizeMultiplier = getSymbolMultiplier(trade.symbol);
    const estimatedRisk = slPips * (tradeExecs.filter(e => e.type === 'ENTRY').reduce((acc, e) => acc + e.contracts, 0) || 1) * sizeMultiplier;
    
    if (estimatedRisk > 0) {
      totalRMultiple += netPnL / estimatedRisk;
    }
  });

  const totalTrades = trades.length;
  const winRate = eligibleTradesCount > 0 ? (winCount / eligibleTradesCount) * 100 : 0;
  const profitFactor = totalLossPnL > 0 ? (totalWinPnL / totalLossPnL) : (totalWinPnL > 0 ? 9.99 : 0);
  const avgRMultiple = totalTrades > 0 ? (totalRMultiple / totalTrades) : 0;

  return {
    totalTrades,
    winRate,
    profitFactor,
    avgRMultiple,
    totalNetPnL
  };
}
