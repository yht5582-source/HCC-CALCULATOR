# 肝細胞癌與末期肝病綜合計算機 (HCC & End-Stage Liver Disease Calculator)

這是一個專為肝膽腸胃科醫師、專科護理師及臨床醫療人員設計的單一網頁互動式評估工具。本工具整合了四大國際主流的肝臟功能與肝癌分期系統，只需輸入一次病患的客觀檢驗數據與臨床症狀，即可即時獲得綜合預後評估與國際指引治療建議。

## ✨ 核心特色 (Features)

*   **四大評估系統整合**：在單一介面同時運算 Child-Pugh、ALBI / mALBI、MELD / MELD-Na / MELD 3.0 以及 BCLC 2022 分期。
*   **缺值防呆**：欄位空白時不計分並提示「請填寫」，數值超出常見範圍（如白蛋白誤填 g/L）會提醒。
*   **病歷摘要**：一鍵複製所有分數與 BCLC 建議。
*   **高隱私與安全性 (Pure Client-Side)**：完全採用前端瀏覽器運算（Vue.js），無需後端伺服器，病患的檢驗數據絕不會上傳至任何網路，確保醫療個資安全。
*   **隨插即用 (Single File)**：所有計算邏輯皆封裝在 `index.html` 中（另附 `manifest.webmanifest` 與 `icon.svg` 供 PWA 使用）。
*   **PWA 支援 (Progressive Web App)**：支援行動裝置「加到主畫面」功能。在手機或平板上，可作為全螢幕、無網址列的類原生 App 般順暢使用。
*   **響應式設計 (RWD)**：基於 Tailwind CSS 打造，完美適應手機、平板、醫院行動護理車與桌上型電腦螢幕。

## 🧮 內建臨床評估指標

1.  **Child-Pugh Score & Class**：傳統經典的肝硬化代償功能評估。
    *   膽汁淤積性肝病 (PBC/PSC) 可切換膽紅素切點為 4 / 10 mg/dL。
2.  **ALBI Score & Grade (白蛋白-膽紅素評分)**：以純客觀抽血數值計算的肝功能指標，並顯示 mALBI 2a / 2b（切點 −2.27）。
3.  **MELD / MELD-Na / MELD 3.0 (末期肝病模式)**：MELD-Na 依 OPTN 2016（MELD(i) > 11 才校正，Na 125–137）；MELD 3.0 依 Kim 2021（性別、白蛋白，肌酸酐上限 3.0）並估計 90 天存活率。
4.  **BCLC Staging (巴塞隆納肝癌分期系統 2022 版)**：輸入腫瘤顆數與最大直徑、血管侵犯、肝外轉移、肝功能與 ECOG，推導 Stage 0、A、B、C、D，並依門脈高壓 / 移植候選資格 / 瀰漫型腫瘤細分治療建議；同時判讀 Milan 與 up-to-7 標準。

## 🚀 部署與使用方式 (How to Use)

### 方案 A：本機直接使用 (最簡單)
1. 下載或儲存 `index.html` 檔案。
2. 使用任何現代瀏覽器（Chrome, Edge, Safari, Firefox）直接點擊開啟該檔案即可使用。

### 方案 B：部署至醫院內部網路或靜態網頁伺服器
將 `index.html`、`manifest.webmanifest` 與 `icon.svg` 放入您的網頁伺服器目錄下（或使用 GitHub Pages, Vercel 等免費靜態託管服務），透過網址分享給科內同仁。

### 📱 行動裝置安裝 (PWA)
1. 使用手機瀏覽器（如 Safari 或 Chrome）開啟此網頁。
2. 點選瀏覽器選單中的 **「分享」** (iOS) 或 **「選單」** (Android)。
3. 選擇 **「加入主畫面 (Add to Home Screen)」**。
4. 即可在手機桌面上產生 App 圖示，隨時點擊快速啟動。

## 🛠 技術架構 (Tech Stack)

*   **核心架構**：HTML5
*   **前端框架**：[Vue.js 3](https://vuejs.org/) (透過 CDN 引入，處理即時響應式狀態與算式邏輯)
*   **樣式排版**：[Tailwind CSS](https://tailwindcss.com/) (透過 CDN 引入，處理現代化與自適應 UI)
*   **PWA 實作**：靜態 `manifest.webmanifest` + SVG 圖示（瀏覽器不接受 blob: 網址的 manifest）
*   **測試**：計算邏輯位於 `index.html` 的 `/*ENGINE-START*/…/*ENGINE-END*/` 區塊，執行 `node tests.cjs` 驗證。

## ⚠️ 醫療免責聲明 (Medical Disclaimer)

本計算工具所提供的分數與治療建議，依據 BCLC 2022、EASL 2025、AASLD 2023 與 OPTN MELD 3.0 推導，**僅供合格之醫療專業人員做為臨床決策之「輔助參考」**。
工具無法取代醫師親自診察之專業判斷。實際的診斷與最終治療計畫，應由**多專科團隊 (MDT, Multidisciplinary Team)** 根據患者整體的生理狀況、共病症與禁忌症進行全面評估後決定。作者與開發者對本工具產生之計算結果及後續的醫療處置不負任何法律或醫療責任。

---
*Developed for clinical professionals in Gastroenterology and Hepatology.*
