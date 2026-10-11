/** Pure formatting helpers for the dealer dashboard (no React). */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const trim = (n: number) => String(Math.round(n * 10) / 10).replace(/\.0$/, "");

/** 312000 -> ₹3,12,000 (Indian digit grouping) */
export function formatINR(value: number) {
  const digits = String(Math.round(Math.abs(value)));
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  return `${value < 0 ? "-" : ""}₹${grouped}`;
}

/** 1240000 -> ₹12.4L, 84000 -> ₹84K, 25000000 -> ₹2.5Cr */
export function formatCompactINR(value: number) {
  const n = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (n >= 1e7) return `${sign}₹${trim(n / 1e7)}Cr`;
  if (n >= 1e5) return `${sign}₹${trim(n / 1e5)}L`;
  if (n >= 1e3) return `${sign}₹${trim(n / 1e3)}K`;
  return `${sign}₹${Math.round(n)}`;
}

/** 8 -> "08" (the design shows bid counts zero-padded) */
export const padCount = (n: number) => (n >= 0 && n < 10 ? `0${n}` : String(n));

/** Tuesday, 16 June 2026 */
export function formatDateLine(date: Date) {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** 09:00 AM */
export function formatClock(date: Date) {
  const h = date.getHours();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${String(hour12).padStart(2, "0")}:${mm} ${h < 12 ? "AM" : "PM"}`;
}

export function marketText(market: {
  status: string;
  closesAt: string | null;
  nextOpensAt: string | null;
}) {
  const at = (iso: string | null) => {
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.getTime()) ? formatClock(d) : null;
  };

  if (String(market.status).toUpperCase() === "OPEN") {
    const closes = at(market.closesAt);
    return closes ? `Market closes at ${closes}` : "Market open";
  }

  const opens = at(market.nextOpensAt);
  return opens ? `Market opens at ${opens}` : "Market closed";
}

/** 12 mins ago / 1 hr ago / 3 hrs ago / Yesterday / 12 Sep */
export function timeAgo(iso: string, now: number = Date.now()) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  const mins = Math.floor((now - then.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(then)) / 86400000);
  if (days === 1) return "Yesterday";

  return `${then.getDate()} ${MONTHS[then.getMonth()].slice(0, 3)}`;
}

/** 14:25 (mm:ss) under an hour, "2h 05m" above, "Ended" when over */
export function formatRemaining(endsAt: string | null, now: number = Date.now()) {
  if (!endsAt) return "";
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return "";

  const total = Math.floor((end - now) / 1000);
  if (total <= 0) return "Ended";

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** +18% vs last month; null when there is nothing to compare */
export function changeText(changePercent: number | null | undefined) {
  if (changePercent == null || !Number.isFinite(changePercent)) return null;
  const p = Math.round(changePercent);
  return `${p >= 0 ? "+" : ""}${p}% vs last month`;
}

/** 62400 -> "62,400" (Indian grouping, no currency symbol) */
export const formatCount = (value: number) => formatINR(value).replace("₹", "");

/** Like formatINR, but keeps paise when there are any: 380.5 -> ₹380.50 */
export function formatPrice(value: number) {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return formatINR(rounded);

  const [whole, decimals] = Math.abs(rounded).toFixed(2).split(".");
  return `${rounded < 0 ? "-" : ""}${formatINR(Number(whole))}.${decimals}`;
}
