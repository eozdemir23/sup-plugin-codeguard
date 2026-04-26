# 🛡️ sup-plugin-codeguard — Advanced Code Analysis & Security Scanner

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-brightgreen?style=flat-square" />
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/license-ISC-orange?style=flat-square" />
</p>

> **CodeGuard**, projenizde hataları otomatik olarak tespit eden, güvenlik açıklarını bulan ve kod kalitesini iyileştirme önerileri sunan profesyonel bir kod analiz aracıdır.

---

## ✨ Özellikler

### 🔍 Kapsamlı Analiz
- **6 Kategori** — Sözdizimi, Güvenlik, Performans, Kod Kalitesi, Best Practices, Bağımlılıklar
- **40+ Kural** — Her kural detaylı açıklama ve çözüm önerisi ile gelir
- **Uyarlanabilir** — Tüm dosya türlerini tarayabilir (JS, TS, JSON, YAML, CSS, HTML)

### 🛡️ Güvenlik Odaklı
- **SQL Injection** tespiti
- **XSS Vulnerabilities** algılama
- **Hardcoded Credentials** bulma
- **Unsafe Code Patterns** uyarıları
- **Regex DoS** riski tespiti

### ⚡ Performans İçin
- **N+1 Query** desenleri algılar
- **Memory Leak** riskleri gösterir
- **Async/Await** optimizasyonları
- **Unused Code** temizliği önerir

### 📊 Risk Puanlandırması
- **0-100 Risk Score** — Genel proje sağlığı
- **Severity Levels** — CRITICAL, HIGH, MEDIUM, LOW
- **Trend Takibi** — Geçmiş raporlarla karşılaştırma
- **Detaylı Report** — JSON formatında kaydedilir

### 🤖 Gelişmiş Özellikler
- **Interactive Configuration** — OpenAI API entegrasyonu
- **Auto-Fix Önerileri** — Her sorun için çözüm örnekleri
- **Report History** — `.codeguard/` klasöründe tutulur
- **GitHub Integration** — Issue otomatik oluşturabilir (ileride)

---

## 📦 Kurulum

```bash
sup install https://github.com/eozdemir23/sup-plugin-codeguard
```

---

## 🚀 Kullanım

### Temel Tarama

```bash
sup codeguard
# veya
sup codeguard scan
```

Proje klasöründeki tüm desteklenen dosyaları tarar ve rapor oluşturur.

### Konfigürasyon (OpenAI API)

```bash
sup codeguard config
```

OpenAI API key'inizi girdikten sonra:
- Daha detaylı sorun açıklamaları
- AI-powered çözüm önerileri
- Otomatik kod düzeltme önerileri

### Auto-Fix (Gelecek)

```bash
sup codeguard fix
```

Otomatik olarak düzeltme yapılabilen sorunları yakalar ve önerir.

---

## 📋 Kontrol Kategorileri

### 1️⃣ SYNTAX ERRORS
```javascript
// ❌ HATA: Eksik virgül
let obj = {
  name: "John"
  age: 30
}

// ✅ DÜZELTME:
let obj = {
  name: "John",
  age: 30
}
```

**Tespit Edilen Sorunlar:**
- Eksik noktalı virgül
- Kapalı olmayan parantez/ayraçlar
- Yanlış değişken deklarasyonu
- Yinelenen değişken adları
- Ulaşılamayan kod

---

### 2️⃣ SECURITY ISSUES

#### SQL Injection
```javascript
// ❌ VULNERABLE
const query = `SELECT * FROM users WHERE id = ${userId}`;
db.execute(query);

// ✅ SECURE
const query = "SELECT * FROM users WHERE id = ?";
db.execute(query, [userId]);
```

#### XSS Vulnerability
```javascript
// ❌ VULNERABLE
element.innerHTML = userInput;

// ✅ SAFE
element.textContent = userInput; // Otomatik escaping
// veya
element.innerHTML = DOMPurify.sanitize(userInput);
```

#### Hardcoded Credentials
```javascript
// ❌ VULNERABLE
const apiKey = "sk-1234567890abcdef";
const password = "MyPassword123!";

// ✅ SAFE
const apiKey = process.env.API_KEY;
const password = process.env.DB_PASSWORD;
```

#### Unsafe eval()
```javascript
// ❌ DANGEROUS
const result = eval(userInput);
const func = new Function(dynamicCode);

// ✅ SAFE
const result = JSON.parse(userInput);
const module = await import(modulePath);
```

---

### 3️⃣ PERFORMANCE ISSUES

#### N+1 Queries
```javascript
// ❌ INEFFICIENT
const users = db.query("SELECT * FROM users");
for (const user of users) {
    const posts = db.query(`SELECT * FROM posts WHERE userId = ${user.id}`);
    // N+1 problem!
}

// ✅ OPTIMIZED
const users = db.query("SELECT * FROM users");
const allPosts = db.query(`
  SELECT * FROM posts WHERE userId IN (${users.map(u => u.id).join(',')})
`);
```

#### Unoptimized Loops
```javascript
// ❌ SLOW
for (let i = 0; i < array.length; i++) {
    array[i] = expensiveCalculation(array[i]);
}

// ✅ FAST
const results = array.map(item => expensiveCalculation(item));
```

#### Missing Await
```javascript
// ❌ WRONG
const data = fetch('/api/data');
console.log(data); // Promise, not data!

// ✅ CORRECT
const data = await fetch('/api/data').then(r => r.json());
console.log(data); // Actual data
```

---

### 4️⃣ CODE QUALITY

#### Missing Error Handling
```javascript
// ❌ BAD
const result = await fetchData();
return result;

// ✅ GOOD
try {
    const result = await fetchData();
    return result;
} catch (error) {
    logger.error('Fetch failed:', error);
    throw new Error('Failed to fetch data');
}
```

#### Missing Input Validation
```javascript
// ❌ UNSAFE
function updateUser(id, name) {
    db.update('users', { name }, { id });
}

// ✅ SAFE
function updateUser(id, name) {
    if (!id || typeof id !== 'number') throw new Error('Invalid ID');
    if (!name || typeof name !== 'string') throw new Error('Invalid name');
    if (name.length > 100) throw new Error('Name too long');
    db.update('users', { name }, { id });
}
```

#### Missing Documentation
```javascript
// ❌ NO DOCUMENTATION
export function calculateDiscount(price, percentage) {
    return price * (1 - percentage / 100);
}

// ✅ DOCUMENTED
/**
 * Calculates the final price after applying a discount.
 * @param {number} price - Original price in dollars
 * @param {number} percentage - Discount percentage (0-100)
 * @returns {number} Price after discount
 * @example calculateDiscount(100, 20) // Returns 80
 */
export function calculateDiscount(price, percentage) {
    return price * (1 - percentage / 100);
}
```

#### High Complexity
```javascript
// CodeGuard warns if function > 30 lines or > 10 nested conditions
// Solution: Break into smaller, focused functions
```

---

### 5️⃣ BEST PRACTICES

#### Use let/const Instead of var
```javascript
// ❌ OUTDATED
var name = "John";
var age = 30;

// ✅ MODERN
const name = "John";
let age = 30;
```

#### Proper Promise Handling
```javascript
// ❌ UNHANDLED
doSomething().then(result => {
    // No catch!
});

// ✅ COMPLETE
doSomething()
    .then(result => {
        // Success handling
    })
    .catch(error => {
        // Error handling
        logger.error('Error:', error);
    });
```

#### Remove Debug Statements
```javascript
// ❌ DEBUG CODE
console.log('User:', user);
console.log('Processing...');

// ✅ PRODUCTION READY
// Remove or use logger
import logger from './logger';
logger.debug('User:', user);
```

#### Avoid Magic Numbers
```javascript
// ❌ MAGIC NUMBERS
if (user.age > 18 && user.score > 100) {
    // What do these numbers mean?
}

// ✅ NAMED CONSTANTS
const ADULT_AGE = 18;
const MIN_QUALIFYING_SCORE = 100;
if (user.age > ADULT_AGE && user.score > MIN_QUALIFYING_SCORE) {
    // Clear intent
}
```

---

### 6️⃣ DEPENDENCY ISSUES (Gelecek)

```javascript
// Will detect:
// - Outdated packages
// - Known CVEs
// - Unused dependencies
// - Circular dependencies
```

---

## 📊 Report Format

### Konsol Çıktısı

```
┌─────────────────────────────────────────────┐
│        CODE GUARD ANALYSIS REPORT            │
├─────────────────────────────────────────────┤
│ Scanned: 4/26/2026, 2:34:15 PM              │
│ Risk Score: 67/100                          │
│ Total Issues: 12                            │
└─────────────────────────────────────────────┘

🔴 CRITICAL (3)
   [L45] SQL Injection - User input not sanitized
       Category: Security Issue
       💡 Use parameterized queries: query("SELECT * FROM users WHERE id = ?", [userId])

   [L89] Hardcoded API key detected
       Category: Security Issue
       💡 Move to environment variables: const apiKey = process.env.API_KEY

🟠 HIGH (2)
   [L67] Missing error handling for async operation
       Category: Code Quality
       💡 Add try-catch: try { result = await operation() } catch(e) { handle(e) }

🟡 MEDIUM (4)
   [L12] Potentially unused variable 'oldValue'
       Category: Code Quality
       💡 If not used, remove or prefix with underscore: _oldValue

🟢 LOW (3)
   [L56] Missing JSDoc documentation
       Category: Code Quality
       💡 Add: /** Describes what function does */ above function

📄 Report saved: .codeguard/report-1735161255000.json
```

### JSON Report (.codeguard/report-xxxxx.json)

```json
{
  "timestamp": "2026-04-26T14:34:15.000Z",
  "riskScore": 67,
  "stats": {
    "total": 12,
    "critical": 3,
    "high": 2,
    "medium": 4,
    "low": 3
  },
  "issues": [
    {
      "file": "src/api.js",
      "line": 45,
      "severity": "CRITICAL",
      "category": "Security Issue",
      "message": "SQL Injection - User input not sanitized",
      "suggestion": "Use parameterized queries: query(...)",
      "code": "const query = `SELECT * FROM users WHERE id = ${userId}`;",
      "riskScore": 10
    },
    // ... more issues
  ]
}
```

---

## 🎯 Risk Score Açıklaması

```
Risk Score Aralığı:

0-20   ✅ EXCELLENT - Minimal risk
21-40  ✅ GOOD - Acceptable level
41-60  ⚠️ MEDIUM - Improvements needed
61-80  🔴 HIGH - Significant issues
81-100 🚨 CRITICAL - Immediate action required
```

Puan her sorunun severity ve weight'ine göre hesaplanır.

---

## 💡 Kullanım İpuçları

### 1. Düzenli Kontrol
```bash
# Package.json'a ekle
"scripts": {
  "analyze": "sup codeguard",
  "analyze:ci": "sup codeguard scan && [[ $(cat .codeguard/latest.json | jq .riskScore) -lt 50 ]]"
}
```

### 2. CI/CD Pipeline
```yaml
# GitHub Actions örneği
- name: Run CodeGuard
  run: sup codeguard scan
  
- name: Check Risk Score
  run: |
    RISK=$(cat .codeguard/*.json | jq -r '.riskScore' | sort -n | tail -1)
    if [ $RISK -gt 70 ]; then
      echo "Risk score too high: $RISK/100"
      exit 1
    fi
```

### 3. Yanlış Pozitifler Hariç Tutma
`.codeguardignore` dosyası oluştur:
```
# Eklenti dosyaları
node_modules/
dist/
build/

# Üçüncü taraf kodu
vendor/
external/

# Generated dosyalar
*.generated.js
*.min.js
```

---

## 🔧 Yapılandırma

`.codeguard-config.json`:
```json
{
  "apiKey": "sk-...",
  "threshold": "HIGH",
  "autoFix": false,
  "ignoredPatterns": ["*.min.js", "vendor/*"],
  "rules": {
    "sqlInjection": true,
    "xss": true,
    "hardcodedSecrets": true,
    "unusedVariables": true,
    "missingErrorHandling": true
  }
}
```

---

## 📈 İstatistikler ve Eğilimler

Geçmiş raporları karşılaştır:
```bash
# Raporlar .codeguard/ klasöründe saklanır
ls -la .codeguard/
# report-1735161200000.json
# report-1735161255000.json
# ...
```

JSON raporlarını parse ederek trend analizi yapabilirsin.

---

## 🚀 Gelecek Özellikleri

- [ ] OpenAI API entegrasyonu (detaylı çözümler)
- [ ] Auto-fix özelliği
- [ ] GitHub Issue otomatik oluşturma
- [ ] Slack/Discord notifikasyonları
- [ ] Custom rule yazma desteği
- [ ] Performance benchmarking
- [ ] Team dashboard

---

## ⚠️ Limitasyonlar

CodeGuard statik analiz aracıdır:
- **Dinamik davranış** tespit edemez
- **Runtime errors** tahmin edemez
- **Business logic** hatalarını bulamaz
- **Tüm patterns** otomatik bulunmaz

**Tavsiye:** CodeGuard + linter (ESLint) + type checker (TypeScript) birlikte kullan.

---

## 📄 Lisans

ISC © 2026 [eozdemir23](https://github.com/eozdemir23)

---

<div align="center">

**CodeGuard** ile kodunuzu güvenli, hızlı ve temiz tutun.

[![GitHub](https://img.shields.io/badge/GitHub-eozdemir23-181717?style=flat-square&logo=github)](https://github.com/eozdemir23/sup-plugin-codeguard)
[![Issues](https://img.shields.io/badge/Issues-Report%20Bug-red?style=flat-square)](https://github.com/eozdemir23/sup-plugin-codeguard/issues)

</div>
