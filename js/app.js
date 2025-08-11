// Main Application Entry Point for Kumaş Stok Yönetimi

// Application initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize navigation
        setupNavigation();
        
        // Initialize page routing
        setupPageRouting();
        
        // Wait for database to be initialized
        await waitForDatabase();
        
        // Load initial page (dashboard)
        showPage('dashboard');
        
        console.log('Application initialized successfully');
        
    } catch (error) {
        console.error('Application initialization error:', error);
        Toast.error('Uygulama başlatılamadı. Lütfen sayfayı yenileyin.');
    }
});

// Wait for database initialization
async function waitForDatabase() {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    while (!window.db || !window.db.db) {
        if (attempts >= maxAttempts) {
            throw new Error('Database initialization timeout');
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    console.log('Database ready after', attempts * 100, 'ms');
}

// Navigation setup
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.dataset.page;
            if (pageId) {
                showPage(pageId);
            }
        });
    });
}

// Page routing setup
function setupPageRouting() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
        const pageId = e.state?.pageId || 'dashboard';
        showPage(pageId);
    });
    
    // Update browser history when navigating
    const originalShowPage = window.showPage;
    window.showPage = function(pageId, customerId = null) {
        originalShowPage(pageId, customerId);
        
        // Update URL without causing page reload
        const url = new URL(window.location);
        url.hash = pageId;
        if (customerId) {
            url.searchParams.set('customerId', customerId);
        } else {
            url.searchParams.delete('customerId');
        }
        
        history.pushState({ pageId, customerId }, '', url);
    };
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
        const companyName = await db.getSetting('companyName', 'Kumaş Stok Yönetimi');
        const companyAddress = await db.getSetting('companyAddress', '');
        const companyPhone = await db.getSetting('companyPhone', '');
        const companyLogoText = await db.getSetting('companyLogoText', companyName);
        const companyLogo = await db.getSetting('companyLogo', ''); // Base64 image data
        
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
                </div>
                
                <table class="print-table">
                    <thead>
                        <tr>
                            <th>Ürün</th>
                            <th>Parti</th>
                            <th class="text-right">Kg</th>
                            <th class="text-right">Birim Fiyat</th>
                            <th class="text-right">Toplam</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${shipment.lines?.map(line => `
                            <tr>
                                <td>${line.productName}</td>
                                <td>${line.party}</td>
                                <td class="text-right">${NumberUtils.formatKg(line.kg)}</td>
                                <td class="text-right">${NumberUtils.formatUnitPrice(line.unitUsd)}</td>
                                <td class="text-right">${NumberUtils.formatUSD(line.lineTotalUsd)}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="5">Sevk detayı bulunamadı</td></tr>'}
                    </tbody>
                </table>
                
                <div class="print-totals">
                    <table>
                        <tr>
                            <td class="total-label">Toplam Kg:</td>
                            <td class="total-amount">${NumberUtils.formatKg(shipment.totals?.totalKg || 0)}</td>
                        </tr>
                        <tr class="grand-total">
                            <td class="total-label">Toplam Tutar:</td>
                            <td class="total-amount">${NumberUtils.formatUSD(shipment.totals?.totalUsd || 0)}</td>
                        </tr>
                    </table>
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
        await showPrintDialog(printContent, `Sevk Makbuzu #${shipment.id.substr(-8).toUpperCase()}`);
        
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
        const companyName = await db.getSetting('companyName', 'Kumaş Stok Yönetimi');
        const companyAddress = await db.getSetting('companyAddress', '');
        const companyPhone = await db.getSetting('companyPhone', '');
        const companyLogoText = await db.getSetting('companyLogoText', companyName);
        const companyLogo = await db.getSetting('companyLogo', '');
        
        const finalBalance = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;
        const balanceClass = finalBalance > 0 ? 'balance-positive' : 
                           finalBalance < 0 ? 'balance-negative' : 'balance-zero';
        
        const printContent = `
            <div class="printable customer-statement">
                <div class="print-header">
                    <div class="company-logo">
                        ${companyLogo ? `<img src="${companyLogo}" alt="Logo">` : ''}
                        <div class="company-logo-text">${companyLogoText}</div>
                    </div>
                    <div class="company-info">
                        ${companyAddress ? `<div>${companyAddress}</div>` : ''}
                        ${companyPhone ? `<div>Tel: ${companyPhone}</div>` : ''}
                    </div>
                    <div class="document-title">MÜŞTERİ EKSTRESİ</div>
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
                        <span class="print-info-label">E-posta:</span>
                        <span>${customer?.email || '-'}</span>
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
        `;
        
        // Create and show print dialog with better PDF options
        await showPrintDialog(printContent, `${customer?.name} - Müşteri Ekstresi`);
        
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
            note: formData.get('note').trim()
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

// Enhanced Print Dialog for PDF
async function showPrintDialog(content, title) {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
        // Fallback to inline printing if popup blocked
        const printDiv = document.createElement('div');
        printDiv.innerHTML = content;
        document.body.appendChild(printDiv);
        
        // Add print media query styles
        const printStyles = document.createElement('style');
        printStyles.textContent = `
            @media print {
                body * { visibility: hidden; }
                .printable, .printable * { visibility: visible; }
                .printable { 
                    position: absolute; 
                    left: 0; 
                    top: 0; 
                    width: 100%; 
                }
                @page { 
                    margin: 1cm; 
                    size: A4; 
                }
            }
        `;
        document.head.appendChild(printStyles);
        
        // Show user instructions
        Toast.info('PDF oluşturmak için yazdırma dialogunda "PDF olarak kaydet" seçeneğini seçin', 8000);
        
        // Trigger print
        setTimeout(() => {
            window.print();
            
            // Cleanup after print
            setTimeout(() => {
                document.body.removeChild(printDiv);
                document.head.removeChild(printStyles);
            }, 1000);
        }, 500);
        
        return;
    }
    
    // Write content to new window
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: white;
                }
                
                /* Print styles */
                .print-header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 2px solid black;
                    padding-bottom: 15px;
                }
                
                .company-logo {
                    margin-bottom: 10px;
                }
                
                .company-logo img {
                    max-height: 60px;
                    max-width: 200px;
                    object-fit: contain;
                }
                
                .company-logo-text {
                    font-size: 24pt;
                    font-weight: bold;
                    margin: 10px 0;
                    color: #1e293b;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                }
                
                .print-header h1 {
                    font-size: 18pt;
                    font-weight: bold;
                    margin: 0 0 5px 0;
                }
                
                .company-info {
                    font-size: 10pt;
                    margin: 5px 0;
                }
                
                .document-title {
                    font-size: 16pt;
                    font-weight: bold;
                    margin-top: 10px;
                }
                
                .print-info-section {
                    margin-bottom: 15px;
                }
                
                .print-info-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 3px;
                }
                
                .print-info-label {
                    font-weight: bold;
                }
                
                .print-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 15px;
                }
                
                .print-table th {
                    background-color: #f0f0f0;
                    border: 1px solid black;
                    padding: 5px;
                    text-align: left;
                    font-weight: bold;
                    font-size: 10pt;
                }
                
                .print-table td {
                    border: 1px solid black;
                    padding: 5px;
                    font-size: 10pt;
                }
                
                .text-right {
                    text-align: right;
                }
                
                .text-center {
                    text-align: center;
                }
                
                .print-totals {
                    float: right;
                    width: 40%;
                    margin-top: 10px;
                }
                
                .print-totals table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .print-totals td {
                    padding: 3px 8px;
                    border-bottom: 1px solid #ccc;
                }
                
                .total-label {
                    font-weight: bold;
                }
                
                .total-amount {
                    text-align: right;
                    font-weight: bold;
                }
                
                .grand-total {
                    border-top: 2px solid black;
                    border-bottom: 2px double black;
                    font-size: 12pt;
                }
                
                .print-signature {
                    margin-top: 30px;
                    display: flex;
                    justify-content: space-between;
                    clear: both;
                }
                
                .signature-box {
                    width: 40%;
                    text-align: center;
                }
                
                .signature-line {
                    border-top: 1px solid black;
                    margin-top: 20px;
                    padding-top: 5px;
                    font-size: 10pt;
                }
                
                .print-footer {
                    text-align: center;
                    font-size: 9pt;
                    color: #666;
                    border-top: 1px solid #ccc;
                    padding-top: 5pt;
                    margin-top: 20px;
                }
                
                .balance-positive {
                    color: black;
                    font-weight: bold;
                }
                
                .balance-negative {
                    color: black;
                    font-weight: bold;
                    text-decoration: underline;
                }
                
                .balance-zero {
                    color: black;
                }
                
                .balance-summary {
                    background-color: #f8f9fa;
                    padding: 10px;
                    margin: 10px 0;
                    border: 1px solid black;
                }
                
                .balance-summary h3 {
                    margin: 0 0 5px 0;
                    font-size: 12pt;
                }
                
                .print-notes {
                    margin-top: 15px;
                    padding: 10px;
                    border: 1px solid #ccc;
                    background-color: #f9f9f9;
                }
                
                .print-notes h4 {
                    margin: 0 0 5px 0;
                    font-size: 11pt;
                }
                
                .print-notes p {
                    margin: 0;
                    font-size: 10pt;
                }
                
                @media print {
                    body { margin: 0; }
                    .no-print { display: none !important; }
                    @page { 
                        margin: 1cm; 
                        size: A4; 
                    }
                }
            </style>
        </head>
        <body>
            ${content}
            
            <div class="no-print" style="position: fixed; bottom: 20px; right: 20px; z-index: 1000;">
                <button onclick="window.print()" style="padding: 12px 20px; font-size: 14px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                    🖨️ PDF
                </button>
                <button onclick="window.close()" style="padding: 12px 20px; font-size: 14px; background: #64748b; color: white; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                    ❌
                </button>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
}

// Export global functions
window.generateCustomerShipmentReport = generateCustomerShipmentReport;
window.generateProductShipmentReport = generateProductShipmentReport;
window.generatePaymentReport = generatePaymentReport;
window.exportReportCSV = exportReportCSV;
window.printShipmentReceipt = printShipmentReceipt;
window.printCustomerStatement = printCustomerStatement;
window.showPrintDialog = showPrintDialog;
window.editPayment = editPayment;
window.updatePayment = updatePayment;
window.deletePayment = deletePayment;