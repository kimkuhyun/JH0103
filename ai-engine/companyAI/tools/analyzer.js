import axios from "axios";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://host.docker.internal:11434";
const MODEL_NAME = process.env.OLLAMA_MODEL || "qwen2.5:7b";

/**
 * Ollama로 텍스트 분석
 */
async function analyzeWithOllama(prompt, systemPrompt = "") {
    try {
        console.log("[Ollama] Starting analysis...");
        
        const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
            model: MODEL_NAME,
            prompt: prompt,
            system: systemPrompt,
            stream: false,
            options: {
                temperature: 0.3,
                top_p: 0.8,
                num_predict: 2000,
            }
        }, {
            timeout: 120000 // 120초로 증가
        });

        console.log("[Ollama] Analysis completed");
        return response.data.response;
        
    } catch (error) {
        console.error("[Ollama] Analysis failed:", error.message);
        throw error;
    }
}

/**
 * 회사 데이터 종합 분석
 */
export async function analyzeCompanyData(data) {
    console.log("\n=== AGENT FLOW START ===");
    console.log("Company:", data.company);
    
    const { company, searchResults, crawledData, newsResults, jobContext } = data;

    // Step 1: 검색 결과 필터링 및 요약
    console.log("\n[STEP 1] Processing search results...");
    const relevantUrls = filterRelevantUrls(searchResults, company);
    const searchSummary = relevantUrls
        .slice(0, 5)
        .map(r => `- ${r.title}: ${r.url}`)
        .join('\n');
    console.log(`Found ${relevantUrls.length} relevant URLs`);

    // Step 2: 크롤링 데이터 정제
    console.log("\n[STEP 2] Processing crawled data...");
    const crawledText = crawledData
        .filter(d => d.success && d.text)
        .map(d => ({
            url: d.url,
            text: d.text,
            title: d.title,
            headings: d.headings || [],
            emails: d.emails || [],
            phones: d.phones || []
        }))
        .map(d => {
            const headingsText = d.headings.map(h => `[${h.level}] ${h.text}`).join('\n');
            const contactInfo = [
                d.emails.length > 0 ? `이메일: ${d.emails.join(', ')}` : '',
                d.phones.length > 0 ? `전화: ${d.phones.join(', ')}` : ''
            ].filter(Boolean).join('\n');
            
            return `[페이지: ${d.title}]\nURL: ${d.url}\n\n헤딩:\n${headingsText}\n\n본문:\n${d.text}\n\n연락처:\n${contactInfo}`;
        })
        .join('\n\n========================================\n\n');
    
    console.log(`Processed ${crawledData.length} pages, total text length: ${crawledText.length} characters`);

    // Step 3: 뉴스 요약
    console.log("\n[STEP 3] Processing news results...");
    const newsSummary = newsResults
        .slice(0, 3)
        .map(n => `- ${n.title}`)
        .join('\n');

    // Step 4: AI에게 분석 요청
    console.log("\n[STEP 4] Starting AI analysis...");
    
    const prompt = buildAnalysisPrompt(
        company,
        searchSummary,
        crawledText,
        newsSummary,
        jobContext
    );
    
    const systemPrompt = `당신은 한국 기업 분석 전문가입니다. 
주어진 크롤링 데이터를 꼼꼼히 분석하여 정확하고 상세한 정보를 JSON 형식으로 제공합니다.

**절대 규칙:**
1. "기타", "정보 없음", null, 빈 문자열은 절대 사용 금지
2. 크롤링 내용에서 정보를 최대한 추출하여 구체적으로 작성
3. 모든 항목에 실질적인 내용 포함
4. 회사명이 한국어인 경우 한국 회사 정보 우선 분석
5. JSON 외 다른 텍스트 출력 금지`;

    try {
        const aiResponse = await analyzeWithOllama(prompt, systemPrompt);
        console.log("\n[STEP 5] Parsing AI response...");
        
        // JSON 파싱 시도
        const result = parseAiResponse(aiResponse, company, searchResults, newsResults);
        
        console.log("=== AGENT FLOW END ===\n");
        return result;
        
    } catch (error) {
        console.error("[AI Analysis] Failed:", error.message);
        return createFallbackResponse(company, searchResults, newsResults, crawledData);
    }
}

/**
 * 관련성 높은 URL 필터링
 */
function filterRelevantUrls(searchResults, companyName) {
    const companyKeywords = companyName.toLowerCase().split(' ');
    
    return searchResults
        .filter(result => {
            const url = result.url.toLowerCase();
            const title = (result.title || '').toLowerCase();
            
            // 회사 공식 사이트 우선
            const isOfficialSite = url.includes('.co.kr') || 
                                   url.includes('.com') ||
                                   companyKeywords.some(kw => url.includes(kw));
            
            // 뉴스, 블로그는 낮은 우선순위
            const isNews = url.includes('news') || 
                          url.includes('blog') ||
                          url.includes('naver.com/PostView');
            
            // 채용 사이트 제외
            const isJobSite = url.includes('jobkorea') ||
                             url.includes('saramin') ||
                             url.includes('wanted');
            
            return isOfficialSite && !isJobSite;
        })
        .sort((a, b) => {
            // 공식 사이트가 제일 위로
            const aScore = calculateRelevanceScore(a, companyKeywords);
            const bScore = calculateRelevanceScore(b, companyKeywords);
            return bScore - aScore;
        });
}

/**
 * URL 관련성 점수 계산
 */
function calculateRelevanceScore(result, companyKeywords) {
    let score = 0;
    const url = result.url.toLowerCase();
    const title = (result.title || '').toLowerCase();
    
    // 키워드 포함 여부
    companyKeywords.forEach(keyword => {
        if (url.includes(keyword)) score += 10;
        if (title.includes(keyword)) score += 5;
    });
    
    // .com, .co.kr 도메인 우선
    if (url.includes('.com') || url.includes('.co.kr')) score += 20;
    
    // about, company 페이지 우선
    if (url.includes('about') || url.includes('company')) score += 15;
    
    return score;
}

/**
 * AI 분석 프롬프트 생성 - 유연한 형식 지원
 */
function buildAnalysisPrompt(company, searchSummary, crawledText, newsSummary, jobContext) {
    return `
다음은 "${company}" 회사에 대한 상세 정보입니다.

## 검색 결과:
${searchSummary}

## 회사 홈페이지 크롤링 내용:
${crawledText}

## 최근 뉴스:
${newsSummary}

## 채용 공고 정보:
- 직무: ${jobContext?.title || "정보 없음"}
- 설명: ${jobContext?.description || "정보 없음"}

**중요 지시사항:**
1. "${company}"가 한국 회사인 경우, 반드시 한국 회사 정보로 분석하세요.
2. 위에 제공된 크롤링 내용을 꼼꼼히 읽고 최대한 상세히 분석하세요.
3. **절대로 "기타", "정보 없음", null 같은 답변을 하지 마세요.**
4. **각 항목은 반드시 구체적인 내용을 포함해야 합니다.**

아래 형식의 JSON으로 답변하세요:

{
  "company_name": "회사의 정확한 공식 명칭 (크롤링 내용에서 확인)",
  "domain": "회사 홈페이지 도메인 (예: humax.co.kr)",
  "industry": "구체적인 업종 (예: IT서비스, 제조업, 금융업 등. '기타'라고 쓰지 말것)",
  "business_summary": "회사가 하는 일을 상세히 설명 (최소 3-5문장. 단순히 '정보가 없다'고 쓰지 말고 크롤링 내용에서 추론)",
  "key_products": ["구체적인 제품/서비스명 배열 (최소 2개 이상. '기타'라고 쓰지 말것)"],
  "key_services": ["회사가 제공하는 주요 서비스 배열"],
  "company_vision": "회사의 비전이나 미션 (크롤링 내용에서 찾을 것)",
  "company_culture": "기업 문화, 인재상, 복리후생 등 (최소 2-3문장)",
  "employee_benefits": ["복리후생 항목들 (크롤링 내용에서 발견된 것들)"],
  "contact_info": {
    "email": "크롤링에서 발견된 이메일",
    "phone": "크롤링에서 발견된 전화번호"
  },
  "recent_news_summary": "최근 뉴스 요약 (최소 2-3문장)",
  "job_fit_analysis": "이 회사가 채용하려는 직무('${jobContext?.title}')와 어떻게 연관되는지 상세 분석 (최소 3-4문장)"
}

**다시 한 번 강조: 모든 항목에 구체적인 내용을 작성하세요. "기타", "정보 없음", null은 절대 금지입니다.**
**반드시 유효한 JSON만 출력하고 다른 설명은 하지 마세요.**
`;
}

/**
 * AI 응답 파싱
 */
function parseAiResponse(aiResponse, company, searchResults, newsResults) {
    // JSON 추출 시도
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log("[Parser] Successfully parsed JSON response");
            return parsed;
        } catch (e) {
            console.warn("[Parser] JSON parsing failed, using raw response");
        }
    }
    
    // JSON 파싱 실패시 원본 반환
    return {
        raw_analysis: aiResponse,
        company_name: company
    };
}

/**
 * 에러 발생시 폴백 응답 생성
 */
function createFallbackResponse(company, searchResults, newsResults, crawledData) {
    console.log("[Fallback] Creating fallback response");
    
    return {
        error: "AI 분석 실패 - 크롤링 데이터로 대체",
        company_name: company,
        searchResults: searchResults.slice(0, 3).map(r => ({
            title: r.title,
            url: r.url
        })),
        newsResults: newsResults.slice(0, 3).map(n => ({
            title: n.title,
            url: n.url
        })),
        crawledPages: crawledData.filter(d => d.success).map(d => ({
            url: d.url,
            title: d.title
        }))
    };
}

/**
 * 간단한 텍스트 요약
 */
export async function summarizeText(text, maxLength = 200) {
    const prompt = `다음 텍스트를 ${maxLength}자 이내로 요약해주세요:\n\n${text.slice(0, 3000)}`;
    
    try {
        return await analyzeWithOllama(prompt);
    } catch (error) {
        return text.slice(0, maxLength) + "...";
    }
}
