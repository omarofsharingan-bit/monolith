/**
 * Generates data/seed.json — the single source of demo data.
 * Deterministic: no RNG, so the burn chart and runway figure are stable
 * across every run and every machine.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ACC_MAIN = "SA4420000001234567894417";
const ACC_PETTY = "SA0380000000608010167519";

/**
 * [dayOfMonth, type, amount, description, account, status]
 *
 * Scale note: these are real student-club numbers, not startup numbers. A club
 * of this size runs on a low-four-figure deanship allocation per semester plus
 * member dues, and its largest single line item is catering.
 *
 * Roster: 16 paying members in the spring term growing to 22 in the autumn, at
 * 25 SAR each. Dues are collected once at the start of a semester with a few
 * stragglers trailing in — clubs do not bill monthly, so there is no dues line
 * from May onward until the new term opens in September.
 *
 * The Saudi academic calendar also shapes the spend: June–August is the summer
 * break, so those months are quiet on both sides of the ledger.
 */
const MONTHS = {
  "2026-02": [
    [3, "inflow", 2400, "رصيد مُرحَّل من الفصل الدراسي السابق", ACC_MAIN, "VERIFIED"],
    [8, "inflow", 6000, "المخصص السنوي — عمادة شؤون الطلاب", ACC_MAIN, "VERIFIED"],
    [12, "outflow", 620, "ضيافة حفل افتتاح الفصل — قهوة ومعجنات", ACC_PETTY, "VERIFIED"],
    [17, "inflow", 400, "اشتراكات الأعضاء — الفصل الثاني (16 عضوًا × 25)", ACC_PETTY, "VERIFIED"],
    [21, "outflow", 380, "طباعة بوسترات ولوحة تعريفية للنادي", ACC_MAIN, "VERIFIED"],
    [26, "outflow", 95, "ضيافة اجتماع اللجنة التنفيذية", ACC_PETTY, "VERIFIED"],
  ],
  "2026-03": [
    [4, "outflow", 1250, "وجبات وضيافة هاكاثون الربيع", ACC_PETTY, "VERIFIED"],
    [9, "inflow", 75, "اشتراكات متأخرة — 3 أعضاء", ACC_PETTY, "VERIFIED"],
    [14, "outflow", 700, "بطاقات هدايا لجوائز المراكز الثلاثة", ACC_MAIN, "VERIFIED"],
    [20, "outflow", 215, "طباعة شهادات مشاركة ودروع تكريم", ACC_MAIN, "VERIFIED"],
    [27, "outflow", 115, "بادجات وأقلام ومستلزمات تنظيم", ACC_PETTY, "VERIFIED"],
  ],
  "2026-04": [
    [2, "outflow", 900, "مكافأة مدرب ورشة نموذج العمل التجاري", ACC_MAIN, "VERIFIED"],
    [7, "inflow", 1500, "رعاية — مقهى الحي الجامعي", ACC_MAIN, "VERIFIED"],
    [11, "outflow", 480, "اشتراك سنوي في أداة تصميم", ACC_MAIN, "VERIFIED"],
    [15, "inflow", 50, "اشتراكات متأخرة — عضوان", ACC_PETTY, "VERIFIED"],
    [19, "outflow", 560, "ضيافة الورش الأسبوعية (4 لقاءات)", ACC_PETTY, "VERIFIED"],
    [28, "outflow", 200, "نقل معدات العرض داخل الحرم", ACC_PETTY, "VERIFIED"],
  ],
  "2026-05": [
    [5, "outflow", 1400, "تجهيز جناح النادي في معرض المشاريع الطلابية", ACC_MAIN, "VERIFIED"],
    [16, "outflow", 450, "ضيافة المتحدثين الضيوف", ACC_PETTY, "VERIFIED"],
    [22, "outflow", 420, "تجديد نطاق الموقع والاستضافة", ACC_MAIN, "VERIFIED"],
    [29, "outflow", 190, "قرطاسية ومستلزمات مكتبية", ACC_PETTY, "VERIFIED"],
  ],
  "2026-06": [
    [3, "inflow", 2000, "منحة دعم فعالية — عمادة شؤون الطلاب", ACC_MAIN, "VERIFIED"],
    [8, "outflow", 1100, "معسكر ريادة الأعمال الصيفي — ضيافة وقاعة", ACC_MAIN, "VERIFIED"],
    [24, "outflow", 220, "اشتراك أداة إدارة المهام", ACC_MAIN, "VERIFIED"],
    [30, "outflow", 170, "ضيافة حفل ختام الفصل", ACC_PETTY, "VERIFIED"],
  ],
  "2026-07": [
    [6, "outflow", 420, "تحديث صفحة النادي التعريفية", ACC_MAIN, "VERIFIED"],
    [23, "outflow", 290, "ملحقات وأسلاك لمختبر النادي", ACC_MAIN, "VERIFIED"],
    [29, "outflow", 140, "صيانة مكبر صوت", ACC_PETTY, "VERIFIED"],
  ],
  "2026-08": [
    [4, "outflow", 380, "تجهيز مواد الترويج للفصل الجديد", ACC_MAIN, "VERIFIED"],
    [22, "outflow", 180, "اشتراك خدمة استضافة سحابية", ACC_MAIN, "SYNCED"],
    [27, "outflow", 100, "ضيافة اجتماع اللجنة التحضيرية", ACC_PETTY, "SYNCED"],
  ],
  "2026-09": [
    [1, "outflow", 320, "رسوم تجديد تسجيل النادي", ACC_MAIN, "SYNCED"],
    [3, "inflow", 2800, "مخصص الفصل الأول — عمادة شؤون الطلاب", ACC_MAIN, "SYNCED"],
    [5, "inflow", 550, "اشتراكات الأعضاء — الفصل الأول (22 عضوًا × 25)", ACC_PETTY, "SYNCED"],
    [7, "outflow", 210, "تجهيز ركن النادي في أسبوع التهيئة", ACC_PETTY, "PENDING"],
    [9, "outflow", 110, "ضيافة اللقاء التعريفي للأعضاء الجدد", ACC_PETTY, "PENDING"],
  ],
};

// Spread the timestamps across working hours so the feed looks plausible.
const HOURS = [9, 10, 11, 13, 14, 15, 16, 19];
// The newest month can land on the day the demo runs, so keep it in the early
// morning — a feed showing transactions that have not happened yet reads wrong.
const EARLY_HOURS = [7, 8, 9, 10];

const monthKeys = Object.keys(MONTHS);
const latestMonth = monthKeys[monthKeys.length - 1];

const transactions = [];
let seq = 0;
for (const [month, rows] of Object.entries(MONTHS)) {
  const [y, m] = month.split("-").map(Number);
  for (const [day, type, amount, description, account, sync_status] of rows) {
    const h =
      month === latestMonth
        ? EARLY_HOURS[seq % EARLY_HOURS.length]
        : HOURS[seq % HOURS.length];
    const min = (seq * 17) % 60;
    const sec = (seq * 29) % 60;
    const ts = new Date(Date.UTC(y, m - 1, day, h, min, sec));
    transactions.push({
      reference: `TX-${String(y).slice(2)}${String(m).padStart(2, "0")}-${String(seq + 1).padStart(4, "0")}`,
      type,
      amount,
      description,
      account,
      timestamp: ts.toISOString(),
      sync_status,
    });
    seq += 1;
  }
}
transactions.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

const totalFunds = transactions.reduce(
  (sum, tx) => sum + (tx.type === "inflow" ? tx.amount : -tx.amount),
  0,
);

const seed = {
  vault: {
    name: "نادي الابتكار وريادة الأعمال",
    org: "جامعة الملك سعود — كلية علوم الحاسب والمعلومات",
    total_funds: totalFunds,
  },
  users: [
    {
      email: "treasurer@monolith.demo",
      password: "monolith2026",
      display_name: "نورة العتيبي",
      role: "treasurer",
    },
    {
      email: "founder@monolith.demo",
      password: "monolith2026",
      display_name: "عبدالرحمن القحطاني",
      role: "founder",
    },
    {
      email: "member@monolith.demo",
      password: "monolith2026",
      display_name: "ريم الدوسري",
      role: "member",
    },
  ],
  stakeholders: [
    { name: "عبدالرحمن القحطاني", role: "مؤسس ورئيس النادي", split_percentage: 35 },
    { name: "نورة العتيبي", role: "أمينة الصندوق", split_percentage: 25 },
    { name: "ريم الدوسري", role: "قائدة فريق التقنية", split_percentage: 20 },
    { name: "صندوق تشغيل الفعاليات", role: "مخصص تشغيلي", split_percentage: 15 },
    { name: "احتياطي الطوارئ", role: "مخصص احتياطي", split_percentage: 5 },
  ],
  audit: [
    {
      actor: "عبدالرحمن القحطاني",
      action: "created",
      change_description: "تأسيس بيان الحصص الأولي بأربعة أصحاب حصص",
      offset_days: 214,
    },
    {
      actor: "نورة العتيبي",
      action: "updated",
      change_description: "تعديل نسبة «عبدالرحمن القحطاني»",
      field: "split_percentage",
      old_value: "40",
      new_value: "35",
      offset_days: 96,
    },
    {
      actor: "نورة العتيبي",
      action: "created",
      change_description: "إضافة «احتياطي الطوارئ» كمخصص احتياطي",
      new_value: "5",
      offset_days: 96,
    },
    {
      actor: "عبدالرحمن القحطاني",
      action: "updated",
      change_description: "تعديل نسبة «ريم الدوسري»",
      field: "split_percentage",
      old_value: "15",
      new_value: "20",
      offset_days: 41,
    },
    {
      actor: "نورة العتيبي",
      action: "distributed",
      change_description: "توزيع مخصصات الفرق لشهر أغسطس بحسب النسب المتفق عليها",
      new_value: "1200",
      offset_days: 23,
    },
  ],
  disbursements: [
    {
      amount: 1200,
      note: "توزيع مخصصات الفرق لشهر أغسطس بحسب النسب المتفق عليها",
      offset_days: 23,
      actor: "نورة العتيبي",
    },
    {
      amount: 800,
      note: "توزيع مخصصات معسكر ريادة الأعمال الصيفي",
      offset_days: 78,
      actor: "عبدالرحمن القحطاني",
    },
  ],
  transactions,
};

const out = resolve(__dirname, "../data/seed.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(seed, null, 2) + "\n", "utf8");

// Report the derived figures so the demo numbers can be sanity-checked.
const byMonth = {};
for (const tx of transactions) {
  const k = tx.timestamp.slice(0, 7);
  byMonth[k] ??= { in: 0, out: 0 };
  byMonth[k][tx.type === "inflow" ? "in" : "out"] += tx.amount;
}
let running = 0;
console.log("month     inflow    outflow   net        balance");
for (const [k, v] of Object.entries(byMonth)) {
  running += v.in - v.out;
  console.log(
    k.padEnd(9),
    String(v.in).padStart(8),
    String(v.out).padStart(9),
    String(v.in - v.out).padStart(9),
    String(running).padStart(10),
  );
}
const completed = Object.entries(byMonth).slice(1, -1);
const avgBurn = completed.reduce((s, [, v]) => s + (v.out - v.in), 0) / completed.length;
console.log(`\ntransactions: ${transactions.length}`);
console.log(`total_funds:  ${totalFunds}`);
console.log(`avg net burn: ${avgBurn.toFixed(0)} / month`);
console.log(`runway:       ${(totalFunds / avgBurn).toFixed(1)} months`);
