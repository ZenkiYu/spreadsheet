// ===================================
// 可調整的變數/參數 (費率定義)
// ===================================
const TAX_RATES = {
    // 買方服務費 (2%)
    buyerCommissionRate: 0.02, 
    // 賣方服務費 (4%)
    sellerCommissionRate: 0.04, 
    
    // 房地合一稅率 (保持不變)
    taxRate_Year1_2: 0.45, 
    taxRate_Year2_5: 0.35, 
    taxRate_Year5_10: 0.20, 
    taxRate_Year10_Over: 0.15 
};

// V8.05: 預設頭期款比例設為 3 成
let currentDownPaymentRate = 0.3;


// ===================================
// 日期輔助函式 (循環邏輯)
// ===================================

/**
 * 將民國日期年、月、日數字轉換為西元 Date 物件。
 */
function rocToAdDate(yearStr, monthStr, dayStr) {
    const rocYear = parseInt(yearStr);
    const month = parseInt(monthStr);
    const day = parseInt(dayStr);
    
    if (isNaN(rocYear) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }
        
    const adYear = rocYear + 1911;
    const date = new Date(adYear, month - 1, day);
    
    if (date.getFullYear() === adYear && date.getMonth() === month - 1 && date.getDate() === day) {
        return date;
    }
    return null;
}

/**
 * 實現月份和日期輸入欄位的循環邏輯。
 */
function cycleDateValue(id, max) {
    const inputElement = document.getElementById(id);
    let value = parseInt(inputElement.value);

    if (isNaN(value)) {
        inputElement.value = '';
        calculate('sell');
        return;
    }

    if (value > max) {
        inputElement.value = 1;
    } else if (value < 1) {
        inputElement.value = max;
    } else if (value === 0) {
        inputElement.value = 1;
    }
    
    calculate('sell');
}


// ===================================
// Tab 切換功能
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
    
    // 確保切換到買方時，頭期款比例及顯示正確
    if (tabName === 'Buyer') {
        updateBuyerRateButtons(currentDownPaymentRate);
        updateDownPaymentDisplay();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const defaultTab = document.querySelector('.tab-button.active');
    if (defaultTab) {
        const defaultContentId = defaultTab.getAttribute('onclick').match(/'([^']*)'/)[1];
        document.getElementById(defaultContentId).classList.add('active');
        
        if (defaultContentId === 'Buyer') {
             // 頁面載入時設定頭期款按鈕的默認狀態
             updateBuyerRateButtons(currentDownPaymentRate);
             updateDownPaymentDisplay();
        }
    }
});

/**
 * 更新買方頭期款比例按鈕的視覺狀態
 */
function updateBuyerRateButtons(rate) {
    const buttons = document.querySelectorAll('#Buyer .rate-buttons .dp-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    buttons.forEach(btn => {
        if (parseFloat(btn.dataset.rate) === rate) {
            btn.classList.add('active');
        }
    });
}

// ===================================
// 買方頭期款控制邏輯 (V8.06 優化：改為手動輸入成數)
// ===================================

/**
 * 設定買方的頭期款比例，並更新按鈕的視覺狀態。
 * @param {number} rate - 頭期款比例 (0.2, 0.25 或 0.3)
 * @param {HTMLElement} buttonElement - 當前被點擊的按鈕元素
 */
function setDownPaymentRate(rate, buttonElement) {
    // 1. 設定比例
    currentDownPaymentRate = rate;

    // 2. 更新按鈕樣式
    const buttons = document.querySelectorAll('.downpayment-buttons .dp-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');

    // 3. 關鍵步驟：清空手動輸入成數欄位，使比例按鈕計算生效
    document.getElementById('manualDownPaymentRate').value = '';
}

/**
 * 更新預估頭期款金額的顯示標籤 (單位：萬)。
 * 此函式將根據手動輸入成數或比例按鈕來決定顯示的金額。
 */
function updateDownPaymentDisplay() {
    const estimatedPriceMan = parseFloat(document.getElementById('buyEstimatedPrice').value || 0);
    // V8.06: 讀取手動輸入成數 (以百分比 % 形式輸入)
    const manualRateInput = document.getElementById('manualDownPaymentRate').value; 
    const displayElement = document.getElementById('downPaymentDisplay');
    
    if (estimatedPriceMan <= 0) {
        displayElement.textContent = '--';
        return;
    }
    
    let downPaymentMan = 0;
    let effectiveRate = currentDownPaymentRate; // 預設使用按鈕設定的比例

    // V8.06: 檢查手動輸入成數欄位
    if (manualRateInput !== "" && !isNaN(parseFloat(manualRateInput)) && parseFloat(manualRateInput) >= 0) {
        // 情況 A: 使用手動輸入的成數
        // 將百分比 (例如 18 或 25) 轉換為小數 (0.18 或 0.25)
        effectiveRate = parseFloat(manualRateInput) / 100;
        
    } 
    // 情況 B: 如果沒有手動輸入成數，則使用 currentDownPaymentRate

    downPaymentMan = estimatedPriceMan * effectiveRate;
    
    if (isNaN(downPaymentMan) || downPaymentMan < 0) {
        displayElement.textContent = '--';
    } else {
        // V8.03 修正：移除後面的 ' 萬'，只顯示數字
        displayElement.textContent = downPaymentMan.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
}


// ===================================
// 計算邏輯
// ===================================

/**
 * 執行交易成本與稅務計算的主要函式。
 */
function calculate(type) {
    let estimatedPrice, acquirePrice, decorationFee;
    let registerYearStr, registerMonthStr, registerDayStr;
    let manualLandTax, manualNotaryFeeSeller, manualCommissionFeeSeller; 
    let manualContractTaxSeller;
    let totalFee_CurrentRole = 0;
    let buyerItems = [];
    let sellerItems = [];
    let sellProfit = 0; 
    
    let downPayment = 0; 
    let manualCommissionFeeSeller4Percent = null; 

    if (type === 'buy') {
        const estimatedPriceMan = parseFloat(document.getElementById('buyEstimatedPrice').value || 0);
        estimatedPrice = estimatedPriceMan * 10000;
        
        // V8.04 修正：確保在計算之前，頭期款的顯示標籤更新
        updateDownPaymentDisplay();
        
        // V8.06: 讀取手動輸入成數
        const manualRateInput = document.getElementById('manualDownPaymentRate').value; 
        
        let effectiveRate = currentDownPaymentRate;

        if (estimatedPrice <= 0) {
            displayResults([], [], 0, type, 0, 0, 0); 
            return;
        }
        
        // V8.06: 決定頭期款比例
        if (manualRateInput !== "" && !isNaN(parseFloat(manualRateInput)) && parseFloat(manualRateInput) >= 0) {
             // 情況 A: 使用手動輸入的成數 (百分比轉小數)
            effectiveRate = parseFloat(manualRateInput) / 100;
        } 
        
        // 計算頭期款金額 (萬 * 比例 * 10000)
        downPayment = estimatedPrice * effectiveRate;
        
        // V8.06: 確保頭期款金額四捨五入到萬，以便後續的顯示和計算
        // downPaymentMan 是 (downPayment / 10000)
        const downPaymentMan = estimatedPriceMan * effectiveRate; 

        buyerItems = calculateBuyerFees(estimatedPrice, downPayment, downPaymentMan); 
        totalFee_CurrentRole = buyerItems.reduce((sum, item) => sum + item.amount, 0);
        sellProfit = 0; 

    } else if (type === 'sell') {
        estimatedPrice = parseFloat(document.getElementById('sellEstimatedPrice').value || 0) * 10000;
        acquirePrice = parseFloat(document.getElementById('acquirePrice').value || 0) * 10000; 
        
        const decorationFeeInput = document.getElementById('sellDecorationFee').value;
        decorationFee = (decorationFeeInput === "" || isNaN(parseFloat(decorationFeeInput))) ? 0 : parseFloat(decorationFeeInput) * 10000; 
        
        registerYearStr = document.getElementById('registerDateYear').value;
        registerMonthStr = document.getElementById('registerDateMonth').value;
        registerDayStr = document.getElementById('registerDateDay').value;
        
        manualLandTax = parseFloat(document.getElementById('manualLandTax').value || 0) * 10000;
        manualContractTaxSeller = parseFloat(document.getElementById('manualContractTaxSeller').value || 0) * 10000;
        manualNotaryFeeSeller = parseFloat(document.getElementById('manualNotaryFeeSeller').value || 0) * 10000;
        
        const manualCommissionFeeSellerInput = document.getElementById('manualCommissionFeeSeller').value;
        manualCommissionFeeSeller = (manualCommissionFeeSellerInput === "" || isNaN(parseFloat(manualCommissionFeeSellerInput))) ? null : parseFloat(manualCommissionFeeSellerInput) * 10000;

        const manualCommissionFeeSeller4PercentInput = document.getElementById('manualCommissionFeeSeller4Percent').value;
        manualCommissionFeeSeller4Percent = (manualCommissionFeeSeller4PercentInput === "" || isNaN(parseFloat(manualCommissionFeeSeller4PercentInput))) ? null : parseFloat(manualCommissionFeeSeller4PercentInput) * 10000;

        const isAgentSale = document.getElementById('isAgentSale').checked;


        if (isNaN(estimatedPrice) || estimatedPrice <= 0) {
            displayResults([], [], 0, type, 0, 0, 0); 
            return;
        }

        // 賣方計算
        sellerItems = calculateSellerFees(
            estimatedPrice, 
            acquirePrice, 
            decorationFee, 
            manualLandTax, 
            manualContractTaxSeller, 
            manualNotaryFeeSeller, 
            manualCommissionFeeSeller, 
            manualCommissionFeeSeller4Percent, 
            registerYearStr, 
            registerMonthStr, 
            registerDayStr,
            isAgentSale 
        );
        totalFee_CurrentRole = sellerItems.reduce((sum, item) => sum + item.amount, 0);
        
        sellProfit = estimatedPrice - acquirePrice - totalFee_CurrentRole;
    }
    
    displayResults(buyerItems, sellerItems, totalFee_CurrentRole, type, estimatedPrice, acquirePrice, sellProfit);
}

/**
 * 買方費用項目計算
 * V8.07: 修改代書費和仲介服務費備註
 */
function calculateBuyerFees(estimatedPrice, downPayment, downPaymentMan) {
    let items = [];
    
    const manualContractTax = parseFloat(document.getElementById('manualContractTax').value || 0) * 10000;
    const manualStampTax = parseFloat(document.getElementById('manualStampTax').value || 0) * 10000;
    const manualGovFee = parseFloat(document.getElementById('manualGovFee').value || 0) * 10000;
    const manualNotaryFee = parseFloat(document.getElementById('manualNotaryFee').value || 0) * 10000;
    
    const buyerCommission = estimatedPrice * TAX_RATES.buyerCommissionRate;

    // 判斷頭期款計算依據，以便在備註中顯示
    let dpNote = '';
    const manualRateInput = document.getElementById('manualDownPaymentRate').value;
    
    if (manualRateInput !== "" && !isNaN(parseFloat(manualRateInput)) && parseFloat(manualRateInput) >= 0) {
        // V8.06: 使用手動輸入的成數
        dpNote = `使用手動輸入比例 ${parseFloat(manualRateInput).toLocaleString()} % 計算。`;
    } else {
        // 使用按鈕比例
        dpNote = `房屋總價 ${Math.round(estimatedPrice).toLocaleString()} 元，使用設定比例 ${currentDownPaymentRate * 100}% 計算。`;
    }
    
    items.push({ 
        name: `頭期款`, 
        amount: downPayment,
        note: dpNote
    });

    items.push({ 
        name: "仲介服務費", 
        amount: buyerCommission,
        // V8.07: 修改仲介費備註
        note: `依內政部不動產仲介經紀業報酬計收標準規定，仲介服務費總額不得超過成交價的6%。` 
    });
        
    items.push({ 
        name: "代書費",
        amount: manualNotaryFee,
        // V8.07: 修改代書費備註
        note: "依各縣市所在地政士公會代書收費標準為主。"});
        
    items.push({ name: "契稅", amount: manualContractTax, note: "依輸入金額計算。" });
    items.push({ name: "規費", amount: manualGovFee, note: "依輸入金額計算。" });
    items.push({ name: "印花稅", amount: manualStampTax, note: "依輸入金額計算。" });
    
    return items;
}


/**
 * 賣方費用項目計算
 * V8.07: 修改代書費和仲介服務費備註
 */
function calculateSellerFees(estimatedPrice, acquirePrice, decorationFee, landTaxFinal, contractTaxSeller, notaryFeeSeller, manualCommissionFeeSeller, manualCommissionFeeSeller4Percent, registerYearStr, registerMonthStr, registerDayStr, isAgentSale) {
    let items = [];
    let buyerCommissionDeductible = 0; 
    
    // 1. 代書費 (賣)
    items.push({ 
        name: "代書費", 
        amount: notaryFeeSeller,
        // V8.07: 修改代書費備註
        note: "依各縣市所在地政士公會代書收費標準為主。"});

    // 2. 仲介服務費 (售出時/售出實付)
    let sellerCommission = estimatedPrice * TAX_RATES.sellerCommissionRate; 
    let sellerCommissionName = "仲介服務費 (售出時)";
    // V8.07: 修改仲介費備註
    let sellerCommissionNote = `依內政部不動產仲介經紀業報酬計收標準規定，仲介服務費總額不得超過成交價的6%。`;

    if (manualCommissionFeeSeller4Percent !== null && manualCommissionFeeSeller4Percent > 0) {
        sellerCommission = manualCommissionFeeSeller4Percent;
        sellerCommissionName = "仲介服務費 (售出實付)"; 
        // V8.07: 修改仲介費備註
        sellerCommissionNote = "依內政部不動產仲介經紀業報酬計收標準規定，仲介服務費總額不得超過成交價的6%。";
    }
    
    items.push({ 
        name: sellerCommissionName, 
        amount: sellerCommission,
        note: sellerCommissionNote
    });
    
    // 3. 仲介服務費 (取得時/取得實付) - 僅在勾選仲介時才加入列表
    if (isAgentSale) {
        if (manualCommissionFeeSeller !== null && manualCommissionFeeSeller > 0) {
            buyerCommissionDeductible = manualCommissionFeeSeller;
            
            items.push({ 
                name: "仲介服務費 (取得實付)", 
                amount: buyerCommissionDeductible,
                note: "依照取得時所交付之仲介服務費金額，且有留存發票。" 
            });

        } else if (acquirePrice > 0) {
            buyerCommissionDeductible = acquirePrice * TAX_RATES.buyerCommissionRate; 
            
            items.push({ 
                name: "仲介服務費 (取得時)", 
                amount: buyerCommissionDeductible,
                note: `以取得價 ${Math.round(acquirePrice).toLocaleString()} 元計算，通用費率 ${TAX_RATES.buyerCommissionRate * 100}%。` 
            });
        }
    } 
    
    // 4. 可認列裝潢費用 (如果大於零則顯示)
    if (decorationFee > 0) {
        items.push({ 
            name: "可認列裝潢費用",
            amount: decorationFee,
            note: "依提供之發票所認列，實支實付。" 
        });
    }

    // 5. 賣方契稅 
    items.push({ 
        name: "契稅", 
        amount: contractTaxSeller,
        note: "賣方持有期間繳納的契稅，可從房地合一稅課稅所得中扣除。"
    });
    
    // 6. 土地漲價總數額 
    items.push({ 
        name: "土地漲價總數額", 
        amount: landTaxFinal,
        note: "此金額用於計算房地合一稅所得，並非土地增值稅。" 
    });
    
    // 房地合一稅可扣除總額 (用於課稅所得計算)
    const totalCommissionDeductible = sellerCommission + buyerCommissionDeductible;
    
    
    // 7. 房地合一稅
    const flatTax = calculateFlatTax(
        estimatedPrice, 
        acquirePrice, 
        decorationFee, 
        totalCommissionDeductible, 
        landTaxFinal, 
        contractTaxSeller, 
        notaryFeeSeller, 
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
 * 房地合一稅簡化計算函式
 */
function calculateFlatTax(sellPrice, buyPrice, decorFee, commissionFee, landTax, contractTaxSeller, notaryFeeSeller, registerYearStr, registerMonthStr, registerDayStr) {
    const registerDate = rocToAdDate(registerYearStr, registerMonthStr, registerDayStr);

    if (isNaN(buyPrice) || buyPrice <= 0 || !registerDate) {
        return { 
            amount: 0, 
            note: "缺乏取得價、取得價為零或登記日期格式錯誤 (請輸入數字)，無法計算房地合一稅。" 
        };
    }
    
    const now = new Date();
    // 計算持有年數 (365.25 天)
    const diffTime = now.getTime() - registerDate.getTime();
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    
    let taxRate = 0; 
    let tenureNote = "";

    if (diffYears < 2) {
        taxRate = TAX_RATES.taxRate_Year1_2; 
        tenureNote = "持有未滿 2 年 (45% 稅率)";
    } else if (diffYears >= 2 && diffYears < 5) {
        taxRate = TAX_RATES.taxRate_Year2_5; 
        tenureNote = "持有 2 年以上未滿 5 年 (35% 稅率)";
        } else if (diffYears >= 5 && diffYears < 10) {
        taxRate = TAX_RATES.taxRate_Year5_10; 
        tenureNote = "持有 5 年以上未滿 10 年 (20% 稅率)";
    } else { 
        taxRate = TAX_RATES.taxRate_Year10_Over; 
        tenureNote = "持有 10 年以上 (15% 稅率)";
    }
    
    // 課稅所得 = 成交價 - 取得價 - 裝潢費 - 仲介費(總可扣除額) - 土地漲價總數額 - 契稅(賣方) - 代書費(賣方)
    const taxableIncome = sellPrice - buyPrice - decorFee - commissionFee - landTax - contractTaxSeller - notaryFeeSeller;

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
    
    if (type === 'buy') {
        listElement = document.getElementById('buyerList');
        totalFeeElement = document.getElementById('buyTotalFee');

        const items = buyerItems;
        listElement.innerHTML = ''; 
        
        // 買方排版順序 
        const feeOrder = ["頭期款", "仲介服務費", "代書費", "契稅", "規費", "印花稅"];
        
        if (items.length > 0) {
            feeOrder.forEach(feeName => {
                const item = items.find(i => i.name === feeName);
                
                if (item) {
                    listElement.innerHTML += createListItem(item);
                }
            });
        } else {
            listElement.innerHTML = '<li>請輸入有效的預估成交總價。</li>';
        }


    } else if (type === 'sell') {
        listElement = document.getElementById('sellerList');
        totalFeeElement = document.getElementById('sellTotalFee');
        const profitElement = document.getElementById('sellProfit'); 
        const items = sellerItems;
        listElement.innerHTML = ''; 

        if (items.length > 0) {
            // 賣方支出明細的固定順序 
            const feeOrderSeller = [
                "代書費",
                "仲介服務費 (售出實付)", 
                "仲介服務費 (售出時)",    
                "仲介服務費 (取得實付)", 
                "仲介服務費 (取得時)",    
                "可認列裝潢費用",       
                "契稅",
                "土地漲價總數額",
                "房地合一稅"
            ];

            const displayedNames = new Set(); 

            feeOrderSeller.forEach(feeName => {
                const item = items.find(i => i.name === feeName);
                
                if (item) {
                    let shouldDisplay = true;

                    // 避免重複顯示：實付優先於預估
                    if (item.name.includes("售出實付") && displayedNames.has("仲介服務費 (售出時)")) {
                        shouldDisplay = false;
                    } else if (item.name.includes("售出時") && displayedNames.has("仲介服務費 (售出實付)")) {
                        shouldDisplay = false;
                    } else if (item.name.includes("取得實付") && displayedNames.has("仲介服務費 (取得時)")) {
                        shouldDisplay = false;
                    } else if (item.name.includes("取得時") && displayedNames.has("仲介服務費 (取得實付)")) {
                        shouldDisplay = false;
                    }

                    if (shouldDisplay) {
                        // 針對土地漲價總數額/契稅，若金額為 0 則不顯示
                        if (item.name === "土地漲價總數額" && item.amount === 0) {
                            shouldDisplay = false;
                        }
                        if (item.name === "契稅" && item.amount === 0) {
                            shouldDisplay = false;
                        }
                        
                        if (shouldDisplay) {
                            listElement.innerHTML += createListItem(item);
                            displayedNames.add(item.name);
                        }
                    }
                }
            });

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

    if (isNaN(totalFee_CurrentRole) || totalFee_CurrentRole === 0) {
        totalFeeElement.textContent = "--";
    } else {
        totalFeeElement.textContent = totalFee_CurrentRole.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
}

/**
 * 創建清單項目 HTML
 */
function createListItem(item) {
    if (isNaN(item.amount) || item.amount === 0) {
        // 如果金額為 0，則不顯示該項目 (房地合一稅除外)
        if (item.name === "房地合一稅" && item.amount === 0) {
            // 房地合一稅 $0 仍顯示，但將金額設為 $0
            const formattedAmount = '0';
            let html = `<li>
                <span style="font-weight: bold; color:#0d47a1;">${item.name}:</span> ${formattedAmount}`;
            
            if (item.note) {
                html += `<br><small style="color: #666; display: block; margin-left: 10px;"> - ${item.note}</small>`;
            }
            html += `</li>`;
            return html;
        }
        return ''; 
    }
    
    const formattedAmount = item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
    let html = `<li>
        <span style="font-weight: bold; color:#0d47a1;">${item.name}:</span> ${formattedAmount}`;
    
    if (item.note) {
        html += `<br><small style="color: #666; display: block; margin-left: 10px;"> - ${item.note}</small>`;
    }
    html += `</li>`;
    return html;
}
