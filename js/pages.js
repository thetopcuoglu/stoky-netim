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
        LoadingState.show();
        
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
    } finally {
        LoadingState.hide();
    }
}

// Dashboard Page
async function loadDashboard() {
    try {
        // Check if database is ready
        if (!window.db || !window.db.db) {
            console.log('Database not ready, waiting...');
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!window.db || !window.db.db) {
                throw new Error('Database not initialized');
            }
        }

        const summary = await DashboardService.getSummary();
        const recentActivities = await DashboardService.getRecentActivities();
        const enhancedData = await getEnhancedDashboardData();
        
        // Update dashboard values
        DOMUtils.setText('#net-profit', NumberUtils.formatUSD(enhancedData.netProfit));
        DOMUtils.setText('#total-sales', NumberUtils.formatUSD(enhancedData.totalSales));
        DOMUtils.setText('#total-costs', NumberUtils.formatUSD(enhancedData.totalCosts));
        
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
        const activitiesList = document.getElementById('recent-activities-list');
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
        
    } catch (error) {
        console.error('Dashboard load error:', error);
        Toast.error('Dashboard yüklenirken hata oluştu: ' + error.message);
        showFallbackDashboard();
    }
}

async function getEnhancedDashboardData() {
    try {
        // Get shipments for last 30 days
        const thirtyDaysAgo = DateUtils.getDaysAgo(30);
        const shipments = await ShipmentService.getAll();
        const recentShipments = shipments.filter(s => new Date(s.date) >= thirtyDaysAgo);
        
        // Calculate totals
        const totalSales = recentShipments.reduce((sum, s) => sum + (s.totals?.totalUsd || 0), 0);
        const totalKg = recentShipments.reduce((sum, s) => sum + (s.totals?.totalKg || 0), 0);
        
        // Get production costs (simplified - using random values for demo)
        const totalCosts = totalSales * 0.6; // 60% of sales as costs
        const netProfit = totalSales - totalCosts;
        
        // Calculate average price
        const avgPrice = totalKg > 0 ? totalSales / totalKg : 0;
        
        // Get stock breakdown
        const lots = await InventoryService.getAll();
        const stockAvailable = lots.filter(l => l.status === 'Stokta').reduce((sum, l) => sum + (l.remainingKg || 0), 0);
        const stockPartial = lots.filter(l => l.status === 'Kısmi').reduce((sum, l) => sum + (l.remainingKg || 0), 0);
        const stockFinished = lots.filter(l => l.status === 'Bitti').length;
        const totalStock = stockAvailable + stockPartial;
        
        // Get customers with debt
        const customers = await CustomerService.getAll();
        let customersWithDebt = 0;
        for (const customer of customers) {
            try {
                const balance = await CustomerService.getBalance(customer.id);
                if (balance > 0) customersWithDebt++;
            } catch (e) {
                // Skip if error getting balance
            }
        }
        
        // Calculate percentages for animations
        const maxSales = Math.max(10000, totalSales * 1.2); // Dynamic max based on current sales
        const salesProgressPercent = Math.min((totalSales / maxSales) * 100, 100);
        
        const maxStock = Math.max(5000, totalStock * 1.2); // Dynamic max based on current stock
        const stockGaugePercent = Math.min((totalStock / maxStock) * 100, 100);
        
        const overduePercent = Math.random() * 20; // Random for demo - would need actual calculation
        
        // Determine status
        const stockStatus = totalStock > 3000 ? 'Yüksek' : totalStock > 1000 ? 'Normal' : 'Düşük';
        const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100) : 0;
        const profitTrend = profitMargin > 0 ? `+${profitMargin.toFixed(1)}%` : '0%';
        
        return {
            netProfit,
            totalSales,
            totalCosts,
            avgPrice,
            stockAvailable,
            stockPartial,
            stockFinished,
            customersWithDebt,
            stockStatus,
            profitTrend,
            salesProgressPercent,
            stockGaugePercent,
            overduePercent
        };
        
    } catch (error) {
        console.error('Enhanced dashboard data error:', error);
        return {
            netProfit: 0,
            totalSales: 0,
            totalCosts: 0,
            avgPrice: 0,
            stockAvailable: 0,
            stockPartial: 0,
            stockFinished: 0,
            customersWithDebt: 0,
            stockStatus: 'Normal',
            profitTrend: '0%',
            salesProgressPercent: 0,
            stockGaugePercent: 50,
            overduePercent: 10
        };
    }
}

// Removed complex animations for simplicity

function showFallbackDashboard() {
    // Show fallback data with zero values
    const fallbackData = {
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
        const shipments = await ShipmentService.getByCustomerId(customerId);
        const tbody = document.getElementById('customer-shipments-table');
        
        if (shipments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Sevk bulunamadı</td></tr>';
            return;
        }
        
        tbody.innerHTML = shipments.map(shipment => {
            return shipment.lines?.map(line => `
                <tr>
                    <td>${DateUtils.formatDate(shipment.date)}</td>
                    <td>${line.productName}</td>
                    <td>${line.party}</td>
                    <td>${NumberUtils.formatKg(line.kg)}</td>
                    <td>${NumberUtils.formatUnitPrice(line.unitUsd)}</td>
                    <td>${NumberUtils.formatUSD(line.lineTotalUsd)}</td>
                    <td>
                        <button class="action-btn action-btn-view" onclick="printShipmentReceipt('${shipment.id}')">
                            Makbuz
                        </button>
                    </td>
                </tr>
            `).join('') || `
                <tr>
                    <td>${DateUtils.formatDate(shipment.date)}</td>
                    <td colspan="5">Sevk detayı bulunamadı</td>
                    <td>
                        <button class="action-btn action-btn-view" onclick="printShipmentReceipt('${shipment.id}')">
                            Makbuz
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Customer shipments load error:', error);
        Toast.error('Sevk listesi yüklenirken hata oluştu');
    }
}

async function loadCustomerPayments(customerId) {
    try {
        const payments = await PaymentService.getByCustomerId(customerId);
        const tbody = document.getElementById('customer-payments-table');
        
        if (payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Tahsilat bulunamadı</td></tr>';
            return;
        }
        
        tbody.innerHTML = payments.map(payment => `
            <tr>
                <td>${DateUtils.formatDate(payment.date)}</td>
                <td>${NumberUtils.formatUSD(payment.amountUsd)}</td>
                <td>${payment.method || '-'}</td>
                <td>${payment.note || '-'}</td>
                <td>
                    <div class="action-buttons">
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
        
        renderInventoryTable(lots);
        
        // Populate product filter
        const productFilter = document.getElementById('inventory-product-filter');
        productFilter.innerHTML = '<option value="">Tüm Ürünler</option>' +
            products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        
        // Setup search and filters
        setupInventoryFilters(lots);
        
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
    
    tbody.innerHTML = lots.map(lot => {
        const statusClass = `status-${lot.status.toLowerCase().replace('ı', 'i')}`;
        
        return `
            <tr>
                <td>${lot.productName}</td>
                <td>${lot.party}</td>
                <td>${lot.color || '-'}</td>
                <td>${lot.location || '-'}</td>
                <td>${NumberUtils.formatKg(lot.remainingKg)}</td>
                <td><span class="status-badge ${statusClass}">${lot.status}</span></td>
                <td>${DateUtils.formatDate(lot.date)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-btn-edit" onclick="editLot('${lot.id}')">
                            Düzenle
                        </button>
                        <button class="action-btn action-btn-delete" onclick="deleteLot('${lot.id}')">
                            Sil
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Setup table sorting
    setupTableSorting('inventory-table', lots, renderInventoryTable);
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
        
        // Status filter
        const selectedStatus = statusFilter.value;
        if (selectedStatus) {
            filtered = filtered.filter(lot => lot.status === selectedStatus);
        }
        
        renderInventoryTable(filtered);
    }
    
    searchInput.addEventListener('input', applyFilters);
    productFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
}

async function editLot(lotId) {
    try {
        const lot = await InventoryService.getById(lotId);
        await showNewLotModal(lot);
    } catch (error) {
        console.error('Edit lot error:', error);
        Toast.error('Parti bilgileri yüklenirken hata oluştu');
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
        const shipments = await ShipmentService.getAll();
        const customers = await CustomerService.getAll();
        
        // Enrich shipments with customer names
        const enrichedShipments = shipments.map(shipment => {
            const customer = customers.find(c => c.id === shipment.customerId);
            return {
                ...shipment,
                customerName: customer ? customer.name : 'Bilinmeyen Müşteri'
            };
        });
        
        renderShipments(enrichedShipments);
        
    } catch (error) {
        console.error('Load shipments error:', error);
        Toast.error('Sevkler yüklenirken hata oluştu');
    }
}

function renderShipments(shipments) {
    const tbody = document.getElementById('shipments-table-body');
    
    if (shipments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Sevk bulunamadı</td></tr>';
        return;
    }
    
    // Sort by date descending
    shipments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = shipments.map(shipment => {
        const shortId = shipment.id.substr(-8).toUpperCase();
        const totalKg = shipment.totals?.totalKg || 0;
        const totalUsd = shipment.totals?.totalUsd || 0;
        
        return `
            <tr>
                <td>#${shortId}</td>
                <td>${DateUtils.formatDate(shipment.date)}</td>
                <td>${shipment.customerName}</td>
                <td>${NumberUtils.formatKg(totalKg)}</td>
                <td>${NumberUtils.formatUSD(totalUsd)}</td>
                <td>${shipment.note || '-'}</td>
                <td>
                    <div class="action-buttons">
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
    const searchTerm = document.getElementById('shipments-search').value.toLowerCase();
    const customerFilter = document.getElementById('shipments-customer-filter').value;
    const periodFilter = document.getElementById('shipments-period-filter').value;
    
    const rows = document.querySelectorAll('#shipments-table-body tr');
    
    rows.forEach(row => {
        if (row.cells.length < 7) return; // Skip empty row
        
        const shipmentNo = row.cells[0].textContent.toLowerCase();
        const date = row.cells[1].textContent;
        const customerName = row.cells[2].textContent.toLowerCase();
        const note = row.cells[5].textContent.toLowerCase();
        
        // Search filter
        const matchesSearch = !searchTerm || 
            shipmentNo.includes(searchTerm) ||
            customerName.includes(searchTerm) ||
            note.includes(searchTerm);
        
        // Customer filter
        const matchesCustomer = !customerFilter || 
            row.cells[2].dataset?.customerId === customerFilter;
        
        // Period filter
        let matchesPeriod = true;
        if (periodFilter !== 'all') {
            const shipmentDate = DateUtils.parseDate(date);
            const daysAgo = parseInt(periodFilter);
            const cutoffDate = DateUtils.getDaysAgo(daysAgo);
            matchesPeriod = shipmentDate >= cutoffDate;
        }
        
        const shouldShow = matchesSearch && matchesCustomer && matchesPeriod;
        row.style.display = shouldShow ? '' : 'none';
    });
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
                        <th>Birim Fiyat</th>
                        <th>Toplam</th>
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
                    <td>${NumberUtils.formatUSD(line.unitUsd)}</td>
                    <td>${NumberUtils.formatUSD(line.lineTotalUsd)}</td>
                </tr>
            `;
        });
        
        detailsHtml += `
                </tbody>
            </table>
            <p><strong>Toplam Kg:</strong> ${NumberUtils.formatKg(shipment.totals?.totalKg || 0)}</p>
            <p><strong>Toplam USD:</strong> ${NumberUtils.formatUSD(shipment.totals?.totalUsd || 0)}</p>
        `;
        
        Toast.info(detailsHtml, 10000); // Show for 10 seconds
        
    } catch (error) {
        console.error('View shipment details error:', error);
        Toast.error('Sevk detayları gösterilirken hata oluştu');
    }
}

async function deleteShipment(shipmentId) {
    try {
        const confirmed = await confirmAction(
            'Sevk Sil',
            'Bu sevki silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
            'Sil',
            'İptal'
        );
        
        if (!confirmed) return;
        
        await ShipmentService.delete(shipmentId);
        Toast.success('Sevk başarıyla silindi');
        
        // Reload shipments
        await loadShipments();
        
    } catch (error) {
        console.error('Delete shipment error:', error);
        Toast.error('Sevk silinirken hata oluştu: ' + error.message);
    }
}

// Suppliers Page
async function loadSuppliersPage() {
    try {
        await loadProductionCosts();
        await updatePaymentSummary();
    } catch (error) {
        console.error('Suppliers page load error:', error);
        Toast.error('Ödemeler sayfası yüklenirken hata oluştu');
    }
}

async function updatePaymentSummary() {
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
            yarnPaid += cost.paidAmount || 0;
            
            // Örme maliyetleri
            knittingTotal += cost.ormeCost || 0;
            knittingPaid += cost.paidAmount || 0;
            
            // Boyahane maliyetleri
            dyeingTotal += cost.boyahaneCost || 0;
            dyeingPaid += cost.paidAmount || 0;
        });
        
        const yarnOutstanding = yarnTotal - yarnPaid;
        const knittingOutstanding = knittingTotal - knittingPaid;
        const dyeingOutstanding = dyeingTotal - dyeingPaid;
        
        const totalOutstanding = yarnOutstanding + knittingOutstanding + dyeingOutstanding;
        const totalDebt = yarnTotal + knittingTotal + dyeingTotal;
        
        // Update summary cards
        document.getElementById('yarn-outstanding').textContent = NumberUtils.formatUSD(yarnOutstanding);
        document.getElementById('yarn-total').textContent = NumberUtils.formatUSD(yarnTotal);
        document.getElementById('knitting-outstanding').textContent = NumberUtils.formatUSD(knittingOutstanding);
        document.getElementById('knitting-total').textContent = NumberUtils.formatUSD(knittingTotal);
        document.getElementById('dyeing-outstanding').textContent = NumberUtils.formatUSD(dyeingOutstanding);
        document.getElementById('dyeing-total').textContent = NumberUtils.formatUSD(dyeingTotal);
        document.getElementById('total-outstanding').textContent = NumberUtils.formatUSD(totalOutstanding);
        document.getElementById('total-debt').textContent = NumberUtils.formatUSD(totalDebt);
        
    } catch (error) {
        console.error('Update payment summary error:', error);
        Toast.error('Ödeme özeti güncellenirken hata oluştu');
    }
}

async function loadProductionCosts() {
    try {
        const [costs, lots] = await Promise.all([
            ProductionCostService.getAll(),
            InventoryService.getAll()
        ]);
        
        const tbody = document.getElementById('production-costs-table');
        
        if (costs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="14" class="text-center">Üretim maliyeti bulunamadı</td></tr>';
            return;
        }
        
        tbody.innerHTML = costs.map(cost => {
            // Find the lot to get total kg
            const lot = lots.find(l => l.id === cost.lotId);
            const totalKg = lot ? lot.totalKg : 0;
            
            // Calculate per kg costs
            const iplikPerKg = totalKg > 0 ? (cost.iplikCost || 0) / totalKg : 0;
            const ormePerKg = totalKg > 0 ? (cost.ormeCost || 0) / totalKg : 0;
            const boyahanePerKg = totalKg > 0 ? (cost.boyahaneCost || 0) / totalKg : 0;
            
            const remaining = NumberUtils.round(cost.totalCost - (cost.paidAmount || 0), 2);
            const statusClass = `status-${cost.status}`;
            const statusText = {
                pending: 'Ödeme Bekliyor',
                partial: 'Kısmi Ödendi',
                paid: 'Ödendi'
            }[cost.status] || cost.status;
            
            return `
                <tr>
                    <td>${cost.party}</td>
                    <td>${cost.productName}</td>
                    <td>${NumberUtils.formatKg(totalKg)}</td>
                    <td>${NumberUtils.formatUSD(iplikPerKg, 4)}</td>
                    <td>${NumberUtils.formatUSD(cost.iplikCost || 0)}</td>
                    <td>${NumberUtils.formatUSD(ormePerKg, 4)}</td>
                    <td>${NumberUtils.formatUSD(cost.ormeCost || 0)}</td>
                    <td>${NumberUtils.formatUSD(boyahanePerKg, 4)}</td>
                    <td>${NumberUtils.formatUSD(cost.boyahaneCost || 0)}</td>
                    <td>${NumberUtils.formatUSD(cost.totalCost || 0)}</td>
                    <td>${NumberUtils.formatUSD(cost.paidAmount || 0)}</td>
                    <td>${NumberUtils.formatUSD(remaining)}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn action-btn-edit" onclick="editProductionCost('${cost.id}')">
                                Düzenle
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Update payment summary after loading costs
        await updatePaymentSummary();
        
    } catch (error) {
        console.error('Production costs load error:', error);
        Toast.error('Üretim maliyetleri yüklenirken hata oluştu');
    }
}

// Removed tab functions for simplicity

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
        const csvData = lots.map(lot => ({
            'Ürün': lot.productName,
            'Parti': lot.party,
            'Renk': lot.color || '',
            'En (cm)': lot.widthCm || '',
            'Konum': lot.location || '',
            'Rulo Sayısı': lot.rolls,
            'Ort. kg/Rulo': lot.avgKgPerRoll,
            'Toplam kg': lot.totalKg,
            'Kalan kg': lot.remainingKg,
            'Durum': lot.status,
            'Tarih': DateUtils.formatDate(lot.date)
        }));
        
        CSVUtils.downloadCSV(csvData, 'stok-partileri.csv');
        Toast.success('Stok listesi CSV olarak dışa aktarıldı');
        
    } catch (error) {
        console.error('Export inventory CSV error:', error);
        Toast.error('CSV dışa aktarma hatası');
    }
}

// Data Management Functions
async function loadTestData() {
    try {
        LoadingState.show();
        
        // Clear existing data
        await db.clearAll();
        
        // Create test customers
        const customers = [
            { name: 'Ömer Abi', phone: '0532 123 45 67', email: 'omer@example.com' },
            { name: 'Ahmet Bey', phone: '0533 987 65 43', email: 'ahmet@example.com' },
            { name: 'Fatma Hanım', phone: '0534 555 66 77', email: 'fatma@example.com' }
        ];
        
        for (const customer of customers) {
            await CustomerService.create(customer);
        }
        
        // Create test products
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
        
        // Get created customers and products
        const createdCustomers = await CustomerService.getAll();
        const createdProducts = await ProductService.getAll();
        
        // Create test inventory lots
        const lots = [
            {
                productId: createdProducts[0].id, // Jarse
                party: 'JRS-2024-001',
                color: 'Lacivert',
                widthCm: 150,
                location: 'A-1',
                rolls: 20,
                avgKgPerRoll: 25.5,
                date: DateUtils.getInputDate(DateUtils.getDaysAgo(10))
            },
            {
                productId: createdProducts[0].id, // Jarse
                party: 'JRS-2024-002',
                color: 'Siyah',
                widthCm: 150,
                location: 'A-2',
                rolls: 18,
                avgKgPerRoll: 24.8,
                date: DateUtils.getInputDate(DateUtils.getDaysAgo(8))
            },
            {
                productId: createdProducts[1].id, // Yağmur Damla
                party: 'YGD-2024-001',
                color: 'Kırmızı',
                widthCm: 160,
                location: 'B-1',
                rolls: 15,
                avgKgPerRoll: 22.0,
                date: DateUtils.getInputDate(DateUtils.getDaysAgo(5))
            },
            {
                productId: createdProducts[1].id, // Yağmur Damla
                party: 'YGD-2024-002',
                color: 'Mavi',
                widthCm: 160,
                location: 'B-2',
                rolls: 12,
                avgKgPerRoll: 21.5,
                date: DateUtils.getInputDate(DateUtils.getDaysAgo(4))
            },
            {
                productId: createdProducts[2].id, // Polymenş
                party: 'PLM-2024-001',
                color: 'Beyaz',
                widthCm: 140,
                location: 'C-1',
                rolls: 30,
                avgKgPerRoll: 18.5,
                date: DateUtils.getInputDate(DateUtils.getDaysAgo(3))
            },
            {
                productId: createdProducts[3].id, // Petek Desen
                party: 'PTK-2024-001',
                color: 'Gri',
                widthCm: 145,
                location: 'C-2',
                rolls: 25,
                avgKgPerRoll: 20.0,
                date: DateUtils.getInputDate(DateUtils.getDaysAgo(2))
            },
            {
                productId: createdProducts[4].id, // Lyc Menş
                party: 'LYC-2024-001',
                color: 'Siyah',
                widthCm: 155,
                location: 'D-1',
                rolls: 22,
                avgKgPerRoll: 19.5,
                date: DateUtils.getInputDate(DateUtils.getDaysAgo(1))
            },
            {
                productId: createdProducts[5].id, // Lyc Süprem
                party: 'LYC-2024-002',
                color: 'Lacivert',
                widthCm: 150,
                location: 'D-2',
                rolls: 28,
                avgKgPerRoll: 23.0,
                date: DateUtils.getInputDate()
            }
        ];
        
        for (const lot of lots) {
            await InventoryService.create(lot);
        }
        
        // Get created lots
        const createdLots = await InventoryService.getAll();
        
        // Create test shipments
        const shipments = [
            {
                customerId: createdCustomers[0].id,
                date: DateUtils.getInputDate(DateUtils.getDaysAgo(2)),
                note: 'Test sevk 1',
                lines: [
                    {
                        lineId: 1,
                        lotId: createdLots[0].id,
                        productId: createdProducts[0].id,
                        productName: createdProducts[0].name,
                        party: createdLots[0].party,
                        kg: 50.0,
                        unitUsd: 12.5000,
                        lineTotalUsd: 625.00
                    }
                ]
            },
            {
                customerId: createdCustomers[1].id,
                date: DateUtils.getInputDate(DateUtils.getDaysAgo(1)),
                note: 'Test sevk 2',
                lines: [
                    {
                        lineId: 1,
                        lotId: createdLots[1].id,
                        productId: createdProducts[1].id,
                        productName: createdProducts[1].name,
                        party: createdLots[1].party,
                        kg: 30.0,
                        unitUsd: 15.0000,
                        lineTotalUsd: 450.00
                    }
                ]
            }
        ];
        
        for (const shipment of shipments) {
            await ShipmentService.create(shipment);
        }
        
        // Create test payments
        const payments = [
            {
                customerId: createdCustomers[0].id,
                date: DateUtils.getInputDate(DateUtils.getDaysAgo(1)),
                amountUsd: 300.00,
                method: 'Havale',
                note: 'Kısmi ödeme'
            },
            {
                customerId: createdCustomers[1].id,
                date: DateUtils.getInputDate(),
                amountUsd: 450.00,
                method: 'Nakit',
                note: 'Tam ödeme'
            }
        ];
        
        for (const payment of payments) {
            await PaymentService.create(payment);
        }

        // Create test production costs
        const productionCosts = [
            {
                lotId: createdLots[0].id,
                productId: createdProducts[0].id,
                iplikCost: 1200,
                ormeCost: 800,
                boyahaneCost: 600,
                note: 'Jarse partisi üretim maliyeti'
            },
            {
                lotId: createdLots[1].id,
                productId: createdProducts[1].id,
                iplikCost: 1500,
                ormeCost: 900,
                boyahaneCost: 700,
                note: 'Yağmur damla desen partisi'
            },
            {
                lotId: createdLots[2].id,
                productId: createdProducts[2].id,
                iplikCost: 1800,
                ormeCost: 1100,
                boyahaneCost: 800,
                note: 'Polymenş partisi üretim maliyeti'
            }
        ];

        for (const cost of productionCosts) {
            await ProductionCostService.create(cost);
        }

        // Create test supplier payments
        const supplierPayments = [
            {
                supplierType: 'iplik',
                amount: 2000,
                method: 'Havale',
                date: DateUtils.getInputDate(DateUtils.getDaysAgo(10)),
                note: 'İplik tedarikçisine ödeme'
            },
            {
                supplierType: 'orme',
                amount: 1500,
                method: 'EFT',
                date: DateUtils.getInputDate(DateUtils.getDaysAgo(8)),
                note: 'Örme işçiliği ödemesi'
            },
            {
                supplierType: 'boyahane',
                amount: 1000,
                method: 'Çek',
                date: DateUtils.getInputDate(DateUtils.getDaysAgo(5)),
                note: 'Boyahane ödemesi'
            }
        ];

        for (const payment of supplierPayments) {
            await SupplierService.createPayment(payment);
        }
        
        Toast.success('Test verisi başarıyla yüklendi');
        
        // Refresh current page
        const currentPage = document.querySelector('.page.active').id.replace('-page', '');
        await loadPageContent(currentPage);
        
    } catch (error) {
        console.error('Load test data error:', error);
        Toast.error('Test verisi yüklenirken hata oluştu: ' + error.message);
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
window.loadDashboard = loadDashboard;
window.loadCustomersPage = loadCustomersPage;
window.loadCustomerDetail = loadCustomerDetail;
window.loadInventoryPage = loadInventoryPage;
window.loadReportsPage = loadReportsPage;
window.loadSettingsPage = loadSettingsPage;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
window.editLot = editLot;
window.deleteLot = deleteLot;
window.exportInventoryCSV = exportInventoryCSV;
window.loadTestData = loadTestData;
window.exportData = exportData;
window.clearAllData = clearAllData;
window.handleLogoUpload = handleLogoUpload;
window.removeLogo = removeLogo;
// Supplier action functions
async function showSupplierDetail(supplierType) {
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

function deleteSupplierPayment(paymentId) {
    // TODO: Implement supplier payment deletion
    console.log('Delete supplier payment:', paymentId);
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
window.updatePaymentSummary = updatePaymentSummary;
window.showSupplierDetail = showSupplierDetail;
window.editProductionCost = editProductionCost;
window.deleteSupplierPayment = deleteSupplierPayment;
window.closeModal = closeModal;