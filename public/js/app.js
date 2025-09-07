// Main Application Entry Point for Kumaş Stok Yönetimi

// Ana uygulama başlatma
async function main() {
    try {
        LoadingState.show();
        console.log('Uygulama başlatılıyor...');
        
        try {
            console.log('Firebase veritabanı başlatılıyor...');
            const { initializeFirebase, FirestoreDatabase } = await import('./firebase-config.js');
            const result = await initializeFirebase();
            if (result.success) {
                window.db = new FirestoreDatabase(result.db);
                console.log('✅ Firebase veritabanı başarıyla başlatıldı');
                // Firebase bağlantı durumunu güncelle
                setTimeout(() => {
                    const statusElement = document.getElementById('connection-status');
                    if (statusElement) {
                        const statusDot = statusElement.querySelector('.status-dot');
                        if (statusDot) {
                            statusDot.className = 'status-dot connected';
                            statusElement.title = '';
                        }
                    }
                }, 100);
            } else {
                throw new Error(result.error);
            }
        } catch (firebaseError) {
            console.warn('Firebase başlatılamadı, IndexedDB\'ye geçiliyor:', firebaseError);
            window.db = new IndexedDBDatabase();
            await window.db.init();
            console.log('✅ IndexedDB veritabanı başlatıldı (Firebase fallback)');
            // Yerel veritabanı durumunu güncelle
            setTimeout(() => {
                const statusElement = document.getElementById('connection-status');
                if (statusElement) {
                    const statusDot = statusElement.querySelector('.status-dot');
                    if (statusDot) {
                        statusDot.className = 'status-dot disconnected';
                        statusElement.title = '';
                    }
                }
            }, 100);
        }
        
        // UI bileşenlerini ayarla
        setupNavigation();
        setupPageRouting();
        initializeMobileOptimizations();
        
        // İlk sayfayı yükle
        const initialPage = location.hash.slice(1) || 'dashboard';
        await showPage(initialPage);
        
        console.log('✅ Uygulama başarıyla başlatıldı');
        
    } catch (error) {
        console.error('❌ Uygulama başlatma hatası:', error);
        Toast.error('Uygulama başlatılamadı. Lütfen sayfayı yenileyin.');
    } finally {
        LoadingState.hide();
    }
}

// Sayfa yüklendiğinde main fonksiyonunu çalıştır
document.addEventListener('DOMContentLoaded', main);

// Navigation setup
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.dataset.page;
            showPage(pageId);
        });
    });
}

// Page routing setup
function setupPageRouting() {
    // Listen for hash changes to navigate
    window.addEventListener('hashchange', () => {
        const pageId = location.hash.slice(1) || 'dashboard';
        showPage(pageId);
    });
}

/**
 * Show a specific page and hide others
 * @param {string} pageId - The ID of the page to show (e.g., 'dashboard')
 */
async function showPage(pageId, customerId = null) {
    try {
        // Sadece sayfa değişimi sırasında kısa loading göster
        LoadingState.show();
        
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            
            // Navigation'ı hemen güncelle (loading bitmeden)
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.toggle('active', link.dataset.page === pageId);
            });
            
            if (location.hash !== `#${pageId}`) {
                history.pushState(null, '', `#${pageId}`);
            }
            
            // Loading'i hemen gizle, içerik yüklenirken gösterme
            LoadingState.hide();
            
            // Müşteri detay için global ID sakla
            if (pageId === 'customer-detail' && customerId) {
                window.currentCustomerId = customerId;
            }
            
            // İçeriği arka planda yükle
            await loadPageContent(pageId, customerId);
            
        } else {
            console.error(`Page not found: ${pageId}. Redirecting to dashboard.`);
            LoadingState.hide();
            await showPage('dashboard');
        }
    } catch (error) {
        console.error(`Error loading page '${pageId}':`, error);
        Toast.error(`'${pageId}' sayfası yüklenemedi.`);
        LoadingState.hide();
    }
}

// Load content for the active page
async function loadPageContent(pageId, customerId = null) {
    if (!window.db || !window.db.db) {
        console.error("Database not ready. Cannot load page content.");
        Toast.error("Veritabanı bağlantısı bekleniyor...");
        return;
    }

    switch (pageId) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'customers':
            await loadCustomersPage();
            break;
        case 'customer-detail':
            window.currentCustomerId = customerId;
            await loadCustomerDetail(customerId);
            break;
        case 'inventory':
            await loadInventoryPage();
            break;
        case 'products':
            await loadProductsPage();
            break;
        case 'shipments':
            await loadShipmentsPage();
            break;
        case 'supplier-payments':
            await loadSuppliersPage();
            break;
        case 'supplier-detail':
            // localStorage'dan supplier ID'yi al
            const supplierId = localStorage.getItem('currentSupplierId') || window.currentSupplierId;
            console.log('🔍 Supplier detail case - ID:', supplierId);
            console.log('🔍 localStorage currentSupplierId:', localStorage.getItem('currentSupplierId'));
            console.log('🔍 window.currentSupplierId:', window.currentSupplierId);
            
            if (supplierId) {
                window.currentSupplierId = supplierId;
                // Sayfa değiştir ve navigation'ı güncelle
                document.querySelectorAll('.page').forEach(page => {
                    page.classList.remove('active');
                });
                const targetPage = document.getElementById('supplier-detail-page');
                if (targetPage) {
                    targetPage.classList.add('active');
                }
                await showSupplierDetail(supplierId);
            } else {
                console.log('❌ Supplier ID bulunamadı, ana sayfaya yönlendiriliyor');
                // ID yoksa ana tedarikçiler sayfasına yönlendir
                showPage('supplier-payments');
            }
            break;
        case 'reports':
            await loadReportsPage();
            break;
        case 'settings':
            await loadSettingsPage();
            break;
    }
}

// Report Generation Functions
async function generateCustomerShipmentReport() {
    try {
        LoadingState.show();
        
        const startDate = DateUtils.getDaysAgo(30);
        const endDate = new Date();
        
        const shipments = await ShipmentService.getAll();
        const customers = await CustomerService.getAll();
        
        // Filter shipments by date range
        const filteredShipments = shipments.filter(s => 
            DateUtils.isInRange(s.date, startDate, endDate));
        
        // Group by customer
        const customerGroups = ArrayUtils.groupBy(filteredShipments, 'customerId');
        
        const reportData = [];
        
        for (const [customerId, customerShipments] of Object.entries(customerGroups)) {
            const customer = customers.find(c => c.id === customerId);
            if (!customer) continue;
            
            let totalKg = 0;
            let totalUsd = 0;
            
            customerShipments.forEach(shipment => {
                totalKg += shipment.totals?.totalKg || 0;
                totalUsd += shipment.totals?.totalUsd || 0;
            });
            
            reportData.push({
                'Müşteri': customer.name,
                'Sevk Sayısı': customerShipments.length,
                'Toplam Kg': NumberUtils.formatKg(totalKg),
                'Toplam USD': NumberUtils.formatUSD(totalUsd),
                'Ortalama Sevk': NumberUtils.formatUSD(totalUsd / customerShipments.length)
            });
        }
        
        // Sort by total USD descending
        reportData.sort((a, b) => {
            const aUsd = NumberUtils.parseNumber(a['Toplam USD'].replace('$', ''));
            const bUsd = NumberUtils.parseNumber(b['Toplam USD'].replace('$', ''));
            return bUsd - aUsd;
        });
        
        displayReport('Müşteri Bazlı Sevk Raporu (Son 30 Gün)', reportData);
        
    } catch (error) {
        console.error('Customer shipment report error:', error);
        Toast.error('Rapor oluşturulurken hata oluştu');
    } finally {
        LoadingState.hide();
    }
}

async function generateProductShipmentReport() {
    try {
        LoadingState.show();
        
        const startDate = DateUtils.getDaysAgo(30);
        const endDate = new Date();
        
        const shipments = await ShipmentService.getAll();
        const products = await ProductService.getAll();
        
        // Filter shipments by date range
        const filteredShipments = shipments.filter(s => 
            DateUtils.isInRange(s.date, startDate, endDate));
        
        // Collect all lines
        const allLines = [];
        filteredShipments.forEach(shipment => {
            shipment.lines?.forEach(line => {
                allLines.push({
                    ...line,
                    date: shipment.date
                });
            });
        });
        
        // Group by product
        const productGroups = ArrayUtils.groupBy(allLines, 'productId');
        
        const reportData = [];
        
        for (const [productId, productLines] of Object.entries(productGroups)) {
            const product = products.find(p => p.id === productId);
            if (!product) continue;
            
            const totalKg = ArrayUtils.sumBy(productLines, 'kg');
            const totalUsd = ArrayUtils.sumBy(productLines, 'lineTotalUsd');
            const avgPrice = totalKg > 0 ? totalUsd / totalKg : 0;
            
            reportData.push({
                'Ürün': product.name,
                'Sevk Sayısı': productLines.length,
                'Toplam Kg': NumberUtils.formatKg(totalKg),
                'Toplam USD': NumberUtils.formatUSD(totalUsd),
                'Ortalama Fiyat': NumberUtils.formatUnitPrice(avgPrice) + '/kg'
            });
        }
        
        // Sort by total kg descending
        reportData.sort((a, b) => {
            const aKg = NumberUtils.parseNumber(a['Toplam Kg']);
            const bKg = NumberUtils.parseNumber(b['Toplam Kg']);
            return bKg - aKg;
        });
        
        displayReport('Ürün Bazlı Sevk Raporu (Son 30 Gün)', reportData);
        
    } catch (error) {
        console.error('Product shipment report error:', error);
        Toast.error('Rapor oluşturulurken hata oluştu');
    } finally {
        LoadingState.hide();
    }
}

async function generatePaymentReport() {
    try {
        LoadingState.show();
        
        const startDate = DateUtils.getDaysAgo(30);
        const endDate = new Date();
        
        const payments = await PaymentService.getAll();
        const customers = await CustomerService.getAll();
        
        // Filter payments by date range
        const filteredPayments = payments.filter(p => 
            DateUtils.isInRange(p.date, startDate, endDate));
        
        // Group by method
        const methodGroups = ArrayUtils.groupBy(filteredPayments, 'method');
        
        const reportData = [];
        
        for (const [method, methodPayments] of Object.entries(methodGroups)) {
            const totalAmount = ArrayUtils.sumBy(methodPayments, 'amountUsd');
            
            reportData.push({
                'Ödeme Yöntemi': method || 'Belirtilmemiş',
                'Tahsilat Sayısı': methodPayments.length,
                'Toplam Tutar': NumberUtils.formatUSD(totalAmount),
                'Ortalama Tutar': NumberUtils.formatUSD(totalAmount / methodPayments.length)
            });
        }
        
        // Sort by total amount descending
        reportData.sort((a, b) => {
            const aAmount = NumberUtils.parseNumber(a['Toplam Tutar'].replace('$', ''));
            const bAmount = NumberUtils.parseNumber(b['Toplam Tutar'].replace('$', ''));
            return bAmount - aAmount;
        });
        
        displayReport('Tahsilat Raporu (Son 30 Gün)', reportData);
        
    } catch (error) {
        console.error('Payment report error:', error);
        Toast.error('Rapor oluşturulurken hata oluştu');
    } finally {
        LoadingState.hide();
    }
}

function displayReport(title, data) {
    const reportResults = document.getElementById('report-results');
    const reportTitle = document.getElementById('report-title');
    const reportTableHead = document.getElementById('report-table-head');
    const reportTableBody = document.getElementById('report-table-body');
    
    reportTitle.textContent = title;
    
    if (data.length === 0) {
        reportTableHead.innerHTML = '';
        reportTableBody.innerHTML = '<tr><td class="text-center">Veri bulunamadı</td></tr>';
    } else {
        // Create table headers
        const headers = Object.keys(data[0]);
        reportTableHead.innerHTML = '<tr>' + 
            headers.map(h => `<th>${h}</th>`).join('') + 
            '</tr>';
        
        // Create table rows
        reportTableBody.innerHTML = data.map(row => 
            '<tr>' + headers.map(h => `<td>${row[h]}</td>`).join('') + '</tr>'
        ).join('');
    }
    
    // Store report data for export
    window.currentReportData = data;
    window.currentReportTitle = title;
    
    DOMUtils.show(reportResults);
}

function exportReportCSV() {
    if (!window.currentReportData) {
        Toast.warning('Dışa aktarılacak rapor verisi bulunamadı');
        return;
    }
    
    const filename = StringUtils.normalizeText(window.currentReportTitle).replace(/\s+/g, '-') + '.csv';
    CSVUtils.downloadCSV(window.currentReportData, filename);
    Toast.success('Rapor CSV olarak dışa aktarıldı');
}

// PDF Printing Functions
async function printShipmentReceipt(shipmentId) {
    try {
        console.log('printShipmentReceipt called with ID:', shipmentId);
        
        if (!shipmentId) {
            Toast.error('Geçersiz sevk ID');
            return;
        }
        
        const shipment = await ShipmentService.getById(shipmentId);
        if (!shipment) {
            Toast.error('Sevk bulunamadı');
            return;
        }
        
        const customer = await CustomerService.getById(shipment.customerId);
        const companyName = await window.db.getSetting('companyName', 'Kumaş Stok Yönetimi');
        const companyAddress = await window.db.getSetting('companyAddress', '');
        const companyPhone = await window.db.getSetting('companyPhone', '');
        const companyLogoText = await window.db.getSetting('companyLogoText', companyName);
        const companyLogo = await window.db.getSetting('companyLogo', ''); // Base64 image data
        
        const printContent = `
            <div class="printable shipment-receipt">
                <div class="print-header">
                    <div class="company-logo">
                        ${companyLogo ? `<img src="${companyLogo}" alt="Logo">` : ''}
                        <div class="company-logo-text">${companyLogoText}</div>
                    </div>
                    <div class="company-info">
                        ${companyAddress ? `<div>${companyAddress}</div>` : ''}
                        ${companyPhone ? `<div>Tel: ${companyPhone}</div>` : ''}
                    </div>
                    <div class="document-title">SEVK MAKBUZU</div>
                </div>
                
                <div class="print-info-section">
                    <div class="print-info-row">
                        <span class="print-info-label">Müşteri:</span>
                        <span>${customer?.name || 'Bilinmeyen Müşteri'}</span>
                    </div>
                    <div class="print-info-row">
                        <span class="print-info-label">Tarih:</span>
                        <span>${DateUtils.formatDate(shipment.date)}</span>
                    </div>
                    <div class="print-info-row">
                        <span class="print-info-label">Sevk No:</span>
                        <span>#${shipment.id.substr(-8).toUpperCase()}</span>
                    </div>
                    ${shipment.showTryInReceipt ? `
                    <div class="print-info-row">
                        <span class="print-info-label">Döviz Kuru:</span>
                        <span>1 USD = ${window.currentExchangeRate || 30.5} TL</span>
                    </div>
                    ` : ''}
                </div>
                
                <table class="print-table">
                    <thead>
                        <tr>
                            <th>Ürün</th>
                            <th>Parti</th>
                            <th class="text-right">Kg</th>
                            <th class="text-right">Top Adedi</th>
                            <th class="text-right">Birim Fiyat</th>
                            <th class="text-right">Tutar (USD)</th>
                            ${shipment.showTryInReceipt ? '<th class="text-right">Tutar (TL)</th>' : ''}
                            ${shipment.calculateVat ? '<th class="text-right">KDV Tutarı (TL)</th>' : ''}
                            <th class="text-right">${shipment.showTryInReceipt ? 'Genel Toplam (TL)' : 'Genel Toplam (USD)'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${shipment.lines?.map(line => `
                            <tr>
                                <td>${line.productName}</td>
                                <td>${line.party}</td>
                                <td class="text-right">${NumberUtils.formatKg(line.kg)}</td>
                                <td class="text-right">${line.tops || 0}</td>
                                <td class="text-right">${NumberUtils.formatUnitPrice(line.unitUsd)}</td>
                                <td class="text-right">${NumberUtils.formatUSDReceipt(line.lineTotalUsd)}</td>
                                ${shipment.showTryInReceipt ? `<td class="text-right">${NumberUtils.formatTRYReceipt(line.lineTotalTry || 0)}</td>` : ''}
                                ${shipment.calculateVat ? `<td class="text-right">${NumberUtils.formatTRYReceipt(line.vatTry || 0)}</td>` : ''}
                                <td class="text-right">${shipment.showTryInReceipt ? 
                                    NumberUtils.formatTRYReceipt(shipment.calculateVat ? (line.totalWithVatTry || line.lineTotalTry || 0) : (line.lineTotalTry || 0)) :
                                    NumberUtils.formatUSDReceipt(shipment.calculateVat ? (line.totalWithVat || line.lineTotalUsd || 0) : (line.lineTotalUsd || 0))
                                }</td>
                            </tr>
                        `).join('') || '<tr><td colspan="6">Sevk detayı bulunamadı</td></tr>'}
                    </tbody>
                </table>
                
                <div class="print-totals">
                    <table>
                        <tr>
                            <td class="total-label">Toplam Kg:</td>
                            <td class="total-amount">${NumberUtils.formatKg(shipment.totals?.totalKg || 0)}</td>
                        </tr>
                        <tr>
                            <td class="total-label">Toplam Top Adedi:</td>
                            <td class="total-amount">${shipment.totals?.totalTops || 0}</td>
                        </tr>
                        <tr class="grand-total">
                            <td class="total-label">${shipment.showTryInReceipt ? 
                                (shipment.calculateVat ? 'KDV Dahil Genel Toplam (TL):' : 'Genel Toplam (TL):') : 
                                (shipment.calculateVat ? 'KDV Dahil Genel Toplam (USD):' : 'Genel Toplam (USD):')
                            }</td>
                            <td class="total-amount">${shipment.showTryInReceipt ? 
                                NumberUtils.formatTRYReceipt(shipment.lines.reduce((sum, line) => sum + (shipment.calculateVat ? (line.totalWithVatTry || line.lineTotalTry || 0) : (line.lineTotalTry || 0)), 0)) :
                                NumberUtils.formatUSDReceipt(shipment.lines.reduce((sum, line) => sum + (shipment.calculateVat ? (line.totalWithVat || line.lineTotalUsd || 0) : (line.lineTotalUsd || 0)), 0))
                            }</td>
                        </tr>
                    </table>
                </div>
                
                <div class="print-amount-in-words">
                    <div class="amount-words-row">
                        <span class="amount-words-label">Tutar (Yazı ile):</span>
                        <span class="amount-words-text">${NumberUtils.numberToTurkishText(shipment.totals?.totalUsd || 0)} dolar</span>
                    </div>
                    ${shipment.showTryInReceipt ? `
                    <div class="amount-words-row">
                        <span class="amount-words-label">TL Karşılığı (Yazı ile):</span>
                        <span class="amount-words-text">${NumberUtils.numberToTurkishText(shipment.lines.reduce((sum, line) => sum + (line.lineTotalTry || 0), 0))} Türk lirası</span>
                    </div>
                    ` : ''}
                </div>
                
                ${shipment.note ? `
                    <div class="print-notes">
                        <h4>Notlar:</h4>
                        <p>${shipment.note}</p>
                    </div>
                ` : ''}
                
                <div class="print-signature">
                    <div class="signature-box">
                        <div class="signature-line">Teslim Eden</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line">Teslim Alan</div>
                    </div>
                </div>
                
                <div class="print-footer">
                    Yazdırma Tarihi: ${DateUtils.formatDateTime(new Date())}
                </div>
            </div>
        `;
        
        // Create and show print dialog with better PDF options
        // Direct minimal print window (same flow as stock report)
        const currentDate = new Date();
        const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}.${(currentDate.getMonth() + 1).toString().padStart(2, '0')}.${currentDate.getFullYear()} ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;

        // Build a safe title to be used as the default PDF file name
        const shipmentNo = (shipment.referenceNo || shipment.number || shipment.code || (shipment.id ? shipment.id.substr(-8).toUpperCase() : 'SEVK'));
        const productNames = Array.from(new Set((shipment.lines || []).map(l => l.productName).filter(Boolean)));
        const fabricNameRaw = productNames.length === 1 ? productNames[0] : (productNames.length > 1 ? 'Coklu' : 'Bilinmeyen');
        const customerNameRaw = customer?.name || 'Bilinmeyen';
        const rawTitle = `-${shipmentNo}-${fabricNameRaw}-${customerNameRaw}`;
        const safeTitle = StringUtils.normalizeText(rawTitle).replace(/\s+/g, '-').replace(/-+/g, '-');

        const fullHtml = `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${safeTitle}</title>
                <style>
                    @media print { @page { margin: 1cm; size: A4; } }
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; color: black; font-size: 10pt; line-height: 1.3; }
                    .printable { max-width: 800px; margin: 0 auto; }
                    .print-header { text-align: center; margin-bottom: 14pt; border-bottom: 1pt solid #111827; padding-bottom: 8pt; background: linear-gradient(180deg, #111827 0%, #1f2937 100%); color: white; border-radius: 6px; }
                    .company-logo-text { font-size: 16pt; font-weight: 700; margin: 6pt 0 4pt 0; letter-spacing: .5pt; }
                    .document-title { font-size: 13pt; font-weight: 700; text-transform: uppercase; display: inline-block; padding: 4pt 8pt; border: 1pt solid white; border-radius: 4px; }
                    .print-info-section { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6pt; margin: 10pt 0; }
                    .print-info-row { font-size: 9pt; color: #111827; background: #f3f4f6; padding: 6pt; border: 1pt solid #e5e7eb; border-radius: 4px; }
                    .print-info-label { font-weight: 700; color: #374151; margin-right: 4pt; }
                    .print-table { width: 100%; border-collapse: collapse; margin: 8pt 0; }
                    .print-table th { background-color: #f3f4f6; border: 1pt solid #111827; padding: 6pt; font-weight: 700; font-size: 9pt; }
                    .print-table td { border: 1pt solid #111827; padding: 6pt; font-size: 9pt; }
                    .text-right { text-align: right; }
                    .print-totals { margin-top: 10pt; }
                    .print-totals table { width: 100%; }
                    .print-totals td { padding: 4pt; font-size: 10pt; }
                    .total-label { font-weight: 700; }
                    .grand-total { font-weight: 800; font-size: 12pt; border-top: 2pt solid #111827; }
                    .print-signature { margin-top: 16pt; display: flex; justify-content: space-between; gap: 12pt; }
                    .signature-box { width: 48%; text-align: center; }
                    .signature-line { border-top: 1pt solid #111827; margin-top: 18pt; padding-top: 6pt; font-size: 9pt; }
                    .print-amount-in-words { margin-top: 12pt; padding: 8pt; border: 1pt solid #111827; background-color: #f9fafb; }
                    .amount-words-row { margin-bottom: 6pt; font-size: 9pt; }
                    .amount-words-label { font-weight: 700; color: #374151; margin-right: 8pt; }
                    .amount-words-text { font-style: italic; color: #111827; }
                    .print-footer { margin-top: 10pt; text-align: center; font-size: 8pt; color: #6b7280; }
                </style>
            </head>
            <body>
                ${printContent}
                <div class="print-footer">Yazdırma: ${formattedDate}</div>
            </body>
            </html>
        `;
        // Open via Blob URL (reliable on hosting)
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        let printWindow = window.open(blobUrl, '_blank', 'width=860,height=700');
        if (!printWindow) {
            // Fallback to data URL if popup blocked
            const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml);
            printWindow = window.open(dataUrl, '_blank', 'width=860,height=700');
            if (!printWindow) {
                throw new Error('Popup engelleyici aktif. Lütfen bu site için pop-up izni verin.');
            }
        }
        const finish = () => {
            try { printWindow.focus(); } catch {}
            try { printWindow.print(); } catch (e) { console.error(e); }
            setTimeout(() => {
                try { URL.revokeObjectURL(blobUrl); } catch {}
                try { printWindow.close(); } catch (e) { console.error(e); }
            }, 150);
        };
        // onload may not fire consistently across browsers for blob/data URLs; use a short delay
        printWindow.onload = finish;
        setTimeout(finish, 400);
        return;
        
        // Fallback: Direct print if showPrintDialog fails
        console.log('🖨️ Fallback yazdırma sistemi kullanılıyor...');
        
        // Create a new window for printing
        const fallbackWindow = window.open('', '_blank', 'width=800,height=600');
        if (fallbackWindow) {
            fallbackWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${safeTitle}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .printable { max-width: 800px; margin: 0 auto; }
                        .print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
                        .company-logo-text { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                        .document-title { font-size: 18px; font-weight: bold; }
                        .print-info-section { margin-bottom: 20px; }
                        .print-info-row { margin: 5px 0; }
                        .print-info-label { font-weight: bold; }
                        .print-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                        .print-table th, .print-table td { border: 1px solid #333; padding: 8px; text-align: left; }
                        .print-table th { background-color: #f0f0f0; font-weight: bold; }
                        .text-right { text-align: right; }
                        .print-totals { margin-top: 20px; }
                        .print-totals table { width: 100%; }
                        .print-totals td { padding: 5px; }
                        .total-label { font-weight: bold; }
                        .grand-total { font-weight: bold; font-size: 16px; border-top: 2px solid #333; }
                        .print-signature { margin-top: 30px; display: flex; justify-content: space-between; }
                        .signature-box { width: 40%; text-align: center; }
                        .signature-line { border-top: 1px solid #333; margin-top: 20px; padding-top: 5px; }
                        .print-footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
                        @media print {
                            body { margin: 0; }
                            .printable { max-width: none; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent}
                </body>
                </html>
            `);
            fallbackWindow.document.close();
            
            // Wait for content to load then print
            fallbackWindow.onload = function() {
                fallbackWindow.print();
                fallbackWindow.close();
            };
        } else {
            // If popup blocked, show content in current window
            console.log('⚠️ Popup engellendi, mevcut pencerede yazdırılıyor...');
            const printDiv = document.createElement('div');
            printDiv.innerHTML = fullHtml;
            printDiv.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: white;
                z-index: 10000;
                overflow: auto;
                padding: 20px;
            `;
            document.body.appendChild(printDiv);
            
            // Add print button
            const printBtn = document.createElement('button');
            printBtn.textContent = 'Yazdır';
            printBtn.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10001;
                padding: 10px 20px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            `;
            printBtn.onclick = () => {
                window.print();
                document.body.removeChild(printDiv);
                document.body.removeChild(printBtn);
            };
            document.body.appendChild(printBtn);
        }
        
    } catch (error) {
        console.error('Print shipment receipt error:', error);
        Toast.error('Makbuz yazdırılırken hata oluştu');
    }
}

async function printCustomerStatement() {
    try {
        const customerId = window.currentCustomerId;
        if (!customerId) {
            Toast.error('Müşteri seçilmedi');
            return;
        }
        
        const customer = await CustomerService.getById(customerId);
        const ledger = await CustomerService.getLedger(customerId);
        const companyName = await window.db.getSetting('companyName', 'Kumaş Stok Yönetimi');
        const companyAddress = await window.db.getSetting('companyAddress', '');
        const companyPhone = await window.db.getSetting('companyPhone', '');
        const companyLogoText = await window.db.getSetting('companyLogoText', companyName);
        const companyLogo = await window.db.getSetting('companyLogo', '');
        
        const finalBalance = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;
        const balanceClass = finalBalance > 0 ? 'balance-positive' : 
                           finalBalance < 0 ? 'balance-negative' : 'balance-zero';
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${customer?.name} - Müşteri Ekstresi</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        font-size: 12px;
                        line-height: 1.4;
                        color: #333;
                        background: white;
                        padding: 20px;
                    }
                    .printable { 
                        max-width: 800px; 
                        margin: 0 auto;
                        background: white;
                        border: 2px solid #333;
                        border-radius: 8px;
                        overflow: hidden;
                    }
                    .print-header {
                        background: #333;
                        color: white;
                        padding: 25px;
                        text-align: center;
                    }
                    .company-logo-text {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 15px;
                    }
                    .document-title {
                        font-size: 20px;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        border: 2px solid white;
                        padding: 8px 16px;
                        display: inline-block;
                        border-radius: 4px;
                    }
                    .print-info-section {
                        padding: 25px;
                        background: #f8f9fa;
                        border-bottom: 2px solid #333;
                    }
                    .print-info-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 12px;
                        padding: 8px 0;
                        border-bottom: 1px dotted #ddd;
                    }
                    .print-info-label {
                        font-weight: bold;
                        color: #333;
                        min-width: 120px;
                    }
                    .balance-summary {
                        padding: 20px 25px;
                        text-align: center;
                        background: #f0f0f0;
                        border-bottom: 2px solid #333;
                    }
                    .balance-summary h3 {
                        font-size: 18px;
                        color: #333;
                    }
                    .balance-positive { color: #27ae60; font-weight: bold; }
                    .balance-negative { color: #e74c3c; font-weight: bold; }
                    .balance-zero { color: #666; font-weight: bold; }
                    .print-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 0;
                        font-size: 11px;
                    }
                    .print-table th {
                        background: #333;
                        color: white;
                        padding: 12px 8px;
                        text-align: left;
                        font-weight: bold;
                        border-right: 1px solid #555;
                    }
                    .print-table th:last-child { border-right: none; }
                    .print-table td {
                        padding: 10px 8px;
                        border-bottom: 1px solid #eee;
                        border-right: 1px solid #f5f5f5;
                    }
                    .print-table td:last-child { border-right: none; }
                    .print-table tr:nth-child(even) { background: #f9f9f9; }
                    .print-table tr:hover { background: #f0f8ff; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .debit { color: #e74c3c; font-weight: bold; }
                    .credit { color: #27ae60; font-weight: bold; }
                    .print-signature {
                        display: flex;
                        justify-content: space-between;
                        padding: 40px 25px 25px;
                        background: #f8f9fa;
                    }
                    .signature-box {
                        text-align: center;
                        min-width: 200px;
                    }
                    .signature-line {
                        border-top: 2px solid #333;
                        padding-top: 8px;
                        margin-top: 50px;
                        font-weight: bold;
                        color: #333;
                    }
                    .print-footer {
                        text-align: center;
                        padding: 15px;
                        background: #333;
                        color: white;
                        font-size: 11px;
                    }
                    @media print {
                        body { padding: 0; }
                        .printable { 
                            border: none; 
                            border-radius: 0;
                            box-shadow: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="printable customer-statement">
                    <div class="print-header">
                        <div class="company-logo-text">${companyLogoText}</div>
                        <div class="document-title">MÜŞTERİ EKSTRESİ</div>
                    </div>
                    
                    <div class="print-info-section">
                        <div class="print-info-row">
                            <span class="print-info-label">Müşteri:</span>
                            <span>${customer?.name || 'Bilinmeyen Müşteri'}</span>
                        </div>
                        <div class="print-info-row">
                            <span class="print-info-label">Ekstre Tarihi:</span>
                            <span>${DateUtils.formatDate(new Date())}</span>
                        </div>
                    </div>
                    
                    <div class="balance-summary">
                        <h3>Güncel Bakiye: <span class="${balanceClass}">${NumberUtils.formatUSD(finalBalance)}</span></h3>
                    </div>
                    
                    <table class="print-table statement-table">
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>Açıklama</th>
                                <th class="text-right">Borç</th>
                                <th class="text-right">Alacak</th>
                                <th class="text-right">Bakiye</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ledger.length === 0 ? 
                                '<tr><td colspan="5" class="text-center">Hareket bulunamadı</td></tr>' :
                                ledger.map(entry => {
                                    const entryBalanceClass = entry.balance > 0 ? 'balance-positive' : 
                                                            entry.balance < 0 ? 'balance-negative' : 'balance-zero';
                                    return `
                                        <tr>
                                            <td>${DateUtils.formatDate(entry.date)}</td>
                                            <td>${entry.description}</td>
                                            <td class="text-right ${entry.debit > 0 ? 'debit' : ''}">${entry.debit > 0 ? NumberUtils.formatUSD(entry.debit) : '-'}</td>
                                            <td class="text-right ${entry.credit > 0 ? 'credit' : ''}">${entry.credit > 0 ? NumberUtils.formatUSD(entry.credit) : '-'}</td>
                                            <td class="text-right ${entryBalanceClass}">${NumberUtils.formatUSD(entry.balance)}</td>
                                        </tr>
                                    `;
                                }).join('')
                            }
                        </tbody>
                    </table>
                    
                    <div class="print-signature">
                        <div class="signature-box">
                            <div class="signature-line">Firma Yetkilisi</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line">Müşteri</div>
                        </div>
                    </div>
                    
                    <div class="print-footer">
                        Yazdırma Tarihi: ${DateUtils.formatDateTime(new Date())}
                    </div>
                </div>
                <script>
                    // Auto print after page loads
                    window.onload = function() {
                        setTimeout(() => {
                            window.print();
                        }, 100);
                    };
                </script>
            </body>
            </html>
        `;
        
        // Open in new tab and print - FAST like inventory report!
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        Toast.success('PDF ekstre açılıyor...');
        
    } catch (error) {
        console.error('Print customer statement error:', error);
        Toast.error('Ekstre yazdırılırken hata oluştu');
    }
}

// Payment editing functions
async function editPayment(paymentId) {
    try {
        const payment = await PaymentService.getById(paymentId);
        if (!payment) {
            Toast.error('Tahsilat bulunamadı');
            return;
        }
        
        // Create edit payment modal (similar to new payment but with existing data)
        const customers = await CustomerService.getAll();
        const customerOptions = customers.map(c => 
            `<option value="${c.id}" ${payment.customerId === c.id ? 'selected' : ''}>${c.name}</option>`
        ).join('');
        
        const modalHtml = `
            <div class="modal-overlay">
                <div class="modal" style="width: 500px;">
                    <div class="modal-header">
                        <h3>Tahsilat Düzenle</h3>
                        <button class="modal-close" onclick="ModalManager.hide()">×</button>
                    </div>
                    <div class="modal-content">
                        <form id="edit-payment-form">
                            <div class="form-group">
                                <label for="edit-payment-customer">Müşteri *</label>
                                <select id="edit-payment-customer" name="customerId" required>
                                    <option value="">Müşteri seçin</option>
                                    ${customerOptions}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-payment-amount">Tutar (USD) *</label>
                                <input type="number" id="edit-payment-amount" name="amountUsd" required step="0.01" min="0.01" 
                                       value="${payment.amountUsd}" placeholder="Tahsilat tutarını girin">
                            </div>
                            <div class="form-group">
                                <label for="edit-payment-method">Ödeme Yöntemi</label>
                                <select id="edit-payment-method" name="method">
                                    <option value="">Seçin</option>
                                    <option value="Nakit" ${payment.method === 'Nakit' ? 'selected' : ''}>Nakit</option>
                                    <option value="Havale" ${payment.method === 'Havale' ? 'selected' : ''}>Havale</option>
                                    <option value="EFT" ${payment.method === 'EFT' ? 'selected' : ''}>EFT</option>
                                    <option value="KK" ${payment.method === 'KK' ? 'selected' : ''}>Kredi Kartı</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-payment-date">Tarih *</label>
                                <input type="date" id="edit-payment-date" name="date" required 
                                       value="${DateUtils.getInputDate(new Date(payment.date))}">
                            </div>
                            <div class="form-group">
                                <label for="edit-payment-note">Not</label>
                                <textarea id="edit-payment-note" name="note" 
                                          placeholder="Tahsilat hakkında notlar">${payment.note || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                        <button type="button" class="btn btn-primary" onclick="updatePayment('${paymentId}')">Güncelle</button>
                    </div>
                </div>
            </div>
        `;
        
        ModalManager.show(modalHtml);
        
    } catch (error) {
        console.error('Edit payment error:', error);
        Toast.error('Tahsilat düzenlenirken hata oluştu');
    }
}

async function updatePayment(paymentId) {
    try {
        const form = document.getElementById('edit-payment-form');
        const formData = new FormData(form);
        
        const paymentData = {
            id: paymentId,
            customerId: formData.get('customerId'),
            amountUsd: NumberUtils.parseNumber(formData.get('amountUsd')),
            method: formData.get('method'),
            date: formData.get('date'),
            note: form.get('note').trim()
        };
        
        await PaymentService.update(paymentData);
        Toast.success('Tahsilat başarıyla güncellendi');
        
        ModalManager.hide();
        
        // Refresh current customer detail page
        if (window.currentCustomerId) {
            await loadCustomerDetail(window.currentCustomerId);
        }
        
    } catch (error) {
        console.error('Update payment error:', error);
        Toast.error(error.message);
    }
}

async function deletePayment(paymentId) {
    try {
        const payment = await PaymentService.getById(paymentId);
        showConfirmModal(
            'Tahsilat Sil',
            `${NumberUtils.formatUSD(payment.amountUsd)} tutarındaki tahsilatı silmek istediğinizden emin misiniz?`,
            async () => {
                try {
                    await PaymentService.delete(paymentId);
                    Toast.success('Tahsilat başarıyla silindi');
                    
                    // Refresh current customer detail page
                    if (window.currentCustomerId) {
                        await loadCustomerDetail(window.currentCustomerId);
                    }
                } catch (error) {
                    console.error('Delete payment error:', error);
                    Toast.error('Tahsilat silinirken hata oluştu');
                }
            }
        );
    } catch (error) {
        console.error('Delete payment error:', error);
        Toast.error('Tahsilat silinirken hata oluştu');
    }
}

// Müşteri Tahsilat Makbuzu Yazdırma
async function printPaymentReceipt(paymentId) {
    try {
        console.log('🖨️ Tahsilat makbuzu yazdırılıyor:', paymentId);
        
        if (!paymentId) {
            Toast.error('Geçersiz tahsilat ID');
            return;
        }
        
        const payment = await PaymentService.getById(paymentId);
        if (!payment) {
            Toast.error('Tahsilat bulunamadı');
            return;
        }
        
        const customer = await CustomerService.getById(payment.customerId);
        const companyName = await window.db.getSetting('companyName', 'Kumaş Stok Yönetimi');
        const companyAddress = await window.db.getSetting('companyAddress', '');
        const companyPhone = await window.db.getSetting('companyPhone', '');
        
        const currentDate = new Date();
        const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}.${(currentDate.getMonth() + 1).toString().padStart(2, '0')}.${currentDate.getFullYear()} ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
        
        // Yeni sekme açarak yazdırma
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (!printWindow) {
            throw new Error('Popup engelleyici aktif. Lütfen popup\'ları bu site için etkinleştirin.');
        }
        
        const fullHtml = `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Tahsilat Makbuzu - ${companyName}</title>
                <style>
                    @media print { @page { margin: 1cm; size: A4; } }
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 0; 
                        padding: 20px; 
                        background: white;
                        color: black;
                        font-size: 12pt;
                        line-height: 1.4;
                    }
                    .print-header {
                        text-align: center;
                        margin-bottom: 20pt;
                        border-bottom: 2pt solid black;
                        padding-bottom: 15pt;
                    }
                    .print-header h1 {
                        font-size: 18pt;
                        font-weight: bold;
                        margin: 0 0 8pt 0;
                    }
                    .document-title {
                        font-size: 16pt;
                        font-weight: bold;
                        margin-top: 10pt;
                    }
                    .company-info {
                        font-size: 10pt;
                        margin: 5pt 0;
                        color: #666;
                    }
                    .print-info-section {
                        margin: 15pt 0;
                    }
                    .print-info-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8pt;
                        border-bottom: 1pt dotted #ccc;
                        padding-bottom: 5pt;
                    }
                    .print-info-label {
                        font-weight: bold;
                        width: 30%;
                    }
                    .print-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15pt 0;
                    }
                    .print-table th, .print-table td {
                        border: 1pt solid black;
                        padding: 8pt;
                        text-align: left;
                    }
                    .print-table th {
                        background-color: #f0f0f0;
                        font-weight: bold;
                    }
                    .text-right { text-align: right; }
                    .print-totals {
                        margin: 20pt 0;
                        padding: 10pt;
                        border: 2pt solid black;
                        background-color: #f9f9f9;
                    }
                    .grand-total {
                        font-size: 14pt;
                        font-weight: bold;
                    }
                    .total-label {
                        text-align: right;
                        padding-right: 20pt;
                    }
                    .total-amount {
                        text-align: right;
                        font-weight: bold;
                    }
                    .print-signature {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 40pt;
                    }
                    .signature-box {
                        width: 40%;
                        text-align: center;
                    }
                    .signature-line {
                        border-top: 1pt solid black;
                        margin-top: 30pt;
                        padding-top: 5pt;
                        font-size: 10pt;
                    }
                    .print-notes {
                        margin: 15pt 0;
                        padding: 10pt;
                        border: 1pt solid #ccc;
                        background-color: #f9f9f9;
                    }
                    .print-footer {
                        position: fixed;
                        bottom: 1cm;
                        left: 0;
                        right: 0;
                        text-align: center;
                        font-size: 8pt;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="printable payment-receipt">
                    <div class="print-header">
                        <h1>${companyName}</h1>
                        ${companyAddress ? `<div class="company-info">${companyAddress}</div>` : ''}
                        ${companyPhone ? `<div class="company-info">Tel: ${companyPhone}</div>` : ''}
                        <div class="document-title">TAHSİLAT MAKBUZU</div>
                    </div>
                    
                    <div class="print-info-section">
                        <div class="print-info-row">
                            <span class="print-info-label">Müşteri:</span>
                            <span>${customer?.name || 'Bilinmeyen Müşteri'}</span>
                        </div>
                        <div class="print-info-row">
                            <span class="print-info-label">Telefon:</span>
                            <span>${customer?.phone || '-'}</span>
                        </div>
                        <div class="print-info-row">
                            <span class="print-info-label">Tahsilat Tarihi:</span>
                            <span>${new Date(payment.date).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <div class="print-info-row">
                            <span class="print-info-label">Makbuz No:</span>
                            <span>#${payment.id.substr(-8).toUpperCase()}</span>
                        </div>
                    </div>
                    
                    <table class="print-table">
                        <thead>
                            <tr>
                                <th>Açıklama</th>
                                <th>Ödeme Yöntemi</th>
                                <th class="text-right">Tutar (USD)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Müşteri Tahsilatı</td>
                                <td>${payment.method || '-'}</td>
                                <td class="text-right">$${payment.amountUsd.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="print-totals">
                        <table style="width: 100%;">
                            <tr class="grand-total">
                                <td class="total-label">Tahsil Edilen Toplam:</td>
                                <td class="total-amount">$${payment.amountUsd.toFixed(2)}</td>
                            </tr>
                        </table>
                    </div>
                    
                    ${payment.note ? `
                        <div class="print-notes">
                            <h4>Notlar:</h4>
                            <p>${payment.note}</p>
                        </div>
                    ` : ''}
                    
                    <div class="print-signature">
                        <div class="signature-box">
                            <div class="signature-line">Tahsil Eden</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line">Müşteri</div>
                        </div>
                    </div>
                    
                    <div class="print-footer">
                        Yazdırma Tarihi: ${formattedDate}
                    </div>
                </div>
                <script>
                    // Hemen yazdır
                    setTimeout(() => {
                        window.print();
                    }, 100);
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(fullHtml);
        printWindow.document.close();
        
        Toast.success('Tahsilat makbuzu yazdırma hazırlandı');
        
    } catch (error) {
        console.error('Print payment receipt error:', error);
        Toast.error('Tahsilat makbuzu yazdırılırken hata oluştu: ' + error.message);
    }
}

// Tedarikçi Ödeme Makbuzu Yazdırma
async function printSupplierPaymentReceipt(paymentId) {
    try {
        console.log('🖨️ Tedarikçi ödeme makbuzu yazdırılıyor:', paymentId);
        
        if (!paymentId) {
            Toast.error('Geçersiz ödeme ID');
            return;
        }
        
        const supplierPayments = await SupplierService.getAllPayments();
        const payment = supplierPayments.find(p => p.id === paymentId);
        
        if (!payment) {
            Toast.error('Ödeme bulunamadı');
            return;
        }
        
        const companyName = await window.db.getSetting('companyName', 'Kumaş Stok Yönetimi');
        const companyAddress = await window.db.getSetting('companyAddress', '');
        const companyPhone = await window.db.getSetting('companyPhone', '');
        
        const supplierTypeNames = {
            'iplik': 'İplikçi',
            'orme': 'Örme',
            'boyahane': 'Boyahane'
        };
        
        const supplierTypeName = supplierTypeNames[payment.supplierType] || payment.supplierType;
        
        const currentDate = new Date();
        const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}.${(currentDate.getMonth() + 1).toString().padStart(2, '0')}.${currentDate.getFullYear()} ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
        
        // Yeni sekme açarak yazdırma
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (!printWindow) {
            throw new Error('Popup engelleyici aktif. Lütfen popup\'ları bu site için etkinleştirin.');
        }
        
        const fullHtml = `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Ödeme Makbuzu - ${companyName}</title>
                <style>
                    @media print { @page { margin: 1cm; size: A4; } }
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 0; 
                        padding: 20px; 
                        background: white;
                        color: black;
                        font-size: 12pt;
                        line-height: 1.4;
                    }
                    .print-header {
                        text-align: center;
                        margin-bottom: 20pt;
                        border-bottom: 2pt solid black;
                        padding-bottom: 15pt;
                    }
                    .print-header h1 {
                        font-size: 18pt;
                        font-weight: bold;
                        margin: 0 0 8pt 0;
                    }
                    .document-title {
                        font-size: 16pt;
                        font-weight: bold;
                        margin-top: 10pt;
                        color: #d97706;
                    }
                    .company-info {
                        font-size: 10pt;
                        margin: 5pt 0;
                        color: #666;
                    }
                    .print-info-section {
                        margin: 15pt 0;
                    }
                    .print-info-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8pt;
                        border-bottom: 1pt dotted #ccc;
                        padding-bottom: 5pt;
                    }
                    .print-info-label {
                        font-weight: bold;
                        width: 30%;
                    }
                    .print-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15pt 0;
                    }
                    .print-table th, .print-table td {
                        border: 1pt solid black;
                        padding: 8pt;
                        text-align: left;
                    }
                    .print-table th {
                        background-color: #f0f0f0;
                        font-weight: bold;
                    }
                    .text-right { text-align: right; }
                    .print-totals {
                        margin: 20pt 0;
                        padding: 10pt;
                        border: 2pt solid black;
                        background-color: #fef3c7;
                    }
                    .grand-total {
                        font-size: 14pt;
                        font-weight: bold;
                    }
                    .total-label {
                        text-align: right;
                        padding-right: 20pt;
                    }
                    .total-amount {
                        text-align: right;
                        font-weight: bold;
                    }
                    .print-signature {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 40pt;
                    }
                    .signature-box {
                        width: 40%;
                        text-align: center;
                    }
                    .signature-line {
                        border-top: 1pt solid black;
                        margin-top: 30pt;
                        padding-top: 5pt;
                        font-size: 10pt;
                    }
                    .print-notes {
                        margin: 15pt 0;
                        padding: 10pt;
                        border: 1pt solid #ccc;
                        background-color: #f9f9f9;
                    }
                    .print-footer {
                        position: fixed;
                        bottom: 1cm;
                        left: 0;
                        right: 0;
                        text-align: center;
                        font-size: 8pt;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="printable supplier-payment-receipt">
                    <div class="print-header">
                        <h1>${companyName}</h1>
                        ${companyAddress ? `<div class="company-info">${companyAddress}</div>` : ''}
                        ${companyPhone ? `<div class="company-info">Tel: ${companyPhone}</div>` : ''}
                        <div class="document-title">ÖDEME MAKBUZU</div>
                    </div>
                    
                    <div class="print-info-section">
                        <div class="print-info-row">
                            <span class="print-info-label">Tedarikçi Türü:</span>
                            <span>${supplierTypeName}</span>
                        </div>
                        <div class="print-info-row">
                            <span class="print-info-label">Ödeme Tarihi:</span>
                            <span>${new Date(payment.date).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <div class="print-info-row">
                            <span class="print-info-label">Makbuz No:</span>
                            <span>#${payment.id.substr(-8).toUpperCase()}</span>
                        </div>
                    </div>
                    
                    <table class="print-table">
                        <thead>
                            <tr>
                                <th>Açıklama</th>
                                <th>Ödeme Yöntemi</th>
                                <th class="text-right">Tutar (USD)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${supplierTypeName} Ödemesi</td>
                                <td>${payment.method || '-'}</td>
                                <td class="text-right">$${payment.amount.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="print-totals">
                        <table style="width: 100%;">
                            <tr class="grand-total">
                                <td class="total-label">Ödenen Toplam:</td>
                                <td class="total-amount">$${payment.amount.toFixed(2)}</td>
                            </tr>
                        </table>
                    </div>
                    
                    ${payment.note ? `
                        <div class="print-notes">
                            <h4>Notlar:</h4>
                            <p>${payment.note}</p>
                        </div>
                    ` : ''}
                    
                    <div class="print-signature">
                        <div class="signature-box">
                            <div class="signature-line">Ödeme Yapan</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line">Tedarikçi</div>
                        </div>
                    </div>
                    
                    <div class="print-footer">
                        Yazdırma Tarihi: ${formattedDate}
                    </div>
                </div>
                <script>
                    // Hemen yazdır
                    setTimeout(() => {
                        window.print();
                    }, 100);
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(fullHtml);
        printWindow.document.close();
        
        Toast.success('Ödeme makbuzu yazdırma hazırlandı');
        
    } catch (error) {
        console.error('Print supplier payment receipt error:', error);
        Toast.error('Ödeme makbuzu yazdırılırken hata oluştu: ' + error.message);
    }
}

// Enhanced Print Dialog for PDF
async function showPrintDialog(content, title) {
    console.log('🖨️ Yazdırma işlemi başlatıldı:', title);
    
    // Direkt inline yazdırma kullan (popup sorunlarını önlemek için)
    console.log('📄 Inline yazdırma sistemi kullanılıyor...');
    
    // Create print content container
    const printDiv = document.createElement('div');
    printDiv.innerHTML = content;
    printDiv.className = 'print-content-temp';
    printDiv.style.display = 'none';
    document.body.appendChild(printDiv);
    
    // Add comprehensive print styles
    const printStyles = document.createElement('style');
    printStyles.id = 'temp-print-styles';
    printStyles.textContent = `
        @media print {
            /* Hide everything except print content */
            body * { 
                visibility: hidden !important; 
                display: none !important;
            }
            
            /* Show only printable content */
            .print-content-temp,
            .print-content-temp * { 
                visibility: visible !important; 
                display: block !important;
            }
            
            /* Position print content */
            .print-content-temp { 
                position: absolute !important; 
                left: 0 !important; 
                top: 0 !important; 
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            /* Print page settings */
            @page { 
                margin: 1cm; 
                size: A4; 
            }
            
            /* Print-specific styles */
            .print-header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 2px solid black;
                padding-bottom: 15px;
            }
            
            .company-logo-text {
                font-size: 24pt !important;
                font-weight: bold !important;
                margin: 10px 0 !important;
                color: black !important;
            }
            
            .document-title {
                font-size: 16pt !important;
                font-weight: bold !important;
                margin-top: 10px !important;
            }
            
            .print-table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin-bottom: 15px !important;
            }
            
            .print-table th {
                background-color: #f0f0f0 !important;
                border: 1px solid black !important;
                padding: 5px !important;
                font-weight: bold !important;
                font-size: 10pt !important;
            }
            
            .print-table td {
                border: 1px solid black !important;
                padding: 5px !important;
                font-size: 10pt !important;
            }
            
            .print-signature {
                margin-top: 30px !important;
                display: flex !important;
                justify-content: space-between !important;
            }
            
            .signature-box {
                width: 40% !important;
                text-align: center !important;
            }
            
            .signature-line {
                border-top: 1px solid black !important;
                margin-top: 20px !important;
                padding-top: 5px !important;
                font-size: 10pt !important;
            }
        }
    `;
    document.head.appendChild(printStyles);
    
    // Show success message and instructions
    Toast.success('🖨️ Yazdırma dialogu açılıyor... PDF için hedef olarak "PDF olarak kaydet" seçin!', 5000);
    
    // Trigger print with delay for better user experience
    setTimeout(() => {
        console.log('🖨️ Yazdırma dialogu başlatılıyor...');
        
        // Focus window and trigger print
        window.focus();
        window.print();
        
        // Cleanup after print (longer delay to ensure print dialog is handled)
        setTimeout(() => {
            try {
                if (printDiv && printDiv.parentNode) {
                    document.body.removeChild(printDiv);
                    console.log('✅ Print div temizlendi');
                }
                if (printStyles && printStyles.parentNode) {
                    document.head.removeChild(printStyles);
                    console.log('✅ Print styles temizlendi');
                }
                console.log('✅ Yazdırma temizliği tamamlandı');
            } catch (error) {
                console.error('Temizlik hatası:', error);
            }
        }, 2000);
        
         }, 500);
}

// Mobile Optimizations
function initializeMobileOptimizations() {
    // Prevent iOS zoom on input focus
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            if (window.innerWidth < 768) {
                input.style.fontSize = '16px';
            }
        });
    });
    
    // Add touch feedback to interactive elements
    const interactiveElements = document.querySelectorAll('button, .btn, .nav-link, .tab-btn, .data-table tr');
    interactiveElements.forEach(element => {
        element.addEventListener('touchstart', function() {
            this.style.opacity = '0.7';
        }, { passive: true });
        
        element.addEventListener('touchend', function() {
            setTimeout(() => {
                this.style.opacity = '';
            }, 150);
        }, { passive: true });
    });
    
    // Improve table scrolling on mobile
    const tableContainers = document.querySelectorAll('.table-container');
    tableContainers.forEach(container => {
        let isScrolling = false;
        
        container.addEventListener('touchstart', () => {
            isScrolling = true;
        }, { passive: true });
        
        container.addEventListener('touchend', () => {
            setTimeout(() => {
                isScrolling = false;
            }, 100);
        }, { passive: true });
        
        // Add scroll indicators
        const scrollIndicator = document.createElement('div');
        scrollIndicator.className = 'mobile-scroll-indicator';
        scrollIndicator.innerHTML = '← Kaydırın →';
        scrollIndicator.style.cssText = `
            position: absolute;
            top: 50%;
            right: 10px;
            transform: translateY(-50%);
            background: rgba(59, 130, 246, 0.9);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 10;
        `;
        
        if (container.scrollWidth > container.clientWidth) {
            container.style.position = 'relative';
            container.appendChild(scrollIndicator);
            
            // Show indicator initially
            setTimeout(() => {
                scrollIndicator.style.opacity = '1';
            }, 500);
            
            // Hide after first scroll
            container.addEventListener('scroll', () => {
                scrollIndicator.style.opacity = '0';
            }, { once: true, passive: true });
        }
    });
    
    // Handle orientation change
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            // Refresh table layouts
            tableContainers.forEach(container => {
                const indicator = container.querySelector('.mobile-scroll-indicator');
                if (indicator) {
                    if (container.scrollWidth > container.clientWidth) {
                        indicator.style.display = 'block';
                    } else {
                        indicator.style.display = 'none';
                    }
                }
            });
        }, 100);
    });
    
    // Add pull-to-refresh hint (visual only)
    if (window.innerWidth < 768) {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            let startY = 0;
            let currentY = 0;
            
            mainContent.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
            }, { passive: true });
            
            mainContent.addEventListener('touchmove', (e) => {
                currentY = e.touches[0].clientY;
                
                if (mainContent.scrollTop === 0 && currentY > startY + 50) {
                    // Show refresh hint
                    if (!document.querySelector('.refresh-hint')) {
                        const hint = document.createElement('div');
                        hint.className = 'refresh-hint';
                        hint.innerHTML = '↓ Yenilemek için bırakın';
                        hint.style.cssText = `
                            position: fixed;
                            top: 70px;
                            left: 50%;
                            transform: translateX(-50%);
                            background: rgba(59, 130, 246, 0.9);
                            color: white;
                            padding: 8px 16px;
                            border-radius: 20px;
                            font-size: 14px;
                            z-index: 1000;
                            animation: fadeIn 0.3s;
                        `;
                        document.body.appendChild(hint);
                    }
                }
            }, { passive: true });
            
            mainContent.addEventListener('touchend', () => {
                const hint = document.querySelector('.refresh-hint');
                if (hint && currentY > startY + 100) {
                    // Trigger refresh
                    const currentPage = document.querySelector('.page.active').id.replace('-page', '');
                    loadPageContent(currentPage);
                }
                
                if (hint) {
                    hint.remove();
                }
            }, { passive: true });
        }
    }
}

// Mobile optimizations are now initialized in the main() function

// Add CSS animation for fade in
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
`;
document.head.appendChild(style);

// Export global functions
window.generateCustomerShipmentReport = generateCustomerShipmentReport;
window.generateProductShipmentReport = generateProductShipmentReport;
window.generatePaymentReport = generatePaymentReport;
window.exportReportCSV = exportReportCSV;
window.printShipmentReceipt = printShipmentReceipt;
window.printCustomerStatement = printCustomerStatement;
window.printPaymentReceipt = printPaymentReceipt;
window.printSupplierPaymentReceipt = printSupplierPaymentReceipt;
window.showPrintDialog = showPrintDialog;
window.editPayment = editPayment;
window.updatePayment = updatePayment;
window.deletePayment = deletePayment;