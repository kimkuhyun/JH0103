import axios from "axios";

const SEARXNG_URL = process.env.SEARXNG_URL || "http://searxng:8080";

/**
 * SearxNG로 검색
 */
export async function searchWithSearxng(query, options = {}) {
    const {
        categories = "general",
        language = "ko-KR",
        engines = "google,naver",
        format = "json"
    } = options;
    
    console.log(`[SearxNG] Searching: "${query}"`);
    
    try {
        const response = await axios.get(`${SEARXNG_URL}/search`, {
           params: {
            q: query,
            categories,
            language,
            engines,
            format
           },
           timeout: 10000
        });
        
        const results = response.data.results || [];
        console.log(`[SearxNG] Found ${results.length} results`);
        
        return results;
        
    } catch (error) {
        console.error("[SearxNG] Search failed:", error.message);
        return [];
    }
}

/**
 * 회사 공식 홈페이지 검색
 */
export async function searchCompanyHomepage(companyName) {
    // 한국 회사를 위한 최적화된 검색 쿼리
    const queries = [
        `${companyName} 공식 홈페이지 site:co.kr OR site:com`,
        `${companyName} 회사 소개`,
        `${companyName} about company`
    ];
    
    console.log(`[SearxNG] Searching homepage for: ${companyName}`);
    
    // 첫 번째 쿼리로 검색
    let results = await searchWithSearxng(queries[0]);
    
    // 결과가 없으면 두 번째 쿼리 시도
    if (results.length === 0) {
        console.log("[SearxNG] Trying alternative query...");
        results = await searchWithSearxng(queries[1]);
    }
    
    return results;
}

/**
 * 회사 뉴스 검색
 */
export async function searchCompanyNews(companyName) {
    const query = `${companyName} 뉴스 최근`;
    
    console.log(`[SearxNG] Searching news for: ${companyName}`);
    
    return await searchWithSearxng(query, {
        categories: "news",
        engines: "google news,naver news"
    });
}
