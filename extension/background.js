// extension/background.js

const API_ENDPOINT = 'http://localhost:5000/analyze';
const STATUS_ENDPOINT = 'http://localhost:5000/status';
const USER_API_ENDPOINT = 'http://localhost:8080/api/v1/user';

// 유틸리티: 대기 함수
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getUserEmail() {
    try {
        // credentials: 'include' -> 쿠키(세션)를 같이 보내야 함
        const res = await fetch(USER_API_ENDPOINT, { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' 
        });

        if (res.ok) {
            const data = await res.json();
            return data.email; // 이메일 반환
        }
    } catch (e) {
        console.warn("[CareerOS] 유저 정보 조회 실패:", e);
    }
    return null; // 실패 시 null
}





// [핵심 1] Chrome DevTools Protocol(CDP)을 이용한 전체 화면 캡처
async function captureFullPage(tabId, bounds = null) {
    try {
        await chrome.debugger.attach({ tabId }, "1.3");

        // 1. 전체 페이지 크기 계산 (이걸로 뷰포트를 고정해야 레이아웃이 안 깨짐)
        const layoutMetrics = await chrome.debugger.sendCommand({ tabId }, "Page.getLayoutMetrics");
        const fullWidth = Math.ceil(layoutMetrics.contentSize.width);
        const fullHeight = Math.ceil(layoutMetrics.contentSize.height);

        // 2. 뷰포트 설정: 무조건 '전체 크기'로 설정 (bounds 크기로 줄이지 않음!)
        await chrome.debugger.sendCommand({ tabId }, "Emulation.setDeviceMetricsOverride", {
            width: fullWidth,
            height: fullHeight,
            deviceScaleFactor: 1,
            mobile: false,
        });

        // 3. 캡처 옵션 설정
        const captureOptions = {
            format: "jpeg",
            quality: 80, 
            captureBeyondViewport: true,
            fromSurface: true
        };
        
        // 4. 여기서만 bounds를 사용해 '오려내기' (Clip)
        if (bounds) {
            captureOptions.clip = {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                scale: 1
            };
        } else {
            // bounds가 없으면 전체 캡처
            captureOptions.clip = {
                x: 0,
                y: 0,
                width: fullWidth,
                height: fullHeight,
                scale: 1
            };
        }

        const result = await chrome.debugger.sendCommand({ tabId }, "Page.captureScreenshot", captureOptions);

        await chrome.debugger.sendCommand({ tabId }, "Emulation.clearDeviceMetricsOverride");

        return result.data; 

    } catch (e) {
        console.error("Capture failed:", e);
        try { await chrome.debugger.detach({ tabId }); } catch(err) {}
        throw e;
    } finally {
        try { await chrome.debugger.detach({ tabId }); } catch(e) {}
    }
}

// [핵심 2] 서버 상태 확인 (Polling)
async function pollStatus(jobId) {
    let attempts = 0;
    const maxAttempts = 60; // 60초 대기

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`${STATUS_ENDPOINT}/${jobId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') return data;
                if (data.status === 'error') throw new Error(data.message);
            }
        } catch (e) {
            console.error("Polling error:", e);
        }
        await sleep(1000);
        attempts++;
    }
    throw new Error("분석 시간 초과");
}

// [핵심 3] 공통 분석 실행 로직 (팝업/단축키 모두 여기서 실행)
async function runAnalysis(tabId) {
    try {
        console.log(`[CareerOS] 탭(${tabId}) 분석 시작`);

        const userEmail = await getUserEmail();
        if (!userEmail) {
            throw new Error("로그인이 필요합니다. CareerOS 웹사이트에 먼저 로그인해주세요.");
        }
        console.log("[CareerOS] 사용자 확인:", userEmail || "비로그인 유저");


        // 1. 페이지 정리 및 텍스트 추출 (content.js)
        const prepRes = await chrome.tabs.sendMessage(tabId, { action: 'PREPARE_CAPTURE' });
        
        if (!prepRes || !prepRes.success) throw new Error("페이지 준비 실패");

        // 2. bounds 정보를 사용하여 정확한 영역 캡처
        const imageBase64 = await captureFullPage(tabId, prepRes.bounds);


        // 3. 서버 전송
        const payload = {
            pdf: imageBase64, // 변수명 호환성 유지
            url: prepRes.metadata.url,
            metadata: prepRes.metadata,
            user_email: userEmail
        };

        const res = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("서버 연결 실패");
        const { job_id } = await res.json();

        // 4. 결과 대기
        const finalResult = await pollStatus(job_id);
        
        // 5. 성공 메시지 전달
        chrome.runtime.sendMessage({ action: 'PROCESS_COMPLETE', data: finalResult })
            .catch(() => console.log("팝업이 닫혀있어 알림 생략"));

        console.log("[CareerOS] 분석 완료");

    } catch (error) {
        console.error(error);
        chrome.runtime.sendMessage({ action: 'PROCESS_ERROR', message: error.message })
            .catch(() => console.log("팝업이 닫혀있어 에러 알림 생략"));
    }
}

// 1. 팝업 버튼 클릭 시 실행
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_PROCESS') {
        runAnalysis(request.tabId);
        return true; // 비동기 작업 명시
    }
});

// 2. 단축키(Alt+Shift+S) 입력 시 실행
chrome.commands.onCommand.addListener(async (command) => {
    if (command === "start_capture") {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
            console.log("단축키로 분석 시작");
            runAnalysis(tabs[0].id);
        }
    }
});