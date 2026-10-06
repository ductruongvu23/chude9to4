// ===================================================================
// RISK ENGINE - NHẬN DIỆN SĐT / EMAIL KHẢ NGHI (Task C-03)
// Kết hợp 2 lớp:
//   1. Đối soát danh sách đã bị cảnh báo công khai (storage.js, có nguồn)
//   2. Quy tắc nhận diện (heuristic) dựa trên các dấu hiệu cơ quan chức năng
//      đã khuyến cáo: đầu số quốc tế nháy máy, tổng đài cước cao, hòm thư
//      miễn phí mạo danh nhà trường, tên miền nhái, email dùng 1 lần...
//
// RiskEngine.assess(query) trả về:
// {
//   type: 'phone' | 'email',
//   target, normalized,
//   riskScore: 0-99,
//   riskLevel: 'safe' | 'low' | 'suspicious' | 'high' | 'critical',
//   riskLabel: chuỗi hiển thị,
//   category: nhóm thủ đoạn (nếu xác định được),
//   isListed: true nếu nằm trong danh sách cảnh báo công khai,
//   isOfficialChannel: true nếu là kênh chính thức (156, 5656...),
//   flags: [{ code, severity: 'danger'|'warning'|'info', title, detail, sources: [{name,url,publishedAt}] }],
//   matchedKeywords: [...],
//   advice: [...],
//   sources: [{name,url,publishedAt}] (gộp, không trùng),
//   disclaimer: cảnh báo rủi ro của kết quả,
//   dataAsOf
// }
// ===================================================================

const RiskEngine = (function () {
  const LEVELS = [
    { min: 90, level: 'critical', label: 'Đã bị cảnh báo / Nguy cơ rất cao' },
    { min: 70, level: 'high', label: 'Nguy cơ lừa đảo cao' },
    { min: 40, level: 'suspicious', label: 'Có dấu hiệu khả nghi' },
    { min: 20, level: 'low', label: 'Cần lưu ý' },
    { min: 0, level: 'safe', label: 'Chưa ghi nhận cảnh báo' }
  ];

  const STALE_AFTER_DAYS = 365;

  const DISCLAIMER =
    'Kết quả chỉ mang tính tham khảo, tổng hợp từ cảnh báo công khai của cơ quan công an, ' +
    'cổng thông tin nhà nước, báo chí (cập nhật đến ' + SCAM_DATA_AS_OF + ') và các quy tắc nhận diện tự động. ' +
    'Số điện thoại có thể bị giả mạo hiển thị hoặc đã được nhà mạng cấp lại cho người khác, nên kết quả ' +
    'KHÔNG phải căn cứ để kết luận một cá nhân vi phạm pháp luật. "Chưa ghi nhận cảnh báo" cũng KHÔNG có nghĩa là an toàn. ' +
    'Khi nghi ngờ, hãy xác minh qua kênh chính thức và phản ánh tới 156 / 5656 hoặc cơ quan công an.';

  // ---------------- Email: danh mục từ khóa & tên miền ----------------
  const FREE_MAIL_DOMAINS = [
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.com.vn', 'outlook.com', 'outlook.com.vn',
    'hotmail.com', 'live.com', 'icloud.com', 'aol.com', 'yandex.com', 'yandex.ru', 'mail.ru',
    'gmx.com', 'zoho.com', 'proton.me', 'protonmail.com'
  ];

  // Dịch vụ email tạm thời / dùng một lần
  const DISPOSABLE_DOMAINS = [
    'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'guerrillamail.info', 'sharklasers.com',
    'temp-mail.org', 'tempmail.com', 'tempmail.net', 'tempmailo.com', 'yopmail.com', 'yopmail.net',
    'trashmail.com', 'getnada.com', 'dispostable.com', 'maildrop.cc', 'mohmal.com', 'emailondeck.com',
    'throwawaymail.com', 'fakeinbox.com', 'mintemail.com', 'mail.tm', 'tmpmail.org', 'moakt.com'
  ];

  // Tên miền đuôi rẻ/thường bị lạm dụng làm trang giả mạo
  const SUSPICIOUS_TLDS = ['xyz', 'top', 'click', 'online', 'site', 'icu', 'buzz', 'live', 'vip', 'shop', 'cfd', 'sbs', 'rest', 'monster', 'cyou'];

  // Từ viết tắt các trường ĐH/HV phổ biến (dùng phát hiện mạo danh, tên miền nhái)
  const SCHOOL_ACRONYMS = [
    'vnu', 'dhqg', 'hust', 'neu', 'ftu', 'uet', 'ueh', 'hcmus', 'hcmut', 'hcmute', 'ptit', 'tdtu',
    'ussh', 'ulis', 'hnue', 'hcmue', 'tmu', 'hlu', 'ajc', 'bachkhoa', 'ngoaithuong',
    'huflit', 'uel', 'iuh', 'vlu', 'hutech', 'dut', 'ctu', 'vinhuni', 'tnu'
  ];

  // Từ khóa giáo dục dùng để phát hiện tên miền nhái (vd: daotao-portal.xyz)
  const EDU_DOMAIN_WORDS = ['daotao', 'hocphi', 'tuyensinh', 'sinhvien', 'hocbong', 'giaovu'];

  const KEYWORD_GROUPS = [
    {
      code: 'EMAIL_SCHOOL_IMPERSONATION',
      words: ['daotao', 'phongdaotao', 'hocphi', 'hocbong', 'tuyensinh', 'congtacsinhvien', 'ctsv', 'sinhvien',
        'daihoc', 'hocvien', 'university', 'univ', 'edu', 'giaovu', 'nhaptruong'],
      score: 75,
      title: 'Hòm thư miễn phí mạo danh nhà trường',
      detail: 'Địa chỉ dùng dịch vụ email miễn phí nhưng mang từ khóa nhà trường / học phí / học bổng. Trường học chỉ gửi thông báo từ tên miền chính thức (thường là .edu.vn) và không yêu cầu chuyển tiền vào tài khoản cá nhân.',
      sources: ['DANVIET_AJC_2021', 'KENH14_SINHVIEN_2025']
    },
    {
      code: 'EMAIL_BANK_IMPERSONATION',
      words: ['vietcombank', 'vcb', 'techcombank', 'tcb', 'bidv', 'agribank', 'vietinbank', 'mbbank', 'tpbank',
        'acb', 'sacombank', 'vpbank', 'nganhang', 'bank', 'hoantien', 'saoke', 'tindung'],
      score: 70,
      title: 'Hòm thư miễn phí mạo danh ngân hàng',
      detail: 'Ngân hàng không liên hệ khách hàng qua hòm thư miễn phí và không bao giờ yêu cầu cung cấp mã OTP, mật khẩu.',
      sources: ['TUOITRE_8CUOCGOI_2025', 'CA_NGHEAN_2025']
    },
    {
      code: 'EMAIL_AUTHORITY_IMPERSONATION',
      words: ['congan', 'police', 'botocong', 'vienkiemsat', 'toaan', 'thue', 'tax', 'vneid', 'dinhdanh', 'canhsat'],
      score: 75,
      title: 'Hòm thư miễn phí mạo danh cơ quan nhà nước',
      detail: 'Cơ quan công an, tòa án, thuế không làm việc với người dân qua hòm thư miễn phí và không yêu cầu chuyển tiền để "xác minh".',
      sources: ['CAFEF_CAHN_2026', 'KENH14_SINHVIEN_2025']
    },
    {
      code: 'EMAIL_JOB_SCAM',
      words: ['tuyendung', 'ctv', 'congtacvien', 'vieclam', 'viecnhe', 'shopee', 'tiktok', 'lazada',
        'tiki', 'nhiemvu', 'donhang', 'kiemtien', 'parttime', 'recruit', 'hr'],
      score: 55,
      title: 'Dấu hiệu lừa đảo tuyển cộng tác viên online',
      detail: 'Thủ đoạn phổ biến nhắm vào sinh viên: mời làm "việc nhẹ lương cao", làm nhiệm vụ nhận hoa hồng, sau đó yêu cầu nạp tiền để "mở khóa" rồi chiếm đoạt.',
      sources: ['CA_TUYENQUANG_CTV']
    }
  ];

  // ---------------- Tiện ích ----------------
  function source(id) {
    const s = SCAM_SOURCES[id];
    return s ? { id, name: s.name, url: s.url, publishedAt: s.publishedAt } : null;
  }

  function sourcesOf(ids) {
    return (ids || []).map(source).filter(Boolean);
  }

  function formatDate(iso) {
    if (!iso) return 'không rõ ngày';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function newestDate(srcs) {
    return srcs.map(s => s.publishedAt).filter(Boolean).sort().pop() || null;
  }

  function levelOf(score) {
    return LEVELS.find(l => score >= l.min);
  }

  // Chuẩn hóa số điện thoại cho tra cứu: dùng normalizeTarget() và quy 00xx -> +xx
  function normalizePhone(raw) {
    let t = normalizeTarget(raw);
    if (/^00[1-9]/.test(t) && !t.startsWith('0084')) t = '+' + t.slice(2);
    return t;
  }

  function staleFlag(srcs) {
    const newest = newestDate(srcs);
    if (!newest) return null;
    const ageDays = (Date.now() - Date.parse(newest)) / 86400000;
    if (ageDays < STALE_AFTER_DAYS) return null;
    return {
      code: 'STALE_WARNING',
      severity: 'info',
      title: 'Cảnh báo đã được công bố từ lâu',
      detail: `Cảnh báo gần nhất công bố ngày ${formatDate(newest)}. Số thuê bao có thể đã bị thu hồi và cấp lại cho người khác - hãy xác minh thêm trước khi kết luận.`,
      sources: []
    };
  }

  // ---------------- Phân tích số điện thoại ----------------
  function assessPhone(raw) {
    const normalized = normalizePhone(raw);
    const flags = [];
    let category = null;
    let isListed = false;
    let isOfficialChannel = false;

    if (!/^\+?\d+$/.test(normalized)) {
      flags.push({
        code: 'PHONE_INVALID_CHARS', severity: 'warning', score: 40,
        title: 'Số chứa ký tự không hợp lệ',
        detail: 'Chuỗi nhập vào không phải số điện thoại hợp lệ. Kiểm tra lại hoặc nhập email nếu cần.',
        sources: []
      });
      return { normalized, flags, category, isListed, isOfficialChannel };
    }

    // 1. Kênh chính thức
    if (OFFICIAL_CHANNELS[normalized]) {
      const ch = OFFICIAL_CHANNELS[normalized];
      isOfficialChannel = true;
      flags.push({
        code: 'OFFICIAL_CHANNEL', severity: 'info', score: 0,
        title: 'Kênh chính thức của cơ quan nhà nước',
        detail: ch.name,
        sources: sourcesOf(ch.sources)
      });
      return { normalized, flags, category: 'Kênh chính thức', isListed, isOfficialChannel };
    }

    // 2. Danh sách đã bị cảnh báo công khai
    const record = PHONE_DATABASE[normalized];
    if (record) {
      isListed = true;
      category = record.category;
      const srcs = sourcesOf(record.sources);
      flags.push({
        code: 'LISTED_PUBLIC_WARNING', severity: 'danger', score: record.riskScore,
        title: `Nằm trong danh sách cảnh báo: ${record.category}`,
        detail: record.threatType,
        sources: srcs
      });
      const stale = staleFlag(srcs);
      if (stale) flags.push({ ...stale, score: 0 });
    }

    // 3. Đầu số quốc tế
    if (normalized.startsWith('+') && !normalized.startsWith('+84')) {
      const pattern = SCAM_PATTERNS
        .filter(p => normalized.startsWith(p.prefix))
        .sort((a, b) => b.prefix.length - a.prefix.length)[0];
      if (pattern) {
        category = category || 'Đầu số quốc tế nháy máy';
        flags.push({
          code: 'INTL_WARNED_PREFIX', severity: pattern.risk >= 70 ? 'danger' : 'warning', score: pattern.risk,
          title: `Đầu số quốc tế bị cảnh báo: ${pattern.prefix} (${pattern.country})`,
          detail: 'Đầu số nằm trong danh sách Công an khuyến cáo không nghe, không gọi lại. Thủ đoạn thường gặp: nháy máy 1 hồi chuông để nạn nhân gọi lại và bị tính cước quốc tế cao.',
          sources: sourcesOf(pattern.sources)
        });
      } else if (normalized.startsWith('+881')) {
        flags.push({
          code: 'INTL_SATELLITE', severity: 'danger', score: 75,
          title: 'Đầu số điện thoại vệ tinh (+881)',
          detail: 'Đầu số vệ tinh có cước gọi rất cao, hầu như không được dùng cho liên lạc thông thường. Không gọi lại.',
          sources: []
        });
      } else {
        flags.push({
          code: 'INTL_UNKNOWN', severity: 'warning', score: 45,
          title: 'Cuộc gọi từ nước ngoài',
          detail: 'Số có mã quốc gia khác +84. Nếu không quen biết người gọi, không gọi lại khi bị nháy máy và không làm theo yêu cầu chuyển tiền.',
          sources: sourcesOf(['HATINH_2024'])
        });
      }
      return { normalized, flags, category, isListed, isOfficialChannel };
    }

    // 4. Đầu số tin nhắn dịch vụ
    if (SCAM_SMS_SHORTCODES.includes(normalized)) {
      category = category || 'Tin nhắn dịch vụ trừ tiền';
      flags.push({
        code: 'SMS_SHORTCODE', severity: 'danger', score: 85,
        title: 'Đầu số tin nhắn dịch vụ bị cảnh báo',
        detail: 'Đầu số tin nhắn dịch vụ được Công an cảnh báo: nhắn tin hoặc gọi lại có thể bị trừ tiền.',
        sources: sourcesOf(SCAM_SMS_SHORTCODE_SOURCES)
      });
      return { normalized, flags, category, isListed, isOfficialChannel };
    }

    // 5. Kiểm tra định dạng & loại đầu số trong nước
    const isMobile = /^0[35789]\d{8}$/.test(normalized);
    const isLandline = /^02\d{9}$/.test(normalized);
    const is1900 = /^1900\d{4,6}$/.test(normalized);
    const is1800 = /^1800\d{4,6}$/.test(normalized);
    const isShort = /^\d{3,5}$/.test(normalized);

    if (is1900 && !isListed) {
      flags.push({
        code: 'PREMIUM_1900', severity: 'warning', score: 30,
        title: 'Đầu số dịch vụ 1900 tính cước cao',
        detail: 'Đầu số 1900 tính phí người gọi. Nhiều số 1900 đã bị Công an cảnh báo dùng để nháy máy bẫy cước - chỉ gọi khi chắc chắn đó là tổng đài chính thức.',
        sources: sourcesOf(['QUANGCHAU_2024', 'HATINH_2024'])
      });
    } else if (is1800) {
      flags.push({
        code: 'TOLLFREE_1800', severity: 'info', score: 0,
        title: 'Đầu số miễn phí 1800',
        detail: 'Đầu số 1800 miễn cước cho người gọi. Vẫn cần kiểm tra đây có đúng là tổng đài chính thức của tổ chức hay không.',
        sources: []
      });
    } else if (!isMobile && !isLandline && !isShort && !isListed) {
      flags.push({
        code: 'PHONE_BAD_FORMAT', severity: 'warning', score: 40,
        title: 'Số không đúng định dạng thuê bao Việt Nam',
        detail: 'Di động Việt Nam có 10 chữ số (03x, 05x, 07x, 08x, 09x), cố định có 11 chữ số (02x). Số sai định dạng có thể là số giả mạo hiển thị hoặc bị nhập nhầm.',
        sources: []
      });
    }

    return { normalized, flags, category, isListed, isOfficialChannel };
  }

  // ---------------- Phân tích email ----------------
  function assessEmail(raw) {
    const normalized = normalizeTarget(raw);
    const flags = [];
    const matchedKeywords = [];
    let category = null;
    let isListed = false;

    const match = normalized.match(/^([^\s@]+)@([a-z0-9.-]+\.[a-z]{2,})$/i);
    if (!match) {
      flags.push({
        code: 'EMAIL_BAD_FORMAT', severity: 'warning', score: 40,
        title: 'Địa chỉ email không hợp lệ',
        detail: 'Địa chỉ không đúng định dạng ten@tenmien. Kiểm tra lại ký tự hoặc dấu chấm.',
        sources: []
      });
      return { normalized, flags, category, isListed, isOfficialChannel: false, matchedKeywords };
    }

    const local = match[1];
    const domain = match[2].toLowerCase();
    const flatLocal = local.replace(/[._\-+]/g, '');
    // Tách thành từng cụm (theo dấu . _ - + và chữ số) để so khớp nguyên cụm:
    // tránh bắt nhầm tên người (vd: "khoa", "hue", "hoahong" là tên phổ biến)
    const tokens = local.toLowerCase().split(/[._\-+0-9]+/).filter(Boolean);
    const hasWord = w => (w.length >= 6 ? flatLocal.includes(w) : tokens.includes(w));
    const tld = domain.split('.').pop();
    const isFree = FREE_MAIL_DOMAINS.includes(domain);
    const isOfficialEdu = /\.edu\.vn$/.test(domain);
    const isOfficialGov = /\.gov\.vn$/.test(domain);

    // 1. Danh sách đã bị cảnh báo
    const record = EMAIL_DATABASE[normalized];
    if (record) {
      isListed = true;
      category = record.category;
      const srcs = sourcesOf(record.sources);
      flags.push({
        code: 'LISTED_PUBLIC_WARNING', severity: 'danger', score: record.riskScore,
        title: `Nằm trong danh sách cảnh báo: ${record.category}`,
        detail: record.threatType,
        sources: srcs
      });
      const stale = staleFlag(srcs);
      if (stale) flags.push({ ...stale, score: 0 });
    }

    // 2. Email dùng một lần
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      flags.push({
        code: 'EMAIL_DISPOSABLE', severity: 'warning', score: 60,
        title: 'Hòm thư tạm thời / dùng một lần',
        detail: `Tên miền "${domain}" là dịch vụ email tạm thời. Tổ chức chính thống không dùng loại email này để liên hệ.`,
        sources: []
      });
    }

    // 3. Hòm thư miễn phí mang từ khóa mạo danh
    if (isFree || DISPOSABLE_DOMAINS.includes(domain)) {
      KEYWORD_GROUPS.forEach(group => {
        const hits = group.words.filter(hasWord);
        let score = group.score;
        if (group.code === 'EMAIL_SCHOOL_IMPERSONATION') {
          const acronyms = SCHOOL_ACRONYMS.filter(a => tokens.includes(a));
          // Chỉ có tên viết tắt trường (không kèm từ khóa học phí/đào tạo...) -> mức khả nghi thấp hơn
          if (hits.length === 0 && acronyms.length > 0) score = 45;
          hits.push(...acronyms);
        }
        if (hits.length > 0) {
          const unique = Array.from(new Set(hits));
          matchedKeywords.push(...unique);
          category = category || group.title.replace('Hòm thư miễn phí ', '').replace(/^./, c => c.toUpperCase());
          flags.push({
            code: group.code, severity: score >= 70 ? 'danger' : 'warning', score,
            title: group.title,
            detail: `${group.detail} Từ khóa phát hiện: ${unique.join(', ')}.`,
            sources: sourcesOf(group.sources)
          });
        }
      });
    }

    // 4. Tên miền nhái trường học (typo-squatting)
    if (!isFree && !isOfficialEdu && !isOfficialGov) {
      const domainTokens = domain.split(/[.-]/);
      const domainFlat = domainTokens.join('');
      const schoolHits = [
        ...SCHOOL_ACRONYMS.filter(a => domainTokens.includes(a)),
        ...EDU_DOMAIN_WORDS.filter(w => domainFlat.includes(w))
      ];
      const eduLike = domainTokens.includes('edu') && !/\.edu(\.[a-z]{2})?$/.test(domain);
      if (schoolHits.length > 0 || eduLike) {
        matchedKeywords.push(...schoolHits, ...(eduLike ? ['edu'] : []));
        category = category || 'Tên miền nhái trường học';
        flags.push({
          code: 'EMAIL_LOOKALIKE_DOMAIN', severity: 'danger', score: 80,
          title: 'Tên miền có dấu hiệu nhái trường học',
          detail: `Tên miền "${domain}" mang tên/viết tắt trường học hoặc chữ "edu" nhưng không phải tên miền giáo dục chính thức (.edu.vn). Đây là thủ đoạn tạo email, trang web giống hệt nhà trường để lừa sinh viên.`,
          sources: sourcesOf(['KENH14_SINHVIEN_2025'])
        });
      }
    }

    // 5. Đuôi tên miền hay bị lạm dụng
    if (!isFree && SUSPICIOUS_TLDS.includes(tld)) {
      flags.push({
        code: 'EMAIL_SUSPICIOUS_TLD', severity: 'warning', score: 35,
        title: `Đuôi tên miền ".${tld}" thường bị lạm dụng`,
        detail: 'Đuôi tên miền giá rẻ, đăng ký dễ, thường được dùng cho trang và email giả mạo. Cần kiểm tra kỹ tổ chức gửi.',
        sources: []
      });
    }

    // 6. Tên miền giáo dục / nhà nước chính thức
    if ((isOfficialEdu || isOfficialGov) && !isListed) {
      flags.push({
        code: 'EMAIL_OFFICIAL_DOMAIN', severity: 'info', score: 0,
        title: isOfficialEdu ? 'Tên miền giáo dục chính thức (.edu.vn)' : 'Tên miền cơ quan nhà nước (.gov.vn)',
        detail: 'Tên miền thuộc hệ thống chính thức. Tuy vậy địa chỉ người gửi vẫn có thể bị giả mạo: nếu email yêu cầu chuyển tiền vào tài khoản cá nhân, hãy liên hệ trực tiếp phòng ban để xác minh.',
        sources: []
      });
    }

    return { normalized, flags, category, isListed, isOfficialChannel: false, matchedKeywords };
  }

  // ---------------- Tính điểm & lời khuyên ----------------
  function scoreOf(flags, isListed) {
    const scored = flags.filter(f => f.score > 0).map(f => f.score).sort((a, b) => b - a);
    if (scored.length === 0) return 0;
    // Mỗi dấu hiệu nguy hiểm/khả nghi thêm cộng 5 điểm
    const bonus = (scored.length - 1) * 5;
    const cap = isListed ? 99 : 95; // Chỉ danh sách cảnh báo công khai mới đạt mức 96-99
    return Math.min(cap, scored[0] + bonus);
  }

  function adviceFor(type, level, isOfficialChannel) {
    if (isOfficialChannel) {
      return ['Đây là kênh chính thức, bạn có thể dùng để phản ánh cuộc gọi, tin nhắn lừa đảo.'];
    }
    const common = [
      'Không cung cấp mã OTP, mật khẩu, số CCCD hay thông tin thẻ ngân hàng cho bất kỳ ai.',
      'Không chuyển tiền vào tài khoản cá nhân theo yêu cầu qua điện thoại, tin nhắn, email.'
    ];
    const report = type === 'phone'
      ? 'Phản ánh miễn phí: soạn LD [số điện thoại] [nội dung] gửi 156 hoặc 5656.'
      : 'Báo cho phòng đào tạo / công tác sinh viên của trường và chuyển tiếp email tới cơ quan công an nếu đã bị yêu cầu chuyển tiền.';

    if (level === 'critical' || level === 'high') {
      return [
        type === 'phone' ? 'Không nghe máy, không gọi lại và chặn số này.' : 'Không bấm vào đường link, không mở tệp đính kèm và không trả lời email.',
        ...common,
        report,
        'Nếu đã chuyển tiền: liên hệ ngay ngân hàng để yêu cầu phong tỏa và trình báo công an nơi gần nhất (gọi 113 nếu khẩn cấp).'
      ];
    }
    if (level === 'suspicious' || level === 'low') {
      return [
        type === 'phone'
          ? 'Xác minh danh tính người gọi bằng cách tự gọi lại tổng đài chính thức (lấy từ website / thẻ ngân hàng), không dùng số họ cung cấp.'
          : 'Đối chiếu với email chính thức trên website nhà trường; liên hệ trực tiếp phòng ban liên quan để xác minh.',
        ...common,
        report
      ];
    }
    return [
      'Chưa có cảnh báo không có nghĩa là an toàn: vẫn cảnh giác nếu bị yêu cầu chuyển tiền, cung cấp OTP hoặc cài ứng dụng lạ.',
      report
    ];
  }

  function assess(query) {
    const target = String(query || '').trim();
    const type = target.includes('@') ? 'email' : 'phone';
    const part = type === 'email' ? assessEmail(target) : assessPhone(target);

    const riskScore = part.isOfficialChannel ? 0 : scoreOf(part.flags, part.isListed);
    const lv = levelOf(riskScore);

    const seen = new Set();
    const sources = [];
    part.flags.forEach(f => (f.sources || []).forEach(s => {
      if (!seen.has(s.url)) { seen.add(s.url); sources.push(s); }
    }));

    // Ẩn trường score nội bộ khỏi flags trả ra
    const flags = part.flags.map(({ score, ...rest }) => rest);
    const order = { danger: 0, warning: 1, info: 2 };
    flags.sort((a, b) => order[a.severity] - order[b.severity]);

    return {
      type,
      target,
      normalized: part.normalized,
      riskScore,
      riskLevel: lv.level,
      riskLabel: part.isOfficialChannel ? 'Kênh chính thức' : lv.label,
      category: part.category,
      isListed: part.isListed,
      isOfficialChannel: part.isOfficialChannel,
      flags,
      matchedKeywords: Array.from(new Set(part.matchedKeywords || [])),
      advice: adviceFor(type, lv.level, part.isOfficialChannel),
      sources,
      disclaimer: DISCLAIMER,
      dataAsOf: SCAM_DATA_AS_OF
    };
  }

  // Cộng điểm từ phản ánh cộng đồng (mỗi lượt +5%, số lạ bắt đầu từ 40%)
  function applyCommunity(result, communityCount) {
    if (!communityCount || communityCount <= 0 || result.isOfficialChannel) return result;
    const increment = communityCount * 5;
    const base = result.riskScore > 0 ? result.riskScore : 40;
    const riskScore = Math.min(99, base + increment);
    const lv = levelOf(riskScore);
    return {
      ...result,
      riskScore,
      riskLevel: lv.level,
      riskLabel: lv.label,
      advice: adviceFor(result.type, lv.level, false),
      communityCount,
      communityIncrement: increment,
      flags: [
        {
          code: 'COMMUNITY_REPORTS', severity: 'warning',
          title: `${communityCount} lượt phản ánh từ cộng đồng`,
          detail: `Người dùng cổng đã báo cáo đối tượng này ${communityCount} lần (+${increment}% nguy cơ). Phản ánh cộng đồng chưa được cơ quan chức năng xác minh.`,
          sources: []
        },
        ...result.flags
      ]
    };
  }

  return { assess, applyCommunity, normalizePhone };
})();
