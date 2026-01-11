// extension/popup.js

document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const btn = document.getElementById('analyzeBtn');
    const status = document.getElementById('status');
    
    // UI 초기화
    btn.disabled = true;
    btn.innerText = '분석 진행 중...';
    status.innerHTML = '<div class="spinner" style="display:inline-block"></div> AI가 공고를 읽고 있습니다...';

    // 현재 탭 가져오기
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Background에게 작업 시작 요청
    chrome.runtime.sendMessage({ action: 'START_PROCESS', tabId: tab.id });
});

// 결과 수신 리스너
chrome.runtime.onMessage.addListener((request) => {
    const btn = document.getElementById('analyzeBtn');
    const status = document.getElementById('status');

    if (request.action === 'PROCESS_COMPLETE') {
        btn.innerText = '분석 완료!';
        status.innerText = '성공적으로 분석했습니다.';
        status.style.color = 'green';
        // 필요 시 여기서 결과 페이지를 열거나 데이터를 표시할 수 있음
    } 
    
    if (request.action === 'PROCESS_ERROR') {
        btn.disabled = false;
        btn.innerText = '다시 시도';
        status.innerText = `오류: ${request.message}`;
        status.style.color = 'red';
    }
});