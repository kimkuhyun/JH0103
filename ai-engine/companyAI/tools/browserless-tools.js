import puppeteer from "puppeteer-core";

const BROWSERLESS_URL = process.env.BROWSERLESS_URL || "http://browserless:3000";

//데이터 길이?? 10000 너무 짧음 
//서브페이지까지 어떻게 ??
//이미지??
export async function fetchWithBrowserless(url){
    let browser = null;

    try {
        //browserless에 연결

        //uer agent에 연결 
        
        //불필요한 리소스 차단 

        //페이지 로드

        //동적 콘텐츠 로드 대기 3초

        //데이터 추출
            //메타정보
            //본문 텍스트 추출
            //주요 링크 추출 
            //

        //헤딩추출

        //이메일 전화번호 추출
    }catch (error){
        console.error(`puppeteer fetch failed for ${url}:`, error.message);
        throw error;
    }finally {
        if (browser) {
            await browser.disconnect();
        }
    }
}

export async function fetchMultipleUrls(urls, maxConcurrent = 5){

}