// Modal Management for Kumaş Stok Yönetimi

class ModalManager {
    static currentModal = null;

    static show(modalHtml) {
        this.hide(); // Close any existing modal
        
        const modalContainer = document.getElementById('modal-container');
        modalContainer.innerHTML = modalHtml;
        
        const modal = modalContainer.querySelector('.modal-overlay');
        if (modal) {
            this.currentModal = modal;
            
            // Close modal when clicking overlay
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hide();
                }
            });
            
            // Close modal on Escape key
            document.addEventListener('keydown', this.handleEscape);
            
            // Focus first input
            const firstInput = modal.querySelector('input, select, textarea');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    static hide() {
        if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
            document.removeEventListener('keydown', this.handleEscape);
        }
    }

    static handleEscape = (e) => {
        if (e.key === 'Escape') {
            ModalManager.hide();
        }
    }
}

// Customer Modal
function showNewCustomerModal(customer = null) {
    const isEdit = !!customer;
    const title = isEdit ? 'Müşteri Düzenle' : 'Yeni Müşteri';
    
    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal" style="width: 500px;">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="ModalManager.hide()">×</button>
                </div>
                <div class="modal-content">
                    <form id="customer-form">
                        <div class="form-group">
                            <label for="customer-name">Müşteri Adı *</label>
                            <input type="text" id="customer-name" name="name" required 
                                   value="${customer?.name || ''}" placeholder="Müşteri adını girin">
                        </div>
                        <div class="form-group">
                            <label for="customer-phone">Telefon</label>
                            <input type="tel" id="customer-phone" name="phone" 
                                   value="${customer?.phone || ''}" placeholder="Telefon numarasını girin">
                        </div>
                        <div class="form-group">
                            <label for="customer-email">E-posta</label>
                            <input type="email" id="customer-email" name="email" 
                                   value="${customer?.email || ''}" placeholder="E-posta adresini girin">
                        </div>
                        <div class="form-group">
                            <label for="customer-note">Not</label>
                            <textarea id="customer-note" name="note" 
                                      placeholder="Müşteri hakkında notlar">${customer?.note || ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                    <button type="button" class="btn btn-primary" onclick="saveCustomer(${isEdit})">
                        ${isEdit ? 'Güncelle' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    ModalManager.show(modalHtml);
    
    // Store customer data for editing
    if (isEdit) {
        document.getElementById('customer-form').dataset.customerId = customer.id;
    }
}

async function saveCustomer(isEdit = false) {
    try {
        const form = document.getElementById('customer-form');
        const formData = new FormData(form);
        
        const customerData = {
            name: formData.get('name').trim(),
            phone: formData.get('phone').trim(),
            email: formData.get('email').trim(),
            note: formData.get('note').trim()
        };
        
        if (isEdit) {
            customerData.id = form.dataset.customerId;
            await CustomerService.update(customerData);
            Toast.success('Müşteri başarıyla güncellendi');
        } else {
            await CustomerService.create(customerData);
            Toast.success('Müşteri başarıyla eklendi');
        }
        
        ModalManager.hide();
        
        // Refresh customers page if currently active
        if (document.getElementById('customers-page').classList.contains('active')) {
            await loadCustomersPage();
        }
        
    } catch (error) {
        console.error('Customer save error:', error);
        Toast.error(error.message);
    }
}

// Product Modal
function showNewProductModal(product = null) {
    const isEdit = !!product;
    const title = isEdit ? 'Ürün Düzenle' : 'Yeni Ürün';
    
    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal" style="width: 500px;">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="ModalManager.hide()">×</button>
                </div>
                <div class="modal-content">
                    <form id="product-form">
                        <div class="form-group">
                            <label for="product-name">Ürün Adı *</label>
                            <input type="text" id="product-name" name="name" required 
                                   value="${product?.name || ''}" placeholder="Ürün adını girin">
                        </div>
                        <div class="form-group">
                            <label for="product-code">Ürün Kodu</label>
                            <input type="text" id="product-code" name="code" 
                                   value="${product?.code || ''}" placeholder="Ürün kodunu girin">
                        </div>
                        <div class="form-group">
                            <label for="product-note">Not</label>
                            <textarea id="product-note" name="note" 
                                      placeholder="Ürün hakkında notlar">${product?.note || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Birim</label>
                            <input type="text" value="kg" disabled class="form-control">
                            <small class="text-muted">Tüm ürünler kg cinsinden ölçülür</small>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                    <button type="button" class="btn btn-primary" onclick="saveProduct(${isEdit})">
                        ${isEdit ? 'Güncelle' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    ModalManager.show(modalHtml);
    
    if (isEdit) {
        document.getElementById('product-form').dataset.productId = product.id;
    }
}

async function saveProduct(isEdit = false) {
    try {
        const form = document.getElementById('product-form');
        const formData = new FormData(form);
        
        const productData = {
            name: formData.get('name').trim(),
            code: formData.get('code').trim(),
            note: formData.get('note').trim(),
            unit: 'kg'
        };
        
        if (isEdit) {
            productData.id = form.dataset.productId;
            await ProductService.update(productData);
            Toast.success('Ürün başarıyla güncellendi');
        } else {
            await ProductService.create(productData);
            Toast.success('Ürün başarıyla eklendi');
        }
        
        ModalManager.hide();
        
        // Refresh relevant pages
        if (document.getElementById('inventory-page').classList.contains('active')) {
            await loadInventoryPage();
        }
        
    } catch (error) {
        console.error('Product save error:', error);
        Toast.error(error.message);
    }
}

// Inventory Lot Modal
async function showNewLotModal(lot = null) {
    const isEdit = !!lot;
    const title = isEdit ? 'Parti Düzenle' : 'Yeni Parti';
    
    // Get products for dropdown
    const products = await ProductService.getAll();
    const productOptions = products.map(p => 
        `<option value="${p.id}" ${lot?.productId === p.id ? 'selected' : ''}>${p.name}</option>`
    ).join('');
    
    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal" style="width: 600px;">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="ModalManager.hide()">×</button>
                </div>
                <div class="modal-content">
                    <form id="lot-form">
                        <div class="form-group">
                            <label for="lot-product">Ürün *</label>
                            <select id="lot-product" name="productId" required>
                                <option value="">Ürün seçin</option>
                                ${productOptions}
                            </select>
                            <button type="button" class="btn btn-outline btn-sm mt-2" onclick="showNewProductModal()">
                                + Yeni Ürün Ekle
                            </button>
                        </div>
                        <div class="form-group">
                            <label for="lot-party">Parti *</label>
                            <input type="text" id="lot-party" name="party" required 
                                   value="${lot?.party || ''}" placeholder="Parti adını girin">
                        </div>
                        <div class="form-group">
                            <label for="lot-color">Renk</label>
                            <input type="text" id="lot-color" name="color" 
                                   value="${lot?.color || ''}" placeholder="Renk bilgisi">
                        </div>
                        <div class="form-group">
                            <label for="lot-width">En (cm)</label>
                            <input type="number" id="lot-width" name="widthCm" step="0.1" 
                                   value="${lot?.widthCm || ''}" placeholder="Kumaş eni (cm)">
                        </div>
                        <div class="form-group">
                            <label for="lot-location">Konum</label>
                            <input type="text" id="lot-location" name="location" 
                                   value="${lot?.location || ''}" placeholder="Depo konumu">
                        </div>
                        <div class="form-group">
                            <label for="lot-rolls">Rulo Sayısı *</label>
                            <input type="number" id="lot-rolls" name="rolls" required min="1" 
                                   value="${lot?.rolls || ''}" placeholder="Rulo sayısı">
                        </div>
                        <div class="form-group">
                            <label for="lot-avg-kg">Ortalama kg/Rulo *</label>
                            <input type="number" id="lot-avg-kg" name="avgKgPerRoll" required step="0.01" min="0.01" 
                                   value="${lot?.avgKgPerRoll || ''}" placeholder="Ortalama kg/rulo">
                        </div>
                        <div class="form-group">
                            <label for="lot-date">Tarih *</label>
                            <input type="date" id="lot-date" name="date" required 
                                   value="${lot?.date ? DateUtils.getInputDate(new Date(lot.date)) : DateUtils.getInputDate()}">
                        </div>
                        <div class="form-group">
                            <label>Toplam kg</label>
                            <input type="text" id="lot-total-kg" disabled placeholder="Otomatik hesaplanacak">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                    <button type="button" class="btn btn-primary" onclick="saveLot(${isEdit})">
                        ${isEdit ? 'Güncelle' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    ModalManager.show(modalHtml);
    
    if (isEdit) {
        document.getElementById('lot-form').dataset.lotId = lot.id;
    }
    
    // Add event listeners for automatic total calculation
    const rollsInput = document.getElementById('lot-rolls');
    const avgKgInput = document.getElementById('lot-avg-kg');
    const totalKgInput = document.getElementById('lot-total-kg');
    
    function updateTotal() {
        const rolls = NumberUtils.parseNumber(rollsInput.value);
        const avgKg = NumberUtils.parseNumber(avgKgInput.value);
        const total = rolls * avgKg;
        totalKgInput.value = total > 0 ? NumberUtils.formatKg(total) + ' kg' : '';
    }
    
    rollsInput.addEventListener('input', updateTotal);
    avgKgInput.addEventListener('input', updateTotal);
    
    // Initial calculation
    updateTotal();
}

async function saveLot(isEdit = false) {
    try {
        const form = document.getElementById('lot-form');
        const formData = new FormData(form);
        
        const lotData = {
            productId: formData.get('productId'),
            party: formData.get('party').trim(),
            color: formData.get('color').trim(),
            widthCm: NumberUtils.parseNumber(formData.get('widthCm')),
            location: formData.get('location').trim(),
            rolls: NumberUtils.parseNumber(formData.get('rolls')),
            avgKgPerRoll: NumberUtils.parseNumber(formData.get('avgKgPerRoll')),
            date: formData.get('date')
        };
        
        if (isEdit) {
            lotData.id = form.dataset.lotId;
            await InventoryService.update(lotData);
            Toast.success('Parti başarıyla güncellendi');
        } else {
            await InventoryService.create(lotData);
            Toast.success('Parti başarıyla eklendi');
        }
        
        ModalManager.hide();
        
        // Refresh inventory page if currently active
        if (document.getElementById('inventory-page').classList.contains('active')) {
            await loadInventoryPage();
        }
        
        // Update dashboard if currently active
        if (document.getElementById('dashboard-page').classList.contains('active')) {
            await loadDashboard();
        }
        
    } catch (error) {
        console.error('Lot save error:', error);
        Toast.error(error.message);
    }
}

// Payment Modal
async function showNewPaymentModal(customerId = null) {
    // Get customers for dropdown
    const customers = await CustomerService.getAll();
    const customerOptions = customers.map(c => 
        `<option value="${c.id}" ${customerId === c.id ? 'selected' : ''}>${c.name}</option>`
    ).join('');
    
    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal" style="width: 500px;">
                <div class="modal-header">
                    <h3>Tahsilat Ekle</h3>
                    <button class="modal-close" onclick="ModalManager.hide()">×</button>
                </div>
                <div class="modal-content">
                    <form id="payment-form">
                        <div class="form-group">
                            <label for="payment-customer">Müşteri *</label>
                            <select id="payment-customer" name="customerId" required>
                                <option value="">Müşteri seçin</option>
                                ${customerOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="payment-amount">Tutar (USD) *</label>
                            <input type="number" id="payment-amount" name="amountUsd" required step="0.01" min="0.01" 
                                   placeholder="Tahsilat tutarını girin">
                        </div>
                        <div class="form-group">
                            <label for="payment-method">Ödeme Yöntemi</label>
                            <select id="payment-method" name="method">
                                <option value="">Seçin</option>
                                <option value="Nakit">Nakit</option>
                                <option value="Havale">Havale</option>
                                <option value="EFT">EFT</option>
                                <option value="KK">Kredi Kartı</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="payment-date">Tarih *</label>
                            <input type="date" id="payment-date" name="date" required 
                                   value="${DateUtils.getInputDate()}">
                        </div>
                        <div class="form-group">
                            <label for="payment-note">Not</label>
                            <textarea id="payment-note" name="note" 
                                      placeholder="Tahsilat hakkında notlar"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                    <button type="button" class="btn btn-primary" onclick="savePayment()">Kaydet</button>
                </div>
            </div>
        </div>
    `;
    
    ModalManager.show(modalHtml);
}

async function savePayment() {
    try {
        const form = document.getElementById('payment-form');
        const formData = new FormData(form);
        
        const paymentData = {
            customerId: formData.get('customerId'),
            amountUsd: NumberUtils.parseNumber(formData.get('amountUsd')),
            method: formData.get('method'),
            date: formData.get('date'),
            note: formData.get('note').trim()
        };
        
        await PaymentService.create(paymentData);
        Toast.success('Tahsilat başarıyla eklendi');
        
        ModalManager.hide();
        
        // Refresh relevant pages
        const currentPage = document.querySelector('.page.active').id;
        if (currentPage === 'customer-detail-page') {
            await loadCustomerDetail(window.currentCustomerId);
        } else if (currentPage === 'dashboard-page') {
            await loadDashboard();
        }
        
    } catch (error) {
        console.error('Payment save error:', error);
        Toast.error(error.message);
    }
}

// Shipment Modal (Complex)
async function showNewShipmentModal(customerId = null) {
    const customers = await CustomerService.getAll();
    const products = await ProductService.getAll();
    
    const customerOptions = customers.map(c => 
        `<option value="${c.id}" ${customerId === c.id ? 'selected' : ''}>${c.name}</option>`
    ).join('');
    
    const productOptions = products.map(p => 
        `<option value="${p.id}">${p.name}</option>`
    ).join('');
    
    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal" style="width: 800px; max-height: 90vh;">
                <div class="modal-header">
                    <h3>Yeni Sevk</h3>
                    <button class="modal-close" onclick="ModalManager.hide()">×</button>
                </div>
                <div class="modal-content" style="max-height: calc(90vh - 120px); overflow-y: auto;">
                    <form id="shipment-form">
                        <div class="form-group">
                            <label for="shipment-customer">Müşteri *</label>
                            <select id="shipment-customer" name="customerId" required>
                                <option value="">Müşteri seçin</option>
                                ${customerOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="shipment-date">Tarih *</label>
                            <input type="date" id="shipment-date" name="date" required 
                                   value="${DateUtils.getInputDate()}">
                        </div>
                        <div class="form-group">
                            <label>Ürün Seçimi</label>
                            <select id="product-selector">
                                <option value="">Ürün seçin</option>
                                ${productOptions}
                            </select>
                            <button type="button" class="btn btn-primary btn-sm mt-2" onclick="addShipmentLine()">
                                Satır Ekle
                            </button>
                        </div>
                        
                        <div id="shipment-lines">
                            <h4>Sevk Satırları</h4>
                            <div id="lines-container">
                                <!-- Shipment lines will be added here -->
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="shipment-note">Not</label>
                            <textarea id="shipment-note" name="note" 
                                      placeholder="Sevk hakkında notlar"></textarea>
                        </div>
                        
                        <div class="shipment-totals">
                            <div class="totals-row">
                                <span class="label">Toplam Kg:</span>
                                <span id="total-kg" class="value">0.00</span>
                            </div>
                            <div class="totals-row">
                                <span class="label">Toplam USD:</span>
                                <span id="total-usd" class="value">$0.00</span>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                    <button type="button" class="btn btn-primary" onclick="saveShipment()">Kaydet ve Makbuz Yazdır</button>
                </div>
            </div>
        </div>
    `;
    
    ModalManager.show(modalHtml);
    
    // Add styles for shipment modal
    const style = document.createElement('style');
    style.textContent = `
        .shipment-totals {
            background-color: #f8fafc;
            padding: 16px;
            border-radius: 6px;
            margin-top: 16px;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-weight: 500;
        }
        .totals-row:last-child {
            margin-bottom: 0;
            font-size: 18px;
            font-weight: 700;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
        }
        .line-item {
            background-color: #f8fafc;
            padding: 16px;
            border-radius: 6px;
            margin-bottom: 12px;
            border: 1px solid #e2e8f0;
        }
        .line-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .line-fields {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 12px;
        }
        .lot-selection {
            margin-bottom: 12px;
        }
        .lot-option {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            margin-bottom: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .lot-option:hover {
            background-color: #f3f4f6;
            border-color: #9ca3af;
        }
        .lot-option.selected {
            background-color: #dbeafe;
            border-color: #3b82f6;
        }
        .lot-info {
            flex: 1;
        }
        .lot-available {
            color: #059669;
            font-weight: 500;
        }
    `;
    document.head.appendChild(style);
    
    window.shipmentLineCounter = 0;
    window.shipmentLines = [];
}

async function addShipmentLine() {
    const productSelect = document.getElementById('product-selector');
    const productId = productSelect.value;
    
    if (!productId) {
        Toast.warning('Lütfen bir ürün seçin');
        return;
    }
    
    const product = await ProductService.getById(productId);
    const availableLots = await InventoryService.getAvailableLots(productId);
    
    if (availableLots.length === 0) {
        Toast.warning('Bu ürün için stokta parti bulunmuyor');
        return;
    }
    
    const lineId = ++window.shipmentLineCounter;
    
    const lotOptions = availableLots.map(lot => `
        <div class="lot-option" data-lot-id="${lot.id}" data-line-id="${lineId}">
            <div class="lot-info">
                <strong>${lot.party}</strong> 
                ${lot.color ? `- ${lot.color}` : ''}
                ${lot.location ? `(${lot.location})` : ''}
            </div>
            <div class="lot-available">${NumberUtils.formatKg(lot.remainingKg)} kg</div>
        </div>
    `).join('');
    
    const lineHtml = `
        <div class="line-item" id="line-${lineId}">
            <div class="line-header">
                <h5>${product.name}</h5>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeLine('${lineId}')">Kaldır</button>
            </div>
            <div class="lot-selection">
                <label>Parti Seçimi:</label>
                <div id="lots-${lineId}">
                    ${lotOptions}
                </div>
            </div>
            <div class="line-fields">
                <div class="form-group">
                    <label>Kg *</label>
                    <input type="number" id="kg-${lineId}" step="0.01" min="0.01" 
                           onchange="updateLineTotal('${lineId}')" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>Birim Fiyat (USD) *</label>
                    <input type="number" id="unit-${lineId}" step="0.0001" min="0" 
                           onchange="updateLineTotal('${lineId}')" placeholder="0.0000">
                </div>
                <div class="form-group">
                    <label>Toplam USD</label>
                    <input type="text" id="total-${lineId}" disabled placeholder="$0.00">
                </div>
                <div class="form-group">
                    <label>Seçili Parti</label>
                    <input type="text" id="selected-lot-${lineId}" disabled placeholder="Parti seçin">
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('lines-container').insertAdjacentHTML('beforeend', lineHtml);
    
    // Add to lines array
    window.shipmentLines.push({
        id: lineId,
        productId: productId,
        productName: product.name,
        lotId: null,
        kg: 0,
        unitUsd: 0,
        lineTotalUsd: 0
    });
    
    // Add event listeners to lot options
    document.querySelectorAll(`#lots-${lineId} .lot-option`).forEach(option => {
        option.addEventListener('click', function() {
            const lotId = this.dataset.lotId;
            const currentLineId = this.dataset.lineId;
            selectLot(currentLineId, lotId);
        });
    });
    
    // Reset product selector
    productSelect.value = '';
}

function selectLot(lineId, lotId) {
    // Remove previous selection
    document.querySelectorAll(`#lots-${lineId} .lot-option`).forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Select new lot
    const lotOption = document.querySelector(`#lots-${lineId} .lot-option[data-lot-id="${lotId}"]`);
    if (lotOption) {
        lotOption.classList.add('selected');
        
        // Update selected lot display
        const lotInfo = lotOption.querySelector('.lot-info').textContent;
        document.getElementById(`selected-lot-${lineId}`).value = lotInfo;
        
        // Update line data
        const line = window.shipmentLines.find(l => l.id == lineId);
        if (line) {
            line.lotId = lotId;
        }
        
        console.log('Lot selected:', lotId, 'for line:', lineId);
    } else {
        console.error('Lot option not found:', lotId, lineId);
    }
}

function updateLineTotal(lineId) {
    const kgInput = document.getElementById(`kg-${lineId}`);
    const unitInput = document.getElementById(`unit-${lineId}`);
    const totalInput = document.getElementById(`total-${lineId}`);
    
    const kg = NumberUtils.parseNumber(kgInput.value);
    const unitUsd = NumberUtils.parseNumber(unitInput.value);
    const total = NumberUtils.round(kg * unitUsd, 2);
    
    totalInput.value = NumberUtils.formatUSD(total);
    
    // Update line data
    const line = window.shipmentLines.find(l => l.id == lineId);
    if (line) {
        line.kg = kg;
        line.unitUsd = unitUsd;
        line.lineTotalUsd = total;
    }
    
    updateShipmentTotals();
}

function updateShipmentTotals() {
    let totalKg = 0;
    let totalUsd = 0;
    
    window.shipmentLines.forEach(line => {
        totalKg += line.kg || 0;
        totalUsd += line.lineTotalUsd || 0;
    });
    
    document.getElementById('total-kg').textContent = NumberUtils.formatKg(totalKg);
    document.getElementById('total-usd').textContent = NumberUtils.formatUSD(totalUsd);
}

function removeLine(lineId) {
    document.getElementById(`line-${lineId}`).remove();
    window.shipmentLines = window.shipmentLines.filter(l => l.id != lineId);
    updateShipmentTotals();
}

async function saveShipment() {
    try {
        const form = document.getElementById('shipment-form');
        const formData = new FormData(form);
        
        // Validate lines
        if (window.shipmentLines.length === 0) {
            throw new Error('En az bir sevk satırı eklemelisiniz');
        }
        
        // Validate each line
        for (const line of window.shipmentLines) {
            if (!line.lotId) {
                throw new Error(`${line.productName} için parti seçmelisiniz`);
            }
            if (!line.kg || line.kg <= 0) {
                throw new Error(`${line.productName} için kg miktarı girmelisiniz`);
            }
            if (!line.unitUsd || line.unitUsd < 0) {
                throw new Error(`${line.productName} için birim fiyat girmelisiniz`);
            }
        }
        
        const shipmentData = {
            customerId: formData.get('customerId'),
            date: formData.get('date'),
            note: formData.get('note').trim(),
            lines: window.shipmentLines.map(line => ({
                lineId: line.id,
                lotId: line.lotId,
                productId: line.productId,
                productName: line.productName,
                party: document.getElementById(`selected-lot-${line.id}`).value,
                kg: line.kg,
                unitUsd: line.unitUsd,
                lineTotalUsd: line.lineTotalUsd
            }))
        };
        
        const shipment = await ShipmentService.create(shipmentData);
        Toast.success('Sevk başarıyla oluşturuldu');
        
        ModalManager.hide();
        
        // Print receipt with slight delay to ensure DB transaction is complete
        setTimeout(() => {
            console.log('Printing receipt for shipment:', shipment.id);
            if (shipment.id) {
                printShipmentReceipt(shipment.id);
            } else {
                console.error('Shipment ID is missing:', shipment);
                Toast.error('Sevk ID bulunamadı, makbuz yazdırılamadı');
            }
        }, 100);
        
        // Refresh relevant pages
        const currentPage = document.querySelector('.page.active').id;
        if (currentPage === 'customer-detail-page') {
            await loadCustomerDetail(window.currentCustomerId);
        } else if (currentPage === 'dashboard-page') {
            await loadDashboard();
        } else if (currentPage === 'inventory-page') {
            await loadInventoryPage();
        }
        
    } catch (error) {
        console.error('Shipment save error:', error);
        Toast.error(error.message);
    }
}

// Confirmation Modal
function showConfirmModal(title, message, onConfirm) {
    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal" style="width: 400px;">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="ModalManager.hide()">×</button>
                </div>
                <div class="modal-content">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                    <button type="button" class="btn btn-danger" onclick="confirmAction()">Onayla</button>
                </div>
            </div>
        </div>
    `;
    
    ModalManager.show(modalHtml);
    
    window.confirmCallback = onConfirm;
}

function confirmAction() {
    if (window.confirmCallback) {
        window.confirmCallback();
        window.confirmCallback = null;
    }
    ModalManager.hide();
}

// CSV Import Modal
function showImportCSVModal() {
    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal" style="width: 500px;">
                <div class="modal-header">
                    <h3>CSV İçe Aktar</h3>
                    <button class="modal-close" onclick="ModalManager.hide()">×</button>
                </div>
                <div class="modal-content">
                    <div class="form-group">
                        <label for="csv-file">CSV Dosyası Seçin</label>
                        <input type="file" id="csv-file" accept=".csv" />
                    </div>
                    <div class="form-group">
                        <p><strong>Beklenen Format:</strong></p>
                        <p>productId, party, color, widthCm, location, rolls, avgKgPerRoll, date</p>
                        <p><small>İlk satır başlık satırı olarak kabul edilir.</small></p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                    <button type="button" class="btn btn-primary" onclick="importCSV()">İçe Aktar</button>
                </div>
            </div>
        </div>
    `;
    
    ModalManager.show(modalHtml);
}

async function importCSV() {
    try {
        const fileInput = document.getElementById('csv-file');
        const file = fileInput.files[0];
        
        if (!file) {
            throw new Error('Lütfen bir CSV dosyası seçin');
        }
        
        const text = await file.text();
        const data = CSVUtils.csvToArray(text);
        
        if (data.length === 0) {
            throw new Error('CSV dosyası boş');
        }
        
        // Validate and import data
        const lots = [];
        for (const row of data) {
            const lot = {
                productId: row.productId,
                party: row.party,
                color: row.color || '',
                widthCm: NumberUtils.parseNumber(row.widthCm),
                location: row.location || '',
                rolls: NumberUtils.parseNumber(row.rolls),
                avgKgPerRoll: NumberUtils.parseNumber(row.avgKgPerRoll),
                date: row.date || DateUtils.getInputDate()
            };
            
            lots.push(lot);
        }
        
        // Create lots
        for (const lot of lots) {
            await InventoryService.create(lot);
        }
        
        Toast.success(`${lots.length} parti başarıyla içe aktarıldı`);
        ModalManager.hide();
        
        // Refresh inventory page
        if (document.getElementById('inventory-page').classList.contains('active')) {
            await loadInventoryPage();
        }
        
    } catch (error) {
        console.error('CSV import error:', error);
        Toast.error(error.message);
    }
}

// Supplier Modal
function showNewSupplierModal(supplier = null) {
    const isEdit = !!supplier;
    const title = isEdit ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi';
    
    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal" style="width: 500px;">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="ModalManager.hide()">×</button>
                </div>
                <div class="modal-content">
                    <form id="supplier-form">
                        <div class="form-group">
                            <label for="supplier-name">Tedarikçi Adı *</label>
                            <input type="text" id="supplier-name" name="name" required 
                                   value="${supplier?.name || ''}" placeholder="Tedarikçi adını girin">
                        </div>
                        <div class="form-group">
                            <label for="supplier-type">Tür *</label>
                            <select id="supplier-type" name="type" required>
                                <option value="">Tür seçin</option>
                                <option value="iplik" ${supplier?.type === 'iplik' ? 'selected' : ''}>İplikçi</option>
                                <option value="orme" ${supplier?.type === 'orme' ? 'selected' : ''}>Örme</option>
                                <option value="boyahane" ${supplier?.type === 'boyahane' ? 'selected' : ''}>Boyahane</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="supplier-contact">İletişim Bilgileri</label>
                            <textarea id="supplier-contact" name="contactInfo" 
                                      placeholder="Telefon, adres vb.">${supplier?.contactInfo || ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                    <button type="button" class="btn btn-primary" onclick="saveSupplier(${isEdit})">
                        ${isEdit ? 'Güncelle' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    ModalManager.show(modalHtml);
    
    if (isEdit) {
        document.getElementById('supplier-form').dataset.supplierId = supplier.id;
    }
}

async function saveSupplier(isEdit = false) {
    try {
        const form = document.getElementById('supplier-form');
        const formData = new FormData(form);
        
        const supplierData = {
            name: formData.get('name').trim(),
            type: formData.get('type'),
            contactInfo: formData.get('contactInfo').trim()
        };
        
        if (isEdit) {
            supplierData.id = form.dataset.supplierId;
            await SupplierService.update(supplierData);
            Toast.success('Tedarikçi başarıyla güncellendi');
        } else {
            await SupplierService.create(supplierData);
            Toast.success('Tedarikçi başarıyla eklendi');
        }
        
        ModalManager.hide();
        
        // Refresh suppliers page if currently active
        if (document.getElementById('suppliers-page').classList.contains('active')) {
            await loadSuppliersPage();
        }
        
    } catch (error) {
        console.error('Supplier save error:', error);
        Toast.error(error.message);
    }
}

// Supplier Payment Modal
function showNewSupplierPaymentModal() {
    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal" style="width: 500px;">
                <div class="modal-header">
                    <h3>Tedarikçiye Ödeme</h3>
                    <button class="modal-close" onclick="ModalManager.hide()">×</button>
                </div>
                <div class="modal-content">
                    <form id="supplier-payment-form">
                        <div class="form-group">
                            <label for="payment-supplier-type">Tedarikçi *</label>
                            <select id="payment-supplier-type" name="supplierType" required>
                                <option value="">Tedarikçi seçin</option>
                                <option value="iplik">İplikçi</option>
                                <option value="orme">Örme</option>
                                <option value="boyahane">Boyahane</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="payment-amount">Tutar (USD) *</label>
                            <input type="number" id="payment-amount" name="amount" required step="0.01" min="0.01" 
                                   placeholder="Ödeme tutarını girin">
                        </div>
                        <div class="form-group">
                            <label for="payment-method">Ödeme Yöntemi</label>
                            <select id="payment-method" name="method">
                                <option value="">Seçin</option>
                                <option value="Nakit">Nakit</option>
                                <option value="Havale">Havale</option>
                                <option value="EFT">EFT</option>
                                <option value="Çek">Çek</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="payment-date">Tarih *</label>
                            <input type="date" id="payment-date" name="date" required 
                                   value="${DateUtils.getInputDate()}">
                        </div>
                        <div class="form-group">
                            <label for="payment-note">Not</label>
                            <textarea id="payment-note" name="note" 
                                      placeholder="Ödeme hakkında notlar"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                    <button type="button" class="btn btn-primary" onclick="saveSupplierPayment()">Kaydet</button>
                </div>
            </div>
        </div>
    `;
    
    ModalManager.show(modalHtml);
}

async function saveSupplierPayment() {
    try {
        const form = document.getElementById('supplier-payment-form');
        const formData = new FormData(form);
        
        const paymentData = {
            supplierType: formData.get('supplierType'),
            amount: NumberUtils.parseNumber(formData.get('amount')),
            method: formData.get('method'),
            date: formData.get('date'),
            note: formData.get('note').trim()
        };
        
        await SupplierService.createPayment(paymentData);
        Toast.success('Ödeme başarıyla kaydedildi');
        
        ModalManager.hide();
        
        // Refresh suppliers page if currently active
        if (document.getElementById('suppliers-page').classList.contains('active')) {
            await loadSuppliersPage();
        }
        
    } catch (error) {
        console.error('Supplier payment save error:', error);
        Toast.error(error.message);
    }
}

// Data Import Modal
function showImportDataModal() {
    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal" style="width: 500px;">
                <div class="modal-header">
                    <h3>Veri İçe Aktar</h3>
                    <button class="modal-close" onclick="ModalManager.hide()">×</button>
                </div>
                <div class="modal-content">
                    <div class="form-group">
                        <label for="data-file">JSON Dosyası Seçin</label>
                        <input type="file" id="data-file" accept=".json" />
                    </div>
                    <div class="alert alert-warning">
                        <strong>Uyarı:</strong> Bu işlem mevcut tüm verileri silecek ve seçilen dosyadaki verilerle değiştirecektir.
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                    <button type="button" class="btn btn-danger" onclick="importData()">İçe Aktar</button>
                </div>
            </div>
        </div>
    `;
    
    ModalManager.show(modalHtml);
}

async function importData() {
    try {
        const fileInput = document.getElementById('data-file');
        const file = fileInput.files[0];
        
        if (!file) {
            throw new Error('Lütfen bir JSON dosyası seçin');
        }
        
        const text = await file.text();
        const data = JSON.parse(text);
        
        LoadingState.show();
        await db.importData(data);
        
        Toast.success('Veriler başarıyla içe aktarıldı');
        ModalManager.hide();
        
        // Refresh current page
        const currentPage = document.querySelector('.page.active').id;
        switch (currentPage) {
            case 'dashboard-page':
                await loadDashboard();
                break;
            case 'customers-page':
                await loadCustomersPage();
                break;
            case 'inventory-page':
                await loadInventoryPage();
                break;
        }
        
    } catch (error) {
        console.error('Data import error:', error);
        Toast.error('Veri içe aktarma hatası: ' + error.message);
    } finally {
        LoadingState.hide();
    }
}

// Export global functions
window.ModalManager = ModalManager;
window.showNewCustomerModal = showNewCustomerModal;
window.showNewProductModal = showNewProductModal;
window.showNewLotModal = showNewLotModal;
window.showNewPaymentModal = showNewPaymentModal;
window.showNewShipmentModal = showNewShipmentModal;
window.showConfirmModal = showConfirmModal;
window.showImportCSVModal = showImportCSVModal;
window.showImportDataModal = showImportDataModal;
window.selectLot = selectLot;
window.updateLineTotal = updateLineTotal;
window.removeLine = removeLine;
window.addShipmentLine = addShipmentLine;
window.saveShipment = saveShipment;
window.saveCustomer = saveCustomer;
window.saveProduct = saveProduct;
window.saveLot = saveLot;
window.savePayment = savePayment;
window.confirmAction = confirmAction;
window.importCSV = importCSV;
window.importData = importData;
window.showNewSupplierModal = showNewSupplierModal;
window.showNewSupplierPaymentModal = showNewSupplierPaymentModal;
window.saveSupplier = saveSupplier;
window.saveSupplierPayment = saveSupplierPayment;