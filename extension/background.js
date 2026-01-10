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
        await showToast(tabId, 'Capture starting', 'capture');
        
        const prepareResult = await chrome.tabs.sendMessage(tabId, { 
            action: 'PREPARE_CAPTURE' 
        });
        
        if (!prepareResult.success) {
            throw new Error('Page preparation failed');
        }
        
        const { metadata, pageInfo } = prepareResult;
        
        await showToast(tabId, 'Capturing page, please wait', 'capture');
        const images = await captureJobPosting(tabId, pageInfo);
        
        await showToast(tabId, 'AI analyzing, you can switch tabs now', 'analyzing');
        
        const job = {
            id: Date.now(),
            title: tab.title.substring(0, 30),
            url: tab.url,
            status: 'PROCESSING',
            metadata: metadata,
            images: images
        };
        
        await saveJob(job);
        
        // Submit job and poll for results
        const result = await submitAndPoll(job);
        
        if (result.success) {
            await showToast(tabId, 'Analysis complete', 'complete');
            await updateJobStatus(job.id, 'COMPLETED');
        } else {
            throw new Error(result.message || 'Analysis failed');
        }
        
        setTimeout(() => hideToast(tabId), 3000);
        
    } catch (error) {
        console.error('Capture error:', error);
        await showToast(tabId, `Error: ${error.message}`, 'error');
        setTimeout(() => hideToast(tabId), 3000);
    }
}

async function captureJobPosting(tabId, pageInfo) {
    const images = [];
    const { containerTop, containerHeight, viewportHeight, captureCount, currentScrollY } = pageInfo;
    
    console.log(`Capture plan: ${captureCount} images, height: ${containerHeight}px`);
    
    await chrome.tabs.sendMessage(tabId, { 
        action: 'SCROLL_TO', 
        position: containerTop 
    });
    await sleep(500);
    
    for (let i = 0; i < captureCount; i++) {
        const scrollPosition = containerTop + (i * viewportHeight);
        
        if (scrollPosition > containerTop + containerHeight) {
            break;
        }
        
        await chrome.tabs.sendMessage(tabId, { 
            action: 'SCROLL_TO', 
            position: scrollPosition 
        });
        await sleep(400);
        
        try {
            const currentTab = await chrome.tabs.get(tabId);
            const dataUrl = await chrome.tabs.captureVisibleTab(currentTab.windowId, { 
                format: 'png' 
            });
            images.push(dataUrl.split(',')[1]);
        } catch (e) {
            console.error('Capture failed at position:', scrollPosition, e);
        }
    }
    
    await chrome.tabs.sendMessage(tabId, { 
        action: 'SCROLL_TO', 
        position: currentScrollY 
    });
    
    console.log(`Captured ${images.length} images`);
    return images;
}

async function submitAndPoll(job) {
    try {
        // Submit job
        const submitResponse = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: job.url,
                images: job.images,
                metadata: job.metadata
            })
        });
        
        if (!submitResponse.ok) {
            const errorText = await submitResponse.text();
            return { success: false, message: errorText };
        }
        
        const { job_id } = await submitResponse.json();
        
        // Poll for results
        const maxAttempts = 60; // 60 attempts x 2 seconds = 2 minutes max
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            await sleep(2000); // Poll every 2 seconds
            
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
                // If queued or processing, continue polling
                
            } catch (pollError) {
                console.error('Poll error:', pollError);
            }
            
            attempts++;
        }
        
        return { success: false, message: 'Timeout waiting for results' };
        
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
