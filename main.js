import puppeteer from 'puppeteer';
import sharp from 'sharp';
import fs from 'fs';
import axios from 'axios';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function input(question = null) {
    return new Promise((resolve) => rl.question(question, answ => resolve(answ)));
}

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

const url = await input('Отправь ссылку на ранкинг JuniperBot ');

await page.goto(url, { timeout: 0 });
await input('Нажми Enter, когда прогрузишь всю страницу полностью ');

const usersDivs = await page.$$('div[id^="user-"]')
const users = await Promise.all(usersDivs.map(async div => {
    let tag;
    try {
        tag = await div.$eval('.v-list-item-subtitle', el => el.textContent);
    } catch {
        tag = await div.$eval('.v-list-item-title', el => el.textContent);
    }
    let avatarSrc;
    try {
        avatarSrc = await div.$eval('.v-avatar img', el => el.src);
    } catch {
        avatarSrc = 'https://ia800305.us.archive.org/31/items/discordprofilepictures/discordblue.png';
    }
    const resp = await axios.get(avatarSrc, { responseType: 'arraybuffer' });

    return [tag, resp.data];
}));

await browser.close();

for (const [tag, avatar] of users) {
    let fontSize = 25;
    const text = await input(`У пользователя тег ${tag}. Как его пометить? `)

    if (text == '' || text == undefined) continue;

    let textWidth = text.length * fontSize * 0.6;

    if (textWidth >= 120) {
        fontSize = Math.round(128/(text.length * 0.6));
        textWidth = text.length * fontSize * 0.6;
    }

    const textX = (128 - textWidth) / 2;
    
    const svg = `<svg width="128" height="128"><text x="${textX}" y="30" font-family="Arial" font-size="${fontSize}" font-weight="bolder" fill="red">
        ${text}
    </text></svg>`
    
    const image = sharp(avatar);
    
    const buffer = await image
      .resize(128, 128)
      .composite([{ input: Buffer.from(svg), blend: 'atop' }])
      .toBuffer();
    
    fs.writeFileSync(`output/${text}.png`, buffer);
}

rl.close();
