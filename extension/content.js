// CareerOS Content Script

class ToastNotification {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        if (document.getElementById('careeros-toast-container')) return;
        
        this.container = document.createElement('div');
        this.container.id = 'careeros-toast-container';
        this.container.innerHTML = `
            <div id="careeros-toast" class="careeros-toast">
                <div class="careeros-toast-icon"></div>
                <div class="careeros-toast-message"></div>
                <div class="careeros-toast-progress"></div>
            </div>
        `;
        document.body.appendChild(this.container);
    }

    show(message, type = 'info') {
        const toast = document.getElementById('careeros-toast');
        const msgEl = toast.querySelector('.careeros-toast-message');
        const iconEl = toast.querySelector('.careeros-toast-icon');
        
        const icons = {
            'capture': '📸',
            'analyzing': '🤖',
            'complete': '✅',
            'error': '❌',
            'info': 'ℹ️'
        };
        iconEl.textContent = icons[type] || icons.info;
        
        msgEl.textContent = message;
        toast.className = `careeros-toast careeros-toast-${type} careeros-toast-show`;
    }

    hide() {
        const toast = document.getElementById('careeros-toast');
        if (toast) {
            toast.classList.remove('careeros-toast-show');
        }
    }
}

const toast = new ToastNotification();

// 사이트별 채용공고 메인 컨테이너 선택자
const SITE_CONFIGS = {
    'wanted.co.kr': {
        mainContentSelector: 'article[class*="JobContent"], [class*="JobDescription"], main',
        removeSelectors: [
            '[class*="RelatedPosition"]',
            '[class*="RecommendPosition"]',
            '[class*="SimilarJob"]',
            '[class*="recommend"]',
            '[class*="related"]',
            'footer',
            '[class*="Footer"]',
            'header',
            'nav'
        ],
        scrollToTop: true
    },
    'jobkorea.co.kr': {
        mainContentSelector: '.wrap-jview, .jv-cont, main',
        removeSelectors: [
            '.sameWork',
            '.relateWork',
            '#sameCompanyArea',
            '.footer',
            '#footer',
            'header',
            '.header',
            'nav',
            '.gnb'
        ],
        scrollToTop: true
    },
    'saramin.co.kr': {
        mainContentSelector: '.content, .wrap_jv_cont, main',
        removeSelectors: [
            '.related_jobs',
            '.recommend_jobs',
            '#footer',
            '.footer',
            '.jv_link_wrap',
            '.content_bottom',
            '[class*="HOT100"]',
            '[class*="직업전체"]',
            '.job_list_wrap',
            '#recomm_job_list',
            'header',
            '.header',
            'nav',
            '.gnb',
            '.toolbar',
            '[class*="recommend"]',
            '[class*="banner"]',
            '[class*="ad"]'
        ],
        scrollToTop: true
    },
    'default': {
        mainContentSelector: 'main, article, [role="main"], .content, #content',
        removeSelectors: [
            '[class*="related"]',
            '[class*="recommend"]',
            '[class*="similar"]',
            '[class*="footer"]',
            '[class*="sidebar"]',
            '[class*="ad-"]',
            '[class*="advertisement"]',
            'footer',
            '#footer',
            'header',
            'nav'
        ],
        scrollToTop: true
    }
};

function getSiteConfig() {
    const hostname = window.location.hostname;
    for (const site of Object.keys(SITE_CONFIGS)) {
        if (hostname.includes(site)) {
            return SITE_CONFIGS[site];
        }
    }
    return SITE_CONFIGS.default;
}

function findMainContentElement() {
    """채용공고 메인 컨테이너 찾기"""
    const config = getSiteConfig();
    const selectors = config.mainContentSelector.split(', ');
    
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            console.log(`[CareerOS] 메인 컨테이너 발견: ${selector}`);
            return element;
        }
    }
    
    console.log('[CareerOS] 메인 컨테이너를 찾을 수 없음, body 사용');
    return document.body;
}

function getElementBounds(element) {
    """요소의 화면 좌표 및 크기 반환"""
    const rect = element.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    return {
        x: Math.max(0, rect.left + scrollX),
        y: Math.max(0, rect.top + scrollY),
        width: rect.width,
        height: rect.height,
        viewportX: Math.max(0, rect.left),
        viewportY: Math.max(0, rect.top)
    };
}

function removeUnnecessaryElements() {
    const config = getSiteConfig();
    const removedElements = [];
    
    console.log('[CareerOS] 불필요한 요소 제거 시작');
    
    config.removeSelectors.forEach(selector => {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el && el.parentNode) {
                    removedElements.push({
                        element: el,
                        parent: el.parentNode,
                        nextSibling: el.nextSibling
                    });
                    el.parentNode.removeChild(el);
                }
            });
            if (elements.length > 0) {
                console.log(`[CareerOS] 제거됨: ${selector} (${elements.length}개)`);
            }
        } catch (e) {
            console.log(`[CareerOS] 제거 실패: ${selector}`, e);
        }
    });
    
    console.log(`[CareerOS] 총 ${removedElements.length}개 요소 제거 완료`);
    return removedElements;
}

function restoreElements(removedElements) {
    console.log('[CareerOS] 요소 복원 시작');
    removedElements.forEach(({ element, parent, nextSibling }) => {
        try {
            if (nextSibling) {
                parent.insertBefore(element, nextSibling);
            } else {
                parent.appendChild(element);
            }
        } catch (e) {
            console.log('[CareerOS] 복원 실패:', e);
        }
    });
    console.log('[CareerOS] 복원 완료');
}

function extractMetadata() {
    const metadata = {
        url: window.location.href,
        captured_at: new Date().toISOString(),
        title: document.title,
        company: null,
        raw_text: null
    };
    
    // 회사명 추출
    const titleParts = document.title.split(/[|\\-\u2013]/);
    if (titleParts.length > 0) {
        metadata.company = titleParts[0].trim();
    }
    
    // 페이지 텍스트 추출
    const mainContent = findMainContentElement();
    if (mainContent) {
        metadata.raw_text = mainContent.textContent
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 5000);
    }
    
    return metadata;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PREPARE_CAPTURE') {
        console.log('[CareerOS] PREPARE_CAPTURE 시작');
        toast.show('페이지 정리 중...', 'capture');
        
        const config = getSiteConfig();
        
        // 스크롤 최상단으로
        if (config.scrollToTop) {
            window.scrollTo(0, 0);
        }
        
        const removedElements = removeUnnecessaryElements();
        const metadata = extractMetadata();
        const mainElement = findMainContentElement();
        const bounds = getElementBounds(mainElement);
        
        sendResponse({
            success: true,
            metadata: metadata,
            removedCount: removedElements.length,
            bounds: bounds
        });
        
        // 5초 후 자동 복원
        setTimeout(() => {
            restoreElements(removedElements);
            console.log('[CareerOS] 자동 복원 완료');
        }, 5000);
        
        return true;
    }
    
    if (request.action === 'GET_MAIN_CONTENT_BOUNDS') {
        const mainElement = findMainContentElement();
        const bounds = getElementBounds(mainElement);
        sendResponse({ success: true, bounds: bounds });
        return true;
    }
    
    if (request.action === 'SCROLL_AND_CAPTURE') {
        const config = getSiteConfig();
        const mainElement = findMainContentElement();
        const bounds = getElementBounds(mainElement);
        
        // 메인 컨테이너를 화면에 표시
        mainElement.scrollIntoView({ behavior: 'instant', block: 'start' });
        
        sendResponse({ success: true, bounds: bounds });
        return true;
    }
    
    if (request.action === 'SHOW_TOAST') {
        toast.show(request.message, request.type);
        sendResponse({ success: true });
        return true;
    }
    
    if (request.action === 'HIDE_TOAST') {
        toast.hide();
        sendResponse({ success: true });
        return true;
    }
});
