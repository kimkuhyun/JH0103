// CareerOS Background Service Worker

const STORAGE_KEYS = { 
    JOBS: 'analysisJobs',
    SETTINGS: 'settings'
};

const API_ENDPOINT = 'http://localhost:5000/analyze';
const API_ENDPOINT_IMAGES = 'http://localhost:5000/analyze_images';
const STATUS_ENDPOINT = 'http://localhost:5000/status';

// 직접 이미지 모드 사용 (메모리 최적화)
const USE_DIRECT_IMAGE_MODE = true;

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

async function captureJobPostingArea(tabId, bounds) {
    """채용공고 영역만 정확하게 캡처"""
    try {
        // 화면 전체 캡처
        const screenshot = await chrome.tabs.captureVisibleTab(null, {
            format: 'png'
        });
        
        // Canvas로 특정 영역만 크롭
        const croppedImage = await cropImage(screenshot, bounds);
        
        return croppedImage;
        
    } catch (error) {
        console.error('[CareerOS] 캡처 실패:', error);
        throw error;
    }
}

async function cropImage(dataUrl, bounds) {
    """이미지 크롭 처리"""
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = new OffscreenCanvas(bounds.width, bounds.height);
            const ctx = canvas.getContext('2d');
            
            // 특정 영역만 크롭
            ctx.drawImage(
                img,
                bounds.viewportX, bounds.viewportY,
                bounds.width, bounds.height,
                0, 0,
                bounds.width, bounds.height
            );
            
            canvas.convertToBlob({ type: 'image/jpeg', quality: 0.75 })
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        // data:image/jpeg;base64,xxx 에서 base64 부분만 추출
                        const base64 = reader.result.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                })
                .catch(reject);
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

async function captureMultipleScreenshots(tabId, mainBounds) {
    """메인 컨테이너가 길 경우 여러 장 캡처"""
    const images = [];
    const viewportHeight = await getViewportHeight(tabId);
    const maxCaptures = 3; // 최대 3장
    
    let currentY = 0;
    let captureCount = 0;
    
    while (currentY < mainBounds.height && captureCount < maxCaptures) {
        // 해당 위치로 스크롤
        await chrome.scripting.executeScript({
            target: { tabId },
            func: (y) => { window.scrollTo(0, y); },
            args: [mainBounds.y + currentY]
        });
        
        await sleep(300); // 스크롤 안정화 대기
        
        // 화면 캡처
        const screenshot = await chrome.tabs.captureVisibleTab(null, {
            format: 'png'
        });
        
        // 현재 뷰포트에서 메인 컨테이너 영역만 크롭
        const cropBounds = {
            viewportX: mainBounds.viewportX,
            viewportY: 0,
            width: mainBounds.width,
            height: Math.min(viewportHeight, mainBounds.height - currentY)
        };
        
        const croppedImage = await cropImage(screenshot, cropBounds);
        images.push(croppedImage);
        
        currentY += viewportHeight;
        captureCount++;
    }
    
    // 스크롤 초기화
    await chrome.scripting.executeScript({
        target: { tabId },
        func: () => { window.scrollTo(0, 0); }
    });
    
    return images;
}

async function getViewportHeight(tabId) {
    const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => window.innerHeight
    });
    return result[0].result;
}

async function startOneClickCapture() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    const tabId = tab.id;

    try {
        await showToast(tabId, '페이지 정리 중...', 'capture');
        
        // 요소 제거 및 메인 컨테이너 찾기
        const prepareResult = await chrome.tabs.sendMessage(tabId, { 
            action: 'PREPARE_CAPTURE' 
        });
        
        if (!prepareResult.success) {
            throw new Error('페이지 준비 실패');
        }
        
        console.log(`[CareerOS] ${prepareResult.removedCount}개 요소 제거 완료`);
        console.log('[CareerOS] 메인 컨테이너 바운드:', prepareResult.bounds);
        
        await sleep(1000); // 요소 제거 후 안정화
        
        if (USE_DIRECT_IMAGE_MODE) {
            // 직접 이미지 모드 (추천)
            await showToast(tabId, '채용공고 영역 캡처 중...', 'capture');
            
            const images = await captureMultipleScreenshots(tabId, prepareResult.bounds);
            console.log(`[CareerOS] ${images.length}장 캡처 완료`);
            
            await showToast(tabId, 'AI 분석 시작...', 'analyzing');
            
            // 서버 전송 (이미지 직접)
            const response = await fetch(API_ENDPOINT_IMAGES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    images: images,
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
                
                await sleep(3000);
                await hideToast(tabId);
            }
            
        } else {
            // PDF 모드 (기존 방식)
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
                    url: tab.url,
                    metadata: prepareResult.metadata
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

    } catch (error) {
        console.error('[CareerOS] 실행 실패:', error);
        await showToast(tabId, `오류: ${error.message}`, 'error');
        if (tabId) chrome.debugger.detach({ tabId }).catch(() => {});
        
        await sleep(5000);
        await hideToast(tabId);
    }
}

async function pollStatus(jobId, tabId) {
    const maxAttempts = 30; // 60초 (2초 xd7 30회)
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
