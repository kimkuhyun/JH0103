// extension/background.js

const API_ENDPOINT = 'http://localhost:5000/analyze';
const STATUS_ENDPOINT = 'http://localhost:5000/status';

// 유틸리티: 대기 함수
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// [핵심 1] Chrome DevTools Protocol(CDP)을 이용한 전체 화면 캡처
async function captureFullPage(tabId, bounds = null) {
    try {
        // 1. 디버거 연결
        await chrome.debugger.attach({ tabId }, "1.3");

        // 2. 전체 페이지 높이 계산
        const layoutMetrics = await chrome.debugger.sendCommand({ tabId }, "Page.getLayoutMetrics");
        
        // bounds가 있으면 해당 영역 기준, 없으면 전체 페이지 기준
        const width = bounds ? bounds.width : Math.ceil(layoutMetrics.contentSize.width);
        const height = bounds ? bounds.height : Math.ceil(layoutMetrics.contentSize.height);

        // 3. 뷰포트 강제 확장 (스크롤 없이 전체가 보이게 설정)
        await chrome.debugger.sendCommand({ tabId }, "Emulation.setDeviceMetricsOverride", {
            width: width,
            height: height,
            deviceScaleFactor: 1,
            mobile: false,
        });

        // 4. 캡처 옵션 설정
        const captureOptions = {
            format: "jpeg",
            quality: 80, 
            captureBeyondViewport: true,
            fromSurface: true
        };
        
        // bounds가 있으면 clip 설정 추가
        if (bounds) {
            captureOptions.clip = {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                scale: 1
            };
        }

        // 5. 캡처 실행
        const result = await chrome.debugger.sendCommand({ tabId }, "Page.captureScreenshot", captureOptions);

        // 6. 설정 원상복구
        await chrome.debugger.sendCommand({ tabId }, "Emulation.clearDeviceMetricsOverride");

        return result.data; // Base64 이미지 데이터

    } catch (e) {
        console.error("Capture failed:", e);
        throw e;
    } finally {
        // 디버거 연결 해제 (필수)
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

        // 1. 페이지 정리 및 텍스트 추출 (content.js)
        const prepRes = await chrome.tabs.sendMessage(tabId, { action: 'PREPARE_CAPTURE' });
        
        if (!prepRes || !prepRes.success) throw new Error("페이지 준비 실패");

        // 2. bounds 정보를 사용하여 정확한 영역 캡처
        const imageBase64 = await captureFullPage(tabId, prepRes.bounds);

        // 디버깅: 캡처된 이미지 확인
        chrome.tabs.create({ url: "data:image/jpeg;base64," + imageBase64, active: false });
        console.log("[CareerOS] 캡처된 이미지를 새 탭에 띄웠습니다.");

        // 3. 서버 전송
        const payload = {
            pdf: imageBase64, // 변수명 호환성 유지
            url: prepRes.metadata.url,
            metadata: prepRes.metadata
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