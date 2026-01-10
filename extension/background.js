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
    if (tabs.length === 0) return;
    
    const tab = tabs[0];
    const tabId = tab.id;
    
    try {
        await showToast(tabId, '분석 시작', 'capture');
        
        const prepareResult = await chrome.tabs.sendMessage(tabId, { 
            action: 'PREPARE_CAPTURE' 
        });
        
        if (!prepareResult.success) {
            throw new Error('준비 실패');
        }
        
        const { metadata } = prepareResult;
        
        await showToast(tabId, '서버에서 PDF 생성 중, 다른 탭으로 이동 가능', 'analyzing');
        
        const job = {
            id: Date.now(),
            title: tab.title.substring(0, 30),
            url: tab.url,
            status: 'PROCESSING',
            metadata: metadata
        };
        
        await saveJob(job);
        
        const result = await submitAndPoll(job);
        
        if (result.success) {
            await showToast(tabId, '완료', 'complete');
            await updateJobStatus(job.id, 'COMPLETED');
        } else {
            throw new Error(result.message || '실패');
        }
        
        setTimeout(() => hideToast(tabId), 3000);
        
    } catch (error) {
        console.error('오류:', error);
        await showToast(tabId, `오류: ${error.message}`, 'error');
        setTimeout(() => hideToast(tabId), 3000);
    }
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
