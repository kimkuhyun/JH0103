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
        await showToast(tabId, 'PDF 생성 중...', 'capture');

        // 1. PDF 추출
        await chrome.debugger.attach({ tabId }, "1.3");
        const result = await chrome.debugger.sendCommand({ tabId }, "Page.printToPDF", {
            printBackground: true,
            preferCSSPageSize: true
        });
        const pdfBase64 = result.data;
        await chrome.debugger.detach({ tabId });

        await showToast(tabId, '서버 전송 및 분석 시작...', 'analyzing');

        // 2. 서버에 Job 등록 (등록 즉시 job_id를 반환받음)
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pdf: pdfBase64,
                url: tab.url,
                metadata: { title: tab.title, company: tab.title.split(' ')[0] }
            })
        });

        if (!response.ok) throw new Error('서버 요청 실패');
        const { job_id } = await response.json();

        // 3. 폴링 시작 (상태가 success가 될 때까지 반복 확인)
        const finalResult = await pollStatus(job_id, tabId); 
        
        if (finalResult.status === 'success') {
            await showToast(tabId, 'AI 분석 및 저장 완료!', 'complete');
            console.log("최종 데이터:", finalResult.data);
            // 여기서 CareerOS 대시보드 리로드 명령 등을 보낼 수 있습니다.
        }

    } catch (error) {
        console.error('실행 실패:', error);
        await showToast(tabId, `오류: ${error.message}`, 'error');
        if (tabId) chrome.debugger.detach({ tabId }).catch(() => {});
    }
}

// 별도의 폴링 전용 함수
async function pollStatus(jobId, tabId) {
    const maxAttempts = 60; // 2분 제한
    for (let i = 0; i < maxAttempts; i++) {
        await sleep(2000); // 2초 간격
        const resp = await fetch(`${STATUS_ENDPOINT}/${jobId}`);
        const result = await resp.json();

        if (result.status === 'success') return result;
        if (result.status === 'error') throw new Error(result.message);
        
        // 진행 중임을 토스트로 업데이트 가능
        await showToast(tabId, `분석 중... (${i + 1}/60)`, 'analyzing');
    }
    throw new Error('시간 초과');
}

async function submitAndPoll(job) {
    try {
        const submitResponse = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: job.url,
                metadata: job.metadata
            })
        });
        
        if (!submitResponse.ok) {
            const errorText = await submitResponse.text();
            return { success: false, message: errorText };
        }
        
        const { job_id } = await submitResponse.json();
        
        const maxAttempts = 90;  // 3분
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            await sleep(2000);
            
            try {
                const statusResponse = await fetch(`${STATUS_ENDPOINT}/${job_id}`);
                
                if (!statusResponse.ok) {
                    continue;
                }
                
                const status = await statusResponse.json();
                
                if (status.status === 'success') {
                    return { success: true, data: status.data };
                } else if (status.status === 'error') {
                    return { success: false, message: status.message };
                }
                
            } catch (pollError) {
                console.error('폴링 오류:', pollError);
            }
            
            attempts++;
        }
        
        return { success: false, message: '타임아웃 (3분 초과)' };
        
    } catch (error) {
        return { success: false, message: error.message };
    }
}

async function showToast(tabId, message, type) {
    try {
        await chrome.tabs.sendMessage(tabId, {
            action: 'SHOW_TOAST',
            message: message,
            type: type
        });
    } catch (e) {
        console.log('토스트 오류:', e);
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
