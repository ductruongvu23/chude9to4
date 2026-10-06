"""Huấn luyện Mini AI phân loại tin nhắn lừa đảo (Tổ 4).

Mô hình: hồi quy logistic đa lớp (softmax) trên đặc trưng từ đơn + cặp từ (đã bỏ dấu).
Nhỏ (vài chục KB), chạy hoàn toàn trên trình duyệt bằng JavaScript thuần — không cần
máy chủ, không tải mô hình lớn.

Cách dùng (từ thư mục gốc dự án):
    python tools/mini_ai/train.py

Đầu vào : tools/mini_ai/dataset.tsv (huấn luyện), tools/mini_ai/test.tsv (kiểm tra riêng)
Đầu ra  : app/js/mini-ai-model.js
Yêu cầu : numpy
"""

import json
import os
import re
import sys
import unicodedata

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT_JS = os.path.join(ROOT, 'app', 'js', 'mini-ai-model.js')

LABELS = ['safe', 'job', 'tuition', 'police', 'emergency', 'account', 'bank', 'prize']
LABEL_NAMES = {
    'safe': 'Tin nhắn bình thường',
    'job': 'Lừa đảo việc làm online / làm nhiệm vụ',
    'tuition': 'Mạo danh nhà trường thu học phí',
    'police': 'Giả danh công an, cơ quan nhà nước',
    'emergency': 'Giả người thân gặp nạn, cần tiền gấp',
    'account': 'Đánh cắp tài khoản qua link / ứng dụng lạ',
    'bank': 'Mạo danh ngân hàng, lừa OTP / vay tiền',
    'prize': 'Trúng thưởng, học bổng giả, đòi phí'
}

# Siêu tham số
L2 = 0.002
LEARNING_RATE = 0.5
EPOCHS = 600
PRUNE = 0.1           # bỏ đặc trưng có trọng số nhỏ: ~60 KB, độ chính xác gần như không đổi
SEED = 42

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass


# ------------------------------------------------------------------ tách từ
# PHẢI giống hệt hàm tokenize() trong app/js/mini-ai.js
def tokenize(text):
    t = unicodedata.normalize('NFD', str(text).lower())
    t = re.sub('[̀-ͯ]', '', t).replace('đ', 'd')
    t = re.sub(r'[0-9]+', '#', t)
    return [w for w in re.split(r'[^a-z#]+', t) if w]


def features(text):
    toks = tokenize(text)
    feats = set(toks)
    feats.update(f'{a} {b}' for a, b in zip(toks, toks[1:]))
    return feats


# ------------------------------------------------------------------ dữ liệu
def load(path):
    rows = []
    with open(path, encoding='utf-8') as fh:
        for line in fh:
            line = line.rstrip('\n')
            if not line or line.startswith('#'):
                continue
            label, text = line.split('\t', 1)
            if label not in LABELS:
                sys.exit(f'Nhãn không hợp lệ "{label}" trong {os.path.basename(path)}')
            rows.append((label, text))
    return rows


def vectorize(rows, vocab):
    X = np.zeros((len(rows), len(vocab)), dtype=np.float32)
    y = np.array([LABELS.index(l) for l, _ in rows])
    for i, (_, text) in enumerate(rows):
        for f in features(text):
            j = vocab.get(f)
            if j is not None:
                X[i, j] = 1.0
    return X, y


# ------------------------------------------------------------------ huấn luyện
def softmax(z):
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)


def train(X, y, n_classes):
    rng = np.random.default_rng(SEED)
    W = rng.normal(0, 0.01, (X.shape[1], n_classes)).astype(np.float32)
    b = np.zeros(n_classes, dtype=np.float32)
    Y = np.eye(n_classes, dtype=np.float32)[y]
    # Cân bằng lớp: tin "bình thường" nhiều hơn từng loại lừa đảo
    counts = np.bincount(y, minlength=n_classes)
    sample_w = (len(y) / (n_classes * counts[y]))[:, None].astype(np.float32)
    for _ in range(EPOCHS):
        P = softmax(X @ W + b)
        G = (P - Y) * sample_w / len(y)
        W -= LEARNING_RATE * (X.T @ G + L2 * W)
        b -= LEARNING_RATE * G.sum(axis=0)
    return W, b


def predict(W, b, X):
    return softmax(X @ W + b)


def report(name, y_true, P):
    pred = P.argmax(axis=1)
    acc = (pred == y_true).mean()
    safe = LABELS.index('safe')
    true_scam = y_true != safe
    pred_scam = pred != safe
    tp = int((true_scam & pred_scam).sum())
    fp = int((~true_scam & pred_scam).sum())
    fn = int((true_scam & ~pred_scam).sum())
    precision = tp / (tp + fp) if tp + fp else 0
    recall = tp / (tp + fn) if tp + fn else 0
    print(f'{name}: đúng loại {acc:.0%} | phát hiện lừa đảo: độ chính xác {precision:.0%}, '
          f'bắt được {recall:.0%} | báo nhầm tin thường: {fp}/{int((~true_scam).sum())}')
    report.last = {'accuracy': round(float(acc), 3), 'precision': round(precision, 3), 'recall': round(recall, 3),
                   'falsePositives': fp, 'safeCount': int((~true_scam).sum())}
    return pred


def cross_validate(rows, k=5):
    rng = np.random.default_rng(SEED)
    idx = rng.permutation(len(rows))
    folds = np.array_split(idx, k)
    y_all, p_all = [], []
    for i in range(k):
        test_idx = set(folds[i].tolist())
        tr = [rows[j] for j in idx if j not in test_idx]
        te = [rows[j] for j in folds[i]]
        vocab = build_vocab(tr)
        Xtr, ytr = vectorize(tr, vocab)
        Xte, yte = vectorize(te, vocab)
        W, b = train(Xtr, ytr, len(LABELS))
        y_all.append(yte)
        p_all.append(predict(W, b, Xte))
    report(f'Kiểm tra chéo {k} phần', np.concatenate(y_all), np.concatenate(p_all))
    return report.last


def build_vocab(rows):
    vocab = {}
    for _, text in rows:
        for f in sorted(features(text)):
            vocab.setdefault(f, len(vocab))
    return vocab


# ------------------------------------------------------------------ xuất mô hình
def prune(W):
    W = W.copy()
    W[np.abs(W).max(axis=1) < PRUNE] = 0
    return np.round(W, 2)


def export(W, b, vocab, n_train, metrics):
    weights = {}
    for f, j in vocab.items():
        row = W[j]
        if not np.any(row):
            continue
        weights[f] = [0 if v == 0 else round(float(v), 2) for v in row]
    model = {
        'version': 1,
        'trainedOn': n_train,
        'metrics': metrics,
        'labels': LABELS,
        'labelNames': LABEL_NAMES,
        'bias': [round(float(v), 4) for v in b],
        'weights': weights
    }
    body = json.dumps(model, ensure_ascii=False, separators=(',', ':'))
    with open(OUT_JS, 'w', encoding='utf-8') as fh:
        fh.write('// TỰ ĐỘNG SINH bởi tools/mini_ai/train.py — không sửa tay. Chạy lại script để cập nhật.\n')
        fh.write(f'const MINI_AI_MODEL = {body};\n')
    return len(weights), os.path.getsize(OUT_JS)


def main():
    rows = load(os.path.join(HERE, 'dataset.tsv'))
    test_rows = load(os.path.join(HERE, 'test.tsv'))
    print(f'Dữ liệu huấn luyện: {len(rows)} câu | kiểm tra riêng: {len(test_rows)} câu')
    for l in LABELS:
        print(f'  {l:10} {sum(1 for x, _ in rows if x == l):3} câu')

    cv = cross_validate(rows)

    vocab = build_vocab(rows)
    X, y = vectorize(rows, vocab)
    W, b = train(X, y, len(LABELS))
    W = prune(W)  # đánh giá trên đúng mô hình đã thu gọn sẽ chạy trên web
    report('Trên dữ liệu huấn luyện', y, predict(W, b, X))

    Xt, yt = vectorize(test_rows, vocab)
    Pt = predict(W, b, Xt)
    pred = report('Bộ kiểm tra riêng', yt, Pt)
    wrong = [(test_rows[i][0], LABELS[pred[i]], test_rows[i][1]) for i in range(len(test_rows)) if pred[i] != yt[i]]
    for true_l, pred_l, text in wrong:
        print(f'  sai: {true_l} → {pred_l}: {text[:70]}')

    metrics = {'crossValidation': cv, 'heldOutTest': report.last, 'heldOutSize': len(test_rows)}
    n_feat, size = export(W, b, vocab, len(rows), metrics)
    print(f'→ {os.path.relpath(OUT_JS, ROOT)}: {n_feat} đặc trưng, {size / 1024:.0f} KB')


if __name__ == '__main__':
    main()
