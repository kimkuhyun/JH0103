import puppeteer from "puppeteer-core";

const BROWSERLESS_URL = process.env.BROWSERLESS_URL || "http://browserless:3000";

/**
 * Browserless로 단일 URL 크롤링
 */
export async function fetchWithBrowserless(url) {
    let browser = null;

    try {
        browser = await puppeteer.connect({
            browserWSEndpoint: `${BROWSERLESS_URL.replace('http', 'ws')}`,
        });

        const page = await browser.newPage();
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 15000
        });

        await page.waitForTimeout(3000);

        const pageData = await page.evaluate(() => {
            const title = document.title;
            const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
            
            const body = document.body.cloneNode(true);
            body.querySelectorAll('script, style, noscript').forEach(el => el.remove());
            const text = body.innerText.replace(/\s+/g, ' ').trim();

            const links = Array.from(document.querySelectorAll('a[href]'))
                .map(a => ({
                    text: a.textContent.trim(),
                    href: a.href
                }))
                .filter(link => link.text && link.href.startsWith('http'));

            const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
                .map(h => ({
                    level: h.tagName.toLowerCase(),
                    text: h.textContent.trim()
                }))
                .filter(h => h.text);

            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const phoneRegex = /(\d{2,3}[-.]?\d{3,4}[-.]?\d{4})/g;
            
            const emails = [...new Set(text.match(emailRegex) || [])];
            const phones = [...new Set(text.match(phoneRegex) || [])];

            return {
                title,
                metaDescription,
                text,
                links,
                headings,
                emails,
                phones
            };
        });

        await page.close();

        return {
            url,
            success: true,
            ...pageData
        };

    } catch (error) {
        console.error(`Puppeteer fetch failed for ${url}:`, error.message);
        return {
            url,
            success: false,
            error: error.message,
            text: '',
            links: [],
            headings: []
        };
    } finally {
        if (browser) {
            await browser.disconnect();
        }
    }
}

/**
 * 회사 홈페이지에서 중요 페이지 찾기
 */
export function findImportantPages(mainPageData, baseUrl) {
    const importantKeywords = [
        'about', 'company', 'introduce', 'introduction',
        'recruit', 'career', 'hiring', 'join',
        'service', 'product', 'business',
        '회사소개', '기업소개', '채용', '인재채용', '서비스', '제품'
    ];

    const importantUrls = [];
    const baseDomain = new URL(baseUrl).origin;

    if (!mainPageData.links) return [];

    mainPageData.links.forEach(link => {
        const linkText = link.text.toLowerCase();
        const linkHref = link.href.toLowerCase();

        // 같은 도메인인지 확인
        if (!linkHref.startsWith(baseDomain.toLowerCase())) return;

        // PDF, 이미지 제외
        if (linkHref.match(/\.(pdf|jpg|png|gif|zip|exe)$/)) return;

        // 중요 키워드 포함 여부 확인
        const isImportant = importantKeywords.some(keyword => 
            linkText.includes(keyword) || linkHref.includes(keyword)
        );

        if (isImportant) {
            importantUrls.push({
                url: link.href,
                text: link.text,
                priority: calculatePriority(linkText, linkHref)
            });
        }
    });

    // 우선순위로 정렬하고 중복 제거
    const uniqueUrls = [...new Map(importantUrls.map(item => [item.url, item])).values()];
    return uniqueUrls
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 8)
        .map(item => item.url);
}

function calculatePriority(text, href) {
    let priority = 0;
    
    // about, company 최우선
    if (text.includes('about') || href.includes('about')) priority += 100;
    if (text.includes('company') || href.includes('company') || text.includes('회사소개')) priority += 100;
    
    // recruit, career
    if (text.includes('recruit') || href.includes('recruit') || text.includes('채용')) priority += 50;
    if (text.includes('career') || href.includes('career')) priority += 50;
    
    // service, product
    if (text.includes('service') || href.includes('service') || text.includes('서비스')) priority += 30;
    if (text.includes('product') || href.includes('product') || text.includes('제품')) priority += 30;
    
    return priority;
}

/**
 * 여러 URL 병렬 크롤링
 */
export async function fetchMultipleUrls(urls, maxConcurrent = 3) {
    const results = [];
    
    for (let i = 0; i < urls.length; i += maxConcurrent) {
        const batch = urls.slice(i, i + maxConcurrent);
        console.log(`  Crawling batch ${Math.floor(i/maxConcurrent) + 1}: ${batch.length} URLs`);
        const batchResults = await Promise.all(
            batch.map(url => fetchWithBrowserless(url))
        );
        results.push(...batchResults);
    }
    
    return results;
}
