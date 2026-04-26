# sup-plugin-codeguard — Detaylı Özellik Specifikasyonu

## 🎯 Ana Amaç
Kullanıcının kodundaki hataları, güvenlik açıklarını, performance problemlerini ve best practice ihlallerini otomatik olarak tespit edip çözüm önerileri sunmak.

## 📊 Desteklenen Dosya Türleri
- JavaScript (.js, .mjs, .cjs)
- TypeScript (.ts, .tsx)
- JSON (.json)
- Markdown (.md)
- YAML (.yml, .yaml)
- CSS (.css, .scss)
- HTML (.html)

## 🔍 Kontrol Kategorileri

### 1. SYNTAX ERRORS (Sözdizimi Hataları)
- Missing semicolons
- Unclosed brackets/braces
- Invalid variable declarations
- Duplicate variable names
- Unreachable code

### 2. SECURITY ISSUES (Güvenlik Sorunları)
- SQL Injection risks
- XSS vulnerabilities
- Hardcoded credentials
- Unsafe regex patterns
- CORS misconfigurations
- Path traversal risks

### 3. PERFORMANCE ISSUES (Performans Sorunları)
- Unused variables/imports
- Large bundle size
- N+1 query patterns
- Memory leaks
- Inefficient loops
- Missing indexes

### 4. CODE QUALITY (Kod Kalitesi)
- Naming conventions
- Function complexity (cognitive complexity)
- Code duplication
- Missing error handling
- Missing input validation
- Type safety issues

### 5. BEST PRACTICES (En İyi Uygulamalar)
- Async/await usage
- Promise handling
- Error handling patterns
- Logging practices
- Documentation completeness
- Test coverage

### 6. DEPENDENCY ISSUES (Bağımlılık Sorunları)
- Outdated packages
- Known vulnerabilities (CVE)
- Unused dependencies
- Circular dependencies
- Missing peer dependencies

## 🎨 Çıktı Formatı

```
┌─────────────────────────────────────────┐
│        CODE GUARD ANALYSIS REPORT        │
├─────────────────────────────────────────┤
│ File: src/api.js                        │
│ Scanned: 2026-04-26 14:23:45            │
│ Lines: 145 | Issues Found: 8            │
└─────────────────────────────────────────┘

🔴 CRITICAL (3)
   [L45] SQL Injection - User input not sanitized
         Fix: Use parameterized queries
         
🟠 HIGH (2)
   [L67] Missing error handling in async function
   [L89] Hardcoded API key detected
   
🟡 MEDIUM (2)
   [L12] Unused variable 'oldValue'
   [L103] Function complexity too high (12)
   
🟢 LOW (1)
   [L56] Missing JSDoc comment
```

## 📈 İstatistikler
- Toplam sorun sayısı (category'e göre)
- Risk score (0-100)
- Trend (improvement/degradation)
- Önerilen aksiyonlar

## 🤖 AI Integration
- OpenAI API ile detaylı çözüm önerileri
- Code snippet'lerle örnek düzeltmeler
- Pattern-based recommendations
- Learning from fixes

## 💾 Report Yönetimi
- JSON formatında report kaydetme
- Geçmiş analiz karşılaştırması
- GitHub Issue otomatik oluşturma
- Slack notifikasyonları
