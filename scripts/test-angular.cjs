const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'test', '--browsers=ChromeHeadless', '--watch=false'], { stdio: 'inherit', env: { ...process.env, CHROME_BIN: process.env.CHROME_BIN || require('puppeteer').executablePath() } });
process.exit(result.status ?? 1);
