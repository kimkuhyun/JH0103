// CareerOS Background Service Worker

const STORAGE_KEYS = { 
    JOBS: 'analysisJobs',
    SETTINGS: 'settings'
};

const API_ENDPOINT = 'http://localhost:5000/analyze';
const STATUS_ENDPOINT = 'http://localhost:5000/status';

chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'one-click-capture') {
        await startOneClickCapture();
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_CAPTURE') {
        startOneClickCapture();
    }
});

chrome.action.onClicked.addListener(async (tab) => {
    await startOneClickCapture();
});

async function startOneClickCapture() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    const tabId = tab.id;

    try {
        await showToast(tabId, '페이지 정리 중...', 'capture');
        
        // 요소 제거
        const prepareResult = await chrome.tabs.sendMessage(tabId, { 
            action: 'PREPARE_CAPTURE' 
        });
        
        if (!prepareResult.success) {
            throw new Error('페이지 준비 실패');
        }
        
        console.log(`[CareerOS] ${prepareResult.removedCount}개 요소 제거 완료`);
        
        // 요소 제거 완료 대기 (2초 → 3초로 증가)
        await sleep(3000);
        
        await showToast(tabId, 'PDF 생성 중...', 'capture');

        // PDF 생성
        await chrome.debugger.attach({ tabId }, "1.3");
        const result = await chrome.debugger.sendCommand({ tabId }, "Page.printToPDF", {
            printBackground: true,
            preferCSSPageSize: true
        });
        const pdfBase64 = result.data;
        await chrome.debugger.detach({ tabId });

        await showToast(tabId, 'AI 분석 시작...', 'analyzing');

        // 서버 전송
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pdf: pdfBase64,
                url: tab.url,
                metadata: prepareResult.metadata
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || '서버 요청 실패');
        }
        
        const { job_id } = await response.json();

        // 폴링 시작
        const finalResult = await pollStatus(job_id, tabId); 
        
        if (finalResult.status === 'success') {
            await showToast(tabId, 'AI 분석 완료! ✅', 'complete');
            console.log('[CareerOS] 최종 결과:', finalResult.data);
            
            // 3초 후 토스트 자동 숨김
            await sleep(3000);
            await hideToast(tabId);
        }

    } catch (error) {
        console.error('[CareerOS] 실행 실패:', error);
        await showToast(tabId, `오류: ${error.message}`, 'error');
        if (tabId) chrome.debugger.detach({ tabId }).catch(() => {});
        
        // 5초 후 에러 토스트 숨김
        await sleep(5000);
        await hideToast(tabId);
    }
}

async function pollStatus(jobId, tabId) {
    const maxAttempts = 30; // 60초 (2초 × 30회)
    for (let i = 0; i < maxAttempts; i++) {
        await sleep(2000);
        
        try {
            const resp = await fetch(`${STATUS_ENDPOINT}/${jobId}`);
            const result = await resp.json();

            if (result.status === 'success') return result;
            if (result.status === 'error') {
                throw new Error(result.message || 'AI 분석 실패');
            }
            
            // 10초마다 진행 상황 표시
            if (i > 0 && i % 5 === 0) {
                await showToast(tabId, `분석 중... (${i * 2}초 경과)`, 'analyzing');
            }
        } catch (fetchError) {
            console.error('[CareerOS] 폴링 오류:', fetchError);
            if (i === maxAttempts - 1) throw fetchError;
        }
    }
    throw new Error('분석 시간 초과 (60초)');
}

async function showToast(tabId, message, type) {
    try {
        await chrome.tabs.sendMessage(tabId, {
            action: 'SHOW_TOAST',
            message: message,
            type: type
        });
    } catch (e) {
        console.log('[CareerOS] 토스트 표시 실패:', e);
    }
}

async function hideToast(tabId) {
    try {
        await chrome.tabs.sendMessage(tabId, { action: 'HIDE_TOAST' });
    } catch (e) {}
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
