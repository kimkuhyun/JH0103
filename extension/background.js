// CareerOS Background Service Worker

const STORAGE_KEYS = { 
    JOBS: 'analysisJobs',
    SETTINGS: 'settings'
};

const API_ENDPOINT = 'http://localhost:5000/analyze';
const API_IMAGES_ENDPOINT = 'http://localhost:5000/analyze_images';
const STATUS_ENDPOINT = 'http://localhost:5000/status';
const DIRECT_IMAGE_MODE = true; // PDF 우회, 이미지 직접 전송

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
        
        const prepareResult = await chrome.tabs.sendMessage(tabId, { 
            action: 'PREPARE_CAPTURE' 
        });
        
        if (!prepareResult.success) {
            throw new Error('페이지 준비 실패');
        }
        
        console.log(`[CareerOS] ${prepareResult.removedCount}개 요소 제거 완료`);
        console.log('[CareerOS] 메인 컨텐츠 bounds:', prepareResult.bounds);
        
        await sleep(2000);
        
        if (DIRECT_IMAGE_MODE) {
            await captureAndAnalyzeImages(tabId, tab.url, prepareResult.metadata, prepareResult.bounds);
        } else {
            await captureAndAnalyzePDF(tabId, tab.url, prepareResult.metadata);
        }

    } catch (error) {
        console.error('[CareerOS] 실행 실패:', error);
        await showToast(tabId, `오류: ${error.message}`, 'error');
        if (tabId) chrome.debugger.detach({ tabId }).catch(() => {});
        
        await sleep(5000);
        await hideToast(tabId);
    }
}

async function captureAndAnalyzeImages(tabId, url, metadata, bounds) {
    await showToast(tabId, '이미지 캡처 중...', 'capture');
    
    if (!bounds || bounds.height === 0) {
        throw new Error('메인 컨텐츠 영역을 찾을 수 없습니다');
    }
    
    const images = [];
    const viewportHeight = bounds.viewportHeight;
    const contentHeight = bounds.height;
    const startY = bounds.y;
    
    const captureCount = Math.min(
        Math.ceil(contentHeight / viewportHeight),
        3
    );
    
    console.log(`[CareerOS] 캡처 계획: ${captureCount}회 (content: ${contentHeight}px, viewport: ${viewportHeight}px)`);
    
    for (let i = 0; i < captureCount; i++) {
        const scrollY = startY + (i * viewportHeight);
        
        await chrome.tabs.sendMessage(tabId, {
            action: 'SCROLL_TO',
            scrollY: scrollY
        });
        
        await sleep(500);
        
        const screenshot = await chrome.tabs.captureVisibleTab(null, {
            format: 'jpeg',
            quality: 80
        });
        
        const croppedImage = await cropImage(
            screenshot,
            bounds.viewportX,
            Math.max(0, bounds.viewportY - (i * viewportHeight)),
            bounds.width,
            Math.min(viewportHeight, contentHeight - (i * viewportHeight))
        );
        
        images.push(croppedImage);
        console.log(`[CareerOS] 캡처 ${i + 1}/${captureCount} 완료`);
    }
    
    window.scrollTo({ top: bounds.scrollTop, behavior: 'instant' });
    
    await showToast(tabId, 'AI 분석 시작...', 'analyzing');
    
    const response = await fetch(API_IMAGES_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            images: images,
            url: url,
            metadata: metadata
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '서버 요청 실패');
    }
    
    const { job_id } = await response.json();
    const finalResult = await pollStatus(job_id, tabId);
    
    if (finalResult.status === 'success') {
        await showToast(tabId, 'AI 분석 완료! ✅', 'complete');
        console.log('[CareerOS] 최종 결과:', finalResult.data);
        
        await sleep(3000);
        await hideToast(tabId);
    }
}

async function captureAndAnalyzePDF(tabId, url, metadata) {
    await showToast(tabId, 'PDF 생성 중...', 'capture');

    await chrome.debugger.attach({ tabId }, "1.3");
    const result = await chrome.debugger.sendCommand({ tabId }, "Page.printToPDF", {
        printBackground: true,
        preferCSSPageSize: true
    });
    const pdfBase64 = result.data;
    await chrome.debugger.detach({ tabId });

    await showToast(tabId, 'AI 분석 시작...', 'analyzing');

    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pdf: pdfBase64,
            url: url,
            metadata: metadata
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '서버 요청 실패');
    }
    
    const { job_id } = await response.json();
    const finalResult = await pollStatus(job_id, tabId);
    
    if (finalResult.status === 'success') {
        await showToast(tabId, 'AI 분석 완료! ✅', 'complete');
        console.log('[CareerOS] 최종 결과:', finalResult.data);
        
        await sleep(3000);
        await hideToast(tabId);
    }
}

async function cropImage(base64Image, x, y, width, height) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');
            
            ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
            
            canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = reader.result.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                })
                .catch(reject);
        };
        img.onerror = reject;
        img.src = base64Image;
    });
}

async function pollStatus(jobId, tabId) {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
        await sleep(2000);
        
        try {
            const resp = await fetch(`${STATUS_ENDPOINT}/${jobId}`);
            const result = await resp.json();

            if (result.status === 'success') return result;
            if (result.status === 'error') {
                throw new Error(result.message || 'AI 분석 실패');
            }
            
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
