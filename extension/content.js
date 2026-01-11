// extension/content.js

// 1. 사이트별 설정
const SITE_CONFIG = {
    'saramin.co.kr': {
        mainSelector: 'section[class*="jview-0-"]',
        iframeSelector: 'iframe.iframe_content',
        trash: ['#sri_header', '.jview_wing', '.jv_footer', '#sri_footer', '.wrap_recommend_slide', '.floating_banner', '.banner_job_pass', '.jv_insatong']
    },
    'jobkorea.co.kr': {
        mainSelector: '#container',
        iframeSelector: 'iframe#GI_Read_Comt_Ifrm',
        trash: ['#header', '#footer', '.dev-button-list', 'aside', '#recommended-section', '#menu-buttons', '.jk-ad', 'div[class*="banner"]']
    },
    'wanted.co.kr': { 
        mainSelector: '.JobContent_JobContent__Qb6DR', 
        trash: ['.JobAssociated_JobAssociated__XGF86', 'nav', 'footer', 'aside'] 
    },
    'default': { mainSelector: 'body', trash: ['header', 'footer', '.ad', '.banner'] }
};

function getConfig() {
    const hostname = window.location.hostname;
    for (const site in SITE_CONFIG) {
        if (hostname.includes(site)) return SITE_CONFIG[site];
    }
    return SITE_CONFIG.default;
}

// [디버깅] 소스코드 다운로드
function downloadSourceCode() {
    const htmlContent = document.documentElement.outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug_source_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Iframe 평탄화
function flattenIframes(config) {
    if (!config.iframeSelector) return;
    const iframes = document.querySelectorAll(config.iframeSelector);
    iframes.forEach(iframe => {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (!iframeDoc || !iframeDoc.body) return;
            
            console.log('[CareerOS] 🔨 Iframe 내용 이식');
            const newDiv = document.createElement('div');
            newDiv.className = 'careeros-flattened-content';
            newDiv.innerHTML = iframeDoc.body.innerHTML;
            newDiv.style.width = '100%';
            newDiv.style.overflow = 'visible';
            newDiv.style.backgroundColor = '#fff';
            iframe.parentNode.replaceChild(newDiv, iframe);
        } catch (e) {
            console.warn('[CareerOS] Iframe 접근 불가', e);
            iframe.style.height = '3000px'; 
        }
    });
}

function cleanPage(config) {
    if (config.trash) {
        config.trash.forEach(sel => document.querySelectorAll(sel).forEach(el => el.style.display = 'none'));
    }
    document.querySelectorAll('*').forEach(el => {
        if (window.getComputedStyle(el).position === 'fixed' && !el.closest(config.mainSelector)) {
            el.style.display = 'none';
        }
    });
}

function extractText(config) {
    const mainEl = document.querySelector(config.mainSelector);
    // 텍스트 길이 제한 (AI 과부하 방지)
    const text = (mainEl ? mainEl.innerText : document.body.innerText).replace(/\s+/g, ' ').trim().substring(0, 6000);
    return text;
}

// [추가] 메인 콘텐츠 영역의 정확한 bounds 계산
function getMainContentBounds(config) {
    const mainEl = document.querySelector(config.mainSelector);
    if (!mainEl) return null;
    
    const rect = mainEl.getBoundingClientRect();
    return {
        x: Math.floor(rect.left + window.scrollX),
        y: Math.floor(rect.top + window.scrollY),
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height)
    };
}

// [핵심 수정] 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 1. 가장 중요한 체크: 내가 메인 창(Top Frame)이 아니면 무시한다.
    if (window !== window.top) {
        return; // 아무것도 하지 않음 (광고 Iframe 등은 여기서 멈춤)
    }

    if (request.action === 'PREPARE_CAPTURE') {
        console.log('[CareerOS] 🧹 페이지 정리 시작 (Top Frame)');
        const config = getConfig();
        
        flattenIframes(config);
        cleanPage(config);

        // 디버깅용 다운로드 (이제 메인 창에서 한 번만 실행됨)
        downloadSourceCode();

        setTimeout(() => {
            //const rawText = extractText(config);
            const bounds = getMainContentBounds(config);
            
            sendResponse({
                success: true,
                bounds: bounds, // 캡처할 정확한 영역
                metadata: {
                    url: window.location.href,
                    title: document.title,
                    captured_at: new Date().toISOString(),
                    //raw_text: rawText
                }
            });
        }, 500);
        return true;
    }
});