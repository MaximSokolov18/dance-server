const DAY_NUM: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
};

function toLocalIso(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Walk forward from periodStart counting class days (group weekdays that are
 * not holidays). Counts classesTotal + illnesses slots total — illnesses add
 * makeup days that extend the period. Returns ISO date of the last class.
 */
export function calcPeriodEnd(
    periodStart: string,
    weekDays: string[],
    classesTotal: number,
    illnesses: number,
    holidayDates: string[],
): string {
    const totalSlots = classesTotal + Math.max(0, illnesses);
    const classDayNums = new Set(weekDays.map(d => DAY_NUM[d]).filter(n => n !== undefined));
    const holidaySet = new Set(holidayDates);

    const cursor = new Date(`${periodStart}T00:00:00`);
    let counted = 0;
    const MAX_DAYS = 1825; // ~5 years safety limit

    for (let i = 0; i < MAX_DAYS; i++) {
        const iso = toLocalIso(cursor);
        if (classDayNums.has(cursor.getDay()) && !holidaySet.has(iso)) {
            counted++;
            if (counted === totalSlots) return iso;
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    throw new Error('Could not calculate period end: no result within 5 years');
}
