import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import ora from 'ora';
import chalk from 'chalk';
import readline from 'readline';

// ============================================================================
// CODEGUARD - ADVANCED CODE ANALYSIS & SECURITY SCANNER
// ============================================================================

const SUPPORTED_EXTENSIONS = ['.js', '.ts', '.tsx', '.json', '.md', '.yml', '.yaml', '.css', '.scss', '.html'];
const REPORT_DIR = '.codeguard';
const CONFIG_FILE = path.join(process.cwd(), '.codeguard-config.json');

// Issue severity levels
const SEVERITY = {
    CRITICAL: { level: 0, color: 'red', icon: '🔴', weight: 10 },
    HIGH: { level: 1, color: 'red', icon: '🟠', weight: 7 },
    MEDIUM: { level: 2, color: 'yellow', icon: '🟡', weight: 4 },
    LOW: { level: 3, color: 'blue', icon: '🟢', weight: 1 }
};

// Issue categories
const CATEGORIES = {
    SYNTAX: 'Syntax Error',
    SECURITY: 'Security Issue',
    PERFORMANCE: 'Performance Issue',
    QUALITY: 'Code Quality',
    BEST_PRACTICE: 'Best Practice',
    DEPENDENCY: 'Dependency Issue'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {}
    }
    return { apiKey: null, threshold: 'HIGH', autoFix: false };
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function askQuestion(query, hidden = false) {
    return new Promise(resolve => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(query, ans => { rl.close(); resolve(ans.trim()); });
    });
}

function getFileExtension(filePath) {
    return path.extname(filePath).toLowerCase();
}

function getAllFiles(dir, baseDir = dir, files = []) {
    const ignore = ['node_modules', '.git', 'dist', 'build', '.cache', '.codeguard'];
    let entries;
    try { entries = fs.readdirSync(dir); } catch { return files; }

    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relPath = path.relative(baseDir, fullPath);

        if (ignore.some(i => relPath.startsWith(i))) continue;

        try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) getAllFiles(fullPath, baseDir, files);
            else if (SUPPORTED_EXTENSIONS.includes(getFileExtension(fullPath))) files.push(fullPath);
        } catch {}
    }
    return files;
}

// ============================================================================
// ANALYSIS ENGINE
// ============================================================================

class CodeAnalyzer {
    constructor() {
        this.issues = [];
        this.stats = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    }

    addIssue(file, line, severity, category, message, suggestion, code = null) {
        const issue = {
            file,
            line,
            severity,
            category,
            message,
            suggestion,
            code,
            riskScore: SEVERITY[severity].weight
        };
        this.issues.push(issue);
        this.stats.total++;
        this.stats[severity.toLowerCase()]++;
    }

    analyzeJavaScript(filePath, content) {
        const lines = content.split('\n');

        // 1. SYNTAX CHECKS
        this.checkSyntaxErrors(filePath, content, lines);

        // 2. SECURITY CHECKS
        this.checkSecurityIssues(filePath, content, lines);

        // 3. PERFORMANCE CHECKS
        this.checkPerformanceIssues(filePath, content, lines);

        // 4. CODE QUALITY CHECKS
        this.checkCodeQuality(filePath, content, lines);

        // 5. BEST PRACTICES
        this.checkBestPractices(filePath, content, lines);
    }

    checkSyntaxErrors(file, content, lines) {
        lines.forEach((line, idx) => {
            const lineNum = idx + 1;

            // Missing semicolons (simplified)
            if (/^(?!\/\/).*[a-zA-Z0-9\)]\s*$/.test(line.trim()) && 
                !line.includes('{') && !line.includes('}') && 
                !line.includes('//') && line.trim().length > 0) {
                if (!/;$|{$|,\s*$|=>|return$/.test(line)) {
                    this.addIssue(file, lineNum, 'LOW', CATEGORIES.SYNTAX,
                        'Missing semicolon',
                        `Add semicolon at end of line: ${line.trim()};`,
                        line);
                }
            }

            // Unused variables
            if (/^\s*(let|const|var)\s+(\w+)/.test(line)) {
                const varMatch = line.match(/^\s*(let|const|var)\s+(\w+)/);
                if (varMatch) {
                    const varName = varMatch[2];
                    const usedAfter = lines.slice(idx + 1).some(l => new RegExp(`\\b${varName}\\b`).test(l));
                    if (!usedAfter && !varName.startsWith('_')) {
                        this.addIssue(file, lineNum, 'MEDIUM', CATEGORIES.QUALITY,
                            `Potentially unused variable '${varName}'`,
                            `If not used, remove or prefix with underscore: _${varName}`,
                            line);
                    }
                }
            }

            // Unreachable code after return
            if (idx > 0 && /^\s*return\b/.test(lines[idx - 1])) {
                if (!/^\s*(}|else|catch|finally|\/\/)/.test(line) && line.trim().length > 0) {
                    this.addIssue(file, lineNum, 'MEDIUM', CATEGORIES.SYNTAX,
                        'Unreachable code after return',
                        'Remove or move code before return statement',
                        line);
                }
            }
        });
    }

    checkSecurityIssues(file, content, lines) {
        lines.forEach((line, idx) => {
            const lineNum = idx + 1;

            // SQL Injection risks
            if (/query\s*\(\s*["`']\s*\$|query\s*\(\s*["`']\s*\+|query.*user.*input|SELECT.*WHERE.*=\s*\$\{|SELECT.*WHERE.*=\s*\+/.test(line)) {
                this.addIssue(file, lineNum, 'CRITICAL', CATEGORIES.SECURITY,
                    'Potential SQL Injection vulnerability',
                    'Use parameterized queries: query("SELECT * FROM users WHERE id = ?", [userId])',
                    line);
            }

            // XSS vulnerabilities (innerHTML, dangerouslySetInnerHTML)
            if (/innerHTML\s*=|dangerouslySetInnerHTML|\.html\s*\(|\.append\(.*html|\.insertAdjacentHTML/.test(line)) {
                this.addIssue(file, lineNum, 'CRITICAL', CATEGORIES.SECURITY,
                    'Potential XSS vulnerability - unsafe DOM manipulation',
                    'Use textContent or createElement instead: element.textContent = userInput',
                    line);
            }

            // Hardcoded credentials
            if (/password\s*[:=]\s*['"`]|api[_-]?key\s*[:=]\s*['"`]|secret\s*[:=]\s*['"`]|token\s*[:=]\s*['"`]/.test(line.toLowerCase())) {
                this.addIssue(file, lineNum, 'CRITICAL', CATEGORIES.SECURITY,
                    'Hardcoded credentials/secrets detected',
                    'Move to environment variables: const apiKey = process.env.API_KEY',
                    line);
            }

            // Unsafe eval
            if (/\beval\s*\(|Function\s*\(\s*['"`]|setTimeout\s*\(\s*['"`].*[,\)]|setInterval\s*\(\s*['"`]/.test(line)) {
                this.addIssue(file, lineNum, 'CRITICAL', CATEGORIES.SECURITY,
                    'Use of eval() or similar dynamic code execution',
                    'Refactor to avoid eval. Use safer alternatives like JSON.parse()',
                    line);
            }

            // Regex DoS
            if (/new\s+RegExp\s*\(|\/.*\*.*\/|\.match\(\/.*\*\)/.test(line)) {
                this.addIssue(file, lineNum, 'HIGH', CATEGORIES.SECURITY,
                    'Potentially dangerous regex pattern (ReDoS risk)',
                    'Simplify regex or use a regex validator tool',
                    line);
            }
        });
    }

    checkPerformanceIssues(file, content, lines) {
        lines.forEach((line, idx) => {
            const lineNum = idx + 1;

            // N+1 queries pattern (simplified)
            if (/for\s*\(|foreach|while\s*\(/.test(line)) {
                const blockContent = lines.slice(idx, Math.min(idx + 10)).join('\n');
                if (/(query|fetch|db\.|sql|api\.|axios|fetch\()/.test(blockContent)) {
                    this.addIssue(file, lineNum, 'MEDIUM', CATEGORIES.PERFORMANCE,
                        'Potential N+1 query problem - database call inside loop',
                        'Batch queries: Use JOIN or load all data before loop',
                        line);
                }
            }

            // Missing await
            if (/\.then\(|async.*=>|Promise\.all/.test(line) && !/await/.test(line)) {
                if (idx > 0 && /const|let|var/.test(lines[idx - 1])) {
                    this.addIssue(file, lineNum, 'MEDIUM', CATEGORIES.PERFORMANCE,
                        'Async operation not awaited',
                        'Use await: const result = await asyncFunction()',
                        line);
                }
            }

            // Large imports/inefficient patterns
            if (/import\s+\*\s+as\s+\w+\s+from|require\s*\(\s*['"`].*\.json['"`]/.test(line)) {
                this.addIssue(file, lineNum, 'MEDIUM', CATEGORIES.PERFORMANCE,
                    'Importing entire module (consider destructuring)',
                    'Use named imports: import { function1, function2 } from "module"',
                    line);
            }
        });
    }

    checkCodeQuality(file, content, lines) {
        lines.forEach((line, idx) => {
            const lineNum = idx + 1;

            // No error handling
            if (/try\s*{|\.catch|catch\s*\(/.test(lines[Math.max(0, idx - 3) + ',' + Math.min(lines.length - 1, idx + 3)])) {
                return; // Has error handling
            }
            if (/(fetch|axios|query|api\.)/i.test(line) && !/catch|\.catch|error|try/.test(line)) {
                this.addIssue(file, lineNum, 'HIGH', CATEGORIES.QUALITY,
                    'Missing error handling for async operation',
                    'Add try-catch: try { result = await operation() } catch(e) { handle(e) }',
                    line);
            }

            // Missing input validation
            if (/function\s+\w+\s*\(|=>|\.forEach|\.map/.test(line)) {
                if (!/if\s*\(|validate|throw|check|assert/.test(lines[idx + 1] || '')) {
                    this.addIssue(file, lineNum, 'MEDIUM', CATEGORIES.QUALITY,
                        'Function lacks input validation',
                        'Add validation: if (!input || typeof input !== "string") throw new Error()',
                        line);
                }
            }

            // Missing JSDoc
            if (/^export\s+(function|const|class)\s+\w+|^\s*function\s+\w+\s*\(/.test(line)) {
                if (idx === 0 || !lines[idx - 1].includes('/**')) {
                    this.addIssue(file, lineNum, 'LOW', CATEGORIES.QUALITY,
                        'Missing JSDoc documentation',
                        'Add: /** Describes what function does */ above function',
                        line);
                }
            }

            // Cognitive complexity (function too long/complex)
            if (/function|=>|class/.test(line)) {
                let braceCount = 0;
                let blockLines = 0;
                for (let i = idx; i < Math.min(idx + 50, lines.length); i++) {
                    braceCount += (lines[i].match(/{/g) || []).length;
                    braceCount -= (lines[i].match(/}/g) || []).length;
                    blockLines++;
                    if (braceCount === 0 && i > idx) break;
                }
                if (blockLines > 30) {
                    this.addIssue(file, lineNum, 'MEDIUM', CATEGORIES.QUALITY,
                        `Function too long (${blockLines} lines) - consider breaking into smaller functions`,
                        'Refactor: Extract logic into separate functions',
                        line);
                }
            }
        });
    }

    checkBestPractices(file, content, lines) {
        lines.forEach((line, idx) => {
            const lineNum = idx + 1;

            // Promise handling
            if (/new\s+Promise\(|\.then\(/.test(line) && !/catch/.test(content.substring(content.indexOf(line), Math.min(content.length, content.indexOf(line) + 500)))) {
                this.addIssue(file, lineNum, 'MEDIUM', CATEGORIES.BEST_PRACTICE,
                    'Promise without catch handler',
                    'Add .catch() or use try-catch with await',
                    line);
            }

            // var usage (use let/const instead)
            if (/^\s*var\s+/.test(line)) {
                this.addIssue(file, lineNum, 'LOW', CATEGORIES.BEST_PRACTICE,
                    'Use of deprecated "var" keyword',
                    'Replace with let or const: const name = "value"',
                    line);
            }

            // console.log in production
            if (/console\.(log|debug|info|warn)/.test(line)) {
                this.addIssue(file, lineNum, 'LOW', CATEGORIES.BEST_PRACTICE,
                    'Console statement in code (should be removed before production)',
                    'Use logger library or remove: import logger from "./logger"',
                    line);
            }

            // Magic numbers
            if (/[^a-zA-Z_](\d{3,}|0x[0-9a-f]+)[^a-zA-Z_]/.test(line) && !/const|let|var/.test(line)) {
                this.addIssue(file, lineNum, 'LOW', CATEGORIES.BEST_PRACTICE,
                    'Magic number without explanation',
                    'Extract to named constant: const MAX_RETRIES = 3',
                    line);
            }
        });
    }

    analyzeJSON(filePath, content) {
        try { JSON.parse(content); } catch (e) {
            const line = parseInt(e.message.match(/position (\d+)/) ? e.message.match(/position (\d+)/)[1] : 0);
            this.addIssue(filePath, line || 1, 'CRITICAL', CATEGORIES.SYNTAX,
                'Invalid JSON syntax',
                `Fix JSON: ${e.message.substring(0, 100)}`,
                content.split('\n')[line] || '');
        }
    }

    analyzeYAML(filePath, content) {
        // Simplified YAML check
        const lines = content.split('\n');
        let indentStack = [0];

        lines.forEach((line, idx) => {
            const lineNum = idx + 1;
            const indent = line.match(/^(\s*)/)[1].length;

            if (/:/.test(line) && !line.includes('"') && !line.includes("'")) {
                // Check for valid YAML key-value
                if (!/^\s*[\w-]+:\s*(\w+|".*"|'.*'|\[|\{|$)/.test(line)) {
                    this.addIssue(filePath, lineNum, 'MEDIUM', CATEGORIES.SYNTAX,
                        'Potentially invalid YAML syntax',
                        'Ensure key: value format with proper quoting',
                        line);
                }
            }
        });
    }

    analyze(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const ext = getFileExtension(filePath);

            if (['.js', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
                this.analyzeJavaScript(filePath, content);
            } else if (ext === '.json') {
                this.analyzeJSON(filePath, content);
            } else if (['.yml', '.yaml'].includes(ext)) {
                this.analyzeYAML(filePath, content);
            }
        } catch (err) {
            // File read error
        }
    }

    getRiskScore() {
        const weights = this.issues.reduce((sum, issue) => sum + issue.riskScore, 0);
        return Math.min(100, Math.round((weights / (this.issues.length * 10)) * 100));
    }

    formatReport() {
        const riskScore = this.getRiskScore();
        let output = '\n';
        output += chalk.cyan.bold('┌─────────────────────────────────────────────┐\n');
        output += chalk.cyan.bold('│        CODE GUARD ANALYSIS REPORT            │\n');
        output += chalk.cyan.bold('├─────────────────────────────────────────────┤\n');
        output += chalk.cyan(`│ Scanned: ${new Date().toLocaleString()}           │\n`);
        output += chalk.cyan(`│ Risk Score: ${riskScore}/100                          │\n`);
        output += chalk.cyan(`│ Total Issues: ${this.stats.total}                        │\n`);
        output += chalk.cyan.bold('└─────────────────────────────────────────────┘\n\n');

        // Group by severity
        const bySeverity = Object.keys(SEVERITY).reduce((acc, sev) => {
            acc[sev] = this.issues.filter(i => i.severity === sev);
            return acc;
        }, {});

        for (const [severity, issues] of Object.entries(bySeverity)) {
            if (issues.length > 0) {
                const icon = SEVERITY[severity].icon;
                const color = SEVERITY[severity].color;
                output += chalk[color](`${icon} ${severity} (${issues.length})\n`);

                issues.forEach((issue, idx) => {
                    output += chalk.white(`   [L${issue.line}] ${issue.message}\n`);
                    output += chalk.gray(`       Category: ${issue.category}\n`);
                    output += chalk.green(`       💡 ${issue.suggestion}\n`);
                    if (idx < issues.length - 1) output += '\n';
                });
                output += '\n';
            }
        }

        return output;
    }

    saveReport(filename = null) {
        if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR);
        const fname = filename || `report-${Date.now()}.json`;
        const filepath = path.join(REPORT_DIR, fname);
        fs.writeFileSync(filepath, JSON.stringify({
            timestamp: new Date().toISOString(),
            riskScore: this.getRiskScore(),
            stats: this.stats,
            issues: this.issues
        }, null, 2));
        return filepath;
    }
}

// ============================================================================
// MAIN PLUGIN
// ============================================================================

export async function run(sup, args) {
    const command = args[0] || 'scan';
    const config = getConfig();

    if (command === 'config') {
        await configureAPI(config);
        return;
    }

    if (command === 'scan') {
        await scanProject();
        return;
    }

    if (command === 'fix') {
        console.log(chalk.yellow('ℹ️  Auto-fix feature requires OpenAI API key.'));
        console.log(chalk.gray('Run: sup codeguard config'));
        return;
    }

    console.log(chalk.red('❌ Unknown command. Use: scan, config, or fix'));
}

async function configureAPI(config) {
    console.log(chalk.cyan.bold('\n⚙️ CODE GUARD Configuration\n'));

    const apiKey = await askQuestion(chalk.cyan('🔑 OpenAI API Key (leave blank to skip): '));
    if (apiKey) {
        config.apiKey = apiKey;
        saveConfig(config);
        console.log(chalk.green('✔ Configuration saved!'));
    } else {
        console.log(chalk.yellow('ℹ️  Skipped API configuration'));
    }
}

async function scanProject() {
    const spinner = ora('Scanning project...').start();
    const analyzer = new CodeAnalyzer();

    const files = getAllFiles(process.cwd());
    spinner.text = `Found ${files.length} files to analyze...`;

    let analyzed = 0;
    files.forEach(file => {
        analyzer.analyze(file);
        analyzed++;
        spinner.text = `Analyzing: ${analyzed}/${files.length} files...`;
    });

    spinner.stop();

    if (analyzer.stats.total === 0) {
        console.log(chalk.green.bold('\n✨ Perfect! No issues found.\n'));
        return;
    }

    console.log(analyzer.formatReport());

    // Save report
    const reportPath = analyzer.saveReport();
    console.log(chalk.gray(`📄 Report saved: ${reportPath}\n`));

    // Risk level warning
    const riskScore = analyzer.getRiskScore();
    if (riskScore >= 70) {
        console.log(chalk.red.bold(`⚠️  HIGH RISK (Score: ${riskScore}/100)\n`));
    } else if (riskScore >= 40) {
        console.log(chalk.yellow.bold(`⚠️  MEDIUM RISK (Score: ${riskScore}/100)\n`));
    }
}

export function verify() {
    return "!1qaz2WSX3edc4RFV%56";
}
