import fs from 'fs';
import path from 'path';
import https from 'https';
import ora from 'ora';
import chalk from 'chalk';

// ============================================================================
// CANLI VERİ BAĞLANTISI (KB REPO)
// ============================================================================
const KB_REPO_RAW = "https://raw.githubusercontent.com/eozdemir23/sup-codeguard-kb/main";
const SUPPORTED_EXTENSIONS = ['.js', '.ts', '.tsx', '.json', '.md'];

const SEVERITY = {
    CRITICAL: { color: 'red', icon: '🔴', weight: 10 },
    HIGH: { color: 'red', icon: '🟠', weight: 7 },
    MEDIUM: { color: 'yellow', icon: '🟡', weight: 4 },
    LOW: { color: 'blue', icon: '🟢', weight: 1 }
};

// ============================================================================
// CANLI VERİ ÇEKME MOTORU (Fetch Engine)
// ============================================================================
async function fetchOnlineRules() {
    const fetchJson = (url) => new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });

    try {
        // 1. Önce manifest'i oku (Hangi kural setleri var?)
        const manifest = await fetchJson(`${KB_REPO_RAW}/manifest.json`);
        let allRules = [];

        // 2. Her bir kural setini canlı olarak çek ve birleştir
        for (const file of manifest.active_rulesets) {
            const ruleset = await fetchJson(`${KB_REPO_RAW}/rules/${file}`);
            allRules = allRules.concat(ruleset.rules);
        }
        return allRules;
    } catch (err) {
        throw new Error("Bilgi Bankasına bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.");
    }
}

// ============================================================================
// ANALİZ MOTORU
// ============================================================================
class OnlineAnalyzer {
    constructor(liveRules) {
        this.rules = liveRules;
        this.issues = [];
    }

    analyzeFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        this.rules.forEach(rule => {
            const regex = new RegExp(rule.pattern, 'g');
            lines.forEach((line, idx) => {
                if (regex.test(line)) {
                    this.issues.push({
                        file: path.basename(filePath),
                        line: idx + 1,
                        ...rule,
                        severityConfig: SEVERITY[rule.severity.toUpperCase()]
                    });
                }
            });
        });
    }
}

// ============================================================================
// ANA ÇALIŞTIRICI (Plugin Run)
// ============================================================================
export async function run(sup, args) {
    const spinner = ora('Bulut tabanlı Bilgi Bankasına bağlanılıyor...').start();

    try {
        // KURALLARI İNDİRMİYORUZ, SADECE ÇALIŞMA ZAMANINDA (RUNTIME) BELLEĞE ALIYORUZ
        const liveRules = await fetchOnlineRules();
        spinner.text = 'Bilgi Bankası aktif. Kodlar analiz ediliyor...';

        const analyzer = new OnlineAnalyzer(liveRules);
        const files = getAllFiles(process.cwd());

        files.forEach(f => analyzer.analyzeFile(f));
        spinner.stop();

        // RAPORLAMA
        if (analyzer.issues.length === 0) {
            console.log(chalk.green.bold('\n✨ Harika! Canlı tarama sonucunda hiçbir sorun bulunamadı.\n'));
        } else {
            console.log(chalk.cyan.bold('\n--- CANLI ANALİZ SONUÇLARI ---'));
            analyzer.issues.forEach(issue => {
                const color = issue.severityConfig.color;
                console.log(`${issue.severityConfig.icon} ${chalk[color].bold(issue.severity)}: ${issue.name}`);
                console.log(chalk.white(`   [${issue.file}:L${issue.line}] ${issue.message}`));
                console.log(chalk.green(`   💡 Öneri: ${issue.solution}\n`));
            });
        }

    } catch (error) {
        spinner.fail(chalk.red(error.message));
    }
}

// Proje dosyalarını bulan yardımcı fonksiyon
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
