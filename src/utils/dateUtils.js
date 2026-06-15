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
