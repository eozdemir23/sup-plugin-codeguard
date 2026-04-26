import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import ora from 'ora';
import chalk from 'chalk';
import readline from 'readline';

// ============================================================================
// KONFİGÜRASYON VE SABİTLER
// ============================================================================
const KB_REPO_RAW = "https://raw.githubusercontent.com/eozdemir23/sup-codeguard-kb/main";
const SUPPORTED_EXTENSIONS = ['.js', '.ts', '.tsx', '.json', '.md', '.yml', '.yaml'];
const REPORT_DIR = '.codeguard';
const CACHE_DIR = path.join(REPORT_DIR, 'cache');
const CONFIG_FILE = path.join(process.cwd(), '.codeguard-config.json');

const SEVERITY = {
    CRITICAL: { color: 'red', icon: '🔴', weight: 10 },
    HIGH: { color: 'red', icon: '🟠', weight: 7 },
    MEDIUM: { color: 'yellow', icon: '🟡', weight: 4 },
    LOW: { color: 'blue', icon: '🟢', weight: 1 }
};

// ============================================================================
// KNOWLEDGE BASE (KB) YÖNETİCİSİ
// ============================================================================
class KnowledgeBaseManager {
    constructor() {
        this.rules = [];
        if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    async fetchFromGitHub(endpoint) {
        return new Promise((resolve, reject) => {
            https.get(`${KB_REPO_RAW}/${endpoint}`, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
                res.on('error', reject);
            });
        });
    }

    async sync() {
        const spinner = ora('Bilgi Bankası senkronize ediliyor...').start();
        try {
            const manifest = await this.fetchFromGitHub('manifest.json');
            let allRules = [];

            for (const file of manifest.active_rulesets) {
                const ruleset = await this.fetchFromGitHub(`rules/${file}`);
                allRules = allRules.concat(ruleset.rules);
            }

            fs.writeFileSync(path.join(CACHE_DIR, 'rules_cache.json'), JSON.stringify(allRules));
            this.rules = allRules;
            spinner.succeed(`Bilgi Bankası güncellendi: ${allRules.length} kural yüklendi.`);
        } catch (err) {
            spinner.warn('GitHub bağlantısı başarısız. Yerel önbellek kullanılıyor.');
            if (fs.existsSync(path.join(CACHE_DIR, 'rules_cache.json'))) {
                this.rules = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'rules_cache.json'), 'utf8'));
            }
        }
    }
}

// ============================================================================
// ANALİZ MOTORU (Geliştirilmiş)
// ============================================================================
class CodeAnalyzer {
    constructor(rules) {
        this.rules = rules;
        this.issues = [];
        this.stats = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    }

    analyze(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            
            this.rules.forEach(rule => {
                const regex = new RegExp(rule.pattern, 'g');
                lines.forEach((line, idx) => {
                    if (regex.test(line)) {
                        this.addIssue(filePath, idx + 1, rule);
                    }
                });
            });
        } catch (err) {}
    }

    addIssue(file, line, rule) {
        const severity = rule.severity.toUpperCase();
        this.issues.push({
            file, line,
            severity,
            name: rule.name,
            message: rule.message,
            suggestion: rule.solution,
            riskScore: SEVERITY[severity]?.weight || 1
        });
        this.stats.total++;
        this.stats[severity.toLowerCase()]++;
    }

    getRiskScore() {
        if (this.issues.length === 0) return 0;
        const totalWeight = this.issues.reduce((sum, i) => sum + i.riskScore, 0);
        return Math.min(100, Math.round((totalWeight / (this.issues.length * 10)) * 100));
    }

    formatReport() {
        let output = `\n${chalk.cyan.bold('┌─────────────────────────────────────────────┐')}\n`;
        output += chalk.cyan.bold(`│            CODE GUARD ANALİZ RAPORU         │\n`);
        output += chalk.cyan.bold('└─────────────────────────────────────────────┘\n');
        output += `Risk Skoru: ${this.getRiskScore()}/100 | Toplam Sorun: ${this.stats.total}\n\n`;

        this.issues.forEach(issue => {
            const color = SEVERITY[issue.severity].color;
            output += `${SEVERITY[issue.severity].icon} ${chalk[color].bold(issue.severity)}: ${issue.name}\n`;
            output += chalk.white(`   [${path.basename(issue.file)}:L${issue.line}] ${issue.message}\n`);
            output += chalk.green(`   💡 Öneri: ${issue.suggestion}\n\n`);
        });
        return output;
    }
}

// ============================================================================
// MAIN RUNNER
// ============================================================================
export async function run(sup, args) {
    const command = args[0] || 'scan';
    const kb = new KnowledgeBaseManager();

    if (command === 'init' || command === 'update') {
        await kb.sync();
        return;
    }

    if (command === 'scan') {
        await kb.sync(); // Her taramada sessizce kontrol et
        const spinner = ora('Proje taranıyor...').start();
        const analyzer = new CodeAnalyzer(kb.rules);
        
        const files = getAllFiles(process.cwd());
        files.forEach(f => analyzer.analyze(f));
        
        spinner.stop();
        console.log(analyzer.formatReport());
        
        const reportPath = path.join(REPORT_DIR, `report-${Date.now()}.json`);
        if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR);
        fs.writeFileSync(reportPath, JSON.stringify(analyzer.issues, null, 2));
        console.log(chalk.gray(`Rapor kaydedildi: ${reportPath}`));
    }
}

// Yardımcı fonksiyon: Dosya listeleme (Senin kodundan alındı)
function getAllFiles(dir, files = []) {
    const ignore = ['node_modules', '.git', '.codeguard', 'dist'];
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        if (ignore.includes(entry)) continue;
        if (fs.statSync(fullPath).isDirectory()) getAllFiles(fullPath, files);
        else if (SUPPORTED_EXTENSIONS.includes(path.extname(fullPath))) files.push(fullPath);
    }
    return files;
}

export function verify() { return "!1qaz2WSX3edc4RFV%56"; }
