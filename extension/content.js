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

const SITE_CONFIGS = {
    'wanted.co.kr': {
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
        ]
    },
    'jobkorea.co.kr': {
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
        ]
    },
    'saramin.co.kr': {
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
        ]
    },
    'default': {
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
        ]
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

function removeUnnecessaryElements() {
    const config = getSiteConfig();
    const removedElements = [];
    
    console.log('[CareerOS] 불필요한 요소 제거 시작');
    
    config.removeSelectors.forEach(selector => {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el && el.parentNode) {
                    // 복원용 정보 저장
                    removedElements.push({
                        element: el,
                        parent: el.parentNode,
                        nextSibling: el.nextSibling
                    });
                    // DOM에서 완전 제거
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
    
    // 간단한 회사명 추출
    const titleParts = document.title.split(/[|\-\–]/);
    if (titleParts.length > 0) {
        metadata.company = titleParts[0].trim();
    }
    
    // 페이지 텍스트 추출 (본문만)
    const mainContent = document.querySelector('main, article, .content, [role="main"]');
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
        
        const removedElements = removeUnnecessaryElements();
        const metadata = extractMetadata();
        
        sendResponse({
            success: true,
            metadata: metadata,
            removedCount: removedElements.length
        });
        
        // 5초 후 자동 복원 (PDF 생성 완료 후)
        setTimeout(() => {
            restoreElements(removedElements);
            console.log('[CareerOS] 자동 복원 완료');
        }, 5000);
        
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
