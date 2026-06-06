import { useState } from 'react';
import {
  calcPayment,
  calcMaxItemFromWallet,
  fmt,
  fmtInt,
  MAX_FULL_BENEFIT_PRICE,
  DAILY_CAP,
  SELF_RATIO,
  GOV_RATIO,
} from '../utils/calc';
import type { CalcResult } from '../types';
import styles from './Calculator.module.css';

type Tab = 'price' | 'gov' | 'wallet';

// สิทธิ govRemaining บาท → ราคาสินค้าสูงสุด
function maxPriceFromGov(gov: number) {
  return gov > 0 ? Math.round((gov / GOV_RATIO) * 100) / 100 : 0;
}

// G-Wallet สำหรับใช้สิทธิเต็ม 200 บาท
const WALLET_FOR_FULL = Math.round(MAX_FULL_BENEFIT_PRICE * SELF_RATIO * 100) / 100;

const TABS: { id: Tab; label: string }[] = [
  { id: 'price',  label: 'ราคาสินค้า' },
  { id: 'gov',    label: 'สิทธิคงเหลือ' },
  { id: 'wallet', label: 'G-Wallet' },
];

export default function Calculator() {
  const [tab, setTab] = useState<Tab>('price');

  // Tab: ราคาสินค้า
  const [priceInput, setPriceInput] = useState('');
  const [priceResult, setPriceResult] = useState<CalcResult | null>(null);

  // Tab: สิทธิคงเหลือ
  const [govInput, setGovInput] = useState('');

  // Tab: G-Wallet
  const [walletInput, setWalletInput] = useState('');

  /* ── handlers: ราคาสินค้า ── */
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
      setPriceInput(val);
      const p = parseFloat(val);
      setPriceResult(!isNaN(p) && p > 0 ? calcPayment(p) : null);
    }
  };

  /* ── handlers: สิทธิคงเหลือ ── */
  const handleGovChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(val) || val === '') setGovInput(val);
  };

  /* ── handlers: G-Wallet ── */
  const handleWalletChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(val) || val === '') setWalletInput(val);
  };

  /* ── derived: ราคาสินค้า ── */
  const price = parseFloat(priceInput) || 0;
  const govPct   = priceResult ? (priceResult.govPays  / priceResult.itemPrice) * 100 : 60;
  const selfPct  = priceResult ? (priceResult.selfPays / priceResult.itemPrice) * 100 : 40;

  /* ── derived: สิทธิคงเหลือ ── */
  const govRem     = Math.min(parseFloat(govInput) || 0, DAILY_CAP);
  const hasGov     = govInput !== '' && parseFloat(govInput) >= 0;
  const govIsZero  = hasGov && govRem === 0;
  const govMaxPrice   = maxPriceFromGov(govRem);
  const govWalletNeed = Math.round(govMaxPrice * SELF_RATIO * 100) / 100;
  const govRemPct  = (govRem / DAILY_CAP) * 100;
  const govStatus  = govRemPct <= 0 ? 'danger' : govRemPct <= 25 ? 'warning' : 'good';
  const govStatusText = govIsZero ? 'ใช้สิทธิหมดวันนี้' : govRemPct <= 25 ? 'เหลือน้อยแล้ว' : 'ยังมีสิทธิเหลือ';

  /* ── derived: G-Wallet ── */
  const wallet      = parseFloat(walletInput) || 0;
  const hasWallet   = wallet > 0;
  const maxItem     = calcMaxItemFromWallet(wallet);
  const walletCalc  = hasWallet ? calcPayment(maxItem) : null;
  const govBonus    = walletCalc?.govPays ?? 0;
  const isFull      = wallet >= WALLET_FOR_FULL;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>คำนวณ</h1>

      {/* ── Tab Bar ── */}
      <div className={styles.tabs} role="tablist" aria-label="โหมดคำนวณ">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            id={`tab-${t.id}`}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          PANEL 1 — ราคาสินค้า
      ══════════════════════════════════════════ */}
      <div id="panel-price" role="tabpanel" aria-labelledby="tab-price" hidden={tab !== 'price'}>
        <div className={styles.panel}>
          <p className={styles.panelDesc}>ใส่ราคาสินค้า แล้วดูว่ารัฐช่วยเท่าไหร่ และต้องจ่าย G-Wallet เท่าไหร่</p>

          <div className={styles.inputCard}>
            <label htmlFor="price-input" className={styles.inputLabel}>ราคาสินค้า / บริการ (บาท)</label>
            <div className={styles.inputRow}>
              <span className={styles.inputPfx} aria-hidden="true">฿</span>
              <input
                id="price-input" type="number" inputMode="decimal"
                className={styles.input} value={priceInput}
                onChange={handlePriceChange} placeholder="0.00"
                min="0" step="0.01" autoFocus={tab === 'price'}
                aria-describedby="price-hint"
              />
              {priceInput && (
                <button type="button" className={styles.clearBtn}
                  onClick={() => { setPriceInput(''); setPriceResult(null); }}
                  aria-label="ล้างข้อมูล">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
            <p id="price-hint" className={styles.hint}>
              รัฐช่วยสูงสุด <strong>200 บาท/วัน</strong> — ซื้อไม่เกิน ฿{fmt(MAX_FULL_BENEFIT_PRICE, 0)} ได้สิทธิเต็ม
            </p>
          </div>

          <div className={styles.quickSection}>
            <p className={styles.quickLabel}>ราคาที่ใช้บ่อย</p>
            <div className={styles.quickGrid} role="group">
              {[40, 100, 150, 200, 250, 333].map((a) => (
                <button key={a} type="button"
                  className={`${styles.qBtn} ${price === a && priceInput ? styles.qBtnActive : ''}`}
                  onClick={() => { setPriceInput(String(a)); setPriceResult(calcPayment(a)); }}
                  aria-pressed={price === a && !!priceInput}>
                  ฿{fmtInt(a)}
                </button>
              ))}
            </div>
          </div>

          {priceResult ? (
            <section className={styles.result} aria-live="polite">
              {priceResult.isOverDailyCap && (
                <div className={styles.warn} role="alert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>รัฐช่วยสูงสุด <strong>200 บาท/วัน</strong> — ส่วนเกินจ่ายเอง</span>
                </div>
              )}

              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>ราคาสินค้า</span>
                <span className={styles.summaryValue}>฿{fmt(priceResult.itemPrice)}</span>
              </div>

              <div className={styles.bar} aria-hidden="true">
                <div className={styles.barGov} style={{ width: `${govPct}%` }} />
                <div className={styles.barSelf} />
              </div>

              <div className={styles.cards}>
                <div className={styles.card} data-type="gov">
                  <div className={styles.cardIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardTitle}>สิทธิไทยช่วยไทยพลัส</div>
                    <div className={styles.cardSub}>({govPct.toFixed(0)}%{priceResult.isOverDailyCap ? ' — ถูก cap' : ''})</div>
                  </div>
                  <div className={styles.cardAmt} data-type="gov">฿{fmt(priceResult.govPays)}</div>
                </div>

                <div className={styles.card} data-type="self">
                  <div className={styles.cardIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                    </svg>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardTitle}>G-Wallet ของคุณ</div>
                    <div className={styles.cardSub}>({selfPct.toFixed(0)}%)</div>
                  </div>
                  <div className={styles.cardAmt} data-type="self">฿{fmt(priceResult.selfPays)}</div>
                </div>
              </div>
            </section>
          ) : (
            <div className={styles.empty} aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.emptyIcon}>
                <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/>
              </svg>
              <p>ใส่ราคาสินค้าเพื่อดูผลการคำนวณ</p>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          PANEL 2 — สิทธิคงเหลือวันนี้
      ══════════════════════════════════════════ */}
      <div id="panel-gov" role="tabpanel" aria-labelledby="tab-gov" hidden={tab !== 'gov'}>
        <div className={styles.panel}>
          <p className={styles.panelDesc}>ใส่มูลค่าสิทธิไทยช่วยไทยพลัสที่ใช้ได้วันนี้ แล้วดูว่าซื้อสินค้าได้เท่าไหร่</p>

          <div className={styles.inputCard}>
            <label htmlFor="gov-input" className={styles.inputLabel}>มูลค่าคงเหลือวันนี้ (บาท)</label>
            <div className={styles.inputRow}>
              <span className={styles.inputPfx} aria-hidden="true">฿</span>
              <input
                id="gov-input" type="number" inputMode="decimal"
                className={styles.input} value={govInput}
                onChange={handleGovChange} placeholder="0.00"
                min="0" max="200" autoFocus={tab === 'gov'}
                aria-describedby="gov-hint"
              />
              <span className={styles.inputSfx} aria-hidden="true">/ {fmtInt(DAILY_CAP)}</span>
            </div>

            {hasGov && (
              <div className={styles.dayBar} aria-hidden="true">
                <div className={`${styles.dayBarFill} ${styles[`dayFill_${govStatus}`]}`}
                  style={{ width: `${Math.max(govRemPct, 0)}%` }} />
              </div>
            )}
            {hasGov && (
              <div className={styles.dayBarLabels}>
                <span>ใช้ไปแล้ว <strong>฿{fmtInt(DAILY_CAP - govRem)}</strong></span>
                <span>เหลือ <strong>฿{fmtInt(govRem)}</strong></span>
              </div>
            )}

            <p id="gov-hint" className={styles.hint}>
              ดูได้ในแอปเป๋าตัง → ไทยช่วยไทยพลัส — สูงสุด <strong>200 บาท/วัน</strong>
            </p>
          </div>

          <div className={styles.quickSection}>
            <p className={styles.quickLabel}>มูลค่าที่ใช้บ่อย</p>
            <div className={styles.quickGrid} role="group">
              {[50, 100, 150, 200].map((a) => (
                <button key={a} type="button"
                  className={`${styles.qBtn} ${govRem === a && hasGov ? styles.qBtnActive : ''}`}
                  onClick={() => setGovInput(String(a))}
                  aria-pressed={govRem === a && hasGov}>
                  ฿{a}
                </button>
              ))}
            </div>
          </div>

          {hasGov && !govIsZero && (
            <section className={styles.result} aria-live="polite">
              <div className={`${styles.statusBadge} ${styles[`status_${govStatus}`]}`}>
                <span className={styles.statusDot} aria-hidden="true" />{govStatusText}
              </div>

              <div className={styles.heroCard}>
                <div className={styles.heroLabel}>ซื้อสินค้าได้มูลค่าสูงสุด</div>
                <div className={styles.heroAmt}>฿{fmt(govMaxPrice)}</div>
                <div className={styles.heroSub}>จากสิทธิที่เหลือ ฿{fmt(govRem)} วันนี้</div>
              </div>

              <div className={styles.keyCards} role="list">
                <div className={styles.keyCard} data-type="gov" role="listitem">
                  <div className={styles.keyIcon}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  <div className={styles.keyLabel}>สิทธิไทยช่วยไทยพลัส</div>
                  <div className={styles.keyVal} data-type="gov">฿{fmt(govRem)}</div>
                  <div className={styles.keySub}>รัฐช่วยจ่ายให้</div>
                </div>

                <div className={styles.keyCard} data-type="self" role="listitem">
                  <div className={styles.keyIcon}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="5" width="20" height="14" rx="2"/>
                      <line x1="2" y1="10" x2="22" y2="10"/>
                    </svg>
                  </div>
                  <div className={styles.keyLabel}>ต้องเตรียม G-Wallet</div>
                  <div className={styles.keyVal} data-type="self">฿{fmt(govWalletNeed)}</div>
                  <div className={styles.keySub}>ส่วนที่ต้องจ่ายเอง</div>
                </div>
              </div>

              {govRem >= DAILY_CAP && (
                <div className={styles.tip}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ color:'#F59E0B', flexShrink:0, marginTop:1 }} aria-hidden="true">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span>ซื้อสินค้าไม่เกิน <strong>฿{fmt(MAX_FULL_BENEFIT_PRICE, 0)}</strong> ใช้สิทธิ 200 บาทพอดี — คุ้มที่สุด</span>
                </div>
              )}
            </section>
          )}

          {govIsZero && (
            <div className={styles.exhausted} role="alert">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <h3>สิทธิวันนี้ใช้หมดแล้ว</h3>
              <p>พรุ่งนี้สิทธิรายวันจะรีเซ็ตกลับมา <strong>200 บาท</strong> ใหม่</p>
            </div>
          )}

          {!hasGov && (
            <div className={styles.empty} aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.emptyIcon}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <p>ใส่มูลค่าสิทธิที่เหลือวันนี้<br/>เพื่อดูว่าซื้อได้อะไรบ้าง</p>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          PANEL 3 — G-Wallet
      ══════════════════════════════════════════ */}
      <div id="panel-wallet" role="tabpanel" aria-labelledby="tab-wallet" hidden={tab !== 'wallet'}>
        <div className={styles.panel}>
          <p className={styles.panelDesc}>ใส่ยอด G-Wallet ที่มี แล้วดูว่าซื้อสินค้าได้มูลค่าเท่าไหร่ และรัฐช่วยเพิ่มเท่าไหร่</p>

          <div className={styles.inputCard}>
            <label htmlFor="wallet-input" className={styles.inputLabel}>ยอด G-Wallet ของคุณ (บาท)</label>
            <div className={styles.inputRow}>
              <span className={styles.inputPfx} aria-hidden="true">฿</span>
              <input
                id="wallet-input" type="number" inputMode="decimal"
                className={styles.input} value={walletInput}
                onChange={handleWalletChange} placeholder="0.00"
                min="0" autoFocus={tab === 'wallet'}
                aria-describedby="wallet-hint"
              />
              {walletInput && (
                <button type="button" className={styles.clearBtn}
                  onClick={() => setWalletInput('')} aria-label="ล้างข้อมูล">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
            <p id="wallet-hint" className={styles.hint}>
              G-Wallet คือเงินที่คุณเติมเอง — รัฐเพิ่มให้อีก 60% สูงสุด <strong>200 บาท/วัน</strong>
            </p>
          </div>

          <div className={styles.quickSection}>
            <p className={styles.quickLabel}>ลองดูตัวอย่าง</p>
            <div className={styles.quickGrid} role="group">
              {[50, 100, 133, 200, 300, 500].map((a) => (
                <button key={a} type="button"
                  className={`${styles.qBtn} ${wallet === a && hasWallet ? styles.qBtnActive : ''}`}
                  onClick={() => setWalletInput(String(a))}
                  aria-pressed={wallet === a && hasWallet}>
                  ฿{fmtInt(a)}
                </button>
              ))}
            </div>
          </div>

          {hasWallet && walletCalc && (
            <section className={styles.result} aria-live="polite">
              <div className={styles.heroCard}>
                <div className={styles.heroLabel}>ซื้อสินค้าได้มูลค่าสูงสุด</div>
                <div className={styles.heroAmt}>฿{fmt(maxItem)}</div>
                <div className={styles.heroSub}>G-Wallet ฿{fmt(wallet)} + รัฐช่วย ฿{fmt(govBonus)}</div>
                {isFull && (
                  <div className={styles.heroBadge}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    ได้สิทธิรัฐเต็ม 200 บาทพอดี
                  </div>
                )}
              </div>

              <div className={styles.cards}>
                <div className={styles.card} data-type="gov">
                  <div className={styles.cardIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardTitle}>รัฐช่วยเพิ่มให้</div>
                    <div className={styles.cardSub}>{walletCalc.isOverDailyCap ? 'เต็ม cap แล้ว' : 'สิทธิไทยช่วยไทยพลัส'}</div>
                  </div>
                  <div className={styles.cardAmt} data-type="gov">฿{fmt(govBonus)}</div>
                </div>

                <div className={styles.card} data-type="self">
                  <div className={styles.cardIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="5" width="20" height="14" rx="2"/>
                      <line x1="2" y1="10" x2="22" y2="10"/>
                    </svg>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardTitle}>G-Wallet ของคุณ</div>
                    <div className={styles.cardSub}>เงินที่คุณจ่ายจริง</div>
                  </div>
                  <div className={styles.cardAmt} data-type="self">฿{fmt(wallet)}</div>
                </div>
              </div>

              {walletCalc.isOverDailyCap && (
                <div className={styles.warn} role="alert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>รัฐช่วยสูงสุด <strong>200 บาท/วัน</strong> แม้ G-Wallet จะมีมากกว่า ฿{fmt(WALLET_FOR_FULL)}</span>
                </div>
              )}

              {!isFull && (
                <div className={styles.tip}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ color:'#F59E0B', flexShrink:0, marginTop:1 }} aria-hidden="true">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span>เติม G-Wallet ถึง <strong>฿{fmt(WALLET_FOR_FULL)}</strong> รัฐช่วยเต็ม <strong>200 บาท</strong> — คุ้มสุด</span>
                </div>
              )}
            </section>
          )}

          {!hasWallet && (
            <div className={styles.empty} aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.emptyIcon}>
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
              <p>ใส่ยอด G-Wallet เพื่อดูว่าซื้อได้มูลค่าเท่าไหร่</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        รัฐช่วยสูงสุด <strong>200 บาท/วัน</strong> — รวม <strong>1,000 บาท/เดือน</strong>
      </div>
    </div>
  );
}
