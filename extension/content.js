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

// 채용 사이트별 선택자 설정
const SITE_CONFIGS = {
    'wanted.co.kr': {
        jobContainer: '[class*="JobDescription"], article, main',
        // 공고 끝 지점 마커
        endMarkers: [
            '[class*="ApplyButton"]',
            '[class*="ShareButton"]',
            '[class*="SimilarJob"]',
            '[class*="RelatedPosition"]'
        ],
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
            deadline: '[class*="deadline"], [class*="Deadline"], [class*="마감"]',
            company_description: '[class*="CompanyDescription"], [class*="company-info"]',
            employee_count: '[class*="employee"], [class*="직원"]'
        }
    },
    'jobkorea.co.kr': {
        jobContainer: '.jobView-content, .job-content, article, main',
        endMarkers: [
            '.btnApply',
            '.applyBtn',
            '.sameWork',
            '.relateWork'
        ],
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
            deadline: '.receiptDate, .deadline',
            company_description: '.company-info, .company-desc',
            employee_count: '.employee-count, .member-count'
        }
    },
    'saramin.co.kr': {
        jobContainer: '.content, .job_cont, article, main',
        endMarkers: [
            '.btn_apply',
            '.jv_link_wrap',
            '.related_jobs'
        ],
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
            deadline: '.deadline, .end_date',
            company_description: '.company_summary, .company_intro',
            employee_count: '.employee_num'
        }
    },
    'default': {
        jobContainer: 'main, article, [role="main"], .job-content, .content',
        endMarkers: [
            '[class*="apply"]',
            '[class*="Apply"]',
            '[class*="share"]',
            '[class*="related"]',
            '[class*="similar"]'
        ],
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
            deadline: '[class*="deadline"], [class*="마감"]',
            company_description: '[class*="company-info"], [class*="about"]',
            employee_count: '[class*="employee"], [class*="직원"]'
        }
    }
};

// 현재 사이트 설정
function getSiteConfig() {
    const hostname = window.location.hostname;
    for (const site of Object.keys(SITE_CONFIGS)) {
        if (hostname.includes(site)) {
            return SITE_CONFIGS[site];
        }
    }
    return SITE_CONFIGS.default;
}

// 공고 컨테이너와 끝 지점 찾기
function findJobBoundaries() {
    const config = getSiteConfig();
    
    // 1. 컨테이너 찾기
    let container = null;
    const containerSelectors = config.jobContainer.split(', ');
    
    for (const selector of containerSelectors) {
        const el = document.querySelector(selector.trim());
        if (el && el.offsetHeight > 0) {
            container = el;
            break;
        }
    }
    
    if (!container) {
        container = document.body;
    }
    
    // 2. 공고 끝 지점 찾기
    let endElement = null;
    let endY = null;
    
    for (const selector of config.endMarkers) {
        try {
            const elements = container.querySelectorAll(selector);
            for (const el of elements) {
                // 숨겨지지 않은 첫 번째 요소
                if (el.offsetHeight > 0) {
                    const rect = el.getBoundingClientRect();
                    const elementY = rect.top + window.scrollY;
                    
                    if (!endY || elementY < endY) {
                        endY = elementY;
                        endElement = el;
                    }
                    break;
                }
            }
        } catch (e) {
            console.log('End marker search error:', selector);
        }
    }
    
    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top + window.scrollY;
    
    // 끝 지점이 없으면 컨테이너 높이 사용 (하지만 제한)
    let containerHeight;
    if (endY && endY > containerTop) {
        containerHeight = endY - containerTop;
        console.log('[CareerOS] 공고 끝 지점 감지:', endElement?.className);
    } else {
        // 폴백: 컨테이너 높이의 80% (나머지는 추천 공고일 가능성)
        containerHeight = container.scrollHeight * 0.8;
        console.log('[CareerOS] 끝 지점 미감지, 컨테이너 80% 사용');
    }
    
    // 최소/최대 높이 제한
    containerHeight = Math.min(containerHeight, window.innerHeight * 15); // 최대 15화면
    containerHeight = Math.max(containerHeight, window.innerHeight); // 최소 1화면
    
    return {
        container: container,
        containerTop: containerTop,
        containerHeight: containerHeight
    };
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
        company_description: null,
        employee_count: null,
        raw_text: null
    };
    
    // 각 필드 추출
    for (const [field, selector] of Object.entries(config.metadataSelectors)) {
        try {
            const selectors = selector.split(', ');
            for (const sel of selectors) {
                const el = document.querySelector(sel.trim());
                if (el && el.textContent.trim()) {
                    let text = el.textContent.trim();
                    
                    if (field === 'company_description') {
                        metadata[field] = text.substring(0, 1000);
                    } else {
                        metadata[field] = text.substring(0, 200);
                    }
                    break;
                }
            }
        } catch (e) {
            console.log('Metadata extraction error:', field);
        }
    }
    
    // 전체 텍스트
    try {
        const { container } = findJobBoundaries();
        if (container) {
            metadata.raw_text = container.textContent
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 5000);
        }
    } catch (e) {
        console.log('Raw text extraction error');
    }
    
    return metadata;
}

// 공고 영역 정보 계산
function getJobContainerInfo() {
    const { containerTop, containerHeight } = findJobBoundaries();
    const viewportHeight = window.innerHeight;
    
    // 필요한 캡처 횟수
    const captureCount = Math.ceil(containerHeight / viewportHeight);
    const limitedCount = Math.min(captureCount, 10);
    
    console.log(`[CareerOS] 캡처 계획: ${limitedCount}개 스크린 (공고 높이: ${Math.round(containerHeight)}px)`);
    
    return {
        containerTop: containerTop,
        containerHeight: containerHeight,
        viewportHeight: viewportHeight,
        captureCount: limitedCount,
        totalHeight: Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
        ),
        currentScrollY: window.scrollY
    };
}

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PREPARE_CAPTURE') {
        toast.show('캡처 준비중...', 'capture');
        
        // 불필요한 요소 숨기기
        const hiddenElements = hideUnnecessaryElements();
        
        // 메타데이터 추출
        const metadata = extractMetadata();
        
        // 공고 영역 정보
        const containerInfo = getJobContainerInfo();
        
        sendResponse({
            success: true,
            metadata: metadata,
            pageInfo: containerInfo,
            hiddenCount: hiddenElements.length
        });
        
        // 캡처 후 복원
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
