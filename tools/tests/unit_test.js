// Test đơn vị cho normalizeTarget() (storage.js) và RiskEngine (risk-engine.js)
// Chạy từ thư mục gốc dự án:  node tools/tests/unit_test.js
// Không cần trình duyệt, không gọi mạng. Thoát mã 1 nếu có test sai.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..', '..');

// Nạp mã trình duyệt vào một sandbox (các biến const toàn cục không gắn vào window)
function loadApp(files, exportNames) {
  const store = {};
  const ctx = {
    console,
    window: {},
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    }
  };
  vm.createContext(ctx);
  const src = files.map(f => fs.readFileSync(path.join(ROOT, 'app', 'js', f), 'utf8')).join('\n;\n');
  vm.runInContext(`${src}\n;this.__exports = { ${exportNames.join(', ')} };`, ctx);
  return ctx.__exports;
}

const { normalizeTarget, escapeHtml, RiskEngine, PHONE_DATABASE } =
  loadApp(['storage.js', 'risk-engine.js'], ['normalizeTarget', 'escapeHtml', 'RiskEngine', 'PHONE_DATABASE']);

let passed = 0;
const failures = [];
function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failures.push(`${name}\n    ${err.message}`);
  }
}

// ------------------------------------------------------------------ normalizeTarget
const NORMALIZE_CASES = [
  // Di động
  ['0912345678', '0912345678'],
  ['0912.345.678', '0912345678'],
  ['0912-345-678', '0912345678'],
  ['0912 345 678', '0912345678'],
  ['0912 345 678', '0912345678'],           // khoảng trắng không ngắt
  ['091_234_5678', '0912345678'],
  ['091/234/5678', '0912345678'],
  ['+84 912 345 678', '0912345678'],
  ['+84-912-345-678', '0912345678'],
  ['0084 912 345 678', '0912345678'],
  ['84912345678', '0912345678'],
  ['+84 (0) 912 345 678', '0912345678'],              // số 0 thừa sau mã quốc gia
  ['84 (0)912345678', '0912345678'],
  ['０９１２３４５６７８', '0912345678'], // chữ số toàn độ rộng
  // Số bàn (11 số, đầu 02)
  ['024 3826 9999', '02438269999'],
  ['(024) 3826-9999', '02438269999'],
  ['+84 24 3826 9999', '02438269999'],
  ['842438269999', '02438269999'],
  // Không phải số VN: giữ nguyên
  ['1900 1234', '19001234'],
  ['156', '156'],
  ['+1 202 555 0123', '+12025550123'],
  ['8412', '8412'],                                    // quá ngắn, không đoán là mã quốc gia
  // Email: giữ dấu chấm / gạch, chỉ bỏ khoảng trắng + chữ hoa
  [' A.B-c@Gmail.COM ', 'a.b-c@gmail.com'],
  ['ten.nguoi@truong.edu.vn', 'ten.nguoi@truong.edu.vn'],
  // Giá trị rỗng
  [null, ''],
  [undefined, ''],
  ['', '']
];

for (const [input, expected] of NORMALIZE_CASES) {
  test(`normalizeTarget(${JSON.stringify(input)})`, () => {
    assert.strictEqual(normalizeTarget(input), expected);
  });
}

test('normalizeTarget: mọi khóa trong PHONE_DATABASE đã ở dạng chuẩn', () => {
  for (const key of Object.keys(PHONE_DATABASE)) {
    assert.strictEqual(normalizeTarget(key), key, `khóa "${key}" bị đổi`);
  }
});

// ------------------------------------------------------------------ escapeHtml
test('escapeHtml: thoát đủ & < > " và nháy đơn', () => {
  assert.strictEqual(escapeHtml(`<img src=x onerror="a('b')">&`),
    '&lt;img src=x onerror=&quot;a(&#039;b&#039;)&quot;&gt;&amp;');
});
test('escapeHtml: số 0 vẫn hiển thị, null/undefined -> rỗng', () => {
  assert.strictEqual(escapeHtml(0), '0');
  assert.strictEqual(escapeHtml(null), '');
  assert.strictEqual(escapeHtml(undefined), '');
});

// ------------------------------------------------------------------ RiskEngine
const LEVELS = ['safe', 'low', 'suspicious', 'high', 'critical'];
const listedMobile = Object.keys(PHONE_DATABASE).find(k => /^0[35789]\d{8}$/.test(k));
const listedLandline = Object.keys(PHONE_DATABASE).find(k => /^02\d{9}$/.test(k));

function codes(result) {
  return result.flags.map(f => f.code);
}

function checkShape(r) {
  assert.ok(r, 'assess() trả về rỗng');
  assert.ok(['phone', 'email'].includes(r.type), `type = ${r.type}`);
  assert.ok(Number.isInteger(r.riskScore) && r.riskScore >= 0 && r.riskScore <= 99, `riskScore = ${r.riskScore}`);
  assert.ok(LEVELS.includes(r.riskLevel), `riskLevel = ${r.riskLevel}`);
  assert.ok(Array.isArray(r.flags) && Array.isArray(r.advice) && r.advice.length > 0, 'thiếu flags / advice');
  assert.ok(typeof r.disclaimer === 'string' && r.disclaimer.length > 0, 'thiếu disclaimer');
  for (const f of r.flags) {
    assert.ok(['danger', 'warning', 'info'].includes(f.severity), `severity = ${f.severity}`);
    assert.ok(f.code && f.title, 'flag thiếu code / title');
  }
}

test('RiskEngine: có dữ liệu mẫu để test', () => {
  assert.ok(listedMobile, 'không có SĐT di động nào trong PHONE_DATABASE');
  assert.ok(listedLandline, 'không có số bàn nào trong PHONE_DATABASE');
});

test('RiskEngine: SĐT di động đã bị cảnh báo -> nguy cơ cao, khớp cả khi viết +84 có dấu chấm', () => {
  const variants = [listedMobile, `+84 ${listedMobile.slice(1, 4)}.${listedMobile.slice(4, 7)}.${listedMobile.slice(7)}`];
  for (const q of variants) {
    const r = RiskEngine.assess(q);
    checkShape(r);
    assert.strictEqual(r.normalized, listedMobile, q);
    assert.strictEqual(r.isListed, true, q);
    assert.ok(codes(r).includes('LISTED_PUBLIC_WARNING'), q);
    assert.ok(['high', 'critical'].includes(r.riskLevel), `${q}: ${r.riskLevel}`);
    assert.ok(r.sources.length > 0, `${q}: không kèm nguồn`);
  }
});

test('RiskEngine: số bàn đã bị cảnh báo khớp khi viết dạng 84 không dấu +', () => {
  const r = RiskEngine.assess('84' + listedLandline.slice(1));
  checkShape(r);
  assert.strictEqual(r.normalized, listedLandline);
  assert.strictEqual(r.isListed, true);
});

test('RiskEngine: kênh chính thức 156 -> an toàn', () => {
  const r = RiskEngine.assess('156');
  checkShape(r);
  assert.strictEqual(r.isOfficialChannel, true);
  assert.strictEqual(r.riskLevel, 'safe');
});

test('RiskEngine: số chưa có trong dữ liệu -> an toàn nhưng vẫn kèm disclaimer', () => {
  const r = RiskEngine.assess('0912345678');
  checkShape(r);
  assert.strictEqual(r.isListed, false);
  assert.strictEqual(r.riskLevel, 'safe');
});

test('RiskEngine: 1900 cước cao -> có cờ, 1800 miễn phí -> an toàn', () => {
  const premium = RiskEngine.assess('1900 1234');
  checkShape(premium);
  assert.ok(codes(premium).includes('PREMIUM_1900'));
  assert.ok(premium.riskScore > 0);
  const free = RiskEngine.assess('1800 1234');
  checkShape(free);
  assert.strictEqual(free.riskLevel, 'safe');
});

test('RiskEngine: đầu số vệ tinh +881 -> nguy cơ cao', () => {
  const r = RiskEngine.assess('+881 234 567 89');
  checkShape(r);
  assert.ok(codes(r).includes('INTL_SATELLITE'));
  assert.ok(['high', 'critical'].includes(r.riskLevel));
});

test('RiskEngine: email trong danh sách cảnh báo -> nghiêm trọng', () => {
  const r = RiskEngine.assess('BaoChiVaTuyenTruyenHocVien@gmail.com');
  checkShape(r);
  assert.strictEqual(r.type, 'email');
  assert.strictEqual(r.isListed, true);
  assert.strictEqual(r.riskLevel, 'critical');
});

test('RiskEngine: gmail mạo danh trường, tên miền nhái -> nguy cơ cao', () => {
  for (const q of ['phongdaotao.hust@gmail.com', 'abc@hust-edu.com']) {
    const r = RiskEngine.assess(q);
    checkShape(r);
    assert.ok(['high', 'critical'].includes(r.riskLevel), `${q}: ${r.riskLevel}`);
  }
});

test('RiskEngine: email tên người thường (khoa, huệ...) không bị bắt nhầm', () => {
  for (const q of ['nguyen.van.khoa@gmail.com', 'tran.thi.hue@gmail.com', 'le.truong@gmail.com']) {
    const r = RiskEngine.assess(q);
    checkShape(r);
    assert.strictEqual(r.riskLevel, 'safe', `${q}: ${r.riskLevel} (${codes(r).join(',')})`);
  }
});

test('RiskEngine.applyCommunity: +5%/lượt, có cờ COMMUNITY_REPORTS, không quá 99', () => {
  const base = RiskEngine.assess('0912345678');
  const r = RiskEngine.applyCommunity(base, 3);
  assert.ok(r.riskScore >= base.riskScore + 15, `${base.riskScore} -> ${r.riskScore}`);
  assert.ok(codes(r).includes('COMMUNITY_REPORTS'));
  const many = RiskEngine.applyCommunity(RiskEngine.assess(listedMobile), 50);
  assert.ok(many.riskScore <= 99, `riskScore = ${many.riskScore}`);
});

test('RiskEngine.normalizePhone: 00xx quốc tế -> +xx, 0084 -> số VN', () => {
  assert.strictEqual(RiskEngine.normalizePhone('00881 234 567'), '+881234567');
  assert.strictEqual(RiskEngine.normalizePhone('0084 912 345 678'), '0912345678');
});

// ------------------------------------------------------------------ kết quả
const total = passed + failures.length;
if (failures.length) {
  console.log(`❌ ${failures.length}/${total} test SAI:\n`);
  failures.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
}
console.log(`✅ ${passed}/${total} test đơn vị ĐẠT (normalizeTarget + escapeHtml + RiskEngine)`);
