// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface QuotaState {
  monthlyUsed: number;       // บาทที่ใช้ไปแล้วในเดือนนี้ (รวมส่วนที่รัฐช่วย)
  monthlyLimit: number;      // 1000 บาท/เดือน
  dailyLimit: number;        // 200 บาท/วัน
  resetDay: number;          // 1 = รีเซ็ตวันที่ 1 ของเดือน
}

export interface CalcResult {
  itemPrice: number;         // ราคาสินค้า
  govPays: number;           // รัฐช่วยจ่าย (60%)
  selfPays: number;          // ผู้ใช้จ่ายเอง (40%)
  cappedAt: number | null;   // ถ้า > 200 บาทรัฐ → capped
  isOverDailyCap: boolean;   // ราคาสินค้าเกินเพดาน 200 บาทรัฐหรือไม่
}

export interface PlanOption {
  label: string;
  daysNeeded: number;
  dailySpend: number;        // ราคาสินค้าต่อวัน
  govPerDay: number;
  selfPerDay: number;
  description: string;
}

export type AppPage = 'home' | 'calculator' | 'planner' | 'tracker' | 'explain' | 'faq';

export type SimpleMode = boolean;
