// CareerOS Content Script - DOM 조작 및 메타데이터 추출

// 토스트 알림 시스템
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
        
        // 아이콘 설정
        const icons = {
            'capture': '📸',
            'analyzing': '🔄',
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

// 채용 사이트별 선택자 설정 (관련 공고/광고 영역)
const SITE_CONFIGS = {
    'wanted.co.kr': {
        hideSelectors: [
            '[class*="RelatedPosition"]',
            '[class*="RecommendPosition"]',
            '[class*="SimilarJob"]',
            '[class*="recommend"]',
            '[class*="related"]',
            'footer',
            '[class*="Footer"]'
        ],
        metadataSelectors: {
            company: '[class*="CompanyName"], [class*="company-name"], h2',
            title: '[class*="JobHeader"] h1, [class*="job-title"], h1',
            salary: '[class*="salary"], [class*="Salary"], [class*="연봉"]',
            location: '[class*="location"], [class*="Location"], [class*="근무지"]',
            deadline: '[class*="deadline"], [class*="Deadline"], [class*="마감"]'
        }
    },
    'jobkorea.co.kr': {
        hideSelectors: [
            '.sameWork',
            '.relateWork',
            '#sameCompanyArea',
            '.footer',
            '#footer'
        ],
        metadataSelectors: {
            company: '.coName, .company-name',
            title: '.viewTitle, .job-title',
            salary: '.salary, .pay',
            location: '.work-place, .location',
            deadline: '.receiptDate, .deadline'
        }
    },
    'saramin.co.kr': {
        hideSelectors: [
            '.related_jobs',
            '.recommend_jobs',
            '#footer',
            '.footer'
        ],
        metadataSelectors: {
            company: '.company_name, .comp_name',
            title: '.job_tit, .title',
            salary: '.salary',
            location: '.work_place, .location',
            deadline: '.deadline, .end_date'
        }
    },
    'default': {
        hideSelectors: [
            '[class*="related"]',
            '[class*="recommend"]',
            '[class*="similar"]',
            '[class*="footer"]',
            '[class*="sidebar"]',
            '[class*="ad-"]',
            '[class*="advertisement"]',
            'footer',
            '#footer'
        ],
        metadataSelectors: {
            company: '[class*="company"], [class*="Company"]',
            title: 'h1, [class*="title"], [class*="Title"]',
            salary: '[class*="salary"], [class*="pay"], [class*="연봉"]',
            location: '[class*="location"], [class*="address"], [class*="근무지"]',
            deadline: '[class*="deadline"], [class*="마감"]'
        }
    }
};

// 현재 사이트에 맞는 설정 가져오기
function getSiteConfig() {
    const hostname = window.location.hostname;
    for (const site of Object.keys(SITE_CONFIGS)) {
        if (hostname.includes(site)) {
            return SITE_CONFIGS[site];
        }
    }
    return SITE_CONFIGS.default;
}

// 불필요한 요소 숨기기
function hideUnnecessaryElements() {
    const config = getSiteConfig();
    const hiddenElements = [];
    
    config.hideSelectors.forEach(selector => {
        try {
            document.querySelectorAll(selector).forEach(el => {
                if (el.style.display !== 'none') {
                    hiddenElements.push({
                        element: el,
                        originalDisplay: el.style.display
                    });
                    el.style.display = 'none';
                }
            });
        } catch (e) {
            console.log('Selector error:', selector);
        }
    });
    
    return hiddenElements;
}

// 숨긴 요소 복원
function restoreElements(hiddenElements) {
    hiddenElements.forEach(({ element, originalDisplay }) => {
        element.style.display = originalDisplay;
    });
}

// 메타데이터 추출
function extractMetadata() {
    const config = getSiteConfig();
    const metadata = {
        url: window.location.href,
        captured_at: new Date().toISOString(),
        company: null,
        title: null,
        salary: null,
        location: null,
        deadline: null,
        raw_text: null
    };
    
    // 각 필드별로 추출 시도
    for (const [field, selector] of Object.entries(config.metadataSelectors)) {
        try {
            const selectors = selector.split(', ');
            for (const sel of selectors) {
                const el = document.querySelector(sel.trim());
                if (el && el.textContent.trim()) {
                    metadata[field] = el.textContent.trim().substring(0, 200);
                    break;
                }
            }
        } catch (e) {
            console.log('Metadata extraction error:', field);
        }
    }
    
    // 전체 텍스트 추출 (보조용)
    try {
        const mainContent = document.querySelector('main, article, [role="main"], .job-content, .content');
        if (mainContent) {
            metadata.raw_text = mainContent.textContent
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 3000);
        }
    } catch (e) {
        console.log('Raw text extraction error');
    }
    
    return metadata;
}

// 전체 페이지 높이 계산 (스크롤 캡처용)
function getFullPageHeight() {
    return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
    );
}

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PREPARE_CAPTURE') {
        toast.show('캡처 준비중...', 'capture');
        
        // 불필요한 요소 숨기기
        const hiddenElements = hideUnnecessaryElements();
        
        // 메타데이터 추출
        const metadata = extractMetadata();
        
        // 페이지 정보
        const pageInfo = {
            totalHeight: getFullPageHeight(),
            viewportHeight: window.innerHeight,
            scrollY: window.scrollY
        };
        
        sendResponse({
            success: true,
            metadata: metadata,
            pageInfo: pageInfo,
            hiddenCount: hiddenElements.length
        });
        
        // 약간의 딜레이 후 요소 복원 (캡처 완료 후)
        setTimeout(() => {
            restoreElements(hiddenElements);
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
    
    if (request.action === 'SCROLL_TO') {
        window.scrollTo(0, request.position);
        sendResponse({ success: true });
        return true;
    }
});
