// Page Management for Kumaş Stok Yönetimi

// Global variables
window.currentCustomerId = null;
window.currentSortColumn = null;
window.currentSortDirection = 'asc';

// Page Navigation
function showPage(pageId, customerId = null) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected page
    const page = document.getElementById(`${pageId}-page`);
    if (page) {
        page.classList.add('active');
        
        // Update active nav link
        const navLink = document.querySelector(`[data-page="${pageId}"]`);
        if (navLink) {
            navLink.classList.add('active');
        }
        
        // Load page content
        loadPageContent(pageId, customerId);
    }
}

async function loadPageContent(pageId, customerId = null) {
    try {
        // İçerik yükleme için loading gösterme, hızlı yüklensin
        
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
            case 'shipments':
                await loadShipmentsPage();
                break;
            case 'suppliers':
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
                    await showSupplierDetail(supplierId);
                } else {
                    console.log('❌ Supplier ID bulunamadı, ana sayfaya yönlendiriliyor');
                    // ID yoksa ana tedarikçiler sayfasına yönlendir
                    showPage('suppliers');
                }
                break;
            case 'reports':
                await loadReportsPage();
                break;
            case 'settings':
                await loadSettingsPage();
                break;
        }
    } catch (error) {
        console.error('Page load error:', error);
        Toast.error('Sayfa yüklenirken hata oluştu');
    }
}

// Dashboard Cache System
const DashboardCache = {
    data: null,
    timestamp: 0,
    cacheTimeout: 30 * 1000, // 30 saniye
    
    isExpired() {
        return Date.now() - this.timestamp > this.cacheTimeout;
    },
    
    set(data) {
        this.data = data;
        this.timestamp = Date.now();
        console.log('💾 Dashboard verileri cache\'lendi');
    },
    
    get() {
        if (this.data && !this.isExpired()) {
            console.log('⚡ Cache\'den dashboard verileri kullanılıyor');
            return this.data;
        }
        return null;
    },
    
    clear() {
        this.data = null;
        this.timestamp = 0;
        console.log('🗑️ Dashboard cache temizlendi');
    }
};

// Dashboard Page
async function loadDashboard() {
    try {
        console.log('🚀 Dashboard yükleniyor...');
        const startTime = performance.now();
        
        // Check if database is ready
        if (!window.db || !window.db.db) {
            console.log('Database not ready');
            showFallbackDashboard();
            return;
        }

        // Cache kontrolü - geçici olarak devre dışı
        // const cachedData = DashboardCache.get();
        // if (cachedData) {
        //     updateDashboardUI(cachedData);
        //     const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
        //     console.log(`✅ Dashboard cache'den yüklendi: ${totalTime}s`);
        //     return;
        // }

        // Paralel olarak tüm dashboard verilerini çek
        const [summary, recentActivities, enhancedData, stockAlerts] = await Promise.all([
            DashboardService.getSummary(),
            DashboardService.getRecentActivities(),
            getEnhancedDashboardData(),
            StockAlertService.getLowStockAlerts()
        ]);
        
        // Döviz kuru güncelle (eğer yoksa)
        if (!window.currentExchangeRate) {
            try {
                const rate = await ExchangeRateService.getUSDToTRY();
                window.currentExchangeRate = rate;
            } catch (error) {
                console.log('Döviz kuru alınamadı, varsayılan kullanılıyor');
                window.currentExchangeRate = 30.5;
            }
        }
        
        console.log(`📊 Dashboard verileri çekildi: ${((performance.now() - startTime) / 1000).toFixed(2)}s`);
        
        // Verileri cache'le - geçici olarak devre dışı
        const dashboardData = { summary, recentActivities, enhancedData };
        // DashboardCache.set(dashboardData);
        
        // Stok uyarılarını kontrol et ve göster
        updateStockAlerts(stockAlerts);
        
        // UI'ı güncelle
        updateDashboardUI(dashboardData);
        
        const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Dashboard tamamlandı: ${totalTime}s`);
        
    } catch (error) {
        console.error('Dashboard load error:', error);
        Toast.error('Dashboard yüklenirken hata oluştu: ' + error.message);
        showFallbackDashboard();
    }
}

// Dashboard UI güncelleme fonksiyonu
function updateDashboardUI(dashboardData) {
    const { summary, recentActivities, enhancedData } = dashboardData;
        
        // Update exchange rate values
        const currentRate = window.currentExchangeRate || 30.5;
        const formattedRate = `₺${currentRate.toFixed(2)}`;
        DOMUtils.setText('#current-exchange-rate', formattedRate);
        DOMUtils.setText('#usd-try-rate', formattedRate);
        
        // Update exchange rate update time
        const now = new Date();
        const timeString = now.toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        DOMUtils.setText('#exchange-update-time', timeString);
        
        // Update exchange trend
        const exchangeTrendElement = document.getElementById('exchange-trend');
        if (exchangeTrendElement) {
            exchangeTrendElement.textContent = 'Güncel';
            exchangeTrendElement.className = 'kpi-trend positive';
        }
        
        DOMUtils.setText('#last30-shipment-usd', NumberUtils.formatUSD(summary.last30DaysShipment.totalUsd));
        DOMUtils.setText('#last30-shipment-kg', NumberUtils.formatKg(summary.last30DaysShipment.totalKg));
        DOMUtils.setText('#monthly-avg-price', NumberUtils.formatUSD(enhancedData.avgPrice, 4) + '/kg');
        
        DOMUtils.setText('#total-stock-kg', NumberUtils.formatKg(summary.totalStock));
        DOMUtils.setText('#stock-available', NumberUtils.formatKg(enhancedData.stockAvailable));
        DOMUtils.setText('#stock-partial', NumberUtils.formatKg(enhancedData.stockPartial));
        DOMUtils.setText('#stock-finished', enhancedData.stockFinished);
        
        DOMUtils.setText('#open-receivables', NumberUtils.formatUSD(summary.openReceivables));
        DOMUtils.setText('#receivables-count', enhancedData.customersWithDebt);
        
        // Update recent activities
    const activitiesList = document.getElementById('recent-activities');
    if (activitiesList) {
        if (recentActivities.length === 0) {
            activitiesList.innerHTML = '<p class="text-center">Henüz hareket bulunmuyor</p>';
        } else {
            activitiesList.innerHTML = recentActivities.map(activity => `
                <div class="activity-item">
                    <div class="activity-description">${activity.description}</div>
                    <div class="activity-time">${DateUtils.formatDate(activity.date)}</div>
                </div>
            `).join('');
        }
    }
}

// Stock Alerts Functions
function updateStockAlerts(alerts) {
    const alertsSection = document.getElementById('stock-alerts-section');
    const alertsList = document.getElementById('stock-alerts-list');
    
    if (!alertsSection || !alertsList) {
        console.warn('Stock alerts elements not found');
        return;
    }
    
    if (!alerts || alerts.length === 0) {
        alertsSection.style.display = 'none';
        return;
    }
    
    // Uyarıları göster
    alertsSection.style.display = 'block';
    
    // Uyarı listesini oluştur
    alertsList.innerHTML = alerts.map(alert => `
        <div class="stock-alert-item ${alert.severity}">
            <div class="stock-alert-icon">
                ${alert.severity === 'critical' ? '🚨' : '⚠️'}
            </div>
            <div class="stock-alert-content">
                <div class="stock-alert-product">${alert.productName}</div>
                <div class="stock-alert-message">${alert.message}</div>
            </div>
            <div class="stock-alert-stock">
                ${NumberUtils.formatKg(alert.currentStock)}
            </div>
        </div>
    `).join('');
    
    console.log(`⚠️ ${alerts.length} stok uyarısı gösteriliyor`);
}

function dismissStockAlerts() {
    const alertsSection = document.getElementById('stock-alerts-section');
    if (alertsSection) {
        alertsSection.style.display = 'none';
        console.log('📢 Stok uyarıları kapatıldı');
    }
}

async function getEnhancedDashboardData() {
    try {
        console.log('🚀 Dashboard verileri optimize edilmiş şekilde yükleniyor...');
        const startTime = performance.now();
        
        // 1. TÜM VERİLERİ TEK SEFERDE ÇEK (Promise.all ile paralel)
        const thirtyDaysAgo = DateUtils.getDaysAgo(30);
        const sixtyDaysAgo = DateUtils.getDaysAgo(60);
        const previousPeriodStart = DateUtils.getDaysAgo(60);
        const previousPeriodEnd = DateUtils.getDaysAgo(30);
        
        // Paralel olarak tüm verileri çek
        const [
            allShipments,
            allCustomers, 
            allPayments,
            allSupplierPayments,
            allLots
        ] = await Promise.all([
            ShipmentService.getAll(),
            CustomerService.getAll(),
            PaymentService.getAll(),
            db.readAll('supplierPayments'),
            InventoryService.getAll()
        ]);
        
        console.log(`📊 Veri çekme tamamlandı: ${((performance.now() - startTime) / 1000).toFixed(2)}s`);
        
        // 2. SEVK VERİLERİNİ FİLTRELE (Bellekte)
        const recentShipments = allShipments.filter(s => new Date(s.date) >= thirtyDaysAgo);
        const totalSales = recentShipments.reduce((sum, s) => sum + (s.totals?.totalUsd || 0), 0);
        const totalKg = recentShipments.reduce((sum, s) => sum + (s.totals?.totalKg || 0), 0);
        
        // 3. ÖDEME VERİLERİNİ FİLTRELE (Bellekte)
        const recentPayments = allPayments.filter(p => new Date(p.date) >= thirtyDaysAgo);
        const previousPayments = allPayments.filter(p => 
                    new Date(p.date) >= previousPeriodStart && new Date(p.date) < previousPeriodEnd
                );
        
        const recentSupplierPayments = allSupplierPayments.filter(p => new Date(p.date) >= thirtyDaysAgo);
        const previousSupplierPayments = allSupplierPayments.filter(p => 
                new Date(p.date) >= previousPeriodStart && new Date(p.date) < previousPeriodEnd
            );
        
        // 4. KASA HESAPLAMALARI (Bellekte)
        const totalReceived = recentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        // Tedarikçi ödemelerini TL/USD ayrımı yaparak hesapla
        const totalPaid = recentSupplierPayments.reduce((sum, p) => {
            if (p.originalCurrency === 'TRY') {
                // TL ödemeleri USD'ye çevir (dashboard USD gösteriyor)
                const exchangeRate = p.exchangeRate || 30.5;
                return sum + ((p.originalAmount || 0) / exchangeRate);
            } else {
                return sum + (p.amount || 0);
            }
        }, 0);
        
        const netCash = totalReceived - totalPaid;
        
        const previousTotalReceived = previousPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const previousTotalPaid = previousSupplierPayments.reduce((sum, p) => {
            if (p.originalCurrency === 'TRY') {
                const exchangeRate = p.exchangeRate || 30.5;
                return sum + ((p.originalAmount || 0) / exchangeRate);
            } else {
                return sum + (p.amount || 0);
            }
        }, 0);
        const previousNetCash = previousTotalReceived - previousTotalPaid;
        
        // 5. TREND HESAPLAMA
        let calculatedTrend = '0%';
        if (previousNetCash !== 0) {
            const changePercent = ((netCash - previousNetCash) / Math.abs(previousNetCash)) * 100;
            const sign = changePercent >= 0 ? '+' : '';
            calculatedTrend = `${sign}${changePercent.toFixed(1)}%`;
        } else if (netCash > 0) {
            calculatedTrend = '+100%';
        } else if (netCash < 0) {
            calculatedTrend = '-100%';
        }
        
        // 6. STOK HESAPLAMALARI (Bellekte)
        const stockAvailable = allLots.filter(l => l.status === 'Stokta').reduce((sum, l) => sum + (l.remainingKg || 0), 0);
        const stockPartial = allLots.filter(l => l.status === 'Kısmi').reduce((sum, l) => sum + (l.remainingKg || 0), 0);
        const stockFinished = allLots.filter(l => l.status === 'Bitti').length;
        const totalStock = stockAvailable + stockPartial;
        
        // 7. MÜŞTERİ BAKİYE HESAPLAMALARI (Optimize edilmiş)
        let customersWithDebt = 0;
        const customerBalances = await Promise.all(
            allCustomers.map(async (customer) => {
            try {
                const balance = await CustomerService.getBalance(customer.id);
                    return { customerId: customer.id, balance };
            } catch (e) {
                    return { customerId: customer.id, balance: 0 };
            }
            })
        );
        
        customersWithDebt = customerBalances.filter(cb => cb.balance > 0).length;
        
        // 8. DİĞER HESAPLAMALAR
        const avgPrice = totalKg > 0 ? totalSales / totalKg : 0;
        const maxReceived = Math.max(10000, totalReceived * 1.2);
        const receivedProgressPercent = Math.min((totalReceived / maxReceived) * 100, 100);
        const maxStock = Math.max(5000, totalStock * 1.2);
        const stockGaugePercent = Math.min((totalStock / maxStock) * 100, 100);
        const stockStatus = totalStock > 3000 ? 'Yüksek' : totalStock > 1000 ? 'Normal' : 'Düşük';
        
        const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Dashboard verileri hazır: ${totalTime}s`);
        
        return {
            netCash,
            totalReceived,
            totalPaid,
            totalSales,
            avgPrice,
            stockAvailable,
            stockPartial,
            stockFinished,
            customersWithDebt,
            stockStatus,
            cashFlowTrend: calculatedTrend,
            receivedProgressPercent,
            stockGaugePercent
        };
        
    } catch (error) {
        console.error('Enhanced dashboard data error:', error);
        return {
            netCash: 0,
            totalReceived: 0,
            totalPaid: 0,
            totalSales: 0,
            avgPrice: 0,
            stockAvailable: 0,
            stockPartial: 0,
            stockFinished: 0,
            customersWithDebt: 0,
            stockStatus: 'Normal',
            cashFlowTrend: '0%',
            receivedProgressPercent: 0,
            stockGaugePercent: 50
        };
    }
}

// Removed complex animations for simplicity

function showFallbackDashboard() {
    // Show fallback data with zero values
    const fallbackData = {
        '#net-cash': '$0',
        '#total-received': '$0',
        '#total-paid': '$0',
        '#total-stock-kg': '0',
        '#last30-shipment-kg': '0', 
        '#last30-shipment-usd': '$0',
        '#open-receivables': '$0',
        '#net-profit': '$0',
        '#total-sales': '$0',
        '#total-costs': '$0',
        '#monthly-avg-price': '$0/kg',
        '#stock-available': '0',
        '#stock-partial': '0',
        '#stock-finished': '0',
        '#receivables-count': '0 Müşteri'
    };
    
    Object.entries(fallbackData).forEach(([selector, value]) => {
        const element = document.querySelector(selector);
        if (element) element.textContent = value;
    });
    
    const activitiesList = document.getElementById('recent-activities-list');
    if (activitiesList) {
        activitiesList.innerHTML = '<p class="text-center">Veri yüklenirken hata oluştu</p>';
    }
}

// Customers Page
async function loadCustomersPage() {
    try {
        const customers = await CustomerService.getAll();
        
        // Calculate balances for each customer
        const customersWithBalance = await Promise.all(
            customers.map(async customer => ({
                ...customer,
                balance: await CustomerService.getBalance(customer.id)
            }))
        );
        
        // Alacaklar özetini güncelle
        updateCustomersSummary(customersWithBalance);
        
        renderCustomersTable(customersWithBalance);
        
        // Setup search
        const searchInput = document.getElementById('customer-search');
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase();
            const filtered = customersWithBalance.filter(customer =>
                StringUtils.searchMatch(customer.name, query) ||
                StringUtils.searchMatch(customer.phone, query) ||
                StringUtils.searchMatch(customer.email, query)
            );
            renderCustomersTable(filtered);
        });
        
    } catch (error) {
        console.error('Customers page load error:', error);
        Toast.error('Müşteri listesi yüklenirken hata oluştu');
    }
}

// Müşteriler sayfası alacaklar özeti güncelle
function updateCustomersSummary(customers) {
    // Borçlu müşterileri filtrele (bakiye > 0)
    const customersWithDebt = customers.filter(c => (c.balance || 0) > 0);
    
    // Toplam alacak
    const totalReceivables = customersWithDebt.reduce((sum, c) => sum + (c.balance || 0), 0);
    
    // Borçlu müşteri sayısı
    const debtCount = customersWithDebt.length;
    
    // Ortalama borç
    const avgDebt = debtCount > 0 ? totalReceivables / debtCount : 0;
    
    // Kartları güncelle
    const totalEl = document.getElementById('customers-total-receivables');
    if (totalEl) totalEl.textContent = NumberUtils.formatUSD(totalReceivables);
    
    const countEl = document.getElementById('customers-with-debt-count');
    if (countEl) countEl.textContent = debtCount;
    
    const avgEl = document.getElementById('customers-avg-debt');
    if (avgEl) avgEl.textContent = NumberUtils.formatUSD(avgDebt);
}

function renderCustomersTable(customers) {
    const tbody = document.getElementById('customers-table-body');
    
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Müşteri bulunamadı</td></tr>';
        return;
    }
    
    tbody.innerHTML = customers.map(customer => {
        const balanceClass = customer.balance > 0 ? 'balance-positive' : 
                           customer.balance < 0 ? 'balance-negative' : 'balance-zero';
        
        return `
            <tr>
                <td>${customer.name}</td>
                <td>${customer.phone || '-'}</td>
                <td>${customer.email || '-'}</td>
                <td class="${balanceClass}">${NumberUtils.formatUSD(customer.balance)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-btn-view" onclick="showPage('customer-detail', '${customer.id}')">
                            Detay
                        </button>
                        <button class="action-btn action-btn-edit" onclick="editCustomer('${customer.id}')">
                            Düzenle
                        </button>
                        <button class="action-btn action-btn-delete" onclick="deleteCustomer('${customer.id}')">
                            Sil
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Setup table sorting
    setupTableSorting('customers-table', customers, renderCustomersTable);
}

async function editCustomer(customerId) {
    try {
        const customer = await CustomerService.getById(customerId);
        showNewCustomerModal(customer);
    } catch (error) {
        console.error('Edit customer error:', error);
        Toast.error('Müşteri bilgileri yüklenirken hata oluştu');
    }
}

async function deleteCustomer(customerId) {
    try {
        const customer = await CustomerService.getById(customerId);
        showConfirmModal(
            'Müşteri Sil',
            `"${customer.name}" müşterisini silmek istediğinizden emin misiniz?`,
            async () => {
                try {
                    await CustomerService.delete(customerId);
                    Toast.success('Müşteri başarıyla silindi');
                    await loadCustomersPage();
                } catch (error) {
                    console.error('Delete customer error:', error);
                    Toast.error(error.message);
                }
            }
        );
    } catch (error) {
        console.error('Delete customer error:', error);
        Toast.error('Müşteri silinirken hata oluştu');
    }
}

// Customer Detail Page
async function loadCustomerDetail(customerId) {
    try {
        const customer = await CustomerService.getById(customerId);
        if (!customer) {
            Toast.error('Müşteri bulunamadı');
            showPage('customers');
            return;
        }
        
        // Aktif müşteri kimliğini kaydet ve tabloları/sekmeleri resetle
        window.currentCustomerDetailId = customerId;
        try {
            const paymentsTbody = document.getElementById('customer-payments-table');
            if (paymentsTbody) paymentsTbody.innerHTML = '';
            const shipmentsTbody = document.getElementById('customer-shipments-table');
            if (shipmentsTbody) shipmentsTbody.innerHTML = '';
            const tabButtons = document.querySelectorAll('.tab-btn');
            const tabPanes = document.querySelectorAll('.tab-pane');
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            const shipmentsBtn = Array.from(tabButtons).find(b => b.dataset.tab === 'shipments');
            if (shipmentsBtn) shipmentsBtn.classList.add('active');
            const shipmentsPane = document.getElementById('shipments-tab');
            if (shipmentsPane) shipmentsPane.classList.add('active');
        } catch (_) {}

        // Update page title
        DOMUtils.setText('#customer-detail-name', customer.name);
        
        // Load customer summary
        const summary = await CustomerService.getSummary(customerId, 30);
        DOMUtils.setText('#customer-total-balance', NumberUtils.formatUSD(summary.totalBalance));
        DOMUtils.setText('#customer-30d-kg', NumberUtils.formatKg(summary.totalKg));
        DOMUtils.setText('#customer-30d-usd', NumberUtils.formatUSD(summary.totalUsd));
        DOMUtils.setText('#customer-30d-avg', NumberUtils.formatUnitPrice(summary.avgPrice) + '/kg');
        
        // Setup tabs
        setupCustomerTabs(customerId);
        
        // Load default tab (shipments)
        await loadCustomerShipments(customerId);
        
    } catch (error) {
        console.error('Customer detail load error:', error);
        Toast.error('Müşteri detayları yüklenirken hata oluştu');
    }
}

function setupCustomerTabs(customerId) {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const tabName = button.dataset.tab;
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update active tab pane
            tabPanes.forEach(pane => pane.classList.remove('active'));
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            // Load tab content
            try {
                LoadingState.show();
                switch (tabName) {
                    case 'shipments':
                        await loadCustomerShipments(customerId);
                        break;
                    case 'payments':
                        await loadCustomerPayments(customerId);
                        break;
                    case 'statement':
                        await loadCustomerStatement(customerId);
                        break;
                }
            } catch (error) {
                console.error('Tab load error:', error);
                Toast.error('Sekme yüklenirken hata oluştu');
            } finally {
                LoadingState.hide();
            }
        });
    });
}

async function loadCustomerShipments(customerId) {
    try {
        // Verileri al ve cache'le
        const shipments = await ShipmentService.getByCustomerId(customerId);
        window.currentCustomerShipments = shipments;

        // Dönem filtresi UI ayarları
        const periodSelect = document.getElementById('shipments-period-filter');
        const customRange = document.getElementById('custom-date-range');
        const startInput = document.getElementById('shipments-start-date');
        const endInput = document.getElementById('shipments-end-date');

        if (periodSelect && customRange && startInput && endInput && !periodSelect.dataset.bound) {
            periodSelect.addEventListener('change', () => {
                const val = periodSelect.value;
                customRange.classList.toggle('hidden', val !== 'custom');
                renderCustomerShipmentsWithFilters();
            });
            const onDateChange = () => renderCustomerShipmentsWithFilters();
            startInput.addEventListener('change', onDateChange);
            endInput.addEventListener('change', onDateChange);
            periodSelect.dataset.bound = 'true';
        }

        renderCustomerShipmentsWithFilters();
    } catch (error) {
        console.error('Customer shipments load error:', error);
        Toast.error('Sevk listesi yüklenirken hata oluştu');
    }
}

function renderCustomerShipmentsWithFilters() {
    const tbody = document.getElementById('customer-shipments-table');
    const list = Array.isArray(window.currentCustomerShipments) ? window.currentCustomerShipments : [];

    // Filtreleri oku
    const periodSelect = document.getElementById('shipments-period-filter');
    const startInput = document.getElementById('shipments-start-date');
    const endInput = document.getElementById('shipments-end-date');

    let filtered = [...list];
    if (periodSelect) {
        const val = periodSelect.value;
        if (val === 'custom' && startInput?.value && endInput?.value) {
            const start = new Date(startInput.value);
            const end = new Date(endInput.value);
            // Gün sonunu dahile al
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(s => DateUtils.isInRange(s.date, start, end));
        } else if (val !== 'all') {
            const days = parseInt(val || '30', 10);
            const cutoff = DateUtils.getDaysAgo(days);
            filtered = filtered.filter(s => new Date(s.date) >= cutoff);
        }
    }

    // Özet metrikleri (USD toplamı, KG ve ortalama fiyat) filtreye göre güncelle
    let totalKg = 0;
    let totalUsd = 0;
    let weightedSum = 0;
    filtered.forEach(shipment => {
        shipment.lines?.forEach(line => {
            const kg = NumberUtils.parseNumber(line.kg) || 0;
            const unitUsd = NumberUtils.parseNumber(line.unitUsd) || 0;
            const lineTotalUsd = NumberUtils.parseNumber(line.lineTotalUsd) || NumberUtils.round(kg * unitUsd, 2);
            totalKg += kg;
            totalUsd += lineTotalUsd;
            weightedSum += kg * unitUsd;
        });
    });
    const avgPrice = totalKg > 0 ? NumberUtils.round(weightedSum / totalKg, 4) : 0;
    // Müşteri detay özet widget'ını güncelle
    DOMUtils.setText('#customer-30d-kg', NumberUtils.formatKg(totalKg));
    DOMUtils.setText('#customer-30d-usd', NumberUtils.formatUSD(totalUsd));
    DOMUtils.setText('#customer-30d-avg', NumberUtils.formatUnitPrice(avgPrice) + '/kg');

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Sevk bulunamadı</td></tr>';
        return;
    }

    // KDV sütunlarını göster/gizle
    const hasVat = filtered.some(shipment => shipment.calculateVat);
    const vatColumns = document.querySelectorAll('.vat-column');
    vatColumns.forEach(col => {
        col.style.display = hasVat ? '' : 'none';
    });

    // TL karşılığı sütununu göster/gizle
    const hasTry = filtered.some(shipment => shipment.showTryInReceipt);
    const tryColumns = document.querySelectorAll('.try-column');
    tryColumns.forEach(col => {
        col.style.display = hasTry ? '' : 'none';
    });

    // Tarihe göre azalan sırala
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = filtered.map(shipment => {
        return shipment.lines?.map(line => `
            <tr>
                <td>${DateUtils.formatDate(shipment.date)}</td>
                <td>${line.productName}</td>
                <td>${line.party}</td>
                <td>${NumberUtils.formatKg(line.kg)}</td>
                <td>${line.tops || 0}</td>
                <td>${NumberUtils.formatUnitPrice(line.unitUsd)}</td>
                <td>${NumberUtils.formatUSD(line.lineTotalUsd)}</td>
                ${shipment.calculateVat ? `<td>${NumberUtils.formatTRY(line.vatTry || 0)}</td>` : ''}
                ${shipment.showTryInReceipt ? `<td>${NumberUtils.formatTRY(line.lineTotalTry || 0)}</td>` : ''}
                <td>${NumberUtils.formatTRY(shipment.calculateVat ? (line.totalWithVatTry || line.lineTotalTry || 0) : (line.lineTotalTry || 0))}</td>
                <td>
                    <button class="action-btn action-btn-view" onclick="printShipmentReceipt('${shipment.id}')">
                        Makbuz
                    </button>
                </td>
            </tr>
        `).join('') || `
            <tr>
                <td>${DateUtils.formatDate(shipment.date)}</td>
                <td colspan="${(shipment.calculateVat ? 1 : 0) + (shipment.showTryInReceipt ? 1 : 0) + 6}">Sevk detayı bulunamadı</td>
                <td>
                    <button class="action-btn action-btn-view" onclick="printShipmentReceipt('${shipment.id}')">
                        Makbuz
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function loadCustomerPayments(customerId) {
    try {
        const tbody = document.getElementById('customer-payments-table');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Yükleniyor...</td></tr>';
        }
        const requestedCustomerId = customerId;
        const payments = await PaymentService.getByCustomerId(requestedCustomerId);
        if (window.currentCustomerDetailId && window.currentCustomerDetailId !== requestedCustomerId) {
            return; // farklı müşteriye geçilmiş, bu sonucu yansıtma
        }
        
        const safeTbody = document.getElementById('customer-payments-table');
        const tbodyRef = safeTbody || tbody;
        
        if (payments.length === 0) {
            if (tbodyRef) tbodyRef.innerHTML = '<tr><td colspan="6" class="text-center">Tahsilat bulunamadı</td></tr>';
            return;
        }
        
        if (!tbodyRef) return;
        tbodyRef.innerHTML = payments.map(payment => `
            <tr>
                <td>${DateUtils.formatDate(payment.date)}</td>
                <td>${NumberUtils.formatUSD(payment.amountUsd)}</td>
                <td>${payment.method || '-'}</td>
                <td>${payment.note || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-btn-print" onclick="fastPrintPaymentReceipt('${payment.id}', '${customerId}')">
                            Makbuz
                        </button>
                        <button class="action-btn action-btn-edit" onclick="editPayment('${payment.id}')">
                            Düzenle
                        </button>
                        <button class="action-btn action-btn-delete" onclick="deletePayment('${payment.id}')">
                            Sil
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Customer payments load error:', error);
        Toast.error('Tahsilat listesi yüklenirken hata oluştu');
    }
}

// Hızlı tahsilat makbuzu yazdırma
async function fastPrintPaymentReceipt(paymentId, customerId) {
    try {
        console.log('🖨️ Hızlı tahsilat makbuzu yazdırılıyor:', paymentId);
        
        const payment = await PaymentService.getById(paymentId);
        if (!payment) {
            Toast.error('Tahsilat bulunamadı');
            return;
        }
        
        const customer = await CustomerService.getById(customerId);
        const companyName = await window.db.getSetting('companyName', 'Kumaş Stok Yönetimi');
        
        const currentDate = new Date();
        const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}.${(currentDate.getMonth() + 1).toString().padStart(2, '0')}.${currentDate.getFullYear()} ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
        
        // Yeni sekme açarak yazdırma - HEMEN!
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (!printWindow) {
            Toast.error('Popup engelleyici aktif. Lütfen popup\'ları etkinleştirin.');
            return;
        }
        
        const fullHtml = `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
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
                        color: #2563eb;
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
                        background-color: #dbeafe;
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
                </style>
            </head>
            <body>
                <div class="printable payment-receipt">
                    <div class="print-header">
                        <h1>${companyName}</h1>
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
                            <span>#${payment.id.toString().substr(-8).toUpperCase()}</span>
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
                    
                    <div style="text-align: center; margin-top: 20pt; font-size: 8pt; color: #666;">
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
        
        Toast.success('Tahsilat makbuzu hazırlandı');
        
    } catch (error) {
        console.error('Hızlı makbuz yazdırma hatası:', error);
        Toast.error('Makbuz yazdırılırken hata oluştu');
    }
}

async function loadCustomerStatement(customerId) {
    try {
        const ledger = await CustomerService.getLedger(customerId);
        const tbody = document.getElementById('customer-statement-table');
        
        if (ledger.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Hareket bulunamadı</td></tr>';
            return;
        }
        
        tbody.innerHTML = ledger.map(entry => {
            const balanceClass = entry.balance > 0 ? 'balance-positive' : 
                               entry.balance < 0 ? 'balance-negative' : 'balance-zero';
            
            return `
                <tr>
                    <td>${DateUtils.formatDate(entry.date)}</td>
                    <td>${entry.description}</td>
                    <td>${entry.debit > 0 ? NumberUtils.formatUSD(entry.debit) : '-'}</td>
                    <td>${entry.credit > 0 ? NumberUtils.formatUSD(entry.credit) : '-'}</td>
                    <td class="${balanceClass}">${NumberUtils.formatUSD(entry.balance)}</td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Customer statement load error:', error);
        Toast.error('Ekstre yüklenirken hata oluştu');
    }
}

// Inventory Page
async function loadInventoryPage() {
    try {
        const lots = await InventoryService.getAll();
        const products = await ProductService.getAll();
        
        // Aktif stok (Bitti olmayan)
        const activeLots = lots.filter(lot => lot.status !== 'Bitti');
        renderInventoryTable(activeLots);
        
        // Populate product filters
        const productFilter = document.getElementById('inventory-product-filter');
        const finishedProductFilter = document.getElementById('finished-inventory-product-filter');
        
        const productOptions = '<option value="">Tüm Ürünler</option>' +
            products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        
        productFilter.innerHTML = productOptions;
        if (finishedProductFilter) {
        finishedProductFilter.innerHTML = productOptions;
        }
        
        // Setup search and filters (tüm lotlar üzerinde çalışsın)
        setupInventoryFilters(lots);
        
        // Setup tabs
        setupInventoryTabs();
        
        // Bitti kumaşları sadece sekme değiştiğinde yükle
        const finishedLots = lots.filter(lot => lot.status === 'Bitti');
        setupFinishedInventoryFilters(finishedLots);
        
    } catch (error) {
        console.error('Inventory page load error:', error);
        Toast.error('Stok listesi yüklenirken hata oluştu');
    }
}

function renderInventoryTable(lots) {
    const tbody = document.getElementById('inventory-table-body');
    
    if (lots.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Parti bulunamadı</td></tr>';
        return;
    }
    
    // Gruplama: ürün (kumaş türü) bazında
    const groups = ArrayUtils.groupBy(lots, 'productId');

    // Grupları ürün adına göre sırala
    const groupEntries = Object.entries(groups).sort((a, b) => {
        const aName = a[1][0]?.productName || '';
        const bName = b[1][0]?.productName || '';
        return StringUtils.normalizeText(aName).localeCompare(StringUtils.normalizeText(bName));
    });

    const rowsHtml = groupEntries.map(([productId, groupLots], groupIndex) => {
        const productName = groupLots[0]?.productName || 'Bilinmeyen Ürün';
        const totalKg = NumberUtils.formatKg(groupLots.reduce((sum, l) => sum + (l.remainingKg || 0), 0));
        const lotCount = groupLots.length;
        const groupId = `g-${productId}`;

        // Lotları tarihine göre sıralı göster (eski → yeni)
        const sortedGroupLots = [...groupLots].sort((a, b) => new Date(a.date) - new Date(b.date));

        const lotRows = sortedGroupLots.map(lot => {
            const statusClass = `status-${lot.status.toLowerCase().replace('ı', 'i')}`;
        return `
                <tr data-group="${groupId}">
                <td>${lot.productName}</td>
                <td>${lot.party}</td>
                <td>${lot.color || '-'}</td>
                <td>${lot.location || '-'}</td>
                <td>
                    ${NumberUtils.formatKg(lot.remainingKg)}
                    <div class="sub-muted">Top: ${lot.avgKgPerRoll > 0 ? Math.floor(lot.remainingKg / lot.avgKgPerRoll) : (lot.remainingTops ?? lot.rolls ?? '-')}</div>
                </td>
                <td><span class="status-badge ${statusClass}">${lot.status}</span></td>
                <td>${DateUtils.formatDate(lot.date)}</td>
                <td>
                    <div class="action-buttons">
                            <button class="action-btn" onclick="showLotHistory('${lot.id}')">Geçmiş</button>
                            <button class="action-btn action-btn-edit" onclick="editLot('${lot.id}')">Düzenle</button>
                            <button class="action-btn action-btn-delete" onclick="deleteLot('${lot.id}')">Sil</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
        // Grup başlığı satırı
        const headerRow = `
            <tr class="group-header" data-group-header="${groupId}">
                <td colspan="8">
                    <button class="group-toggle" data-group-toggle="${groupId}" aria-expanded="true">
                        <span class="toggle-icon">▾</span>
                        <span class="group-title">${productName}</span>
                    </button>
                    <span class="group-meta">Toplam: <strong>${totalKg}</strong> • Parti: <strong>${lotCount}</strong></span>
                </td>
            </tr>
        `;

        return headerRow + lotRows;
    }).join('');

    tbody.innerHTML = rowsHtml;

    // Grup daralt/aç davranışı
    tbody.querySelectorAll('[data-group-toggle]').forEach(btn => {
        btn.addEventListener('click', () => {
            const groupId = btn.getAttribute('data-group-toggle');
            const expanded = btn.getAttribute('aria-expanded') === 'true';
            const rows = tbody.querySelectorAll(`tr[data-group="${groupId}"]`);
            rows.forEach(row => row.style.display = expanded ? 'none' : '');
            btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
            const icon = btn.querySelector('.toggle-icon');
            if (icon) icon.textContent = expanded ? '▸' : '▾';
        });
    });

    // Tablo sıralamayı aktif tut (gruplu liste ile yeniden render edilecektir)
    setupTableSorting('inventory-table', lots, renderInventoryTable);
}

// Parti sevk geçmişi modalı
async function showLotHistory(lotId) {
    try {
        const lot = await InventoryService.getById(lotId);

        if (!lot) {
            Toast.error('Parti bulunamadı');
            return;
        }

        const shipments = await ShipmentService.getAll();
        const related = [];

        shipments.forEach(shipment => {
            shipment.lines?.forEach(line => {
                if (line.lotId === lotId) {
                    related.push({
                        date: shipment.date,
                        customerName: shipment.customerName,
                        kg: line.kg || 0,
                        tops: line.tops || 0,
                        unitUsd: line.unitUsd || 0,
                        totalUsd: (line.kg || 0) * (line.unitUsd || 0)
                    });
                }
            });
        });

        // Tarihe göre yeni → eski
        related.sort((a, b) => new Date(b.date) - new Date(a.date));

        const rowsHtml = related.length === 0
            ? '<tr><td colspan="6" class="text-center">Bu partiden sevk bulunmuyor</td></tr>'
            : related.map(r => `
                <tr>
                    <td>${DateUtils.formatDate(r.date)}</td>
                    <td>${r.customerName || '-'}</td>
                    <td class="text-right">${NumberUtils.formatKg(r.kg)}</td>
                    <td class="text-right">${r.tops || 0}</td>
                    <td class="text-right">${NumberUtils.formatUSD(r.unitUsd)}</td>
                    <td class="text-right">${NumberUtils.formatUSD(NumberUtils.round(r.totalUsd, 2))}</td>
                </tr>
            `).join('');

        const modalHtml = `
            <div class="modal-overlay">
                <div class="modal" style="width: 800px;">
                    <div class="modal-header">
                        <h3>Sevk Geçmişi - ${lot.productName} / ${lot.party}</h3>
                        <button class="modal-close" onclick="ModalManager.hide()">×</button>
                    </div>
                    <div class="modal-content">
                        <div class="simple-summary" style="margin-bottom:12px;">
                            <div class="summary-row">
                                <div class="summary-item">
                                    <span class="label">Toplam Gönderilen</span>
                                    <span class="amount">${NumberUtils.formatKg(related.reduce((s, r) => s + (r.kg || 0), 0))}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">Toplam Top</span>
                                    <span class="amount">${related.reduce((s, r) => s + (r.tops || 0), 0)}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">Kalan</span>
                                    <span class="amount">${NumberUtils.formatKg(lot.remainingKg || 0)}</span>
                                </div>
                            </div>
                        </div>
                        <table class="table" id="lot-history-table">
                            <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Müşteri</th>
                                    <th class="text-right">KG</th>
                                    <th class="text-right">Top</th>
                                    <th class="text-right">Birim Fiyat</th>
                                    <th class="text-right">Tutar</th>
                                </tr>
                            </thead>
                            <tbody>${rowsHtml}</tbody>
                        </table>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="ModalManager.hide()">Kapat</button>
                    </div>
                </div>
            </div>
        `;

        ModalManager.show(modalHtml);
    } catch (error) {
        console.error('Lot history error:', error);
        Toast.error('Sevk geçmişi yüklenirken hata oluştu');
    }
}

window.showLotHistory = showLotHistory;

// Bitti kumaşlar tablosunu render et
async function renderFinishedInventoryTable(finishedLots) {
    const tbody = document.getElementById('finished-inventory-table-body');
    
    if (finishedLots.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Bitti kumaş bulunamadı</td></tr>';
        return;
    }
    
    // Sevk verilerini al
    const shipments = await ShipmentService.getAll();
    
    const rowsHtml = finishedLots.map(async (lot) => {
        // Bu parti için sevkleri bul
        const lotShipments = shipments.filter(shipment => 
            shipment.lines?.some(line => line.lotId === lot.id)
        );
        
        // Müşteri isimlerini al
        const customerNames = [...new Set(lotShipments.map(s => s.customerName))].join(', ');
        
        // Toplam sevk edilen kg
        const totalShippedKg = lotShipments.reduce((sum, shipment) => {
            return sum + shipment.lines
                .filter(line => line.lotId === lot.id)
                .reduce((lineSum, line) => lineSum + (line.kg || 0), 0);
        }, 0);
        
        // Bitiş tarihi (son sevk tarihi)
        const lastShipmentDate = lotShipments.length > 0 
            ? Math.max(...lotShipments.map(s => new Date(s.date)))
            : new Date(lot.date);
        
        return `
            <tr>
                <td>${lot.productName}</td>
                <td>${lot.party}</td>
                <td>${lot.color || '-'}</td>
                <td>${NumberUtils.formatKg(lot.totalKg)}</td>
                <td>${DateUtils.formatDate(lastShipmentDate)}</td>
                <td>${NumberUtils.formatKg(totalShippedKg)}</td>
                <td>${customerNames || '-'}</td>
            </tr>
        `;
    });
    
    // Promise'ları çöz
    const resolvedRows = await Promise.all(rowsHtml);
    tbody.innerHTML = resolvedRows.join('');
}

function setupInventoryFilters(allLots) {
    const searchInput = document.getElementById('inventory-search');
    const productFilter = document.getElementById('inventory-product-filter');
    const statusFilter = document.getElementById('inventory-status-filter');
    
    function applyFilters() {
        let filtered = allLots;
        
        // Search filter
        const searchQuery = searchInput.value.toLowerCase();
        if (searchQuery) {
            filtered = filtered.filter(lot =>
                StringUtils.searchMatch(lot.productName, searchQuery) ||
                StringUtils.searchMatch(lot.party, searchQuery) ||
                StringUtils.searchMatch(lot.color, searchQuery) ||
                StringUtils.searchMatch(lot.location, searchQuery)
            );
        }
        
        // Product filter
        const selectedProduct = productFilter.value;
        if (selectedProduct) {
            filtered = filtered.filter(lot => lot.productId === selectedProduct);
        }
        
        // Status filter (Bitti'yi varsayılan olarak dışla, sadece "Bitti" seçilince göster)
        const selectedStatus = statusFilter.value;
        if (selectedStatus === 'Bitti') {
            filtered = filtered.filter(lot => lot.status === 'Bitti');
        } else {
            // Varsayılan ve diğer tüm durumlarda Bitti'leri gösterme
            filtered = filtered.filter(lot => lot.status !== 'Bitti');
            if (selectedStatus) {
                filtered = filtered.filter(lot => lot.status === selectedStatus);
            }
        }
        
        renderInventoryTable(filtered);
    }
    
    searchInput.addEventListener('input', applyFilters);
    productFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
}

// Bitti kumaşlar için filter setup
function setupFinishedInventoryFilters(allFinishedLots) {
    const searchInput = document.getElementById('finished-inventory-search');
    const productFilter = document.getElementById('finished-inventory-product-filter');
    if (!searchInput || !productFilter) {
        // Finished inventory UI yoksa sessizce çık
        return;
    }
    
    function applyFilters() {
        let filtered = allFinishedLots;
        
        // Search filter
        const searchQuery = searchInput.value.toLowerCase();
        if (searchQuery) {
            filtered = filtered.filter(lot =>
                StringUtils.searchMatch(lot.productName, searchQuery) ||
                StringUtils.searchMatch(lot.party, searchQuery) ||
                StringUtils.searchMatch(lot.color, searchQuery)
            );
        }
        
        // Product filter
        const selectedProduct = productFilter.value;
        if (selectedProduct) {
            filtered = filtered.filter(lot => lot.productId === selectedProduct);
        }
        
        renderFinishedInventoryTable(filtered);
    }
    
    searchInput.addEventListener('input', applyFilters);
    productFilter.addEventListener('change', applyFilters);
}

// Inventory tab yönetimi
function setupInventoryTabs() {
    const tabButtons = document.querySelectorAll('.inventory-tabs .tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Aktif tab'ı değiştir
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Tab içeriğini göster/gizle
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab + '-tab') {
                    content.classList.add('active');
                }
            });
            
            // Bitti kumaşlar sekmesi seçildiyse tabloyu render et
            if (targetTab === 'finished-inventory') {
                const lots = await InventoryService.getAll();
                const finishedLots = lots.filter(lot => lot.status === 'Bitti');
                await renderFinishedInventoryTable(finishedLots);
            }
        });
    });
}

async function editLot(lotId) {
    try {
        console.log('✏️ editLot çağrıldı:', lotId);
        
        const lot = await InventoryService.getById(lotId);
        console.log('📦 Bulunan lot verisi:', lot);
        
        if (!lot) {
            throw new Error('Parti bulunamadı');
        }
        
        await showNewLotModal(lot);
        console.log('✅ Modal açıldı');
        
    } catch (error) {
        console.error('❌ Edit lot error:', error);
        Toast.error('Parti bilgileri yüklenirken hata oluştu: ' + error.message);
    }
}

async function deleteLot(lotId) {
    try {
        const lot = await InventoryService.getById(lotId);
        showConfirmModal(
            'Parti Sil',
            `"${lot.party}" partisini silmek istediğinizden emin misiniz?`,
            async () => {
                try {
                    await InventoryService.delete(lotId);
                    Toast.success('Parti başarıyla silindi');
                    await loadInventoryPage();
                } catch (error) {
                    console.error('Delete lot error:', error);
                    Toast.error(error.message);
                }
            }
        );
    } catch (error) {
        console.error('Delete lot error:', error);
        Toast.error('Parti silinirken hata oluştu');
    }
}

// Shipments Page
async function loadShipmentsPage() {
    try {
        // Setup filters
        await setupShipmentsFilters();
        
        // Load shipments
        await loadShipments();
        
    } catch (error) {
        console.error('Shipments page load error:', error);
        Toast.error('Sevkler sayfası yüklenirken hata oluştu');
    }
}

async function setupShipmentsFilters() {
    try {
        // Load customers for filter
        const customers = await CustomerService.getAll();
        const customerFilter = document.getElementById('shipments-customer-filter');
        
        // Clear existing options (keep "Tüm Müşteriler")
        customerFilter.innerHTML = '<option value="">Tüm Müşteriler</option>';
        
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            customerFilter.appendChild(option);
        });
        
        // Add event listeners for filters
        document.getElementById('shipments-search').addEventListener('input', filterShipments);
        document.getElementById('shipments-customer-filter').addEventListener('change', filterShipments);
        document.getElementById('shipments-period-filter').addEventListener('change', filterShipments);
        
    } catch (error) {
        console.error('Setup shipments filters error:', error);
    }
}

async function loadShipments() {
    try {
        const [shipments, customers, products] = await Promise.all([
            ShipmentService.getAll(),
            CustomerService.getAll(),
            ProductService.getAll()
        ]);
        
        // Enrich shipments with customer names and fabric info
        const enrichedShipments = shipments.map(shipment => {
            const customer = customers.find(c => c.id === shipment.customerId);
            
            // Get fabric names from shipment lines
            const fabricNames = [...new Set(
                shipment.lines?.map(line => {
                    const product = products.find(p => p.id === line.productId);
                    return product ? product.name : 'Bilinmeyen Kumaş';
                }) || []
            )];
            
            return {
                ...shipment,
                customerName: customer ? customer.name : 'Bilinmeyen Müşteri',
                fabricNames: fabricNames.join(', ') || '-'
            };
        });
        
        // Store for filtering
        window.allShipments = enrichedShipments;
        renderShipments(enrichedShipments);
        
    } catch (error) {
        console.error('Load shipments error:', error);
        Toast.error('Sevkler yüklenirken hata oluştu');
    }
}

function renderShipments(shipments) {
    const tbody = document.getElementById('shipments-table-body');
    
    if (shipments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Sevk bulunamadı</td></tr>';
        return;
    }
    
    // Sort by date descending
    shipments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = shipments.map(shipment => {
        const shortId = shipment.id.substr(-8).toUpperCase();
        const totalKg = shipment.totals?.totalKg || 0;
        const totalUsd = shipment.totals?.totalUsd || 0;
        
        return `
            <tr data-customer-id="${shipment.customerId}">
                <td>#${shortId}</td>
                <td>${DateUtils.formatDate(shipment.date)}</td>
                <td>${shipment.customerName}</td>
                <td class="fabric-names">${shipment.fabricNames}</td>
                <td>${NumberUtils.formatKg(totalKg)}</td>
                <td>${NumberUtils.formatUSD(totalUsd)}</td>
                <td>${shipment.note || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-btn-edit" onclick="showEditShipmentModal('${shipment.id}')">
                            Düzenle
                        </button>
                        <button class="action-btn action-btn-view" onclick="viewShipmentDetails('${shipment.id}')">
                            Detay
                        </button>
                        <button class="action-btn action-btn-print" onclick="printShipmentReceipt('${shipment.id}')">
                            Yazdır
                        </button>
                        <button class="action-btn action-btn-delete" onclick="deleteShipment('${shipment.id}')">
                            Sil
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterShipments() {
    if (!window.allShipments) return;
    
    const searchTerm = document.getElementById('shipments-search').value.toLowerCase();
    const customerFilter = document.getElementById('shipments-customer-filter').value;
    const periodFilter = document.getElementById('shipments-period-filter').value;
    
    let filteredShipments = window.allShipments.filter(shipment => {
        // Search filter - sevk no, müşteri, kumaş adı, not
        const matchesSearch = !searchTerm || 
            shipment.id.toLowerCase().includes(searchTerm) ||
            shipment.customerName.toLowerCase().includes(searchTerm) ||
            shipment.fabricNames.toLowerCase().includes(searchTerm) ||
            (shipment.note && shipment.note.toLowerCase().includes(searchTerm));
        
        // Customer filter
        const matchesCustomer = !customerFilter || shipment.customerId === customerFilter;
        
        // Period filter
        let matchesPeriod = true;
        if (periodFilter !== 'all') {
            const shipmentDate = new Date(shipment.date);
            const daysAgo = parseInt(periodFilter);
            const cutoffDate = DateUtils.getDaysAgo(daysAgo);
            matchesPeriod = shipmentDate >= cutoffDate;
        }
        
        return matchesSearch && matchesCustomer && matchesPeriod;
    });
    
    renderShipments(filteredShipments);
}

async function viewShipmentDetails(shipmentId) {
    try {
        const shipment = await ShipmentService.getById(shipmentId);
        if (!shipment) {
            Toast.error('Sevk bulunamadı');
            return;
        }
        
        const customer = await CustomerService.getById(shipment.customerId);
        const customerName = customer ? customer.name : 'Bilinmeyen Müşteri';
        
        let detailsHtml = `
            <h4>Sevk Detayları</h4>
            <p><strong>Sevk No:</strong> #${shipment.id.substr(-8).toUpperCase()}</p>
            <p><strong>Müşteri:</strong> ${customerName}</p>
            <p><strong>Tarih:</strong> ${DateUtils.formatDate(shipment.date)}</p>
            <p><strong>Not:</strong> ${shipment.note || '-'}</p>
            <h5>Sevk Satırları:</h5>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Ürün</th>
                        <th>Parti</th>
                        <th>Kg</th>
                        <th>Top Adedi</th>
                        <th>Birim Fiyat</th>
                        <th>Toplam USD</th>
                        ${shipment.lines?.some(line => line.lineTotalTry > 0) ? '<th>TL Karşılığı</th>' : ''}
                    </tr>
                </thead>
                <tbody>
        `;
        
        shipment.lines.forEach(line => {
            detailsHtml += `
                <tr>
                    <td>${line.productName}</td>
                    <td>${line.party}</td>
                    <td>${NumberUtils.formatKg(line.kg)}</td>
                    <td>${line.tops || 0}</td>
                    <td>${NumberUtils.formatUSD(line.unitUsd)}</td>
                    <td>${NumberUtils.formatUSD(line.lineTotalUsd)}</td>
                    ${shipment.lines?.some(l => l.lineTotalTry > 0) ? `<td>${line.lineTotalTry > 0 ? NumberUtils.formatTRY(line.lineTotalTry) : '-'}</td>` : ''}
                </tr>
            `;
        });
        
        detailsHtml += `
                </tbody>
            </table>
            <p><strong>Toplam Kg:</strong> ${NumberUtils.formatKg(shipment.totals?.totalKg || 0)}</p>
            <p><strong>Toplam USD:</strong> ${NumberUtils.formatUSD(shipment.totals?.totalUsd || 0)}</p>
            ${shipment.lines?.some(line => line.lineTotalTry > 0) ? `<p><strong>Toplam TL Karşılığı:</strong> ${NumberUtils.formatTRY(shipment.lines.reduce((sum, line) => sum + (line.lineTotalTry || 0), 0))}</p>` : ''}
        `;
        
        Toast.info(detailsHtml, 10000); // Show for 10 seconds
        
    } catch (error) {
        console.error('View shipment details error:', error);
        Toast.error('Sevk detayları gösterilirken hata oluştu');
    }
}

async function deleteShipment(shipmentId) {
    try {
        console.log('🗑️ Sevk silme işlemi başlatıldı:', shipmentId);
        
        // Sevk detaylarını al
        const shipment = await ShipmentService.getById(shipmentId);
        if (!shipment) {
            console.error('❌ Sevk bulunamadı:', shipmentId);
            Toast.error('Sevk bulunamadı');
            return;
        }

        console.log('📦 Sevk bulundu:', shipment);

        const shortId = shipmentId.substr(-8).toUpperCase();
        const totalUsd = shipment.totals?.totalUsd || 0;
        const totalKg = shipment.totals?.totalKg || 0;

        console.log('💬 Onay modalı gösteriliyor...');
        const confirmed = await confirmActionAsync(
            'Sevk Sil',
            `Sevk #${shortId} silinecek ve aşağıdaki işlemler yapılacak:
            
• ${NumberUtils.formatKg(totalKg)} stok geri eklenecek
• ${NumberUtils.formatUSD(totalUsd)} müşteri bakiyesinden düşülecek
• Tüm parti stok miktarları güncellenecek

Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?`,
            'Evet, Sil',
            'İptal'
        );
        
        console.log('✅ Kullanıcı onayı:', confirmed);
        
        if (!confirmed) {
            console.log('❌ İşlem kullanıcı tarafından iptal edildi');
            return;
        }
        
        // Loading göster
        LoadingState.show();
        console.log('⏳ Sevk silme işlemi başlatılıyor...');
        
        await ShipmentService.delete(shipmentId);
        console.log('🎉 Sevk başarıyla silindi!');
        
        Toast.success(`Sevk #${shortId} başarıyla silindi ve tüm etkiler geri alındı`);
        
        // Sayfaları yenile
        console.log('🔄 Sayfalar yenileniyor...');
        await loadShipments();
        
        // Dashboard güncel kalsın
        if (document.getElementById('dashboard-page').classList.contains('active')) {
            await loadDashboard();
        }
        
        console.log('✅ Sevk silme işlemi tamamlandı');
        
    } catch (error) {
        console.error('❌ Delete shipment error:', error);
        Toast.error('Sevk silinirken hata oluştu: ' + error.message);
    } finally {
        LoadingState.hide();
    }
}

// Suppliers Page
async function loadSuppliersPage() {
    try {
        const suppliers = await SupplierService.getAll();
        const tbody = document.getElementById('suppliers-table-body');
        
        if (!tbody) {
            console.warn('Suppliers table body not found');
            return;
        }
        
        if (suppliers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Henüz tedarikçi eklenmemiş</td></tr>';
            updateTotalSupplierDebt([]);
            return;
        }
        
        // Her tedarikçi için borç hesapla
        const suppliersWithDebt = await Promise.all(suppliers.map(async (supplier) => {
            const totalDebt = await calculateSupplierDebt(supplier.id);
            const totalPaid = await calculateSupplierPaid(supplier.id);
            const outstanding = totalDebt - totalPaid;
            
            // Para birimi belirleme: iplik ve örme USD, boyahane TL
            const isUSD = supplier.type === 'iplik' || supplier.type === 'orme';
            
            return {
                ...supplier,
                totalDebt,
                totalPaid,
                outstanding,
                isUSD
            };
        }));
        
        tbody.innerHTML = suppliersWithDebt.map(supplier => {
            const typeNames = {
                'iplik': 'İplikçi',
                'orme': 'Örme',
                'boyahane': 'Boyahane'
            };
            
            // Para birimine göre formatlama
            const formatAmount = supplier.isUSD ? NumberUtils.formatUSD : NumberUtils.formatTRY;
            const currencyBadge = supplier.isUSD 
                ? '<span class="currency-badge usd">USD</span>' 
                : '<span class="currency-badge try">TL</span>';
            
            return `
                <tr>
                    <td>
                        <a href="#supplier-detail" onclick="showSupplierDetail('${supplier.id}'); return false;" class="supplier-link">
                            ${supplier.name}
                        </a>
                    </td>
                    <td>${typeNames[supplier.type] || supplier.type}</td>
                    <td>${currencyBadge}</td>
                    <td>${formatAmount(supplier.totalDebt)}</td>
                    <td>${formatAmount(supplier.totalPaid)}</td>
                    <td class="${supplier.outstanding > 0 ? 'text-danger' : 'text-success'}">
                        ${formatAmount(supplier.outstanding)}
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn action-btn-edit" onclick="showSupplierDetail('${supplier.id}')">
                                Detay
                            </button>
                            <button class="action-btn action-btn-delete" onclick="deleteSupplier('${supplier.id}')">
                                Sil
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Toplam borç güncelle
        updateTotalSupplierDebt(suppliersWithDebt);
        
    } catch (error) {
        console.error('Suppliers load error:', error);
        Toast.error('Tedarikçiler yüklenirken hata oluştu');
    }
}



// Tedarikçi ödemesi sil
async function deleteSupplierPayment(paymentId) {
    try {
        if (!confirm('Bu ödemeyi silmek istediğinizden emin misiniz?')) {
            return;
        }
        
        LoadingState.show();
        
        // Ödemeyi sil
        await db.delete('supplierPayments', paymentId);
        
        // Dashboard cache'ini temizle
        DashboardCache.clear();
        
        // Sayfayı yenile
        await loadSuppliersPage();
        
        Toast.success('Ödeme başarıyla silindi');
        
    } catch (error) {
        console.error('Delete supplier payment error:', error);
        Toast.error('Ödeme silinirken hata oluştu');
    } finally {
        LoadingState.hide();
    }
}

// Tedarikçi detay sayfası
// Tedarikçi butonlarını güncelle (yeniden kullanılabilir fonksiyon)
async function updateSupplierButtons(supplierType) {
    // Eğer supplierType yoksa, mevcut tedarikçiden al
    if (!supplierType && window.currentSupplierId) {
        try {
            const supplier = await SupplierService.getById(window.currentSupplierId);
            if (supplier) {
                supplierType = supplier.type;
                console.log('🔄 updateSupplierButtons: Tip DB\'den alındı:', supplierType);
            }
        } catch (e) {
            console.warn('Tedarikçi tipi alınamadı:', e);
        }
    }
    
    // Butonları al - DOM henüz hazır olmayabilir, kontrol et
    const rawMaterialBtn = document.getElementById('btn-raw-material-shipment');
    const yarnShipmentBtn = document.getElementById('btn-yarn-shipment');
    const supplierPriceListBtn = document.getElementById('btn-supplier-price-list');
    const yarnPriceListBtn = document.getElementById('btn-yarn-price-list');
    const yarnTypesBtn = document.getElementById('btn-yarn-types');
    
    // Butonların hiçbiri bulunamazsa çık (DOM hazır değil)
    if (!rawMaterialBtn && !yarnShipmentBtn && !supplierPriceListBtn && !yarnPriceListBtn) {
        console.warn('⚠️ updateSupplierButtons: Butonlar DOM\'da bulunamadı');
        return;
    }
    
    if (!supplierType) {
        // Tedarikçi tipi yoksa tüm butonları gizle
        if (rawMaterialBtn) rawMaterialBtn.style.display = 'none';
        if (yarnShipmentBtn) yarnShipmentBtn.style.display = 'none';
        if (supplierPriceListBtn) supplierPriceListBtn.style.display = 'inline-flex';
        if (yarnPriceListBtn) yarnPriceListBtn.style.display = 'none';
        if (yarnTypesBtn) yarnTypesBtn.style.display = 'none';
        console.log('⚠️ updateSupplierButtons: Tip bilinmiyor, varsayılan butonlar gösteriliyor');
        return;
    }
    
    console.log('🔧 updateSupplierButtons çalışıyor, tip:', supplierType);
    
    // Ham kumaş gönder butonunu göster (sadece örme tedarikçileri için)
    if (rawMaterialBtn) {
        rawMaterialBtn.style.display = supplierType === 'orme' ? 'inline-flex' : 'none';
    }
    
    // İplik girişi butonunu göster (sadece iplik tedarikçileri için)
    if (yarnShipmentBtn) {
        yarnShipmentBtn.style.display = supplierType === 'iplik' ? 'inline-flex' : 'none';
        console.log('🧵 İplik Girişi butonu:', supplierType === 'iplik' ? 'GÖRÜNÜR' : 'GİZLİ');
    }
    
    // Fiyat listesi butonlarını göster/gizle
    if (supplierPriceListBtn) {
        supplierPriceListBtn.style.display = supplierType === 'iplik' ? 'none' : 'inline-flex';
    }
    if (yarnPriceListBtn) {
        yarnPriceListBtn.style.display = supplierType === 'iplik' ? 'inline-flex' : 'none';
        console.log('💰 İplik Fiyat Listesi butonu:', supplierType === 'iplik' ? 'GÖRÜNÜR' : 'GİZLİ');
    }
    
    // İplik Türleri butonu (sadece iplik tedarikçileri için)
    if (yarnTypesBtn) {
        yarnTypesBtn.style.display = supplierType === 'iplik' ? 'inline-flex' : 'none';
        console.log('🧶 İplik Türleri butonu:', supplierType === 'iplik' ? 'GÖRÜNÜR' : 'GİZLİ');
    }
}

async function showSupplierDetail(supplierId) {
    try {
        // HEMEN window.currentSupplierId'yi set et (en başta)
        window.currentSupplierId = supplierId;
        
        // Hash ve sayfa aktivasyonu
        location.hash = '#supplier-detail';
        
        // localStorage'a supplier ID'yi kaydet
        localStorage.setItem('currentSupplierId', supplierId);
        console.log('💾 Supplier ID localStorage\'a kaydedildi:', supplierId);
        console.log('✅ window.currentSupplierId set edildi:', window.currentSupplierId);
        
        const supplier = await SupplierService.getById(supplierId);
        if (!supplier) {
            Toast.error('Tedarikçi bulunamadı');
            return;
        }
        
        // Tedarikçi tipini window'a da kaydet (buton güncellemeleri için)
        window.currentSupplierType = supplier.type;
        console.log('📝 Tedarikçi tipi kaydedildi:', supplier.type);
        
        // Sayfa değiştir ve navigation'ı güncelle
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        const targetPage = document.getElementById('supplier-detail-page');
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        // Tedarikçi bilgilerini doldur
        document.getElementById('supplier-detail-title').textContent = supplier.name;
        document.getElementById('supplier-detail-name').textContent = supplier.name;
        document.getElementById('supplier-detail-type').textContent = getSupplierTypeName(supplier.type);
        document.getElementById('supplier-detail-contact').textContent = supplier.contactInfo || '-';
        
        // Butonları HEMEN güncelle (tip parametresi ile - await kullan)
        await updateSupplierButtons(supplier.type);
        
        // Açılış ayarlarını yükle
        const isUSD = supplier.type === 'orme' || supplier.type === 'iplik' || supplierId === 'vMtmBGwmTq0rRsjhHUEm';
        const opening = {
            balance: isUSD ? (supplier.openingBalanceUSD || 0) : (supplier.openingBalanceTRY || 0),
            startDate: supplier.accrualStartDate || DateUtils.getInputDate()
        };
        const openingInput = document.getElementById('supplier-opening-balance');
        const startInput = document.getElementById('supplier-accrual-start');
        if (openingInput) openingInput.value = opening.balance || '';
        if (startInput) startInput.value = opening.startDate || DateUtils.getInputDate();
        // Etiket güncelle
        const labelEl = document.getElementById('supplier-opening-balance-label');
        if (labelEl) {
            labelEl.textContent = `Açılış Bakiyesi (${isUSD ? 'USD' : 'TL'}):`;
            console.log('💰 Açılış bakiyesi label güncellendi:', labelEl.textContent);
        } else {
            console.warn('⚠️ supplier-opening-balance-label bulunamadı');
        }

        // Ekstre yükle
        await loadSupplierExtract(supplierId);
        
        // Ekstre yüklendikten sonra butonları bir kez daha güncelle (DOM kesin hazır)
        // requestAnimationFrame ile bir sonraki render cycle'da çalıştır
        requestAnimationFrame(async () => {
            await updateSupplierButtons(supplier.type);
        });
        
    } catch (error) {
        console.error('Supplier detail error:', error);
        Toast.error('Tedarikçi detayı yüklenirken hata oluştu');
    }
}

// Tedarikçi ekstre yükle
async function loadSupplierExtract(supplierId) {
    try {
        const [lots, payments, priceList, supplier, productionCosts] = await Promise.all([
            InventoryService.getAll(),
            SupplierService.getAllPayments(),
            SupplierService.getPriceListBySupplier(supplierId),
            SupplierService.getById(supplierId),
            ProductionCostService.getAll()
        ]);
        
        const startDate = supplier?.accrualStartDate ? new Date(supplier.accrualStartDate) : new Date(DateUtils.getInputDate());
        startDate.setHours(0,0,0,0);
        
        // Bu tedarikçiye ait lotları filtrele ve tarihten sonrakileri al
        const supplierLots = lots.filter(lot => {
            if (!lot.date) return false;
            const lotDate = new Date(lot.date);
            lotDate.setHours(0,0,0,0);
            if (lotDate < startDate) return false;
            
            if (lot.supplierId === supplierId) return true;
            const hasPrice = priceList.find(p => p.productId === lot.productId);
            return hasPrice;
        });
        
        // Ödemeleri filtrele (başlangıç tarihinden itibaren)
        const supplierPayments = payments.filter(p => (p.supplierId === supplierId || !p.supplierId) && new Date(p.date) >= startDate);
        
        // Ham kumaş gönderimlerini al (örme tedarikçileri için)
        let rawMaterialShipments = [];
        if (supplier.type === 'orme') {
            rawMaterialShipments = await db.readAll('rawMaterialShipments');
            rawMaterialShipments = rawMaterialShipments.filter(rms => {
                if (rms.supplierId !== supplierId) return false;
                if (!rms.date) return false;
                const rmsDate = new Date(rms.date);
                rmsDate.setHours(0,0,0,0);
                return rmsDate >= startDate;
            });
        }
        
        // İplik girişlerini al (iplik tedarikçileri için)
        let yarnShipments = [];
        if (supplier.type === 'iplik') {
            yarnShipments = await db.readAll('yarnShipments');
            yarnShipments = yarnShipments.filter(ys => {
                if (ys.supplierId !== supplierId) return false;
                if (!ys.date) return false;
                const ysDate = new Date(ys.date);
                ysDate.setHours(0,0,0,0);
                return ysDate >= startDate;
            });
        }
        
        // Ekstre oluştur
        const ENSA_ID = 'vMtmBGwmTq0rRsjhHUEm';
        const isUSD = supplierId === ENSA_ID || supplier.type === 'orme' || supplier.type === 'iplik'; // Örme tedarikçileri USD
        const extract = [];
        let runningBalance = NumberUtils.parseNumber(isUSD ? (supplier?.openingBalanceUSD) : (supplier?.openingBalanceTRY)) || 0;
        if (runningBalance > 0) {
            extract.push({
                date: supplier.accrualStartDate || DateUtils.getInputDate(),
                description: 'Açılış Bakiyesi',
                product: '-',
                kg: 0,
                unitPrice: 0,
                debt: runningBalance,
                payment: 0,
                balance: runningBalance,
                type: 'opening'
            });
        }
        
        // Ham kumaş gönderimlerini ekstreye ekle (örme tedarikçileri için)
        for (const shipment of rawMaterialShipments) {
            runningBalance += shipment.totalCost || 0;
            extract.push({
                date: shipment.date,
                description: `Ham kumaş gönderimi - ${shipment.productName || ''}`,
                product: shipment.productName || '-',
                kg: shipment.kg || 0,
                unitPrice: shipment.pricePerKg || 0,
                debt: shipment.totalCost || 0,
                payment: 0,
                balance: runningBalance,
                type: 'rawMaterialShipment'
            });
        }
        
        // İplik girişlerini ekstreye ekle (iplik tedarikçileri için)
        for (const shipment of yarnShipments) {
            runningBalance += shipment.totalCost || 0;
            extract.push({
                date: shipment.date,
                description: `İplik girişi - ${shipment.yarnTypeName || ''}`,
                product: shipment.yarnTypeName || '-',
                kg: shipment.kg || 0,
                unitPrice: shipment.pricePerKg || 0,
                debt: shipment.totalCost || 0,
                payment: 0,
                balance: runningBalance,
                type: 'yarnShipment'
            });
        }
        
        for (const lot of supplierLots) {
            // Önce productionCosts'tan o günkü fiyat bilgisini al
            const productionCost = productionCosts.find(pc => pc.lotId === lot.id && pc.supplierId === supplierId);
            
            if (productionCost && productionCost.pricePerKg) {
                // O günkü fiyat bilgisini kullan
                const debt = (lot.totalKg || 0) * (productionCost.pricePerKg || 0);
                runningBalance += debt;
                
                extract.push({
                    date: lot.date,
                    description: `Stok girişi - ${lot.party}`,
                    product: lot.productName,
                    kg: lot.totalKg,
                    unitPrice: productionCost.pricePerKg,
                    debt: debt,
                    payment: 0,
                    balance: runningBalance,
                    type: 'debt'
                });
            } else {
                // Eski sistem - güncel fiyat listesini kullan (geriye uyumluluk)
                const price = priceList.find(p => p.productId === lot.productId);
                if (price) {
                    const debt = (lot.totalKg || 0) * (price.pricePerKg || 0);
                    runningBalance += debt;
                    
                    extract.push({
                        date: lot.date,
                        description: `Stok girişi - ${lot.party}`,
                        product: lot.productName,
                        kg: lot.totalKg,
                        unitPrice: price.pricePerKg,
                        debt: debt,
                        payment: 0,
                        balance: runningBalance,
                        type: 'debt'
                    });
                }
            }
        }
        
        for (const payment of supplierPayments) {
            // Ensa USD: TRY ödemeleri USD'ye çevir
            let paymentAmount;
            if (isUSD) {
                if (payment.originalCurrency === 'TRY') {
                    const rate = payment.exchangeRate || window.currentExchangeRate || 30.50;
                    paymentAmount = NumberUtils.round((payment.originalAmount || 0) / rate, 2);
                } else {
                    paymentAmount = payment.amount || 0;
                }
            } else {
                paymentAmount = payment.originalCurrency === 'TRY' ? (payment.originalAmount || 0) : (payment.amount || 0);
            }
            runningBalance -= paymentAmount;
            
            extract.push({
                date: payment.date,
                description: `Ödeme - ${payment.method || 'Nakit'}`,
                product: '-',
                kg: 0,
                unitPrice: 0,
                debt: 0,
                payment: paymentAmount,
                paymentId: payment.id || '',
                balance: runningBalance,
                type: 'payment'
            });
        }
        
        extract.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const tbody = document.getElementById('supplier-extract-table-body');
        tbody.innerHTML = extract.map(item => `
            <tr class="${item.type === 'payment' ? 'payment-row' : item.type === 'opening' ? 'opening-row' : 'debt-row'}">
                <td>${DateUtils.formatDate(item.date)}</td>
                <td>${item.description}</td>
                <td>${item.product}</td>
                <td>${item.kg > 0 ? NumberUtils.formatKg(item.kg) : '-'}</td>
                <td>${item.unitPrice > 0 ? (isUSD ? NumberUtils.formatUnitPrice(item.unitPrice) : NumberUtils.formatTRY(item.unitPrice)) : '-'}</td>
                <td class="text-danger">${item.debt > 0 ? (isUSD ? NumberUtils.formatUSD(item.debt) : NumberUtils.formatTRY(item.debt)) : '-'}</td>
                <td class="text-success">${item.payment > 0 ? (isUSD ? NumberUtils.formatUSD(item.payment) : NumberUtils.formatTRY(item.payment)) : '-'}</td>
                <td class="${item.balance >= 0 ? 'text-danger' : 'text-success'}">
                    ${isUSD ? NumberUtils.formatUSD(Math.abs(item.balance)) : NumberUtils.formatTRY(Math.abs(item.balance))}
                </td>
                <td>
                    ${item.type === 'payment' ? `<button class="action-btn action-btn-print" onclick="fastPrintSupplierPaymentReceipt('${item.paymentId||''}')">Makbuz</button>` : '-'}
                </td>
                            </tr>
        `).join('');
        
        const totalDebt = extract.reduce((sum, item) => sum + item.debt, 0);
        const totalPaid = extract.reduce((sum, item) => sum + item.payment, 0);
        const outstanding = totalDebt - totalPaid;
        
        document.getElementById('supplier-detail-total-debt').textContent = isUSD ? NumberUtils.formatUSD(totalDebt) : NumberUtils.formatTRY(totalDebt);
        document.getElementById('supplier-detail-paid').textContent = isUSD ? NumberUtils.formatUSD(totalPaid) : NumberUtils.formatTRY(totalPaid);
        document.getElementById('supplier-detail-outstanding').textContent = isUSD ? NumberUtils.formatUSD(outstanding) : NumberUtils.formatTRY(outstanding);
        
    } catch (error) {
        console.error('Supplier extract error:', error);
        Toast.error('Ekstre yüklenirken hata oluştu');
    }
}

// Tedarikçi borç hesapla
async function calculateSupplierDebt(supplierId) {
    try {
        const [lots, priceList, supplier, productionCosts, yarnShipments] = await Promise.all([
            InventoryService.getAll(),
            SupplierService.getPriceListBySupplier(supplierId),
            SupplierService.getById(supplierId),
            ProductionCostService.getAll(),
            db.readAll('yarnShipments').catch(() => [])
        ]);
        
        const startDate = supplier?.accrualStartDate ? new Date(supplier.accrualStartDate) : new Date(DateUtils.getInputDate());
        startDate.setHours(0,0,0,0);
        
        // Tedarikçi tipi - USD mi TL mi?
        const isUSD = supplier?.type === 'iplik' || supplier?.type === 'orme';
        
        // Açılış bakiyesi - tedarikçi tipine göre
        let totalDebt = isUSD 
            ? (NumberUtils.parseNumber(supplier?.openingBalanceUSD) || 0)
            : (NumberUtils.parseNumber(supplier?.openingBalanceTRY) || 0);
        
        // İplik tedarikçileri için iplik girişlerini hesapla
        if (supplier?.type === 'iplik') {
            const supplierYarnShipments = (yarnShipments || []).filter(ys => {
                if (ys.supplierId !== supplierId) return false;
                if (!ys.date) return false;
                const shipmentDate = new Date(ys.date);
                shipmentDate.setHours(0,0,0,0);
                return shipmentDate >= startDate;
            });
            
            for (const shipment of supplierYarnShipments) {
                totalDebt += shipment.totalCost || 0;
            }
        }
        
        // Örme ve Boyahane için lot bazlı hesaplama
        if (supplier?.type === 'orme' || supplier?.type === 'boyahane') {
            // Bu tedarikçiye ait lotları filtrele ve tarihten sonrakileri al
            const supplierLots = lots.filter(lot => {
                if (!lot.date) return false;
                const lotDate = new Date(lot.date);
                lotDate.setHours(0,0,0,0);
                if (lotDate < startDate) return false;
                
                if (lot.supplierId === supplierId) return true;
                const hasPrice = priceList.find(p => p.productId === lot.productId);
                return hasPrice;
            });
            
            for (const lot of supplierLots) {
                // Önce productionCosts'tan o günkü fiyat bilgisini al
                const productionCost = productionCosts.find(pc => pc.lotId === lot.id && pc.supplierId === supplierId);
                
                if (productionCost && productionCost.pricePerKg) {
                    // O günkü fiyat bilgisini kullan
                    totalDebt += (lot.totalKg || 0) * (productionCost.pricePerKg || 0);
                } else {
                    // Eski sistem - güncel fiyat listesini kullan (geriye uyumluluk)
                    const price = priceList.find(p => p.productId === lot.productId);
                    if (price) {
                        totalDebt += (lot.totalKg || 0) * (price.pricePerKg || 0);
                    }
                }
            }
        }
        
        return totalDebt;
    } catch (error) {
        console.error('Calculate supplier debt error:', error);
        return 0;
    }
}

// Tedarikçi ödeme hesapla
async function calculateSupplierPaid(supplierId) {
    try {
        const [payments, supplier] = await Promise.all([
            SupplierService.getAllPayments(),
            SupplierService.getById(supplierId)
        ]);
        
        const startDate = supplier?.accrualStartDate ? new Date(supplier.accrualStartDate) : new Date(DateUtils.getInputDate());
        startDate.setHours(0,0,0,0);
        
        // Ödemeleri filtrele (başlangıç tarihinden itibaren)
        const supplierPayments = payments.filter(p => (p.supplierId === supplierId || !p.supplierId) && new Date(p.date) >= startDate);
        
        return supplierPayments.reduce((sum, p) => {
            // TL ödemeler için TL değerini, USD ödemeler için USD değerini kullan
            if (p.originalCurrency === 'TRY') {
                return sum + (p.originalAmount || 0);
            } else {
                return sum + (p.amount || 0);
            }
        }, 0);
    } catch (error) {
        console.error('Calculate supplier paid error:', error);
        return 0;
    }
}

// Toplam tedarikçi borcu güncelle
function updateTotalSupplierDebt(suppliers) {
    // USD borçlar (iplik + örme)
    const usdSuppliers = suppliers.filter(s => s.isUSD);
    const totalUsdDebt = usdSuppliers.reduce((sum, s) => sum + (s.outstanding || 0), 0);
    
    // TL borçlar (boyahane)
    const trySuppliers = suppliers.filter(s => !s.isUSD);
    const totalTryDebt = trySuppliers.reduce((sum, s) => sum + (s.outstanding || 0), 0);
    
    // USD kartını güncelle
    const usdElement = document.getElementById('total-usd-debt');
    if (usdElement) {
        usdElement.textContent = NumberUtils.formatUSD(totalUsdDebt);
    }
    
    // TL kartını güncelle
    const tryElement = document.getElementById('total-try-debt');
    if (tryElement) {
        tryElement.textContent = NumberUtils.formatTRY(totalTryDebt);
    }
}

// Tedarikçi türü adını al
function getSupplierTypeName(type) {
    const typeNames = {
        'iplik': 'İplikçi',
        'orme': 'Örme',
        'boyahane': 'Boyahane'
    };
    return typeNames[type] || type;
}

// Tedarikçiler sayfasına geri dön
function goBackToSuppliers() {
    // localStorage'dan supplier ID'yi temizle
    localStorage.removeItem('currentSupplierId');
    
    showPage('supplier-payments');
}

// Tedarikçi sil
async function deleteSupplier(supplierId) {
    try {
        if (!confirm('Bu tedarikçiyi silmek istediğinizden emin misiniz?')) {
            return;
        }
        
        await SupplierService.delete(supplierId);
        Toast.success('Tedarikçi silindi');
        await loadSuppliersPage();
        
    } catch (error) {
        console.error('Delete supplier error:', error);
        Toast.error('Tedarikçi silinirken hata oluştu');
    }
}

// Reports Page
async function loadReportsPage() {
    // Reports page is mostly static, content is generated on demand
    DOMUtils.hide('#report-results');
}

// Settings Page
async function loadSettingsPage() {
    try {
        // Load company settings
        const companyName = await db.getSetting('companyName', '');
        const companyAddress = await db.getSetting('companyAddress', '');
        const companyPhone = await db.getSetting('companyPhone', '');
        const companyLogoText = await db.getSetting('companyLogoText', '');
        const companyLogo = await db.getSetting('companyLogo', '');
        
        document.getElementById('company-name').value = companyName;
        document.getElementById('company-address').value = companyAddress;
        document.getElementById('company-phone').value = companyPhone;
        document.getElementById('company-logo-text').value = companyLogoText;
        
        // Show existing logo if available
        if (companyLogo) {
            const preview = document.getElementById('logo-preview');
            const previewImg = document.getElementById('logo-preview-img');
            
            previewImg.src = companyLogo;
            preview.classList.remove('hidden');
        }
        
        // Setup form submission
        const form = document.getElementById('company-settings-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveCompanySettings();
        });
        
    } catch (error) {
        console.error('Settings page load error:', error);
        Toast.error('Ayarlar yüklenirken hata oluştu');
    }
}

async function saveCompanySettings() {
    try {
        const form = document.getElementById('company-settings-form');
        const formData = new FormData(form);
        
        await db.setSetting('companyName', formData.get('companyName'));
        await db.setSetting('companyAddress', formData.get('companyAddress'));
        await db.setSetting('companyPhone', formData.get('companyPhone'));
        await db.setSetting('companyLogoText', formData.get('companyLogoText'));
        
        // Logo data is handled separately by handleLogoUpload function
        
        Toast.success('Firma bilgileri başarıyla kaydedildi');
        
    } catch (error) {
        console.error('Save settings error:', error);
        Toast.error('Ayarlar kaydedilirken hata oluştu');
    }
}

// Logo upload handler
async function handleLogoUpload(input) {
    try {
        const file = input.files[0];
        if (!file) return;
        
        // Check file size (max 1MB)
        if (file.size > 1024 * 1024) {
            Toast.error('Logo dosyası 1MB\'dan küçük olmalıdır');
            input.value = '';
            return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
            Toast.error('Sadece resim dosyaları yükleyebilirsiniz');
            input.value = '';
            return;
        }
        
        // Convert to base64
        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Data = e.target.result;
            
            // Save to database
            await db.setSetting('companyLogo', base64Data);
            
            // Show preview
            const preview = document.getElementById('logo-preview');
            const previewImg = document.getElementById('logo-preview-img');
            
            previewImg.src = base64Data;
            preview.classList.remove('hidden');
            
            Toast.success('Logo başarıyla yüklendi');
        };
        
        reader.onerror = function() {
            Toast.error('Logo yüklenirken hata oluştu');
            input.value = '';
        };
        
        reader.readAsDataURL(file);
        
    } catch (error) {
        console.error('Logo upload error:', error);
        Toast.error('Logo yüklenirken hata oluştu');
    }
}

// Remove logo
async function removeLogo() {
    try {
        await db.setSetting('companyLogo', '');
        
        const preview = document.getElementById('logo-preview');
        const logoInput = document.getElementById('company-logo');
        
        preview.classList.add('hidden');
        logoInput.value = '';
        
        Toast.success('Logo kaldırıldı');
        
    } catch (error) {
        console.error('Remove logo error:', error);
        Toast.error('Logo kaldırılırken hata oluştu');
    }
}

// Table Sorting
function setupTableSorting(tableId, data, renderFunction) {
    const table = document.getElementById(tableId);
    const headers = table.querySelectorAll('th[data-sort]');
    
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sort;
            
            // Update sort direction
            if (window.currentSortColumn === sortKey) {
                window.currentSortDirection = window.currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                window.currentSortColumn = sortKey;
                window.currentSortDirection = 'asc';
            }
            
            // Update header classes
            headers.forEach(h => {
                h.classList.remove('sort-asc', 'sort-desc');
            });
            header.classList.add(`sort-${window.currentSortDirection}`);
            
            // Sort and render data
            const sorted = ArrayUtils.sortBy(data, sortKey, window.currentSortDirection);
            renderFunction(sorted);
        });
    });
}

// CSV Export Functions
async function exportInventoryCSV() {
    try {
        const lots = await InventoryService.getAll();
        
        const csvData = [
            ['Kumaş', 'Parti', 'Renk', 'Konum', 'Kalan (kg)', 'Durum', 'Tarih'],
            ...lots.map(lot => [
                lot.productName,
                lot.party,
                lot.color || '',
                lot.location || '',
                NumberUtils.formatKg(lot.remainingKg),
                lot.status,
                DateUtils.formatDate(lot.date)
            ])
        ];
        
        CSVUtils.downloadCSV(csvData, 'stok-partileri.csv');
        Toast.success('Stok listesi CSV olarak dışa aktarıldı');
        
    } catch (error) {
        console.error('CSV export error:', error);
        Toast.error('CSV dışa aktarma sırasında hata oluştu');
    }
}

async function printInventoryReport() {
    try {
        console.log('🖨️ Print inventory report başlatıldı');
        
        // Sadece aktif lotlar (Bitti olmayanlar)
        const allLots = await InventoryService.getAll();
        const lots = allLots.filter(l => l.status !== 'Bitti');
        console.log('📦 Lots yüklendi (aktif):', lots.length);
        
        const companyName = await db.getSetting('companyName', 'Kumaş Stok Yönetimi');
        console.log('🏢 Şirket adı:', companyName);
        
        // Grup bazında organize et
        const groups = ArrayUtils.groupBy(lots, 'productId');
        const groupEntries = Object.entries(groups).sort((a, b) => {
            const aName = a[1][0]?.productName || '';
            const bName = b[1][0]?.productName || '';
            return StringUtils.normalizeText(aName).localeCompare(StringUtils.normalizeText(bName));
        });

        // Genel özet hesapla
        const totalKg = lots.reduce((sum, l) => sum + (l.remainingKg || 0), 0);
        const totalLots = lots.length;
        const activeLots = lots.filter(l => l.remainingKg > 0).length;
        const statusCounts = {
            'Stokta': lots.filter(l => l.status === 'Stokta').length,
            'Kısmi': lots.filter(l => l.status === 'Kısmi').length
        };

        console.log('📊 Özet hazırlandı:', { totalKg, totalLots, activeLots });
        
        // Tarih formatını güvenli hale getir
        const currentDate = new Date();
        const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}.${(currentDate.getMonth() + 1).toString().padStart(2, '0')}.${currentDate.getFullYear()} ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
        
        let reportHtml = `
            <div class="printable inventory-report">
                <div class="print-header">
                    <h1>${companyName}</h1>
                    <div class="company-info">Güncel Stok Durumu Raporu</div>
                    <div class="print-date">Rapor Tarihi: ${formattedDate}</div>
                </div>
                
                <div class="print-info-section">
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="summary-label">Toplam Stok:</span>
                            <span class="summary-value">${NumberUtils.formatKg(totalKg)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Toplam Parti:</span>
                            <span class="summary-value">${totalLots}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Aktif Parti:</span>
                            <span class="summary-value">${activeLots}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Durum:</span>
                            <span class="summary-value">Stokta: ${statusCounts.Stokta}, Kısmi: ${statusCounts.Kısmi}, Bitti: ${statusCounts.Bitti}</span>
                        </div>
                    </div>
                </div>
        `;

        // Her grup için tablo oluştur
        groupEntries.forEach(([productId, groupLots], index) => {
            const productName = groupLots[0]?.productName || 'Bilinmeyen Ürün';
            const groupTotalKg = groupLots.reduce((sum, l) => sum + (l.remainingKg || 0), 0);
            const groupActiveLots = groupLots.filter(l => l.remainingKg > 0).length;
            
            // Lotları tarihe göre sırala
            const sortedLots = [...groupLots].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            reportHtml += `
                <div class="product-group">
                    <h3 class="group-title">${productName}</h3>
                    <div class="group-summary">
                        Toplam: <strong>${NumberUtils.formatKg(groupTotalKg)}</strong> • 
                        Aktif Parti: <strong>${groupActiveLots}/${groupLots.length}</strong>
                    </div>
                    
                    <table class="print-table">
                        <thead>
                            <tr>
                                <th>Parti</th>
                                <th>Renk</th>
                                <th>Depo</th>
                                <th class="text-right">Kalan (kg)</th>
                                <th class="text-center">Durum</th>
                                <th class="text-center">Tarih</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            sortedLots.forEach(lot => {
                const statusClass = lot.status === 'Stokta' ? 'status-active' : 
                                 lot.status === 'Kısmi' ? 'status-partial' : 'status-empty';
                reportHtml += `
                    <tr class="${statusClass}">
                        <td><strong>${lot.party}</strong></td>
                        <td>${lot.color || '-'}</td>
                        <td>${lot.location || '-'}</td>
                        <td class="text-right"><strong>${NumberUtils.formatKg(lot.remainingKg)}</strong></td>
                        <td class="text-center">${lot.status}</td>
                        <td class="text-center">${DateUtils.formatDate(lot.date)}</td>
                    </tr>
                `;
            });
            
            reportHtml += `
                        </tbody>
                    </table>
                </div>
            `;
        });

        reportHtml += `
                <div class="print-footer">
                    ${companyName} - Stok Yönetim Sistemi | Yazdırma: ${formattedDate}
                </div>
            </div>
        `;

        console.log('📄 HTML raporu hazırlandı');
        
        // Yeni sekme açarak yazdırma
        console.log('🖨️ Yeni sekme açılıyor...');
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
                <title>Stok Raporu - ${companyName}</title>
                <style>
                    @media print {
                        @page { margin: 1cm; size: A4; }
                    }
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 0; 
                        padding: 20px; 
                        background: white;
                        color: black;
                        font-size: 9pt;
                        line-height: 1.2;
                    }
                    .print-header {
                        text-align: center;
                        margin-bottom: 12pt;
                        border-bottom: 1pt solid black;
                        padding-bottom: 6pt;
                        background-color: #e8f4fd;
                    }
                    .print-header h1 {
                        font-size: 14pt;
                        font-weight: bold;
                        margin: 0 0 3pt 0;
                    }
                    .company-info {
                        font-size: 9pt;
                        margin: 2pt 0;
                    }
                    .print-date {
                        font-size: 8pt;
                        color: #666;
                    }
                    .summary-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 4pt;
                        margin-bottom: 8pt;
                        padding: 6pt;
                        border: 1pt solid #d1d5db;
                        background-color: #f9fafb;
                    }
                    .summary-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 8pt;
                    }
                    .summary-label {
                        font-weight: bold;
                        color: #374151;
                    }
                    .summary-value {
                        font-weight: bold;
                        color: #1f2937;
                    }
                    .product-group {
                        margin-bottom: 8pt;
                    }
                    .product-group h3.group-title {
                        font-size: 11pt;
                        font-weight: bold;
                        margin: 0 0 3pt 0;
                        color: #1f2937;
                        border-bottom: 1pt solid #3b82f6;
                        padding-bottom: 2pt;
                    }
                    .group-summary {
                        font-size: 8pt;
                        color: #6b7280;
                        margin-bottom: 4pt;
                        font-weight: 600;
                    }
                    .print-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 6pt;
                    }
                    .print-table th {
                        background-color: #f0f0f0;
                        border: 1pt solid black;
                        padding: 3pt;
                        text-align: left;
                        font-weight: bold;
                        font-size: 8pt;
                    }
                    .print-table td {
                        border: 1pt solid black;
                        padding: 3pt;
                        font-size: 8pt;
                    }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .status-active td { background-color: #f0fdf4; }
                    .status-partial td { background-color: #fffbeb; }
                    .status-empty td { background-color: #fef2f2; color: #6b7280; }
                    .print-footer {
                        position: fixed;
                        bottom: 1cm;
                        left: 0;
                        right: 0;
                        text-align: center;
                        font-size: 7pt;
                        color: #666;
                        border-top: 1pt solid #ccc;
                        padding-top: 5pt;
                    }
                </style>
            </head>
            <body>
                ${reportHtml}
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
        
        console.log('✅ Print sekmesi hazırlandı');

        Toast.success('Stok raporu yazdırma hazırlandı');
        
    } catch (error) {
        console.error('Print inventory report error:', error);
        Toast.error('Stok raporu yazdırılırken hata oluştu: ' + error.message);
    }
}

// Data Management Functions
async function loadTestData() {
    try {
        LoadingState.show();
        
        // Clear existing data
        await db.clearAll();
        
        // Create only fabric/product names - no test customers, inventory, shipments, etc.
        const products = [
            { name: 'Jarse (Mikro Polyester)', code: 'JRS001' },
            { name: 'Yağmur Damla Desen', code: 'YGD001' },
            { name: 'Polymenş (Mikro Polyester File)', code: 'PLM001' },
            { name: 'Petek Desen', code: 'PTK001' },
            { name: 'Lyc Menş', code: 'LYC001' },
            { name: 'Lyc Süprem', code: 'LYC002' },
            { name: 'Lyc Dalgıç Şardonlu', code: 'LYC003' },
            { name: 'Lyc Scuba', code: 'LYC004' }
        ];
        
        for (const product of products) {
            await ProductService.create(product);
        }
        
        Toast.success('Kumaş isimleri başarıyla yüklendi');
        
        // Refresh current page
        const currentPage = document.querySelector('.page.active').id.replace('-page', '');
        await loadPageContent(currentPage);
        
    } catch (error) {
        console.error('Load fabric names error:', error);
        Toast.error('Kumaş isimleri yüklenirken hata oluştu: ' + error.message);
    } finally {
        LoadingState.hide();
    }
}

async function exportData() {
    try {
        const data = await db.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `kumaş-stok-yedek-${DateUtils.getInputDate()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        Toast.success('Veri yedeği başarıyla dışa aktarıldı');
        
    } catch (error) {
        console.error('Export data error:', error);
        Toast.error('Veri dışa aktarma hatası');
    }
}

async function clearAllData() {
    showConfirmModal(
        'Tüm Veriyi Temizle',
        'Bu işlem tüm müşteri, ürün, stok, sevk ve tahsilat verilerini silecektir. Bu işlem geri alınamaz!',
        async () => {
            try {
                LoadingState.show();
                await db.clearAll();
                Toast.success('Tüm veriler başarıyla temizlendi');
                
                // Refresh current page
                const currentPage = document.querySelector('.page.active').id.replace('-page', '');
                await loadPageContent(currentPage);
                
            } catch (error) {
                console.error('Clear data error:', error);
                Toast.error('Veri temizleme hatası');
            } finally {
                LoadingState.hide();
            }
        }
    );
}

// Export functions to global scope
window.showPage = showPage;
window.loadPageContent = loadPageContent;
window.loadDashboard = loadDashboard;
window.loadCustomersPage = loadCustomersPage;
window.loadCustomerDetail = loadCustomerDetail;
window.loadCustomerShipments = loadCustomerShipments;
window.loadCustomerPayments = loadCustomerPayments;
window.loadCustomerStatement = loadCustomerStatement;
window.loadInventoryPage = loadInventoryPage;
window.loadShipmentsPage = loadShipmentsPage;
window.loadSuppliersPage = loadSuppliersPage;
window.loadSupplierPayments = loadSuppliersPage;
window.showSupplierDetail = showSupplierDetail;
window.showSupplierTypeInfo = showSupplierTypeInfo;
window.goBackToSuppliers = goBackToSuppliers;
window.updateSupplierButtons = updateSupplierButtons;
window.deleteSupplier = deleteSupplier;
window.loadProductionCosts = typeof loadProductionCosts === 'function' ? loadProductionCosts : () => {};
window.loadReportsPage = loadReportsPage;
window.loadSettingsPage = loadSettingsPage;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
window.editLot = editLot;
window.deleteLot = deleteLot;
window.viewShipmentDetails = viewShipmentDetails;
window.deleteShipment = deleteShipment;
window.filterShipments = filterShipments;
window.editProductionCost = editProductionCost;
window.fastPrintPaymentReceipt = fastPrintPaymentReceipt;
window.fastPrintSupplierPaymentReceipt = fastPrintSupplierPaymentReceipt;
window.deleteSupplierPayment = deleteSupplierPayment;
window.toggleCurrencyDisplay = toggleCurrencyDisplay;
window.updatePaymentCurrency = updatePaymentCurrency;
window.updatePaymentAmount = updatePaymentAmount;
window.updatePaymentExchangeRate = updatePaymentExchangeRate;

// Supplier action functions (type-based info)
async function showSupplierTypeInfo(supplierType) {
    try {
        const debt = await SupplierService.getSupplierDebt(supplierType);
        const lastPayment = await SupplierService.getLastPaymentDate(supplierType);
        
        const supplierName = {
            iplik: 'İplikçi',
            orme: 'Örme', 
            boyahane: 'Boyahane'
        }[supplierType] || supplierType;
        
        Toast.info(`${supplierName}: Borç ${NumberUtils.formatUSD(debt)}, Son Ödeme: ${lastPayment ? DateUtils.formatDate(lastPayment) : 'Yok'}`);
    } catch (error) {
        console.error('Supplier detail error:', error);
        Toast.error('Tedarikçi bilgileri alınırken hata oluştu');
    }
}

// Para birimi görüntüleme toggle fonksiyonu
function toggleCurrencyDisplay() {
	const isTLMode = document.getElementById('currency-toggle')?.checked || false;
	updatePaymentSummaryDisplay(isTLMode);
}

// Ödeme özeti görüntüleme fonksiyonu
async function updatePaymentSummaryDisplay(showTL = false) {
	try {
		const costs = await ProductionCostService.getAll();
		
		let yarnTotal = 0;
		let yarnPaid = 0;
		let knittingTotal = 0;
		let knittingPaid = 0;
		let dyeingTotal = 0;
		let dyeingPaid = 0;
		
		costs.forEach(cost => {
			// İplik maliyetleri
			yarnTotal += cost.iplikCost || 0;
			// Örme maliyetleri
			knittingTotal += cost.ormeCost || 0;
			// Boyahane maliyetleri
			dyeingTotal += cost.boyahaneCost || 0;
		});

		// Ödemeleri hesapla
		const payments = await SupplierService.getAllPayments();
		payments.forEach(payment => {
			switch (payment.supplierType) {
				case 'iplik':
					yarnPaid += payment.amount || 0;
					break;
				case 'orme':
					knittingPaid += payment.amount || 0;
					break;
				case 'boyahane':
					dyeingPaid += payment.amount || 0;
					break;
			}
		});
		
		const yarnOutstanding = yarnTotal - yarnPaid;
		const knittingOutstanding = knittingTotal - knittingPaid;
		const dyeingOutstanding = dyeingTotal - dyeingPaid;
		
		const totalOutstanding = yarnOutstanding + knittingOutstanding + dyeingOutstanding;
		const totalDebt = yarnTotal + knittingTotal + dyeingTotal;

		if (showTL) {
			// TL modunda göster
			const exchangeRate = window.currentExchangeRate || 30.50;
			
			document.getElementById('yarn-outstanding').textContent = NumberUtils.formatTRY(yarnOutstanding * exchangeRate);
			document.getElementById('knitting-outstanding').textContent = NumberUtils.formatTRY(knittingOutstanding * exchangeRate);
			document.getElementById('dyeing-outstanding').textContent = NumberUtils.formatTRY(dyeingOutstanding * exchangeRate);
			document.getElementById('total-outstanding').textContent = NumberUtils.formatTRY(totalOutstanding * exchangeRate);
			
			// Toplam borç alanları da güncelle
			document.getElementById('yarn-total').textContent = NumberUtils.formatTRY(yarnTotal * exchangeRate);
			document.getElementById('knitting-total').textContent = NumberUtils.formatTRY(knittingTotal * exchangeRate);
			document.getElementById('dyeing-total').textContent = NumberUtils.formatTRY(dyeingTotal * exchangeRate);
			document.getElementById('total-debt').textContent = NumberUtils.formatTRY(totalDebt * exchangeRate);
		} else {
			// USD modunda göster
			document.getElementById('yarn-outstanding').textContent = NumberUtils.formatUSD(yarnOutstanding);
			document.getElementById('knitting-outstanding').textContent = NumberUtils.formatUSD(knittingOutstanding);
			document.getElementById('dyeing-outstanding').textContent = NumberUtils.formatUSD(dyeingOutstanding);
			document.getElementById('total-outstanding').textContent = NumberUtils.formatUSD(totalOutstanding);
			
			// Toplam borç alanları da güncelle
			document.getElementById('yarn-total').textContent = NumberUtils.formatUSD(yarnTotal);
			document.getElementById('knitting-total').textContent = NumberUtils.formatUSD(knittingTotal);
			document.getElementById('dyeing-total').textContent = NumberUtils.formatUSD(dyeingTotal);
			document.getElementById('total-debt').textContent = NumberUtils.formatUSD(totalDebt);
		}
	} catch (error) {
		console.error('Ödeme özeti güncellenirken hata:', error);
    }
}

function editProductionCost(costId) {
    // Get the production cost data and lot information
    Promise.all([
        ProductionCostService.getById(costId),
        InventoryService.getAll()
    ]).then(([cost, lots]) => {
        if (!cost) {
            showToast('Maliyet bulunamadı', 'error');
            return;
        }

        // Find the lot to get total kg
        const lot = lots.find(l => l.id === cost.lotId);
        const totalKg = lot ? lot.totalKg : 0;

        // Calculate per kg costs (if total cost exists, divide by total kg)
        const iplikPerKg = totalKg > 0 ? (cost.iplikCost || 0) / totalKg : 0;
        const ormePerKg = totalKg > 0 ? (cost.ormeCost || 0) / totalKg : 0;
        const boyahanePerKg = totalKg > 0 ? (cost.boyahaneCost || 0) / totalKg : 0;

        // Create modal HTML
        const modalHTML = `
            <div class="modal-overlay" id="editCostModal">
                <div class="modal">
                    <div class="modal-header">
                        <h3>Maliyet Düzenle (KG Başına)</h3>
                        <button class="close-btn" onclick="closeModal('editCostModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="editCostForm">
                            <div class="form-group">
                                <label>Parti:</label>
                                <input type="text" id="edit-cost-party" value="${cost.party}" readonly>
                            </div>
                            <div class="form-group">
                                <label>Ürün:</label>
                                <input type="text" id="edit-cost-product" value="${cost.productName}" readonly>
                            </div>
                            <div class="form-group">
                                <label>Toplam KG:</label>
                                <input type="text" id="edit-cost-total-kg" value="${NumberUtils.formatKg(totalKg)}" readonly>
                            </div>
                            <div class="form-group">
                                <label>İplik Maliyeti (USD/KG):</label>
                                <input type="number" id="edit-cost-yarn-per-kg" value="${iplikPerKg.toFixed(4)}" step="0.0001" min="0" required>
                            </div>
                            <div class="form-group">
                                <label>Örme Maliyeti (USD/KG):</label>
                                <input type="number" id="edit-cost-knitting-per-kg" value="${ormePerKg.toFixed(4)}" step="0.0001" min="0" required>
                            </div>
                            <div class="form-group">
                                <label>Boyahane Maliyeti (USD/KG):</label>
                                <input type="number" id="edit-cost-dyeing-per-kg" value="${boyahanePerKg.toFixed(4)}" step="0.0001" min="0" required>
                            </div>
                            <div class="form-group">
                                <label>Toplam İplik Maliyeti:</label>
                                <input type="text" id="edit-cost-yarn-total" readonly>
                            </div>
                            <div class="form-group">
                                <label>Toplam Örme Maliyeti:</label>
                                <input type="text" id="edit-cost-knitting-total" readonly>
                            </div>
                            <div class="form-group">
                                <label>Toplam Boyahane Maliyeti:</label>
                                <input type="text" id="edit-cost-dyeing-total" readonly>
                            </div>
                            <div class="form-group">
                                <label>Genel Toplam Maliyet:</label>
                                <input type="text" id="edit-cost-total" readonly>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeModal('editCostModal')">İptal</button>
                        <button class="btn btn-primary" onclick="saveEditedCost(${costId})">Kaydet</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Get input elements
        const yarnPerKgInput = document.getElementById('edit-cost-yarn-per-kg');
        const knittingPerKgInput = document.getElementById('edit-cost-knitting-per-kg');
        const dyeingPerKgInput = document.getElementById('edit-cost-dyeing-per-kg');
        const yarnTotalInput = document.getElementById('edit-cost-yarn-total');
        const knittingTotalInput = document.getElementById('edit-cost-knitting-total');
        const dyeingTotalInput = document.getElementById('edit-cost-dyeing-total');
        const totalInput = document.getElementById('edit-cost-total');

        function updateTotals() {
            const yarnPerKg = parseFloat(yarnPerKgInput.value) || 0;
            const knittingPerKg = parseFloat(knittingPerKgInput.value) || 0;
            const dyeingPerKg = parseFloat(dyeingPerKgInput.value) || 0;

            const yarnTotal = NumberUtils.round(yarnPerKg * totalKg, 2);
            const knittingTotal = NumberUtils.round(knittingPerKg * totalKg, 2);
            const dyeingTotal = NumberUtils.round(dyeingPerKg * totalKg, 2);
            const grandTotal = yarnTotal + knittingTotal + dyeingTotal;

            yarnTotalInput.value = NumberUtils.formatUSD(yarnTotal);
            knittingTotalInput.value = NumberUtils.formatUSD(knittingTotal);
            dyeingTotalInput.value = NumberUtils.formatUSD(dyeingTotal);
            totalInput.value = NumberUtils.formatUSD(grandTotal);
        }

        // Add event listeners for live calculation
        yarnPerKgInput.addEventListener('input', updateTotals);
        knittingPerKgInput.addEventListener('input', updateTotals);
        dyeingPerKgInput.addEventListener('input', updateTotals);

        // Initial calculation
        updateTotals();
    }).catch(error => {
        console.error('Edit production cost error:', error);
        showToast('Maliyet yüklenirken hata oluştu', 'error');
    });
}

function saveEditedCost(costId) {
    const yarnPerKg = parseFloat(document.getElementById('edit-cost-yarn-per-kg').value) || 0;
    const knittingPerKg = parseFloat(document.getElementById('edit-cost-knitting-per-kg').value) || 0;
    const dyeingPerKg = parseFloat(document.getElementById('edit-cost-dyeing-per-kg').value) || 0;

    if (yarnPerKg < 0 || knittingPerKg < 0 || dyeingPerKg < 0) {
        showToast('Maliyet değerleri negatif olamaz', 'error');
        return;
    }

    Promise.all([
        ProductionCostService.getById(costId),
        InventoryService.getAll()
    ]).then(([cost, lots]) => {
        if (!cost) {
            showToast('Maliyet bulunamadı', 'error');
            return;
        }

        // Find the lot to get total kg
        const lot = lots.find(l => l.id === cost.lotId);
        const totalKg = lot ? lot.totalKg : 0;

        if (totalKg <= 0) {
            showToast('Parti toplam kg bilgisi bulunamadı', 'error');
            return;
        }

        // Calculate total costs by multiplying per kg costs with total kg
        const yarnCost = NumberUtils.round(yarnPerKg * totalKg, 2);
        const knittingCost = NumberUtils.round(knittingPerKg * totalKg, 2);
        const dyeingCost = NumberUtils.round(dyeingPerKg * totalKg, 2);
        const totalCost = yarnCost + knittingCost + dyeingCost;

        // Update the cost
        cost.iplikCost = yarnCost;
        cost.ormeCost = knittingCost;
        cost.boyahaneCost = dyeingCost;
        cost.totalCost = totalCost;

        ProductionCostService.update(cost).then(async () => {
            showToast('Maliyet başarıyla güncellendi', 'success');
            closeModal('editCostModal');
            await loadProductionCosts(); // Refresh the table
            await updatePaymentSummary(); // Update the payment summary
        }).catch(error => {
            console.error('Save edited cost error:', error);
            showToast('Maliyet güncellenirken hata oluştu', 'error');
        });
    }).catch(error => {
        console.error('Get cost for edit error:', error);
        showToast('Maliyet yüklenirken hata oluştu', 'error');
    });
}

async function deleteSupplierPayment(paymentId) {
    try {
        if (!confirm('Bu ödemeyi silmek istediğinizden emin misiniz?')) {
            return;
        }
        
        LoadingState.show();
        
        // Ödemeyi sil
        await db.delete('supplierPayments', paymentId);
        
        // Dashboard cache'ini temizle
        DashboardCache.clear();
        
        // Sayfayı yenile
        await loadSuppliersPage();
        
        Toast.success('Ödeme başarıyla silindi');
        
    } catch (error) {
        console.error('Delete supplier payment error:', error);
        Toast.error('Ödeme silinirken hata oluştu');
    } finally {
        LoadingState.hide();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

window.loadShipmentsPage = loadShipmentsPage;
window.viewShipmentDetails = viewShipmentDetails;
window.deleteShipment = deleteShipment;
window.loadSuppliersPage = loadSuppliersPage;
window.updatePaymentSummary = typeof updatePaymentSummary === 'function' ? updatePaymentSummary : () => {};
window.showSupplierDetail = showSupplierDetail;
window.editProductionCost = editProductionCost;
window.deleteSupplierPayment = deleteSupplierPayment;
window.closeModal = closeModal;
window.dismissStockAlerts = dismissStockAlerts;

// Açılış bakiyelerini manuel olarak ekle
async function setOpeningBalances() {
    try {
        LoadingState.show();
        
        const openingBalances = [
            { name: 'Divanespor', balance: 28262.80 },
            { name: 'Yunus', balance: 1205.40 },
            { name: 'SpeedSpor', balance: 421.00 },
            { name: 'Ömer', balance: 3935.40 },
            { name: 'Yüksel', balance: 10120.80 },
            { name: 'Özağca', balance: 24995.46 }
        ];
        
        console.log('💰 Açılış bakiyeleri ayarlanıyor...');
        
        // Önce mevcut müşterileri listele
        const allCustomers = await CustomerService.getAll();
        console.log('👥 Mevcut müşteriler:', allCustomers.map(c => c.name));
        
        // Önce Özağca duplikatını temizle
        const ozagcaCustomers = allCustomers.filter(c => 
            StringUtils.normalizeText(c.name).toLowerCase().includes('ozagca') ||
            StringUtils.normalizeText(c.name).toLowerCase().includes('özağca')
        );
        if (ozagcaCustomers.length > 1) {
            console.log('🧹 Özağca duplikatları temizleniyor...');
            for (let i = 1; i < ozagcaCustomers.length; i++) {
                await CustomerService.delete(ozagcaCustomers[i].id);
                console.log(`🗑️ Duplikat silindi: ${ozagcaCustomers[i].name}`);
            }
        }
        
        // Müşteri listesini yenile
        const updatedCustomers = await CustomerService.getAll();
        
        for (const customerData of openingBalances) {
            console.log(`🔍 Aranan müşteri: "${customerData.name}"`);
            
            // Müşteriyi daha esnek şekilde ara
            let customer = updatedCustomers.find(c => {
                const customerNameNorm = StringUtils.normalizeText(c.name).toLowerCase();
                const searchNameNorm = StringUtils.normalizeText(customerData.name).toLowerCase();
                
                // Daha sıkı eşleştirme - sadece ana kelime içerme
                return customerNameNorm.includes(searchNameNorm) || searchNameNorm.includes(customerNameNorm);
            });
            
            if (customer) {
                console.log(`✅ Müşteri bulundu: "${customer.name}" → "${customerData.name}"`);
            } else {
                console.log(`❌ Müşteri bulunamadı: "${customerData.name}"`);
            }
            
            if (!customer) {
                // Müşteri yoksa oluştur
                console.log(`➕ Yeni müşteri oluşturuluyor: ${customerData.name}`);
                const newCustomer = {
                    name: customerData.name,
                    phone: '',
                    email: '',
                    note: 'Açılış bakiyesi ile oluşturuldu',
                    balance: customerData.balance
                };
                const createdCustomer = await CustomerService.create(newCustomer);
                console.log(`✅ Müşteri oluşturuldu:`, createdCustomer);
            } else {
                // Müşteri varsa bakiyeyi güncelle
                console.log(`🔄 Müşteri bakiyesi güncelleniyor: ${customer.name}`);
                console.log(`   Eski bakiye: ${customer.balance || 0}`);
                console.log(`   Yeni bakiye: ${customerData.balance}`);
                
                const updatedCustomer = {
                    ...customer,
                    balance: customerData.balance
                };
                await CustomerService.update(updatedCustomer);
                console.log(`✅ Bakiye güncellendi: ${customer.name} → ${NumberUtils.formatUSD(customerData.balance)}`);
            }
        }
        
        console.log('🎉 Tüm açılış bakiyeleri işlendi');
        Toast.success('Açılış bakiyeleri başarıyla ayarlandı');
        
        // Müşteriler sayfasını yenile
        if (document.getElementById('customers-page').classList.contains('active')) {
            await loadCustomersPage();
        }
        
        // Dashboard'u yenile
        if (document.getElementById('dashboard-page').classList.contains('active')) {
            await loadDashboard();
        }
        
    } catch (error) {
        console.error('Set opening balances error:', error);
        Toast.error('Açılış bakiyeleri ayarlanırken hata oluştu: ' + error.message);
    } finally {
        LoadingState.hide();
    }
}

// Hızlı bakiye düzeltme fonksiyonu
async function fixCustomerBalances() {
    try {
        LoadingState.show();
        
        const balances = {
            'Divanespor': 28262.80,
            'Yunus': 1205.40,
            'SpeedSpor': 421.00,
            'Ömer': 3935.40,
            'Yüksel': 10120.80,
            'Özağca': 24995.46
        };
        
        const customers = await CustomerService.getAll();
        console.log('🔧 Müşteri bakiyeleri düzeltiliyor...');
        
        for (const customer of customers) {
            const targetBalance = Object.entries(balances).find(([name, amount]) => {
                const customerName = StringUtils.normalizeText(customer.name).toLowerCase();
                const searchName = StringUtils.normalizeText(name).toLowerCase();
                return customerName.includes(searchName) || searchName.includes(customerName);
            });
            
            if (targetBalance) {
                const [name, balance] = targetBalance;
                console.log(`💰 ${customer.name} bakiyesi ${balance} olarak ayarlanıyor...`);
                
                const updatedCustomer = {
                    ...customer,
                    balance: balance
                };
                await CustomerService.update(updatedCustomer);
                console.log(`✅ ${customer.name}: ${NumberUtils.formatUSD(balance)}`);
            }
        }
        
        Toast.success('Müşteri bakiyeleri düzeltildi');
        
        // Sayfaları yenile
        if (document.getElementById('customers-page').classList.contains('active')) {
            await loadCustomersPage();
        }
        if (document.getElementById('dashboard-page').classList.contains('active')) {
            await loadDashboard();
        }
        
    } catch (error) {
        console.error('Fix balances error:', error);
        Toast.error('Bakiye düzeltme hatası: ' + error.message);
    } finally {
        LoadingState.hide();
    }
}

window.fixCustomerBalances = fixCustomerBalances;

// Tüm bakiyeleri sıfırla ve duplikatları temizle
async function resetAndFixBalances() {
    try {
        LoadingState.show();
        
        console.log('🧹 Tüm müşteri bakiyeleri sıfırlanıyor ve duplikatlar temizleniyor...');
        
        // 1. Tüm müşterileri al
        let customers = await CustomerService.getAll();
        console.log('👥 Toplam müşteri sayısı:', customers.length);
        
        // 2. Duplikatları tespit et ve sil
        const seenNames = new Set();
        const duplicates = [];
        
        for (const customer of customers) {
            const normalizedName = StringUtils.normalizeText(customer.name).toLowerCase();
            if (seenNames.has(normalizedName)) {
                duplicates.push(customer);
            } else {
                seenNames.add(normalizedName);
            }
        }
        
        if (duplicates.length > 0) {
            console.log('🗑️ Duplikat müşteriler siliniyor:', duplicates.map(c => c.name));
            for (const duplicate of duplicates) {
                await CustomerService.delete(duplicate.id);
            }
        }
        
        // 3. Güncel müşteri listesini al
        customers = await CustomerService.getAll();
        console.log('👥 Temizlendikten sonra müşteri sayısı:', customers.length);
        
        // 4. Tüm bakiyeleri sıfırla
        console.log('💰 Tüm bakiyeler sıfırlanıyor...');
        for (const customer of customers) {
            const resetCustomer = {
                ...customer,
                balance: 0
            };
            await CustomerService.update(resetCustomer);
            console.log(`🔄 ${customer.name}: bakiye sıfırlandı`);
        }
        
        // 5. Doğru bakiyeleri ayarla
        const targetBalances = {
            'divanespor': 28262.80,
            'yunus': 1205.40,
            'speedspor': 421.00,
            'omer': 3935.40,
            'yuksel': 10120.80,
            'ozagca': 24995.46
        };
        
        console.log('💰 Doğru bakiyeler ayarlanıyor...');
        const updatedCustomers = await CustomerService.getAll();
        
        for (const customer of updatedCustomers) {
            const customerNameNorm = StringUtils.normalizeText(customer.name).toLowerCase().replace(/[^a-z]/g, '');
            
            for (const [targetName, targetBalance] of Object.entries(targetBalances)) {
                if (customerNameNorm.includes(targetName) || targetName.includes(customerNameNorm)) {
                    console.log(`✅ ${customer.name} → ${NumberUtils.formatUSD(targetBalance)}`);
                    
                    const updatedCustomer = {
                        ...customer,
                        balance: targetBalance
                    };
                    await CustomerService.update(updatedCustomer);
                    break;
                }
            }
        }
        
        console.log('🎉 Tüm işlemler tamamlandı!');
        Toast.success('Müşteri bakiyeleri temizlendi ve yeniden ayarlandı');
        
        // Sayfaları yenile
        if (document.getElementById('customers-page').classList.contains('active')) {
            await loadCustomersPage();
        }
        if (document.getElementById('dashboard-page').classList.contains('active')) {
            await loadDashboard();
        }
        
    } catch (error) {
        console.error('Reset and fix balances error:', error);
        Toast.error('Bakiye sıfırlama/düzeltme hatası: ' + error.message);
    } finally {
        LoadingState.hide();
    }
}

window.resetAndFixBalances = resetAndFixBalances;

// Doğrudan veritabanına bakiye yaz
async function directSetBalances() {
    try {
        LoadingState.show();
        
        console.log('🔧 Doğrudan veritabanı güncellemesi başlıyor...');
        
        const targetBalances = [
            { name: 'Divanespor', balance: 28262.80 },
            { name: 'Yunus', balance: 1205.40 },
            { name: 'SpeedSpor', balance: 421.00 },
            { name: 'Ömer', balance: 3935.40 },
            { name: 'Yüksel', balance: 10120.80 },
            { name: 'Özağca', balance: 24995.46 }
        ];
        
        // Tüm müşterileri al
        const customers = await db.readAll('customers');
        console.log('👥 Veritabanından müşteriler:', customers.map(c => `${c.name} (${c.id})`));
        
        for (const targetCustomer of targetBalances) {
            // Müşteriyi bul
            const customer = customers.find(c => {
                const customerName = c.name.toLowerCase().replace(/[^a-z]/g, '');
                const targetName = targetCustomer.name.toLowerCase().replace(/[^a-z]/g, '');
                return customerName.includes(targetName) || targetName.includes(customerName);
            });
            
            if (customer) {
                console.log(`💰 ${customer.name} bakiyesi güncelleniyor: ${targetCustomer.balance}`);
                
                // Doğrudan db.update kullan
                const updatedData = {
                    ...customer,
                    balance: targetCustomer.balance,
                    updatedAt: new Date().toISOString()
                };
                
                await db.update('customers', customer.id, updatedData);
                console.log(`✅ ${customer.name}: ${NumberUtils.formatUSD(targetCustomer.balance)} - VERİTABANINA YAZILDI`);
            } else {
                console.log(`❌ Müşteri bulunamadı: ${targetCustomer.name}`);
                
                // Müşteri yoksa oluştur
                const newCustomer = {
                    name: targetCustomer.name,
                    phone: '',
                    email: '',
                    note: 'Açılış bakiyesi',
                    balance: targetCustomer.balance,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                await db.create('customers', newCustomer);
                console.log(`➕ Yeni müşteri oluşturuldu: ${targetCustomer.name} - ${NumberUtils.formatUSD(targetCustomer.balance)}`);
            }
        }
        
        // Kontrol et
        console.log('🔍 Güncelleme sonrası kontrol...');
        const updatedCustomers = await db.readAll('customers');
        for (const customer of updatedCustomers) {
            console.log(`📊 ${customer.name}: balance=${customer.balance}`);
        }
        
        console.log('🎉 Doğrudan veritabanı güncellemesi tamamlandı!');
        Toast.success('Bakiyeler doğrudan veritabanına yazıldı');
        
        // Sayfaları yenile
        if (document.getElementById('customers-page').classList.contains('active')) {
            await loadCustomersPage();
        }
        if (document.getElementById('dashboard-page').classList.contains('active')) {
            await loadDashboard();
        }
        
    } catch (error) {
        console.error('Direct set balances error:', error);
        Toast.error('Doğrudan bakiye yazma hatası: ' + error.message);
    } finally {
        LoadingState.hide();
    }
}

window.directSetBalances = directSetBalances;

// Tek müşteri test
async function testSingleCustomer() {
    try {
        console.log('🧪 Tek müşteri testi başlıyor...');
        
        const customers = await db.readAll('customers');
        console.log('👥 Mevcut müşteriler:', customers);
        
        if (customers.length > 0) {
            const firstCustomer = customers[0];
            console.log('🎯 Test edilecek müşteri:', firstCustomer);
            
            // Bakiyeyi 999.99 yap
            const testData = {
                ...firstCustomer,
                balance: 999.99
            };
            
            console.log('�� Güncelleniyor...', testData);
            await db.update('customers', firstCustomer.id, testData);
            
            // Kontrol et
            const updated = await db.read('customers', firstCustomer.id);
            console.log('✅ Güncelleme sonrası:', updated);
            
            // CustomerService ile kontrol et
            const balanceViaService = await CustomerService.getBalance(firstCustomer.id);
            console.log('🔍 CustomerService.getBalance sonucu:', balanceViaService);
            
            Toast.success(`Test: ${firstCustomer.name} bakiyesi ${updated.balance} oldu`);
        }
        
    } catch (error) {
        console.error('Test error:', error);
        Toast.error('Test hatası: ' + error.message);
    }
}

window.testSingleCustomer = testSingleCustomer;

// Müşteri bakiyesini konsoldan düşür (ekstrede görünmez)
async function reduceCustomerBalance(customerNameOrId, amountToReduce) {
    try {
        console.log(`💰 Müşteri bakiyesi düşürülüyor: ${customerNameOrId}, Tutar: ${amountToReduce}`);
        
        // Müşteriyi bul
        let customer;
        if (typeof customerNameOrId === 'string' && customerNameOrId.length > 10) {
            // ID gibi görünüyorsa
            customer = await CustomerService.getById(customerNameOrId);
        } else {
            // İsim ile ara
            const customers = await CustomerService.getAll();
            customer = customers.find(c => 
                c.name.toLowerCase().includes(customerNameOrId.toLowerCase()) ||
                customerNameOrId.toLowerCase().includes(c.name.toLowerCase())
            );
        }
        
        if (!customer) {
            console.error(`❌ Müşteri bulunamadı: ${customerNameOrId}`);
            return;
        }
        
        const oldBalance = customer.balance || 0;
        const newBalance = NumberUtils.round(oldBalance - amountToReduce, 2);
        
        console.log(`📊 ${customer.name}:`);
        console.log(`   Eski bakiye: ${NumberUtils.formatUSD(oldBalance)}`);
        console.log(`   Düşürülecek: ${NumberUtils.formatUSD(amountToReduce)}`);
        console.log(`   Yeni bakiye: ${NumberUtils.formatUSD(newBalance)}`);
        
        // Bakiyeyi güncelle (ekstrede görünmeyecek çünkü sadece balance alanı güncelleniyor)
        await CustomerService.update({
            ...customer,
            balance: newBalance
        });
        
        console.log(`✅ ${customer.name} bakiyesi güncellendi: ${NumberUtils.formatUSD(oldBalance)} → ${NumberUtils.formatUSD(newBalance)}`);
        console.log(`ℹ️ Not: Bu işlem ekstrede görünmeyecek, sadece bakiye alanı güncellendi.`);
        
        return {
            customer: customer.name,
            oldBalance,
            amountReduced: amountToReduce,
            newBalance
        };
    } catch (error) {
        console.error('❌ Bakiye düşürme hatası:', error);
        throw error;
    }
}

window.reduceCustomerBalance = reduceCustomerBalance;

// Products Page
async function loadProductsPage() {
    try {
        const products = await ProductService.getAll();
        renderProductsTable(products);
        setupProductsFilters(products);
    } catch (error) {
        console.error('Products page load error:', error);
        Toast.error('Kumaş listesi yüklenirken hata oluştu');
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('products-table-body');
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Kumaş bulunamadı</td></tr>';
        return;
    }
    
    const rowsHtml = products.map(product => `
        <tr>
            <td>${product.name}</td>
            <td>${product.code || '-'}</td>
            <td>${product.note || '-'}</td>
            <td>${DateUtils.formatDate(product.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn action-btn-edit" onclick="editProduct('${product.id}')">Düzenle</button>
                    <button class="action-btn action-btn-delete" onclick="deleteProduct('${product.id}')">Sil</button>
                </div>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = rowsHtml;
}

function setupProductsFilters(allProducts) {
    const searchInput = document.getElementById('products-search');
    
    function applyFilters() {
        let filtered = allProducts;
        
        // Search filter
        const searchQuery = searchInput.value.toLowerCase();
        if (searchQuery) {
            filtered = filtered.filter(product =>
                StringUtils.searchMatch(product.name, searchQuery) ||
                StringUtils.searchMatch(product.code, searchQuery) ||
                StringUtils.searchMatch(product.note, searchQuery)
            );
        }
        
        renderProductsTable(filtered);
    }
    
    searchInput.addEventListener('input', applyFilters);
}

async function editProduct(productId) {
    try {
        const product = await ProductService.getById(productId);
        showNewProductModal(product);
    } catch (error) {
        console.error('Edit product error:', error);
        Toast.error('Kumaş bilgileri yüklenirken hata oluştu');
    }
}

async function deleteProduct(productId) {
    try {
        const product = await ProductService.getById(productId);
        showConfirmModal(
            'Kumaş Sil',
            `"${product.name}" kumaşını silmek istediğinizden emin misiniz?`,
            async () => {
                try {
                    await ProductService.delete(productId);
                    Toast.success('Kumaş başarıyla silindi');
                    await loadProductsPage();
                } catch (error) {
                    console.error('Delete product error:', error);
                    Toast.error(error.message);
                }
            }
        );
    } catch (error) {
        console.error('Delete product error:', error);
        Toast.error('Kumaş silinirken hata oluştu');
    }
}

window.directSetBalances = directSetBalances;
window.testSingleCustomer = testSingleCustomer;
window.loadProductsPage = loadProductsPage;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;

// Alfa Promosyon bakiyesine 1661.458 dolar ekle
async function addBalanceToAlfaPromosyon() {
    try {
        LoadingState.show();
        
        console.log('💰 Alfa Promosyon bakiyesine 1661.458 dolar ekleniyor...');
        
        // Tüm müşterileri al
        const customers = await CustomerService.getAll();
        
        // Alfa Promosyon'u bul
        const alfaPromosyon = customers.find(customer => 
            customer.name.toLowerCase().includes('alfa') && 
            customer.name.toLowerCase().includes('promosyon')
        );
        
        if (!alfaPromosyon) {
            console.log('❌ Alfa Promosyon müşterisi bulunamadı');
            Toast.error('Alfa Promosyon müşterisi bulunamadı');
            return;
        }
        
        console.log(`👤 Bulunan müşteri: ${alfaPromosyon.name} (ID: ${alfaPromosyon.id})`);
        console.log(`💰 Mevcut bakiye: ${NumberUtils.formatUSD(alfaPromosyon.balance || 0)}`);
        
        // Yeni bakiyeyi hesapla
        const currentBalance = alfaPromosyon.balance || 0;
        const amountToAdd = 1661.458;
        const newBalance = NumberUtils.round(currentBalance + amountToAdd, 2);
        
        console.log(`💰 Eklenecek tutar: ${NumberUtils.formatUSD(amountToAdd)}`);
        console.log(`💰 Yeni bakiye: ${NumberUtils.formatUSD(newBalance)}`);
        
        // Müşteri bakiyesini güncelle
        const updatedCustomer = {
            ...alfaPromosyon,
            balance: newBalance,
            updatedAt: new Date().toISOString()
        };
        
        await CustomerService.update(updatedCustomer);
        
        console.log(`✅ Alfa Promosyon bakiyesi güncellendi: ${NumberUtils.formatUSD(currentBalance)} → ${NumberUtils.formatUSD(newBalance)}`);
        Toast.success(`Alfa Promosyon bakiyesine ${NumberUtils.formatUSD(amountToAdd)} eklendi`);
        
        // Sayfaları yenile
        if (document.getElementById('customers-page').classList.contains('active')) {
            await loadCustomersPage();
        }
        if (document.getElementById('dashboard-page').classList.contains('active')) {
            await loadDashboard();
        }
        
    } catch (error) {
        console.error('Add balance to Alfa Promosyon error:', error);
        Toast.error('Bakiye ekleme hatası: ' + error.message);
    } finally {
        LoadingState.hide();
    }
}

window.addBalanceToAlfaPromosyon = addBalanceToAlfaPromosyon;
window.addBalanceToAlfaPromosyon = addBalanceToAlfaPromosyon;

async function saveSupplierOpeningSettings() {
    try {
        const supplierId = window.currentSupplierId;
        const opening = NumberUtils.parseNumber(document.getElementById('supplier-opening-balance').value);
        const startDate = document.getElementById('supplier-accrual-start').value || DateUtils.getInputDate();
        await SupplierService.setOpeningSettings(supplierId, opening, startDate);
        Toast.success('Ayarlar kaydedildi');
        await loadSupplierExtract(supplierId);
    } catch (e) {
        console.error('saveSupplierOpeningSettings error:', e);
        Toast.error('Ayarlar kaydedilemedi');
    }
}

window.saveSupplierOpeningSettings = saveSupplierOpeningSettings;

// İplik çeşidi ekle (konsoldan kullanım için)
async function addYarnTypeFromConsole(name, code = '') {
    try {
        const yarnType = await YarnTypeService.create({
            name: name,
            code: code,
            note: ''
        });
        console.log('✅ İplik çeşidi eklendi:', yarnType);
        Toast.success(`İplik çeşidi eklendi: ${name}`);
        return yarnType;
    } catch (error) {
        console.error('İplik çeşidi ekleme hatası:', error);
        Toast.error(error.message || 'İplik çeşidi eklenemedi');
        throw error;
    }
}

window.addYarnTypeFromConsole = addYarnTypeFromConsole;

// Hızlı tedarikçi ödeme makbuzu yazdırma
async function fastPrintSupplierPaymentReceipt(paymentId) {
    try {
        console.log('🖨️ Hızlı tedarikçi ödeme makbuzu yazdırılıyor:', paymentId);
        
        const supplierPayments = await SupplierService.getAllPayments();
        const payment = supplierPayments.find(p => p.id === paymentId);
        
        if (!payment) {
            Toast.error('Ödeme bulunamadı');
            return;
        }
        
        const companyName = await window.db.getSetting('companyName', 'Kumaş Stok Yönetimi');
        
        // Tedarikçi adını al
        let supplierName = 'Bilinmeyen Tedarikçi';
        if (payment.supplierId) {
            const supplier = await SupplierService.getById(payment.supplierId);
            if (supplier) {
                supplierName = supplier.name;
            }
        }
        
        const currentDate = new Date();
        const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}.${(currentDate.getMonth() + 1).toString().padStart(2, '0')}.${currentDate.getFullYear()} ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
        
        // Para birimi bilgilerini hazırla
        let amountDisplay = payment.amount;
        let currencyDisplay = 'USD';
        let exchangeRateDisplay = '';
        
        if (payment.originalCurrency === 'TRY') {
            amountDisplay = payment.originalAmount || payment.amount;
            currencyDisplay = 'TL';
            exchangeRateDisplay = `(Kur: ${payment.exchangeRate || 30.5})`;
        }
        
        // Yeni sekme açarak yazdırma - HEMEN!
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (!printWindow) {
            Toast.error('Popup engelleyici aktif. Lütfen popup\'ları etkinleştirin.');
            return;
        }
        
        const fullHtml = `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
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
                    .currency-info {
                        font-size: 10pt;
                        color: #666;
                        margin-top: 5pt;
                    }
                </style>
            </head>
            <body>
                <div class="printable payment-receipt">
                    <div class="print-header">
                        <h1>${companyName}</h1>
                        <div class="document-title">ÖDEME MAKBUZU</div>
                    </div>
                    
                    <div class="print-info-section">
                        <div class="print-info-row">
                            <span class="print-info-label">Tedarikçi:</span>
                            <span>${supplierName}</span>
                        </div>
                        <div class="print-info-row">
                            <span class="print-info-label">Ödeme Tarihi:</span>
                            <span>${new Date(payment.date).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <div class="print-info-row">
                            <span class="print-info-label">Makbuz No:</span>
                            <span>#${payment.id.toString().substr(-8).toUpperCase()}</span>
                        </div>
                        <div class="print-info-row">
                            <span class="print-info-label">Ödeme Yöntemi:</span>
                            <span>${payment.method || 'Nakit'}</span>
                        </div>
                    </div>
                    
                    <table class="print-table">
                        <thead>
                            <tr>
                                <th>Açıklama</th>
                                <th class="text-right">Tutar (${currencyDisplay})</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Tedarikçi Ödemesi</td>
                                <td class="text-right">${currencyDisplay === 'TL' ? '₺' : '$'}${amountDisplay.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="print-totals">
                        <table style="width: 100%;">
                            <tr class="grand-total">
                                <td class="total-label">Ödenen Toplam:</td>
                                <td class="total-amount">${currencyDisplay === 'TL' ? '₺' : '$'}${amountDisplay.toFixed(2)}</td>
                            </tr>
                            ${exchangeRateDisplay ? `<tr><td class="total-label">Döviz Kuru:</td><td class="total-amount">${exchangeRateDisplay}</td></tr>` : ''}
                        </table>
                    </div>
                    
                    <div class="print-signature">
                        <div class="signature-box">
                            <div class="signature-line">Ödeme Yapan</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-box">
                                <div class="signature-line">Tedarikçi İmza</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="print-notes">
                        <strong>Not:</strong> Bu makbuz ${formattedDate} tarihinde yazdırılmıştır.
                        ${payment.note ? `<br><strong>Açıklama:</strong> ${payment.note}` : ''}
                    </div>
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(fullHtml);
        printWindow.document.close();
        
        // Yazdırma dialogunu aç
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
        
    } catch (error) {
        console.error('Tedarikçi ödeme makbuzu yazdırma hatası:', error);
        Toast.error('Makbuz yazdırılırken hata oluştu');
    }
}