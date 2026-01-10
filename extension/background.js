// CareerOS Background Service Worker - One-Click Capture System

const STORAGE_KEYS = { 
    JOBS: 'analysisJobs',
    SETTINGS: 'settings'
};

const API_ENDPOINT = 'http://localhost:5000/analyze';

// 단축키 리스너
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'one-click-capture') {
        await startOneClickCapture();
    }
});

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_CAPTURE') {
        startOneClickCapture();
    }
});

// 익스텐션 아이콘 클릭
chrome.action.onClicked.addListener(async (tab) => {
    await startOneClickCapture();
});

// === 메인 원클릭 캡처 함수 ===
async function startOneClickCapture() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) return;
    
    const tab = tabs[0];
    const tabId = tab.id;
    
    try {
        await showToast(tabId, '캡처 시작! 완료될 때까지 대기해주세요', 'capture');
        
        // Content script에 준비 요청
        const prepareResult = await chrome.tabs.sendMessage(tabId, { 
            action: 'PREPARE_CAPTURE' 
        });
        
        if (!prepareResult.success) {
            throw new Error('페이지 준비 실패');
        }
        
        const { metadata, pageInfo } = prepareResult;
        
        // 스크린샷 캡처
        await showToast(tabId, '페이지 캡처중... 탭을 유지해주세요', 'capture');
        const images = await captureJobPosting(tabId, pageInfo);
        
        // AI 분석
        await showToast(tabId, 'AI 분석중... 다른 작업 가능합니다', 'analyzing');
        
        const job = {
            id: Date.now(),
            title: tab.title.substring(0, 30),
            url: tab.url,
            status: 'PROCESSING',
            metadata: metadata,
            images: images
        };
        
        await saveJob(job);
        
        // 서버로 전송
        const result = await sendToServer(job);
        
        if (result.success) {
            await showToast(tabId, '공고 분석 완료!', 'complete');
            await updateJobStatus(job.id, 'COMPLETED');
        } else {
            throw new Error(result.message || '분석 실패');
        }
        
        setTimeout(async () => {
            await hideToast(tabId);
        }, 3000);
        
    } catch (error) {
        console.error('Capture error:', error);
        await showToast(tabId, `오류: ${error.message}`, 'error');
        setTimeout(async () => {
            await hideToast(tabId);
        }, 3000);
    }
}

// === 공고 캡처 (개선된 버전) ===
async function captureJobPosting(tabId, pageInfo) {
    const images = [];
    const { containerTop, containerHeight, viewportHeight, captureCount, currentScrollY } = pageInfo;
    
    console.log(`캡처 계획: ${captureCount}개 이미지, 컨테이너 높이: ${containerHeight}px`);
    
    // 컨테이너 시작 위치로 스크롤
    await chrome.tabs.sendMessage(tabId, { 
        action: 'SCROLL_TO', 
        position: containerTop 
    });
    await sleep(500);
    
    // 컨테이너 영역만 캡처
    for (let i = 0; i < captureCount; i++) {
        const scrollPosition = containerTop + (i * viewportHeight);
        
        // 컨테이너 끝을 넘지 않도록
        if (scrollPosition > containerTop + containerHeight) {
            break;
        }
        
        await chrome.tabs.sendMessage(tabId, { 
            action: 'SCROLL_TO', 
            position: scrollPosition 
        });
        await sleep(400);
        
        try {
            const tab = await chrome.tabs.get(tabId);
            const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { 
                format: 'png' 
            });
            images.push(dataUrl.split(',')[1]);
        } catch (e) {
            console.error('Capture failed at position:', scrollPosition, e);
        }
    }
    
    // 원래 위치로 복원
    await chrome.tabs.sendMessage(tabId, { 
        action: 'SCROLL_TO', 
        position: currentScrollY 
    });
    
    console.log(`캡처 완료: ${images.length}개 이미지`);
    return images;
}

// === 서버 전송 (단순화) ===
async function sendToServer(job) {
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: job.url,
                images: job.images,
                metadata: job.metadata
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, message: errorText };
        }
        
        const result = await response.json();
        return { success: true, data: result };
        
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// === 유틸리티 함수 ===

async function showToast(tabId, message, type) {
    try {
        await chrome.tabs.sendMessage(tabId, {
            action: 'SHOW_TOAST',
            message: message,
            type: type
        });
    } catch (e) {
        console.log('Toast error:', e);
    }
}

async function hideToast(tabId) {
    try {
        await chrome.tabs.sendMessage(tabId, { action: 'HIDE_TOAST' });
    } catch (e) {
        console.log('Hide toast error:', e);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function saveJob(job) {
    const result = await chrome.storage.local.get([STORAGE_KEYS.JOBS]);
    const jobs = result[STORAGE_KEYS.JOBS] || [];
    jobs.unshift(job);
    if (jobs.length > 20) jobs.pop();
    await chrome.storage.local.set({ [STORAGE_KEYS.JOBS]: jobs });
}

async function updateJobStatus(jobId, status) {
    const result = await chrome.storage.local.get([STORAGE_KEYS.JOBS]);
    const jobs = result[STORAGE_KEYS.JOBS] || [];
    const idx = jobs.findIndex(j => j.id === jobId);
    if (idx !== -1) {
        jobs[idx].status = status;
        await chrome.storage.local.set({ [STORAGE_KEYS.JOBS]: jobs });
    }
}
