import type { CalcResult, PlanOption } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────
export const MONTHLY_LIMIT = 1000;   // บาท
export const DAILY_CAP = 200;        // บาท (สูงสุดที่รัฐช่วย/วัน)
export const GOV_RATIO = 0.6;        // 60%
export const SELF_RATIO = 0.4;       // 40%

/**
 * คำนวณว่าซื้อสินค้าราคา `itemPrice` บาท
 * รัฐช่วยเท่าไหร่ / จ่ายเองเท่าไหร่
 */
export function calcPayment(itemPrice: number): CalcResult {
  if (itemPrice <= 0) {
    return { itemPrice: 0, govPays: 0, selfPays: 0, cappedAt: null, isOverDailyCap: false };
  }

  const rawGov = itemPrice * GOV_RATIO;
  const isOverDailyCap = rawGov > DAILY_CAP;
  const govPays = Math.min(rawGov, DAILY_CAP);
  const selfPays = itemPrice - govPays;

  return {
    itemPrice,
    govPays: Math.round(govPays * 100) / 100,
    selfPays: Math.round(selfPays * 100) / 100,
    cappedAt: isOverDailyCap ? DAILY_CAP : null,
    isOverDailyCap,
  };
}

/**
 * ราคาสินค้าสูงสุดที่รัฐยังช่วยเต็มที่ (ไม่ถูก cap)
 * = 200 / 0.6 = 333.33 บาท
 */
export const MAX_FULL_BENEFIT_PRICE = DAILY_CAP / GOV_RATIO; // ~333.33

/**
 * คำนวณว่า G-Wallet `gWallet` บาท จะซื้อสินค้าได้มูลค่าเท่าไหร่ต่อวัน
 * โดยรัฐช่วย 60% (สูงสุด 200 บาท)
 * G-Wallet ของผู้ใช้ = selfPays = itemPrice * 40% (หรือ itemPrice - min(60%, 200))
 *
 * ถ้า govCap ไม่เกิน → itemPrice = gWallet / 0.4
 * ถ้าเกิน govCap → itemPrice = gWallet + 200
 */
export function calcMaxItemFromWallet(gWallet: number): number {
  if (gWallet <= 0) return 0;
  // ลองก่อน: ถ้ารัฐช่วย 60% ไม่เกิน 200 บาท
  const priceNoCapHit = gWallet / SELF_RATIO;
  const govWouldPay = priceNoCapHit * GOV_RATIO;
  if (govWouldPay <= DAILY_CAP) {
    return Math.round(priceNoCapHit * 100) / 100;
  }
  // ถ้าเกิน: รัฐช่วย 200 บาทเต็ม, ผู้ใช้จ่ายส่วนที่เกิน
  return Math.round((gWallet + DAILY_CAP) * 100) / 100;
}

/**
 * สร้างแผนการใช้งบเดือน
 * `gWalletBudget` = เงินใน G-Wallet (ที่ผู้ใช้มีเอง) ทั้งเดือน
 * ระบบจะคำนวณว่าแต่ละวันควรซื้อสินค้ามูลค่าเท่าไหร่ เพื่อให้ใช้สิทธิรัฐได้คุ้มที่สุด
 *
 * เงินที่ผู้ใช้จ่ายต่อวัน = selfPerDay
 * ราคาสินค้า = selfPerDay / 0.4 (ถ้าไม่เกิน cap)
 *            หรือ selfPerDay + 200 (ถ้าเกิน cap)
 */
export function buildPlanOptions(gWalletBudget: number): PlanOption[] {
  if (gWalletBudget <= 0) return [];

  const walletBudget = gWalletBudget; // เงิน G-Wallet ทั้งเดือด
  const daysInMonth = 30;
  const plans: PlanOption[] = [];

  // helper: จาก selfPay/วัน → ราคาสินค้า + govPay
  function fromSelf(selfPerDay: number) {
    const priceNoCap = selfPerDay / SELF_RATIO;
    const govNoCap = priceNoCap * GOV_RATIO;
    if (govNoCap <= DAILY_CAP) {
      return { price: priceNoCap, gov: govNoCap, self: selfPerDay };
    }
    // cap: รัฐช่วย 200 บาท, ผู้ใช้จ่ายส่วนที่เกิน
    return { price: selfPerDay + DAILY_CAP, gov: DAILY_CAP, self: selfPerDay };
  }

  // ─── แผน 1: กระจายใช้ทุกวันเท่า ๆ กัน ────────────────────────────
  const selfPerDayEven = walletBudget / daysInMonth;
  const even = fromSelf(selfPerDayEven);
  plans.push({
    label: 'ใช้ทุกวันเท่า ๆ กัน',
    daysNeeded: daysInMonth,
    dailySpend: Math.round(even.price * 100) / 100,
    govPerDay: Math.round(even.gov * 100) / 100,
    selfPerDay: Math.round(even.self * 100) / 100,
    description: `ซื้อสินค้าวันละ ~${fmt(even.price)} บาท ทุกวัน ครบ 30 วัน`,
  });

  // ─── แผน 2: ใช้สิทธิรัฐเต็ม 200 บาท/วัน (G-Wallet ≥ 133.33/วัน) ─
  // selfPerDay ที่ทำให้รัฐช่วยพอดี 200 บาท = 333.33 * 0.4 = 133.33
  const selfForFullCap = MAX_FULL_BENEFIT_PRICE * SELF_RATIO; // 133.33
  const daysCanAfford = Math.floor(walletBudget / selfForFullCap);
  if (daysCanAfford >= 1) {
    plans.push({
      label: 'ใช้สิทธิเต็มทุกวัน (คุ้มสุด)',
      daysNeeded: daysCanAfford,
      dailySpend: Math.round(MAX_FULL_BENEFIT_PRICE * 100) / 100,
      govPerDay: DAILY_CAP,
      selfPerDay: Math.round(selfForFullCap * 100) / 100,
      description: `ซื้อสินค้าวันละ ~${fmt(MAX_FULL_BENEFIT_PRICE)} บาท รัฐช่วยเต็ม ${daysCanAfford} วัน`,
    });
  } else {
    // งบไม่พอใช้สิทธิเต็ม → ใช้สิทธิบางส่วน
    const partial = fromSelf(walletBudget);
    plans.push({
      label: 'ใช้ครั้งเดียวหมด',
      daysNeeded: 1,
      dailySpend: Math.round(partial.price * 100) / 100,
      govPerDay: Math.round(partial.gov * 100) / 100,
      selfPerDay: Math.round(partial.self * 100) / 100,
      description: `ซื้อสินค้า ${fmt(partial.price)} บาทครั้งเดียว รัฐช่วย ${fmt(partial.gov)} บาท`,
    });
  }

  const weeksInMonth = Math.floor(daysInMonth / 7);
  const selfPerWeek = walletBudget / weeksInMonth;
  const weekly = fromSelf(selfPerWeek);
  plans.push({
    label: 'ใช้สัปดาห์ละครั้ง',
    daysNeeded: weeksInMonth,
    dailySpend: Math.round(weekly.price * 100) / 100,
    govPerDay: Math.round(weekly.gov * 100) / 100,
    selfPerDay: Math.round(weekly.self * 100) / 100,
    description: `ซื้อสินค้าสัปดาห์ละ ~${fmt(weekly.price)} บาท ทุก 7 วัน`,
  });

  return plans;
}

export function smartSuggestion(govRemaining: number, daysLeft: number): number {
  if (govRemaining <= 0 || daysLeft <= 0) return 0;
  const govPerDay = govRemaining / daysLeft;
  const cappedGov = Math.min(govPerDay, DAILY_CAP);
  const price = cappedGov / GOV_RATIO;
  return Math.round(price * 100) / 100;
}

export function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtInt(n: number): string {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 });
}

export function daysLeftInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate() + 1;
}

export function thaiMonth(): string {
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  return months[new Date().getMonth()];
}
