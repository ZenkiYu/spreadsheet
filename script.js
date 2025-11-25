// ===================================
// 可調整的變數/參數 (費率定義)
// ===================================
const TAX_RATES = {
    // 買方服務費改回自動計算 (2%)
    buyerCommissionRate: 0.02,  // 買方仲介費上限 (2%) 
    // 賣方及稅務費率維持不變
    sellerCommissionRate: 0.04, // 賣方仲介費上限 (4%)
    
    // 房地合一稅率
    taxRate_Year1_2: 0.45,   // 持有 1 年以上未滿 2 年 (45%)
    taxRate_Year2_5: 0.35,   // 持有 2 年以上未滿 5 年 (35%)
    taxRate_Year5_10: 0.20,  // 持有 5 年以上未滿 10 年 (20%)
    taxRate_Year10_Over: 0.15 // 持有 10 年以上 (15%)
};

// 【新增】預設頭期款比例為 20% (0.2)
let currentDownPaymentRate = 0.2;


// ===================================
// 日期轉換輔助函式 (保持不變)
// ===================================

/**
 * 將民國日期年、月、日數字轉換為西元 Date 物件。
 * @param {string} yearStr - 民國年字串。
 * @param {string} monthStr - 月份字串。
 * @param {string} dayStr - 日期字串。
 * @returns {Date|null} - 西元 Date 物件或 null (如果格式錯誤)。
 */
function rocToAdDate(yearStr, monthStr, dayStr) {
    const rocYear = parseInt(yearStr);
    const month = parseInt(monthStr);
    const day = parseInt(dayStr);
    
    // 檢查是否為有效數字
    if (isNaN(rocYear) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }
        
    // 民國年轉換為西元年 (民國元年為西元 1912 年)
    const adYear = rocYear + 1911;
    
    // 注意：Date物件的月份是 0-based (0=一月, 11=十二月)
    const date = new Date(adYear, month - 1, day);
    
    // 簡單驗證日期是否有效（防止輸入 110/2/30 等無效日期）
    if (date.getFullYear() === adYear && date.getMonth() === month - 1 && date.getDate() === day) {
        return date;
    }
    return null;
}


// ===================================
// Tab 切換功能 (保持不變)
// ===================================
function openTab(evt, tabName) {
    const tabcontent = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove("active");
    }

    const tablinks = document.getElementsByClassName("tab-button");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }

    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

document.addEventListener('DOMContentLoaded', () => {
    const defaultTab = document.querySelector('.tab-button.active');
    if (defaultTab) {
        const defaultContentId = defaultTab.getAttribute('onclick').match(/'([^']*)'/)[1];
        document.getElementById(defaultContentId).classList.add('active');
    }
    // 【新增】：頁面載入時，初始化頭期款顯示
    updateDownPaymentDisplay(); 
});


// ===================================
// 頭期款專用函式
// ===================================

/**
 * 設定頭期款比例並更新按鈕樣式。
 * @param {number} rate - 選擇的比例 (0.2 或 0.3)。
 * @param {HTMLElement} element - 被點擊的按鈕元素。
 */
function setDownPaymentRate(rate, element) {
    currentDownPaymentRate = rate;
    
    // 移除所有按鈕的 active 樣式
    const buttons = document.querySelectorAll('.dp-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // 為被點擊的按鈕新增 active 樣式
    element.classList.add('active');
    
    // 更新顯示並觸發計算
    updateDownPaymentDisplay();
}

/**
 * 根據成交價和比例，更新頭期款顯示欄位。
 */
function updateDownPaymentDisplay() {
    // 讀取成交價 (萬)
    const estimatedPriceMan = parseFloat(document.getElementById('buyEstimatedPrice').value || 0);
    const displayElement = document.getElementById('downPaymentDisplay');
    
    if (isNaN(estimatedPriceMan) || estimatedPriceMan <= 0) {
        displayElement.textContent = "--";
        // 【修正點】：如果成交價無效，不應該觸發 calculate，避免彈出警告
        return; 
    }

    // 計算頭期款 (萬)
    const downPaymentMan = estimatedPriceMan * currentDownPaymentRate;
    
    // 更新顯示 (以萬為單位顯示，不含小數)
    displayElement.textContent = downPaymentMan.toLocaleString(undefined, { maximumFractionDigits: 0 });
    
    // 如果使用者已經在買方頁面，且成交價存在，自動觸發計算
    if (document.getElementById('Buyer').classList.contains('active') && estimatedPriceMan > 0) {
        calculate('buy');
    }
}


// ===================================
// 計算邏輯
// ===================================

/**
 * 執行交易成本與稅務計算的主要函式。
 * @param {string} type - 'buy' 或 'sell'，決定要讀取哪個 Tab 的輸入。
 */
function calculate(type) {
    let estimatedPrice, acquirePrice, decorationFee;
    let registerYearStr, registerMonthStr, registerDayStr;
    let manualLandTax, manualNotaryFeeSeller; 
    let totalFee_CurrentRole = 0;
    let buyerItems = [];
    let sellerItems = [];
    let sellProfit = 0; 
    
    let downPayment = 0; // 預設為 0

    // 1. 取得使用者輸入 (根據 type 決定從哪個 Tab 讀取數據)
    if (type === 'buy') {
        // 買方輸入：使用 || 0 確保欄位空白時讀取 0
        const estimatedPriceMan = parseFloat(document.getElementById('buyEstimatedPrice').value || 0);
        estimatedPrice = estimatedPriceMan * 10000;
        
        // 【變更】：頭期款自動計算 (已轉換為元)
        downPayment = estimatedPrice * currentDownPaymentRate; 

        // 檢查基本輸入
        if (isNaN(estimatedPrice) || estimatedPrice <= 0) {
            // 【修正點】：如果輸入無效，重設結果顯示，避免 alert 彈窗，讓使用者自行觀察結果欄位。
            displayResults([], [], 0, type, 0, 0, 0); 
            // 由於 updateDownPaymentDisplay 已經處理了顯示，這裡不需要額外 alert。
            return;
        }
        
        // 買方只需要計算自己的費用項目
        buyerItems = calculateBuyerFees(estimatedPrice, decorationFee, downPayment); 
        totalFee_CurrentRole = buyerItems.reduce((sum, item) => sum + item.amount, 0);
        sellProfit = 0; 

    } else if (type === 'sell') {
        // 賣方輸入：使用 || 0 確保欄位空白時讀取 0，解決 NaN 問題
        estimatedPrice = parseFloat(document.getElementById('sellEstimatedPrice').value || 0) * 10000;
        acquirePrice = parseFloat(document.getElementById('acquirePrice').value || 0) * 10000; 
        decorationFee = parseFloat(document.getElementById('sellDecorationFee').value || 0) * 10000; 
        
        // 讀取日期欄位的值
        registerYearStr = document.getElementById('registerDateYear').value;
        registerMonthStr = document.getElementById('registerDateMonth').value;
        registerDayStr = document.getElementById('registerDateDay').value;
        
        // 讀取手動輸入欄位的值 (單位為萬 TWD，確保空白時為 0)
        manualLandTax = parseFloat(document.getElementById('manualLandTax').value || 0) * 10000;
        manualNotaryFeeSeller = parseFloat(document.getElementById('manualNotaryFeeSeller').value || 0) * 10000;


        // 檢查基本輸入
        if (isNaN(estimatedPrice) || estimatedPrice <= 0) {
            // 【修正點】：如果輸入無效，重設結果顯示
            alert("請輸入有效的預估成交總價。");
            displayResults([], [], 0, type, 0, 0, 0); 
            return;
        }

        // 賣方計算自己的費用和稅務
        sellerItems = calculateSellerFees(
            estimatedPrice, 
            acquirePrice, 
            decorationFee, 
            manualLandTax, 
            manualNotaryFeeSeller, 
            registerYearStr, 
            registerMonthStr, 
            registerDayStr
        );
        totalFee_CurrentRole = sellerItems.reduce((sum, item) => sum + item.amount, 0);
        
        // 計算賣方淨獲利
        sellProfit = estimatedPrice - acquirePrice - totalFee_CurrentRole;
    }
    
    // 2. 顯示結果 
    displayResults(buyerItems, sellerItems, totalFee_CurrentRole, type, estimatedPrice, acquirePrice, sellProfit);
}

/**
 * 買方費用項目計算
 * @param {number} estimatedPrice - 預估成交總價 (元)
 * @param {number} decorationFee - 裝潢費 (元，通常買方為 0)
 * @param {number} downPayment - 頭期款金額 (元)
 */
function calculateBuyerFees(estimatedPrice, decorationFee, downPayment) {
    let items = [];
    
    // 取得手動輸入欄位的值 (單位為萬 TWD，確保空白時為 0)
    const manualContractTax = parseFloat(document.getElementById('manualContractTax').value || 0) * 10000;
    const manualStampTax = parseFloat(document.getElementById('manualStampTax').value || 0) * 10000;
    const manualGovFee = parseFloat(document.getElementById('manualGovFee').value || 0) * 10000;
    const manualNotaryFee = parseFloat(document.getElementById('manualNotaryFee').value || 0) * 10000;
    
    // 自動計算服務費
    const buyerCommission = estimatedPrice * TAX_RATES.buyerCommissionRate;

    // 組裝項目清單
    
    // 頭期款 
    const loanAmount = estimatedPrice - downPayment;
    items.push({ 
        name: `頭期款 ( ${currentDownPaymentRate * 100}% )`, // 顯示選定的比例
        amount: downPayment,
        note: `房屋總價 ${Math.round(estimatedPrice).toLocaleString()} 元，貸款金額 ${Math.round(loanAmount).toLocaleString()} 元。`
    });

    // 代書費
    items.push({ name: "代書費",
           amount: manualNotaryFee,
           note: "依新北市地政士公會代書收費標準。"});
           
    // 服務費 (自動計算 2%)
    items.push({ name: "仲介服務費", 
        amount: buyerCommission,
        note: "依內政部不動產仲介經紀業報酬計收標準規定，仲介服務費總額不得超過成交價的6%" });
    
    // 契稅
    items.push({ name: "契稅", amount: manualContractTax });

    // 規費
    items.push({ name: "規費", amount: manualGovFee });
    
    // 印花稅
    items.push({ name: "印花稅", amount: manualStampTax });
    
    return items;
}


/**
 * 賣方費用項目計算 (保持不變)
 */
function calculateSellerFees(estimatedPrice, acquirePrice, decorationFee, landTaxFinal, notaryFeeSeller, registerYearStr, registerMonthStr, registerDayStr) {
    let items = [];

    // 1. 服務費 (賣)
    const sellerCommission = estimatedPrice * TAX_RATES.sellerCommissionRate;
    items.push({ 
        name: "仲介服務費", 
        amount: sellerCommission,
        note: "依內政部不動產仲介經紀業報酬計收標準規定，仲介服務費總額不得超過成交價的6%" });

    // 2. 代書費 (賣)
    items.push({ 
        name: "代書費", 
        amount: notaryFeeSeller,
        note: "依新北市地政士公會代書收費標準。"});
    
    // 3. 土地漲價總數額 (使用手動輸入值)
    items.push({ 
        name: "土地漲價總數額", 
        amount: landTaxFinal,
        note: "手動輸入值，此金額用於計算房地合一稅所得。" 
    });
    
    // 4. 房地合一稅
    const flatTax = calculateFlatTax(
        estimatedPrice, 
        acquirePrice, 
        decorationFee, 
        sellerCommission, 
        landTaxFinal, // 土地增值稅
        notaryFeeSeller, // 代書費
        registerYearStr, 
        registerMonthStr, 
        registerDayStr 
    );
    
    items.push({ 
        name: "房地合一稅", 
        amount: flatTax.amount,
        note: flatTax.note
    });
    
    return items;
}


/**
 * 房地合一稅簡化計算函式 (保持不變)
 */
function calculateFlatTax(sellPrice, buyPrice, decorFee, commissionFee, landTax, notaryFeeSeller, registerYearStr, registerMonthStr, registerDayStr) {
    // 1. 將民國日期字串轉換為西元 Date 物件
    const registerDate = rocToAdDate(registerYearStr, registerMonthStr, registerDayStr);

    if (isNaN(buyPrice) || buyPrice <= 0 || !registerDate) {
        return { 
            amount: 0, 
            note: "缺乏取得價、取得價為零或登記日期格式錯誤 (請輸入數字)，無法計算房地合一稅。" 
        };
    }
    
    const now = new Date();
    
    const diffTime = now.getTime() - registerDate.getTime();
    // 換算成年數 (考慮閏年)
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    
    let taxRate = 0; 
    let tenureNote = "";

    // 房地合一稅率判斷邏輯
    if (diffYears < 2) {
        taxRate = TAX_RATES.taxRate_Year1_2; // 45%
        tenureNote = "持有未滿 2 年 (45% 稅率)";
    } else if (diffYears >= 2 && diffYears < 5) {
        taxRate = TAX_RATES.taxRate_Year2_5; // 35%
        tenureNote = "持有 2 年以上未滿 5 年 (35% 稅率)";
        } else if (diffYears >= 5 && diffYears < 10) {
        taxRate = TAX_RATES.taxRate_Year5_10; // 20%
        tenureNote = "持有 5 年以上未滿 10 年 (20% 稅率)";
    } else { // 10 年以上
        taxRate = TAX_RATES.taxRate_Year10_Over; // 15%
        tenureNote = "持有 10 年以上 (15% 稅率)";
    }
    
    // 計算課稅所得
    // 課稅所得 = 成交價 - 取得價 - 裝潢/改良費 - 仲介費 - 土地增值稅 - 代書費
    const taxableIncome = sellPrice - buyPrice - decorFee - commissionFee - landTax - notaryFeeSeller;

    if (taxableIncome <= 0) {
        return { amount: 0, note: `${tenureNote}，無課稅所得，稅額 $0。` };
    }

    const taxAmount = taxableIncome * taxRate;
    
    return { 
        amount: taxAmount, 
        note: `${tenureNote}。課稅所得 ${Math.round(taxableIncome).toLocaleString()} 元，適用稅率 ${taxRate * 100}%。` 
    };
}


/**
 * 將計算結果顯示在網頁上。
 */
function displayResults(buyerItems, sellerItems, totalFee_CurrentRole, type, estimatedPrice, acquirePrice, sellProfit) {
    let listElement, totalFeeElement;
    
    // 根據 type 選擇正確的顯示區塊
    if (type === 'buy') {
        listElement = document.getElementById('buyerList');
        totalFeeElement = document.getElementById('buyTotalFee');

        const items = buyerItems;
        listElement.innerHTML = ''; // 清空舊清單

        // 買方排版邏輯：將頭期款放在最前面，然後是指定順序
        const feeOrder = ["頭期款", "代書費", "仲介服務費", "契稅", "規費", "印花稅"];
        
        if (items.length > 0) {
            feeOrder.forEach(feeName => {
                let item;
                if (feeName === "頭期款") {
                     // 尋找包含 "頭期款" 字眼的項目
                     item = items.find(i => i.name.includes("頭期款")); 
                } else {
                     item = items.find(i => i.name === feeName);
                }
                
                if (item) {
                    listElement.innerHTML += createListItem(item);
                }
            });
        } else {
            // 如果 items 為空，顯示提示訊息
            listElement.innerHTML = '<li>請輸入有效的預估成交總價。</li>';
        }


    } else if (type === 'sell') {
        listElement = document.getElementById('sellerList');
        totalFeeElement = document.getElementById('sellTotalFee');
        const profitElement = document.getElementById('sellProfit'); 
        const items = sellerItems;
        listElement.innerHTML = ''; // 清空舊清單

        if (items.length > 0) {
             // 賣方排版邏輯：代書費優先
            const notaryFeeItem = items.find(item => item.name === "代書費");
            if (notaryFeeItem) {
                listElement.innerHTML += createListItem(notaryFeeItem);
            }
            
            // 其他項目 (服務費、土地增值稅、房地合一稅)
            items.filter(item => item.name !== "代書費").forEach(item => {
                listElement.innerHTML += createListItem(item);
            });

             // 顯示可獲利金額 (完整金額) - 僅在賣方計算時執行
            if (isNaN(sellProfit)) {
                 profitElement.textContent = "--";
            } else {
                 const formattedProfit = sellProfit.toLocaleString(undefined, { maximumFractionDigits: 0 });
                 profitElement.textContent = formattedProfit;
            }
        } else {
            listElement.innerHTML = '<li>請輸入資訊並點擊按鈕執行計算。</li>';
            profitElement.textContent = "--";
        }
    }

    // 顯示總費用 (完整金額)
    if (isNaN(totalFee_CurrentRole) || totalFee_CurrentRole === 0) {
        totalFeeElement.textContent = "--";
    } else {
        totalFeeElement.textContent = totalFee_CurrentRole.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
}

/**
 * 創建清單項目 HTML (保持不變)
 */
function createListItem(item) {
    // 如果項目金額為 NaN 則跳過顯示此項目 (預期不會發生)
    if (isNaN(item.amount)) {
        return ''; 
    }
    
    // 列表項目金額仍以元為單位顯示
    const formattedAmount = item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
    let html = `<li>
        <span style="font-weight: bold; color:#0d47a1;">${item.name}:</span> ${formattedAmount}`;
    
    if (item.note) {
        html += `<br><small style="color: #666; display: block; margin-left: 10px;"> - ${item.note}</small>`;
    }
    html += `</li>`;
    return html;
}