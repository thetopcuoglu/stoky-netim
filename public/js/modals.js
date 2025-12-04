// Modal Management for Kumaş Stok Yönetimifir

class ModalManager {
    static currentModal = null;

    static show(modalHtml) {
        this.hide(); // Close any existing modal
        
        const modalContainer = document.getElementById('modal-container');
        modalContainer.style.display = 'block';
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
            
            // Focus first input immediately without any delay
            const firstInput = modal.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }

    static hide() {
        if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
            document.removeEventListener('keydown', this.handleEscape);
            
            // Hide modal container
            const modalContainer = document.getElementById('modal-container');
            if (modalContainer) {
                modalContainer.style.display = 'none';
            }
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
                            <input type="text" id="customer-name" name="name" 
                                   value="${customer?.name || ''}" placeholder="Müşteri adını girin">
                        </div>
                        <div class="form-group">
                            <label for="customer-phone">Telefon</label>
                            <input type="tel" id="customer-phone" name="phone" 
                                   value="${customer?.phone || ''}" placeholder="Telefon numarası (isteğe bağlı)">
                        </div>
                        <div class="form-group">
                            <label for="customer-email">E-posta</label>
                            <input type="email" id="customer-email" name="email" 
                                   value="${customer?.email || ''}" placeholder="E-posta adresi (isteğe bağlı)">
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
    const title = isEdit ? 'Kumaş Düzenle' : 'Yeni Kumaş';
    
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
                            <label for="product-name">Kumaş Adı *</label>
                            <input type="text" id="product-name" name="name" required 
                                   value="${product?.name || ''}" placeholder="Kumaş adını girin">
                        </div>
                        <div class="form-group">
                            <label for="product-code">Kumaş Kodu</label>
                            <input type="text" id="product-code" name="code" 
                                   value="${product?.code || ''}" placeholder="Kumaş kodunu girin">
                        </div>
                        <div class="form-group">
                            <label for="product-note">Not</label>
                            <textarea id="product-note" name="note" 
                                      placeholder="Kumaş hakkında notlar">${product?.note || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Birim</label>
                            <input type="text" value="kg" disabled class="form-control">
                            <small class="text-muted">Tüm kumaşlar kg cinsinden ölçülür</small>
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
            Toast.success('Kumaş başarıyla güncellendi');
        } else {
            await ProductService.create(productData);
            Toast.success('Kumaş başarıyla eklendi');
        }
        
        ModalManager.hide();
        
        // Refresh relevant pages
        if (document.getElementById('inventory-page').classList.contains('active')) {
            await loadInventoryPage();
        }
        if (document.getElementById('products-page').classList.contains('active')) {
            await loadProductsPage();
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
    
    console.log('🔧 showNewLotModal çağrıldı:', { isEdit, lot });
    
    // Get products for dropdown - if no products exist, create default fabric names
    let products = await ProductService.getAll();
    
    // If no products exist, create default fabric options
    if (products.length === 0) {
        const defaultFabrics = [
            { name: 'Jarse (Mikro Polyester)', code: 'JRS001' },
            { name: 'Yağmur Damla Desen', code: 'YGD001' },
            { name: 'Polymenş (Mikro Polyester File)', code: 'PLM001' },
            { name: 'Petek Desen', code: 'PTK001' },
            { name: 'Lyc Menş', code: 'LYC001' },
            { name: 'Lyc Süprem', code: 'LYC002' },
            { name: 'Lyc Dalgıç Şardonlu', code: 'LYC003' },
            { name: 'Lyc Scuba', code: 'LYC004' }
        ];
        
        for (const fabric of defaultFabrics) {
            await ProductService.create(fabric);
        }
        
        products = await ProductService.getAll();
    }
    
    const productOptions = products.map(p => 
        `<option value="${p.id}" ${lot?.productId === p.id ? 'selected' : ''}>${p.name}</option>`
    ).join('');
    
    // Warehouses (Depo) options from localStorage with default "Zeytinburnu"
    let warehouses;
    try {
        warehouses = JSON.parse(localStorage.getItem('warehouses') || '[]');
    } catch {
        warehouses = [];
    }
    if (!Array.isArray(warehouses) || warehouses.length === 0) {
        warehouses = ['Zeytinburnu'];
    }
    const preferredWarehouse = (lot?.location && typeof lot.location === 'string' && lot.location.trim()) || 'Zeytinburnu';
    if (preferredWarehouse && !warehouses.includes(preferredWarehouse)) {
        warehouses.unshift(preferredWarehouse);
    }
    const warehouseOptions = warehouses.map(w => 
        `<option value="${w}" ${preferredWarehouse === w ? 'selected' : ''}>${w}</option>`
    ).join('');

    // Color options: get from localStorage with default "Beyaz"
    let colors;
    try {
        colors = JSON.parse(localStorage.getItem('colors') || '[]');
    } catch {
        colors = [];
    }
    if (!Array.isArray(colors) || colors.length === 0) {
        colors = ['Beyaz'];
    }
    const selectedColor = (lot?.color && typeof lot.color === 'string' && lot.color.trim()) || 'Beyaz';
    if (selectedColor && !colors.includes(selectedColor)) {
        colors.unshift(selectedColor);
    }
    const colorOptions = colors.map(c => 
        `<option value="${c}" ${selectedColor === c ? 'selected' : ''}>${c}</option>`
    ).join('') + '<option value="__add_new__">+ Renk Ekle</option>';
    
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
                            <label for="lot-product">Kumaş *</label>
                            <select id="lot-product" name="productId" required>
                                <option value="">Kumaş seçin</option>
                                ${productOptions}
                            </select>
                            <button type="button" class="btn btn-outline btn-sm mt-2" onclick="showNewProductModal()">
                                + Yeni Kumaş Ekle
                            </button>
                        </div>
                        <div class="form-group">
                            <label for="lot-party">Parti *</label>
                            <input type="text" id="lot-party" name="party" required 
                                   value="${lot?.party || ''}" placeholder="Parti adını girin">
                        </div>
                        <div class="form-group">
                            <label for="lot-color">Renk</label>
                            <select id="lot-color" name="color">
                                ${colorOptions}
                            </select>
                            <small class="text-muted">Renk seçin veya "+ Renk Ekle" ile yeni renk ekleyin</small>
                        </div>
                        <div class="form-group">
                            <label for="lot-location">Depo</label>
                            <select id="lot-location" name="location" required>
                                ${warehouseOptions}
                            </select>
                            <button type="button" class="btn btn-outline btn-sm mt-2" onclick="addWarehouseOption('lot-location')">
                                + Depo Ekle
                            </button>
                        </div>
                        <div class="form-group">
                            <label for="lot-total-kg">Toplam kg *</label>
                            <input type="number" id="lot-total-kg" name="totalKg" required step="0.01" min="0.01" 
                                   value="${lot?.totalKg || ''}" placeholder="Toplam kilo">
                        </div>
                        <div class="form-group">
                            <label for="lot-rolls">Rulo Sayısı *</label>
                            <input type="number" id="lot-rolls" name="rolls" required min="1" 
                                   value="${lot?.rolls || ''}" placeholder="Rulo sayısı">
                        </div>
                        <div class="form-group">
                            <label>Ortalama kg/Rulo</label>
                            <input type="text" id="lot-avg-kg" disabled placeholder="Otomatik hesaplanacak">
                        </div>
                        <div class="form-group">
                            <label for="lot-date">Tarih *</label>
                            <input type="date" id="lot-date" name="date" required 
                                   value="${lot?.date ? DateUtils.getInputDate(new Date(lot.date)) : DateUtils.getInputDate()}">
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

    // Add event listener for color selection
    setTimeout(() => {
        const colorSelect = document.getElementById('lot-color');
        if (colorSelect) {
            colorSelect.addEventListener('change', function() {
                if (this.value === '__add_new__') {
                    const newColor = prompt('Yeni renk adı:');
                    if (newColor === null) {
                        this.value = selectedColor; // Reset to previous selection
                        return;
                    }
                    const colorName = String(newColor).trim();
                    if (!colorName) {
                        this.value = selectedColor; // Reset to previous selection
                        return;
                    }
                    
                    // Add to localStorage
                    let colors;
                    try {
                        colors = JSON.parse(localStorage.getItem('colors') || '[]');
                    } catch {
                        colors = [];
                    }
                    if (!Array.isArray(colors)) { colors = []; }
                    if (!colors.includes(colorName)) {
                        colors.push(colorName);
                        localStorage.setItem('colors', JSON.stringify(colors));
                    }
                    
                    // Update select options
                    const currentValue = this.value;
                    const options = colors.map(c => 
                        `<option value="${c}" ${c === colorName ? 'selected' : ''}>${c}</option>`
                    ).join('') + '<option value="__add_new__">+ Renk Ekle</option>';
                    this.innerHTML = options;
                    this.value = colorName;
                }
            });
        }
    }, 100);

    // Global helper to add new warehouse on the fly
    window.addWarehouseOption = function(selectId) {
        const input = prompt('Yeni depo adı:');
        if (input === null) { return; }
        const newWarehouse = String(input).trim();
        if (!newWarehouse) { return; }
        let list;
        try {
            list = JSON.parse(localStorage.getItem('warehouses') || '[]');
        } catch {
            list = [];
        }
        if (!Array.isArray(list)) { list = []; }
        if (!list.includes(newWarehouse)) {
            list.push(newWarehouse);
            localStorage.setItem('warehouses', JSON.stringify(list));
        }
        const selectEl = document.getElementById(selectId);
        if (selectEl) {
            const exists = Array.from(selectEl.options).some(o => o.value === newWarehouse);
            if (!exists) {
                const opt = document.createElement('option');
                opt.value = newWarehouse;
                opt.textContent = newWarehouse;
                selectEl.appendChild(opt);
            }
            selectEl.value = newWarehouse;
        }
        if (typeof Toast !== 'undefined') {
            Toast.success('Depo eklendi');
        }
    };
    
    if (isEdit && lot && lot.id) {
        console.log('📝 Edit modunda lot ID set ediliyor:', lot.id, typeof lot.id);
        const form = document.getElementById('lot-form');
        if (form) {
            // ID'yi string olarak set et
            form.dataset.lotId = String(lot.id).trim();
            console.log('✅ Form dataset lotId set edildi:', form.dataset.lotId);
        } else {
            console.error('❌ Form bulunamadı, lot ID set edilemedi');
        }
    } else if (isEdit) {
        console.error('❌ Edit modunda ama lot veya lot.id bulunamadı:', { lot, isEdit });
    }
    
    // Add event listeners for automatic average kg calculation
    const rollsInput = document.getElementById('lot-rolls');
    const totalKgInput = document.getElementById('lot-total-kg');
    const avgKgInput = document.getElementById('lot-avg-kg');
    
    function updateAvgKg() {
        const rolls = NumberUtils.parseNumber(rollsInput.value);
        const totalKg = NumberUtils.parseNumber(totalKgInput.value);
        const avgKg = rolls > 0 && totalKg > 0 ? totalKg / rolls : 0;
        avgKgInput.value = avgKg > 0 ? NumberUtils.formatKg(avgKg) + ' kg/rulo' : '';
    }
    
    rollsInput.addEventListener('input', updateAvgKg);
    totalKgInput.addEventListener('input', updateAvgKg);
    
    // Initial calculation
    updateAvgKg();
}

async function saveLot(isEdit = false) {
    try {
        console.log('💾 saveLot çağrıldı:', { isEdit });
        
        const form = document.getElementById('lot-form');
        if (!form) {
            throw new Error('Form bulunamadı');
        }
        
        const formData = new FormData(form);
        
        const totalKg = NumberUtils.parseNumber(formData.get('totalKg'));
        const rolls = NumberUtils.parseNumber(formData.get('rolls'));
        const avgKgPerRoll = rolls > 0 && totalKg > 0 ? totalKg / rolls : 0;
        
        const lotData = {
            productId: formData.get('productId'),
            party: formData.get('party').trim(),
            color: formData.get('color').trim(),
            location: formData.get('location').trim(),
            rolls: rolls,
            avgKgPerRoll: avgKgPerRoll,
            totalKg: totalKg,
            date: formData.get('date')
        };
        
        console.log('📦 Lot verisi (ID öncesi):', lotData);
        
        if (isEdit) {
            // ID'yi form dataset'inden güvenli şekilde al
            const lotId = form.dataset.lotId;
            console.log('🔍 Form dataset lotId:', lotId, typeof lotId);
            
            if (!lotId || lotId === 'undefined' || lotId === 'null') {
                throw new Error('Lot ID bulunamadı veya geçersiz');
            }
            
            // ID'yi string olarak set et
            lotData.id = String(lotId).trim();
            console.log('🔄 Update edilecek lot ID:', lotData.id, typeof lotData.id);
            
            console.log('📦 Final lot verisi (update için):', lotData);
            
            await InventoryService.update(lotData);
            Toast.success('Parti başarıyla güncellendi');
            console.log('✅ Parti güncellendi');
        } else {
            console.log('📦 Final lot verisi (create için):', lotData);
            await InventoryService.create(lotData);
            Toast.success('Parti başarıyla eklendi');
            console.log('✅ Parti eklendi');
        }
        
        ModalManager.hide();
        
        // Refresh inventory page if currently active
        if (document.getElementById('inventory-page').classList.contains('active')) {
            await loadInventoryPage();
        }
        if (document.getElementById('products-page').classList.contains('active')) {
            await loadProductsPage();
        }
        
        // Update dashboard if currently active
        const dashboardPage = document.getElementById('dashboard-page');
        if (dashboardPage && dashboardPage.classList.contains('active')) {
            await loadDashboard();
        }
        
    } catch (error) {
        console.error('❌ Lot save error:', error);
        Toast.error(error.message);
    }
}

// Payment Modal
async function showNewPaymentModal(customerId = null) {
    console.log('🎯 showNewPaymentModal çağrıldı, customerId:', customerId);
    
    // Get customers for dropdown
    const customers = await CustomerService.getAll();
    const customerOptions = customers.map(c => 
        `<option value="${c.id}" ${customerId === c.id ? 'selected' : ''}>${c.name}</option>`
    ).join('');
    
    console.log('🎯 Modal HTML oluşturuluyor...');
    
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
    
    console.log('🎯 Modal gösteriliyor...');
    ModalManager.show(modalHtml);
    
    // Form submit event listener'ı kaldırdık - sadece button click kullanıyoruz
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
        
        console.log('💰 Tahsilat oluşturuluyor:', paymentData);
        console.log('💰 PaymentService objesi:', typeof PaymentService);
        console.log('💰 PaymentService.create metodu:', typeof PaymentService?.create);
        
        let payment;
        try {
            console.log('💰 PaymentService.create çağrılıyor...');
            payment = await PaymentService.create(paymentData);
            console.log('💰 PaymentService.create başarılı:', payment);
        } catch (error) {
            console.error('❌ PaymentService.create hatası:', error);
            console.log('🔄 Doğrudan db.create kullanılıyor...');
            payment = await db.create('payments', paymentData);
            console.log('✅ db.create başarılı:', payment);
        }
        Toast.success('Tahsilat başarıyla eklendi');
        
        ModalManager.hide();
        
        // Refresh relevant pages
        const currentPage = document.querySelector('.page.active').id;
        if (currentPage === 'customer-detail-page') {
            console.log('🔄 Müşteri detay sayfası yenileniyor...');
            // Sayfayı tamamen yenile
            await loadCustomerDetail(window.currentCustomerId);
            // Tahsilatlar sekmesini aktif et
            const paymentsTab = document.querySelector('[data-tab="payments"]');
            if (paymentsTab) {
                paymentsTab.click();
            }
        } else if (currentPage === 'dashboard-page') {
            await loadDashboard();
        }
        
        // Hemen makbuz yazdır - stok raporu gibi hızlı
        setTimeout(async () => {
            try {
                console.log('🖨️ Tahsilat makbuzu yazdırılıyor...');
                
                const customer = await CustomerService.getById(paymentData.customerId);
                const companyName = await window.db.getSetting('companyName', 'Kumaş Stok Yönetimi');
                
                const currentDate = new Date();
                const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}.${(currentDate.getMonth() + 1).toString().padStart(2, '0')}.${currentDate.getFullYear()} ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
                
                const paymentId = payment.id || payment || 'TEMP-' + Date.now();
                
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
                            .print-table th,
                            .print-table td {
                                border: 1pt solid #ddd;
                                padding: 8pt;
                                text-align: left;
                            }
                            .print-table th {
                                background-color: #f8f9fa;
                                font-weight: bold;
                            }
                            .print-total {
                                text-align: right;
                                font-weight: bold;
                                font-size: 14pt;
                                margin-top: 15pt;
                                border-top: 2pt solid #2563eb;
                                padding-top: 10pt;
                            }
                            .print-footer {
                                margin-top: 30pt;
                                text-align: center;
                                font-size: 10pt;
                                color: #666;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="print-header">
                            <h1>${companyName}</h1>
                            <div>Tahsilat Makbuzu</div>
                        </div>
                        
                        <div class="print-info-section">
                            <div class="print-info-row">
                                <span class="print-info-label">Müşteri:</span>
                                <span>${customer.name}</span>
                            </div>
                            <div class="print-info-row">
                                <span class="print-info-label">Tarih:</span>
                                <span>${formattedDate}</span>
                            </div>
                            <div class="print-info-row">
                                <span class="print-info-label">Makbuz No:</span>
                                <span>${paymentId}</span>
                            </div>
                        </div>
                        
                        <table class="print-table">
                            <thead>
                                <tr>
                                    <th>Açıklama</th>
                                    <th>Tutar (USD)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Tahsilat - ${paymentData.method || 'Nakit'}</td>
                                    <td>${NumberUtils.formatUSD(paymentData.amountUsd)}</td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <div class="print-total">
                            Toplam: ${NumberUtils.formatUSD(paymentData.amountUsd)}
                        </div>
                        
                        <div class="print-footer">
                            Bu makbuz bilgisayar ortamında oluşturulmuştur.
                        </div>
                    </body>
                    </html>
                `;
                
                printWindow.document.write(fullHtml);
                printWindow.document.close();
                
                // Yazdırma işlemini başlat
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
                
            } catch (printError) {
                console.error('Print error:', printError);
                Toast.error('Makbuz yazdırılırken hata oluştu');
            }
        }, 100);
        
    } catch (error) {
        console.error('Save payment error:', error);
        Toast.error('Tahsilat kaydedilirken hata oluştu: ' + error.message);
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
                            <label>Döviz Kuru (USD/TL)</label>
                            <div class="exchange-rate-container">
                                <input type="number" id="exchange-rate" step="0.01" min="0" 
                                       placeholder="0.00" style="width: 120px; margin-right: 8px;">
                                <button type="button" class="btn btn-sm btn-outline-primary" onclick="updateExchangeRate()">
                                    <i class="fas fa-sync-alt"></i> Güncelle
                                </button>
                                <span id="exchange-rate-status" class="text-muted" style="margin-left: 8px;"></span>
                            </div>
                            <small class="text-muted">Güncel kur otomatik yüklenecek, değiştirebilirsiniz</small>
                        </div>
                        <div class="form-group">
                            <div class="checkbox-container">
                                <input type="checkbox" id="show-try-in-receipt" name="showTryInReceipt">
                                <label for="show-try-in-receipt">TL Karşılığını Makbuzda Göster</label>
                            </div>
                            <small class="text-muted">İşaretlenirse sevk makbuzunda TL karşılığı da görünecek</small>
                        </div>
                        <div class="form-group">
                            <div class="checkbox-container">
                                <input type="checkbox" id="calculate-vat" name="calculateVat">
                                <label for="calculate-vat">KDV Hesapla (%10)</label>
                            </div>
                            <small class="text-muted">İşaretlenirse ürün fiyatlarına %10 KDV eklenecek</small>
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
                            <div class="mt-2" style="display:flex; gap:8px; align-items:center;">
                                <input type="text" id="party-quick" placeholder="Parti no girin" style="flex:1;" />
                                <button type="button" class="btn btn-outline-primary btn-sm" onclick="addShipmentLineByParty()">
                                    Parti No ile Ekle
                                </button>
                            </div>
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
                                <span class="label">Toplam Top Adedi:</span>
                                <span id="total-tops" class="value">0</span>
                            </div>
                            <div class="totals-row">
                                <span class="label">Toplam USD:</span>
                                <span id="total-usd" class="value">$0.00</span>
                            </div>
                            <div class="totals-row" id="total-vat-row" style="display: none;">
                                <span class="label">Toplam KDV (USD):</span>
                                <span id="total-vat" class="value">$0.00</span>
                            </div>
                            <div class="totals-row" id="total-with-vat-row" style="display: none;">
                                <span class="label">KDV Dahil Toplam USD:</span>
                                <span id="total-with-vat" class="value">$0.00</span>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                    <button type="button" class="btn btn-primary" onclick="saveShipment()">Kaydet</button>
                </div>
            </div>
        </div>
    `;
    
    ModalManager.show(modalHtml);
    
    // Load exchange rate on modal open
    loadExchangeRate();
    
    // Add event listener for manual exchange rate changes
    setTimeout(() => {
        const rateInput = document.getElementById('exchange-rate');
        if (rateInput) {
            rateInput.addEventListener('input', onExchangeRateChange);
        }
    }, 100);
    
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
            grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
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
        .edit-line-item {
            background-color: #f8fafc;
            padding: 16px;
            border-radius: 6px;
            margin-bottom: 12px;
            border: 1px solid #e2e8f0;
        }
        .edit-line-item .line-fields {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 12px;
        }
        .shipment-info {
            background-color: #f1f5f9;
            padding: 16px;
            border-radius: 6px;
            margin-bottom: 16px;
        }
        .shipment-info p {
            margin: 4px 0;
            color: #475569;
        }
    `;
    document.head.appendChild(style);
    
    window.shipmentLineCounter = 0;
    window.shipmentLines = [];
    
    // Add event listener for KDV checkbox
    document.getElementById('calculate-vat')?.addEventListener('change', function() {
        // Update all existing lines
        window.shipmentLines.forEach(line => {
            updateLineTotal(line.id);
        });
    });
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
					<label>Kg</label>
					<input type="number" id="kg-${lineId}" step="0.01" min="0" 
						   onchange="updateLineTotal('${lineId}')" placeholder="0.00">
					<small class="text-muted">Opsiyonel - sonradan düzenlenebilir</small>
				</div>
				<div class="form-group">
					<label>Top Adedi</label>
					<input type="number" id="tops-${lineId}" step="1" min="0" 
						   onchange="updateLineTotal('${lineId}')" placeholder="0">
					<small class="text-muted">Opsiyonel - sonradan düzenlenebilir</small>
				</div>
				<div class="form-group">
					<label>Birim Fiyat (USD)</label>
					<input type="number" id="unit-${lineId}" step="0.0001" min="0" 
						   onchange="updateLineTotal('${lineId}')" placeholder="0.0000">
					<small class="text-muted">Opsiyonel - sonradan düzenlenebilir</small>
				</div>
				<div class="form-group">
					<label>Toplam USD</label>
					<input type="text" id="total-${lineId}" disabled placeholder="$0.00">
				</div>
				<div class="form-group">
					<label>KDV (USD)</label>
					<input type="text" id="vat-${lineId}" disabled placeholder="$0.00">
					<small class="text-muted">TL üzerinden hesaplanan KDV'nin USD karşılığı</small>
				</div>
				<div class="form-group">
					<label>KDV Dahil Toplam USD</label>
					<input type="text" id="total-with-vat-${lineId}" disabled placeholder="$0.00">
					<small class="text-muted">TL üzerinden hesaplanan KDV dahil toplam</small>
				</div>
				<div class="form-group">
					<label>TL Karşılığı (İsteğe Bağlı)</label>
					<input type="text" id="total-try-${lineId}" disabled placeholder="₺0.00">
					<small class="text-muted">USD girişi yapıldığında otomatik hesaplanır</small>
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
		avgKgPerRoll: 0,
		kg: 0,
		tops: 0,
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

async function addShipmentLineByParty() {
    try {
        const input = document.getElementById('party-quick');
        const query = (input?.value || '').trim();
        if (!query) {
            Toast.warning('Lütfen bir parti numarası girin');
            return;
        }

        // Parti ile lot(lar)ı bul
        const lots = await InventoryService.getByParty(query);
        if (!lots || lots.length === 0) {
            Toast.error('Bu parti numarasıyla stok bulunamadı');
            return;
        }

        // Uygun stokta olan ilk lotu seç
        const lot = lots.find(l => NumberUtils.parseNumber(l.remainingKg) > 0) || lots[0];

        // Ürünü belirle ve satır oluştur
        const product = await ProductService.getById(lot.productId);
        if (!product) {
            Toast.error('Partiye bağlı ürün bulunamadı');
            return;
        }

        // Geçici olarak product-selector değerini set edip mevcut akışı kullan
        const productSelect = document.getElementById('product-selector');
        const prev = productSelect.value;
        productSelect.value = lot.productId;
        await addShipmentLine();
        productSelect.value = prev;

        // Son eklenen satırın id'si
        const lineId = window.shipmentLineCounter;
        // Bu satır için ilgili lotu otomatik seç
        selectLot(lineId, lot.id);

        // Seçilen lot bilgisini input'a yaz (kullanıcı geri bildirim)
        const lotInfoInput = document.getElementById(`selected-lot-${lineId}`);
        if (lotInfoInput && lot.party) {
            lotInfoInput.value = `${lot.party}${lot.color ? ' - ' + lot.color : ''}${lot.location ? ' (' + lot.location + ')' : ''}`;
        }

        // Input'u boşalt
        if (input) input.value = '';

        Toast.success('Parti numarasına göre satır eklendi');
    } catch (e) {
        console.error('addShipmentLineByParty error:', e);
        Toast.error('Parti numarasından satır eklenemedi');
    }
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

async function updateLineTotal(lineId) {
	const kgInput = document.getElementById(`kg-${lineId}`);
	const topsInput = document.getElementById(`tops-${lineId}`);
	const unitInput = document.getElementById(`unit-${lineId}`);
	const totalInput = document.getElementById(`total-${lineId}`);
	const vatInput = document.getElementById(`vat-${lineId}`);
	const totalWithVatInput = document.getElementById(`total-with-vat-${lineId}`);
	const totalTryInput = document.getElementById(`total-try-${lineId}`);
	
	let kg = NumberUtils.parseNumber(kgInput.value);
	const tops = NumberUtils.parseNumber(topsInput.value);
	const unitUsd = NumberUtils.parseNumber(unitInput.value);
	
	// Top adedine göre kg otomatik hesapla (avgKgPerRoll varsa)
	const line = window.shipmentLines.find(l => l.id == lineId);
	if (line && (!kg || kg === 0) && tops > 0) {
		try {
			const lot = await InventoryService.getById(line.lotId);
			const avg = NumberUtils.parseNumber(lot?.avgKgPerRoll) || NumberUtils.parseNumber(line.avgKgPerRoll) || 0;
			if (avg > 0) {
				const autoKg = NumberUtils.round(tops * avg, 2);
				kg = autoKg;
				kgInput.value = autoKg;
				line.avgKgPerRoll = avg;
			}
		} catch (e) {
			// ignore
		}
	}
	
	const total = NumberUtils.round(kg * unitUsd, 2);
	
	totalInput.value = NumberUtils.formatUSD(total);
	
	// KDV hesaplama (TL üzerinden)
	const calculateVat = document.getElementById('calculate-vat')?.checked || false;
	let vat = 0;
	let vatTry = 0;
	let totalWithVat = total;
	let totalWithVatTry = 0;
	
	if (calculateVat && total > 0) {
		// TL karşılığını hesapla
		const exchangeRate = window.currentExchangeRate || 30.50;
		const totalTry = NumberUtils.round(total * exchangeRate, 2);
		
		// KDV'yi TL üzerinden hesapla (%10)
		vatTry = NumberUtils.round(totalTry * 0.10, 2);
		
		// TL karşılığını USD'ye çevir
		vat = NumberUtils.round(vatTry / exchangeRate, 2);
		
		// KDV dahil toplamları hesapla
		totalWithVatTry = NumberUtils.round(totalTry + vatTry, 2);
		totalWithVat = NumberUtils.round(totalWithVatTry / exchangeRate, 2);
	}
	
	vatInput.value = NumberUtils.formatUSD(vat);
	totalWithVatInput.value = NumberUtils.formatUSD(totalWithVat);
	
	// Calculate TL equivalent if USD amount is provided
	if (total > 0) {
		// Use manual exchange rate if available, otherwise use API
		const exchangeRate = window.currentExchangeRate || 30.50;
		const totalTry = NumberUtils.round(total * exchangeRate, 2);
		totalTryInput.value = NumberUtils.formatTRY(totalTry);
		
		// Update line data with TL amount
		if (line) {
			line.kg = kg;
			line.tops = tops;
			line.unitUsd = unitUsd;
			line.lineTotalUsd = total;
			line.lineTotalTry = totalTry;
			line.vat = vat;
			line.vatTry = vatTry;
			line.totalWithVat = totalWithVat;
			line.totalWithVatTry = totalWithVatTry;
		}
	} else {
		totalTryInput.value = '₺0.00';
		
		// Update line data
		if (line) {
			line.kg = kg;
			line.tops = tops;
			line.unitUsd = unitUsd;
			line.lineTotalUsd = total;
			line.lineTotalTry = 0;
			line.vat = 0;
			line.vatTry = 0;
			line.totalWithVat = total;
			line.totalWithVatTry = 0;
		}
	}
	
	updateShipmentTotals();
}

function updateShipmentTotals() {
	let totalKg = 0;
	let totalTops = 0;
	let totalUsd = 0;
	let totalVat = 0;
	let totalWithVat = 0;
	
	window.shipmentLines.forEach(line => {
		totalKg += line.kg || 0;
		totalTops += line.tops || 0;
		totalUsd += line.lineTotalUsd || 0;
		totalVat += line.vat || 0;
		totalWithVat += line.totalWithVat || line.lineTotalUsd || 0;
	});
	
	document.getElementById('total-kg').textContent = NumberUtils.formatKg(totalKg);
	document.getElementById('total-tops').textContent = totalTops;
	document.getElementById('total-usd').textContent = NumberUtils.formatUSD(totalUsd);
	
	// KDV toplamlarını göster/gizle
	const calculateVat = document.getElementById('calculate-vat')?.checked || false;
	const vatRow = document.getElementById('total-vat-row');
	const vatWithVatRow = document.getElementById('total-with-vat-row');
	
	if (calculateVat && totalVat > 0) {
		document.getElementById('total-vat').textContent = NumberUtils.formatUSD(totalVat);
		document.getElementById('total-with-vat').textContent = NumberUtils.formatUSD(totalWithVat);
		vatRow.style.display = '';
		vatWithVatRow.style.display = '';
	} else {
		vatRow.style.display = 'none';
		vatWithVatRow.style.display = 'none';
	}
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
			// Kg ve fiyat artık opsiyonel - sadece negatif olmamalı
			if (line.kg && line.kg < 0) {
				throw new Error(`${line.productName} için kg miktarı negatif olamaz`);
			}
			if (line.unitUsd && line.unitUsd < 0) {
				throw new Error(`${line.productName} için birim fiyat negatif olamaz`);
			}
		}
		
		const shipmentData = {
			customerId: formData.get('customerId'),
			date: formData.get('date'),
			note: formData.get('note').trim(),
			showTryInReceipt: formData.get('showTryInReceipt') === 'on',
			calculateVat: formData.get('calculateVat') === 'on',
			lines: window.shipmentLines.map(line => ({
				lineId: line.id,
				lotId: line.lotId,
				productId: line.productId,
				productName: line.productName,
				party: document.getElementById(`selected-lot-${line.id}`).value,
				kg: line.kg,
				tops: line.tops,
				unitUsd: line.unitUsd,
				lineTotalUsd: line.lineTotalUsd,
				lineTotalTry: line.lineTotalTry || 0,
				vat: line.vat || 0,
				vatTry: line.vatTry || 0,
				totalWithVat: line.totalWithVat || line.lineTotalUsd || 0,
				totalWithVatTry: line.totalWithVatTry || line.lineTotalTry || 0
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
		} else if (currentPage === 'customers-page') {
			await loadCustomersPage();
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

// Edit Shipment Modal
async function showEditShipmentModal(shipmentId) {
	try {
		const shipment = await ShipmentService.getById(shipmentId);
		if (!shipment) {
			Toast.error('Sevk bulunamadı');
			return;
		}
		
		const customer = await CustomerService.getById(shipment.customerId);
		const customerName = customer ? customer.name : 'Bilinmeyen Müşteri';
		
		// Get all customers for dropdown
		const customers = await CustomerService.getAll();
		const customerOptions = customers.map(c => 
			`<option value="${c.id}" ${c.id === shipment.customerId ? 'selected' : ''}>${c.name}</option>`
		).join('');
		
		let linesHtml = '';
		shipment.lines.forEach((line, index) => {
			linesHtml += `
				<div class="edit-line-item">
					<div class="line-header">
						<h5>${line.productName} - ${line.party}</h5>
					</div>
					<div class="line-fields">
						<div class="form-group">
							<label>Kg</label>
							<input type="number" id="edit-kg-${index}" step="0.01" min="0" 
								   value="${line.kg || ''}" placeholder="0.00">
						</div>
						<div class="form-group">
							<label>Top Adedi</label>
							<input type="number" id="edit-tops-${index}" step="1" min="0" 
								   value="${line.tops || ''}" placeholder="0">
						</div>
						<div class="form-group">
							<label>Birim Fiyat (USD)</label>
							<input type="number" id="edit-unit-${index}" step="0.0001" min="0" 
								   value="${line.unitUsd || ''}" placeholder="0.0000">
						</div>
						<div class="form-group">
							<label>Toplam USD</label>
							<input type="text" id="edit-total-${index}" disabled 
								   value="${NumberUtils.formatUSD(line.lineTotalUsd || 0)}">
						</div>
						<div class="form-group">
							<label>TL Karşılığı</label>
							<input type="text" id="edit-total-try-${index}" disabled 
								   value="${line.lineTotalTry > 0 ? NumberUtils.formatTRY(line.lineTotalTry) : '₺0.00'}">
						</div>
					</div>
				</div>
			`;
		});
		
		const modalHtml = `
			<div class="modal-overlay">
				<div class="modal" style="width: 800px; max-height: 90vh;">
					<div class="modal-header">
						<h3>Sevk Düzenle</h3>
						<button class="modal-close" onclick="ModalManager.hide()">×</button>
					</div>
					<div class="modal-content" style="max-height: calc(90vh - 120px); overflow-y: auto;">
						<div class="shipment-info">
							<p><strong>Sevk No:</strong> #${shipment.id.substr(-8).toUpperCase()}</p>
							<div class="form-group">
								<label for="edit-shipment-customer"><strong>Müşteri *</strong></label>
								<select id="edit-shipment-customer" name="customerId" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
									<option value="">Müşteri seçin</option>
									${customerOptions}
								</select>
							</div>
							<p><strong>Tarih:</strong> ${DateUtils.formatDate(shipment.date)}</p>
							<p><strong>Not:</strong> ${shipment.note || '-'}</p>
						</div>
						
						<div class="edit-shipment-lines">
							<h4>Sevk Satırları</h4>
							${linesHtml}
						</div>
						
						<div class="shipment-totals">
							<div class="totals-row">
								<span class="label">Toplam Kg:</span>
								<span id="edit-total-kg" class="value">0.00</span>
							</div>
							<div class="totals-row">
								<span class="label">Toplam Top Adedi:</span>
								<span id="edit-total-tops" class="value">0</span>
							</div>
							<div class="totals-row">
								<span class="label">Toplam USD:</span>
								<span id="edit-total-usd" class="value">$0.00</span>
							</div>
							<div class="totals-row" id="edit-total-try-row" style="display: none;">
								<span class="label">Toplam TL Karşılığı:</span>
								<span id="edit-total-try" class="value">₺0.00</span>
							</div>
						</div>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
						<button type="button" class="btn btn-primary" onclick="saveEditedShipment('${shipmentId}')">Güncelle</button>
					</div>
				</div>
			</div>
		`;
		
		ModalManager.show(modalHtml);
		
		// Add event listeners for real-time calculation
		shipment.lines.forEach((line, index) => {
			document.getElementById(`edit-kg-${index}`).addEventListener('input', () => updateEditTotals());
			document.getElementById(`edit-tops-${index}`).addEventListener('input', () => updateEditTotals());
			document.getElementById(`edit-unit-${index}`).addEventListener('input', () => updateEditTotals());
		});
		
		// Initial calculation
		updateEditTotals();
		
	} catch (error) {
		console.error('Edit shipment modal error:', error);
		Toast.error('Sevk düzenleme modalı açılırken hata oluştu');
	}
}

async function updateEditTotals() {
	let totalKg = 0;
	let totalTops = 0;
	let totalUsd = 0;
	let totalTry = 0;
	
	// Get all line inputs
	const kgInputs = document.querySelectorAll('[id^="edit-kg-"]');
	const topsInputs = document.querySelectorAll('[id^="edit-tops-"]');
	const unitInputs = document.querySelectorAll('[id^="edit-unit-"]');
	const totalInputs = document.querySelectorAll('[id^="edit-total-"]');
	const totalTryInputs = document.querySelectorAll('[id^="edit-total-try-"]');
	
	for (let index = 0; index < kgInputs.length; index++) {
		const kg = NumberUtils.parseNumber(kgInputs[index].value) || 0;
		const tops = NumberUtils.parseNumber(topsInputs[index].value) || 0;
		const unitUsd = NumberUtils.parseNumber(unitInputs[index].value) || 0;
		const total = NumberUtils.round(kg * unitUsd, 2);
		
		totalInputs[index].value = NumberUtils.formatUSD(total);
		totalKg += kg;
		totalTops += tops;
		totalUsd += total;
		
		// Calculate TL equivalent if USD amount is provided
		if (total > 0) {
			try {
				const lineTotalTry = await ExchangeRateService.convertUSDToTRY(total);
				totalTry += lineTotalTry;
				if (totalTryInputs[index]) {
					totalTryInputs[index].value = NumberUtils.formatTRY(lineTotalTry);
				}
			} catch (error) {
				console.warn('TL karşılığı hesaplanamadı:', error);
				if (totalTryInputs[index]) {
					totalTryInputs[index].value = '₺0.00';
				}
			}
		} else {
			if (totalTryInputs[index]) {
				totalTryInputs[index].value = '₺0.00';
			}
		}
	}
	
	document.getElementById('edit-total-kg').textContent = NumberUtils.formatKg(totalKg);
	document.getElementById('edit-total-tops').textContent = totalTops;
	document.getElementById('edit-total-usd').textContent = NumberUtils.formatUSD(totalUsd);
	
	// Show TL total if any line has TL amount
	const tlTotalElement = document.getElementById('edit-total-try');
	const tlTotalRow = document.getElementById('edit-total-try-row');
	if (tlTotalElement && tlTotalRow) {
		if (totalTry > 0) {
			tlTotalElement.textContent = NumberUtils.formatTRY(totalTry);
			tlTotalRow.style.display = '';
		} else {
			tlTotalRow.style.display = 'none';
		}
	}
}

async function saveEditedShipment(shipmentId) {
	try {
		const shipment = await ShipmentService.getById(shipmentId);
		if (!shipment) {
			throw new Error('Sevk bulunamadı');
		}
		
		// Get updated values
		const updatedLines = await Promise.all(shipment.lines.map(async (line, index) => {
			const kg = NumberUtils.parseNumber(document.getElementById(`edit-kg-${index}`).value) || 0;
			const tops = NumberUtils.parseNumber(document.getElementById(`edit-tops-${index}`).value) || 0;
			const unitUsd = NumberUtils.parseNumber(document.getElementById(`edit-unit-${index}`).value) || 0;
			const lineTotalUsd = NumberUtils.round(kg * unitUsd, 2);
			
			// Calculate TL equivalent if USD amount is provided
			let lineTotalTry = 0;
			if (lineTotalUsd > 0) {
				try {
					lineTotalTry = await ExchangeRateService.convertUSDToTRY(lineTotalUsd);
				} catch (error) {
					console.warn('TL karşılığı hesaplanamadı:', error);
					lineTotalTry = 0;
				}
			}
			
			return {
				...line,
				kg: kg,
				tops: tops,
				unitUsd: unitUsd,
				lineTotalUsd: lineTotalUsd,
				lineTotalTry: lineTotalTry
			};
		}));
		
		// Calculate new totals
		const totalKg = updatedLines.reduce((sum, line) => sum + (line.kg || 0), 0);
		const totalTops = updatedLines.reduce((sum, line) => sum + (line.tops || 0), 0);
		const totalUsd = updatedLines.reduce((sum, line) => sum + (line.lineTotalUsd || 0), 0);
		
		// Get old totals for comparison
		const oldTotalUsd = shipment.totals?.totalUsd || 0;
		const oldTotalKg = shipment.totals?.totalKg || 0;
		
		// Get new customer ID from dropdown
		const newCustomerId = document.getElementById('edit-shipment-customer').value;
		if (!newCustomerId) {
			throw new Error('Müşteri seçilmelidir');
		}
		
		const oldCustomerId = shipment.customerId;
		const customerChanged = oldCustomerId !== newCustomerId;
		
		console.log(`🔄 Sevk güncelleniyor: #${shipmentId.substr(-8).toUpperCase()}`);
		console.log(`💰 Eski toplam: ${NumberUtils.formatUSD(oldTotalUsd)} → Yeni toplam: ${NumberUtils.formatUSD(totalUsd)}`);
		console.log(`📦 Eski kg: ${NumberUtils.formatKg(oldTotalKg)} → Yeni kg: ${NumberUtils.formatKg(totalKg)}`);
		if (customerChanged) {
			console.log(`👤 Müşteri değişiyor: ${oldCustomerId} → ${newCustomerId}`);
		}
		
		// Debug: Her satırın detaylarını göster
		console.log(`🔍 Debug - Güncellenmiş Satırlar:`);
		updatedLines.forEach((line, index) => {
			console.log(`  Satır ${index + 1}: ${line.kg}kg × $${line.unitUsd} = $${line.lineTotalUsd}`);
		});
		console.log(`🔍 Debug - Toplam USD Hesaplama: ${updatedLines.map(l => l.lineTotalUsd).join(' + ')} = ${totalUsd}`);
		
		// 1. Update customer balances (müşteri bakiyelerini güncelle)
		if (customerChanged) {
			// Müşteri değiştiyse: eski müşteriden eski tutarı çıkar, yeni müşteriye yeni tutarı ekle
			const oldCustomer = await CustomerService.getById(oldCustomerId);
			const newCustomer = await CustomerService.getById(newCustomerId);
			
			if (oldCustomer) {
				// Eski müşterinin bakiyesinden eski sevk tutarını çıkar
				const oldBalance = oldCustomer.balance || 0;
				const newOldBalance = NumberUtils.round(oldBalance - oldTotalUsd, 2);
				
				await CustomerService.update({
					...oldCustomer,
					balance: newOldBalance
				});
				
				console.log(`👤 Eski Müşteri ${oldCustomer.name}: Bakiye ${NumberUtils.formatUSD(oldBalance)} → ${NumberUtils.formatUSD(newOldBalance)} (-${NumberUtils.formatUSD(oldTotalUsd)} sevk kaldırıldı)`);
			} else {
				console.error(`❌ Eski müşteri bulunamadı: ${oldCustomerId}`);
			}
			
			if (newCustomer) {
				// Yeni müşterinin bakiyesine yeni sevk tutarını ekle
				const newBalance = newCustomer.balance || 0;
				const newNewBalance = NumberUtils.round(newBalance + totalUsd, 2);
				
				await CustomerService.update({
					...newCustomer,
					balance: newNewBalance
				});
				
				console.log(`👤 Yeni Müşteri ${newCustomer.name}: Bakiye ${NumberUtils.formatUSD(newBalance)} → ${NumberUtils.formatUSD(newNewBalance)} (+${NumberUtils.formatUSD(totalUsd)} sevk eklendi)`);
			} else {
				console.error(`❌ Yeni müşteri bulunamadı: ${newCustomerId}`);
			}
		} else {
			// Müşteri değişmediyse: sadece bakiye farkını uygula
			const customer = await CustomerService.getById(oldCustomerId);
			if (customer) {
				const balanceDifference = totalUsd - oldTotalUsd;
				const oldBalance = customer.balance || 0;
				const newBalance = NumberUtils.round(oldBalance + balanceDifference, 2);
				
				console.log(`🔍 Debug - Eski Sevk Toplamı: ${NumberUtils.formatUSD(oldTotalUsd)}`);
				console.log(`🔍 Debug - Yeni Sevk Toplamı: ${NumberUtils.formatUSD(totalUsd)}`);
				console.log(`🔍 Debug - Bakiye Farkı: ${balanceDifference > 0 ? '+' : ''}${NumberUtils.formatUSD(balanceDifference)}`);
				console.log(`🔍 Debug - Eski Bakiye: ${NumberUtils.formatUSD(oldBalance)}`);
				console.log(`🔍 Debug - Yeni Bakiye: ${NumberUtils.formatUSD(newBalance)}`);
				console.log(`🔍 Debug - Müşteri ID: ${oldCustomerId}`);
				console.log(`🔍 Debug - Müşteri Adı: ${customer.name}`);
				
				await CustomerService.update({
					...customer,
					balance: newBalance
				});
				
				console.log(`👤 Müşteri ${customer.name}: Bakiye ${NumberUtils.formatUSD(oldBalance)} → ${NumberUtils.formatUSD(newBalance)} (${balanceDifference > 0 ? '+' : ''}${NumberUtils.formatUSD(balanceDifference)})`);
			} else {
				console.error(`❌ Müşteri bulunamadı: ${oldCustomerId}`);
			}
		}
		
		// 2. Update stock allocations (stok tahsislerini güncelle)
		const lots = await InventoryService.getAll();
		const updatedLots = [];
		
		shipment.lines.forEach((oldLine, index) => {
			const newLine = updatedLines[index];
			const lot = lots.find(l => l.id === oldLine.lotId);
			
			if (lot) {
				const oldRemaining = lot.remainingKg;
				const kgDifference = (oldLine.kg || 0) - (newLine.kg || 0);
				
				// Eğer yeni kg daha azsa, stok geri eklenir
				// Eğer yeni kg daha fazlaysa, stoktan düşülür
				lot.remainingKg = NumberUtils.round(lot.remainingKg + kgDifference, 2);
				InventoryService.updateStatus(lot);
				updatedLots.push(lot);
				
				console.log(`📦 Parti ${lot.party}: ${oldRemaining}kg → ${lot.remainingKg}kg (${kgDifference > 0 ? '+' : ''}${kgDifference}kg)`);
			}
		});
		
		// 3. Update inventory lots
		if (updatedLots.length > 0) {
			await db.batchUpdate('inventoryLots', updatedLots);
		}
		
		// 4. Update shipment
		const updatedShipment = {
			...shipment,
			customerId: newCustomerId, // Yeni müşteri ID'sini güncelle
			lines: updatedLines,
			totals: {
				totalKg: totalKg,
				totalTops: totalTops,
				totalUsd: totalUsd
			}
		};
		
		await ShipmentService.update(shipmentId, updatedShipment);
		
		console.log(`✅ Sevk başarıyla güncellendi ve tüm etkiler hesaplandı`);
		Toast.success('Sevk başarıyla güncellendi');
		
		ModalManager.hide();
		
		// Refresh relevant pages
		const currentPage = document.querySelector('.page.active').id;
		if (currentPage === 'shipments-page') {
			await loadShipments();
		} else if (currentPage === 'customer-detail-page') {
			await loadCustomerShipments(window.currentCustomerId);
			await loadCustomerDetail(window.currentCustomerId);
		} else if (currentPage === 'customers-page') {
			await loadCustomersPage();
		} else if (currentPage === 'inventory-page') {
			await loadInventoryPage();
		}
		
	} catch (error) {
		console.error('Save edited shipment error:', error);
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

// Async confirmation dialog
function confirmActionAsync(title, message, confirmText = 'Onayla', cancelText = 'İptal') {
	return new Promise((resolve) => {
		const modalHtml = `
			<div class="modal-overlay">
				<div class="modal" style="width: 500px;">
					<div class="modal-header">
						<h3>${title}</h3>
						<button class="modal-close" onclick="resolveConfirm(false)">×</button>
					</div>
					<div class="modal-content">
						<div style="white-space: pre-line; line-height: 1.6;">${message}</div>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" onclick="resolveConfirm(false)">${cancelText}</button>
						<button type="button" class="btn btn-danger" onclick="resolveConfirm(true)">${confirmText}</button>
					</div>
				</div>
			</div>
		`;
		
		ModalManager.show(modalHtml);
		
		window.resolveConfirm = (result) => {
			ModalManager.hide();
			window.resolveConfirm = null;
			resolve(result);
		};
	});
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
		const suppliersPage = document.getElementById('supplier-payments-page');
		if (suppliersPage && suppliersPage.classList.contains('active')) {
			await loadSuppliersPage();
		}
		
	} catch (error) {
		console.error('Supplier save error:', error);
		Toast.error(error.message);
	}
}

// Daily Report Modal
async function showDailyReportModal() {
    try {
        // Get customers for dropdown
        const customers = await CustomerService.getAll();
        const customerOptions = customers.map(customer => 
            `<option value="${customer.id}">${customer.name}</option>`
        ).join('');
        
        // Get today's date as default
        const today = new Date().toISOString().split('T')[0];
        
        const modalHtml = `
            <div class="modal-overlay">
                <div class="modal" style="width: 500px;">
                    <div class="modal-header">
                        <h3>Günlük Sevk Raporu</h3>
                        <button class="modal-close" onclick="ModalManager.hide()">×</button>
                    </div>
                    <div class="modal-content">
                        <form id="daily-report-form">
                            <div class="form-group">
                                <label for="daily-report-customer">Firma *</label>
                                <select id="daily-report-customer" name="customerId" required>
                                    <option value="">Firma seçin</option>
                                    ${customerOptions}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="daily-report-date">Tarih *</label>
                                <input type="date" id="daily-report-date" name="date" required 
                                       value="${today}" max="${today}">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                        <button type="button" class="btn btn-primary" onclick="generateDailyReport()">
                            <span class="icon">📊</span>
                            Rapor Oluştur
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        ModalManager.show(modalHtml);
        
    } catch (error) {
        console.error('Show daily report modal error:', error);
        Toast.error('Rapor modalı açılırken hata oluştu');
    }
}

// Supplier Payment Modal
function showNewSupplierPaymentModal() {
	const modalHtml = `
		<div class="modal-overlay">
			<div class="modal" style="width: 600px;">
				<div class="modal-header">
					<h3>Tedarikçiye Ödeme</h3>
					<button class="modal-close" onclick="ModalManager.hide()">×</button>
				</div>
				<div class="modal-content">
					<form id="supplier-payment-form">
						<div class="form-group">
							<label for="payment-supplier-type">Tedarikçi *</label>
							<select id="payment-supplier-type" name="supplierType" required onchange="updatePaymentCurrency()">
								<option value="">Tedarikçi seçin</option>
								<option value="iplik">İplikçi</option>
								<option value="orme">Örme</option>
								<option value="boyahane">Boyahane</option>
							</select>
						</div>
						
						<div class="form-row">
							<div class="form-group">
								<label for="payment-currency">Para Birimi *</label>
								<select id="payment-currency" name="currency" required onchange="updatePaymentAmount()">
									<option value="USD">USD</option>
									<option value="TRY">TL</option>
								</select>
							</div>
							<div class="form-group">
								<label for="payment-exchange-rate">Kur (USD/TL)</label>
								<input type="number" id="payment-exchange-rate" name="exchangeRate" step="0.01" min="0.01" 
									   value="${window.currentExchangeRate || 30.50}" readonly>
							</div>
						</div>
						
						<div class="form-row">
							<div class="form-group">
								<label for="payment-amount">Tutar *</label>
								<input type="number" id="payment-amount" name="amount" required step="0.01" min="0.01" 
									   placeholder="Ödeme tutarını girin" onchange="updatePaymentAmount()">
							</div>
							<div class="form-group">
								<label for="payment-amount-usd">USD Karşılığı</label>
								<input type="text" id="payment-amount-usd" readonly 
									   placeholder="USD karşılığı otomatik hesaplanacak">
							</div>
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
	
	// Kur güncelle
	updatePaymentExchangeRate();
}

async function saveSupplierPayment() {
	try {
		const form = document.getElementById('supplier-payment-form');
		const formData = new FormData(form);
		
		const currency = formData.get('currency');
		const amount = NumberUtils.parseNumber(formData.get('amount'));
		const exchangeRate = NumberUtils.parseNumber(formData.get('exchangeRate'));
		
		// USD karşılığını hesapla
		let amountUSD = amount;
		if (currency === 'TRY') {
			amountUSD = NumberUtils.round(amount / exchangeRate, 2);
		}
		
		const paymentData = {
			supplierType: formData.get('supplierType'),
			amount: amountUSD, // İçerde USD olarak sakla
			originalAmount: amount, // Orijinal tutarı da sakla
			originalCurrency: currency,
			exchangeRate: exchangeRate,
			method: formData.get('method'),
			date: formData.get('date'),
			note: formData.get('note').trim()
		};
		
		const payment = await SupplierService.createPayment(paymentData);
		Toast.success('Ödeme başarıyla kaydedildi');
		
		ModalManager.hide();
		
		// Refresh suppliers page if currently active
		if (document.getElementById('suppliers-page').classList.contains('active')) {
			await loadSuppliersPage();
		}
		
		// Hemen makbuz yazdır - stok raporu gibi hızlı
		setTimeout(async () => {
			try {
				console.log('🖨️ Tedarikçi ödeme makbuzu yazdırılıyor...');
				
				const companyName = await window.db.getSetting('companyName', 'Kumaş Stok Yönetimi');
				
				const supplierTypeNames = {
					'iplik': 'İplikçi',
					'orme': 'Örme',
					'boyahane': 'Boyahane'
				};
				
				const supplierTypeName = supplierTypeNames[paymentData.supplierType] || paymentData.supplierType;
				
				const currentDate = new Date();
				const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}.${(currentDate.getMonth() + 1).toString().padStart(2, '0')}.${currentDate.getFullYear()} ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
				
				const paymentId = payment.id || payment || 'TEMP-' + Date.now();
				
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
						</style>
					</head>
					<body>
						<div class="printable supplier-payment-receipt">
							<div class="print-header">
								<h1>${companyName}</h1>
								<div class="document-title">ÖDEME MAKBUZU</div>
							</div>
							
							<div class="print-info-section">
								<div class="print-info-row">
									<span class="print-info-label">Tedarikçi Türü:</span>
									<span>${supplierTypeName}</span>
								</div>
								<div class="print-info-row">
									<span class="print-info-label">Ödeme Tarihi:</span>
									<span>${new Date(paymentData.date).toLocaleDateString('tr-TR')}</span>
								</div>
								<div class="print-info-row">
									<span class="print-info-label">Makbuz No:</span>
									<span>#${paymentId.toString().substr(-8).toUpperCase()}</span>
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
										<td>${paymentData.method || '-'}</td>
										<td class="text-right">$${paymentData.amount.toFixed(2)}</td>
									</tr>
								</tbody>
							</table>
							
							<div class="print-totals">
								<table style="width: 100%;">
									<tr class="grand-total">
										<td class="total-label">Ödenen Toplam:</td>
										<td class="total-amount">$${paymentData.amount.toFixed(2)}</td>
									</tr>
								</table>
							</div>
							
							${paymentData.note ? `
								<div class="print-notes">
									<h4>Notlar:</h4>
									<p>${paymentData.note}</p>
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
				
				console.log('✅ Tedarikçi ödeme makbuzu hazırlandı');
				
			} catch (error) {
				console.error('Makbuz yazdırma hatası:', error);
				Toast.error('Makbuz yazdırılırken hata oluştu');
			}
		}, 50);
		
	} catch (error) {
		console.error('Supplier payment save error:', error);
		Toast.error(error.message);
	}
}

// Ödeme modalı yardımcı fonksiyonları
async function updatePaymentExchangeRate() {
	const rateInput = document.getElementById('payment-exchange-rate');
	if (!rateInput) return;
	
	try {
		const rate = await ExchangeRateService.getUSDToTRY();
		rateInput.value = rate.toFixed(2);
		updatePaymentAmount();
	} catch (error) {
		console.error('Kur güncellenemedi:', error);
		rateInput.value = (window.currentExchangeRate || 30.50).toFixed(2);
	}
}

function updatePaymentCurrency() {
	const supplierType = document.getElementById('payment-supplier-type').value;
	const currencySelect = document.getElementById('payment-currency');
	
	// Boyahane için varsayılan TL, diğerleri için USD
	if (supplierType === 'boyahane') {
		currencySelect.value = 'TRY';
	} else {
		currencySelect.value = 'USD';
	}
	
	updatePaymentAmount();
}

function updatePaymentAmount() {
	const amountInput = document.getElementById('payment-amount');
	const amountUSDInput = document.getElementById('payment-amount-usd');
	const currencySelect = document.getElementById('payment-currency');
	const rateInput = document.getElementById('payment-exchange-rate');
	
	if (!amountInput || !amountUSDInput || !currencySelect || !rateInput) return;
	
	const amount = NumberUtils.parseNumber(amountInput.value) || 0;
	const currency = currencySelect.value;
	const rate = NumberUtils.parseNumber(rateInput.value) || 30.50;
	
	let amountUSD = 0;
	if (currency === 'TRY') {
		amountUSD = NumberUtils.round(amount / rate, 2);
	} else {
		amountUSD = amount;
	}
	
	amountUSDInput.value = NumberUtils.formatUSD(amountUSD);
}

// Fiyat Listesi Modal
async function showPriceListModal() {
	try {
		const [products, priceList] = await Promise.all([
			ProductService.getAll(),
			SupplierService.getPriceList('boyahane')
		]);
		
		const productRows = products.map(product => {
			const existingPrice = priceList.find(p => p.productId === product.id);
			const price = existingPrice ? existingPrice.pricePerKg : '';
			
			return `
				<tr>
					<td>${product.name}</td>
					<td>
						<input type="number" 
							   class="price-input" 
							   data-product-id="${product.id}" 
							   value="${price}" 
							   step="0.01" 
							   min="0" 
							   placeholder="TL/KG">
					</td>
					<td>
						<button class="btn btn-sm btn-primary" onclick="saveProductPrice('${product.id}')">
							Kaydet
						</button>
					</td>
				</tr>
			`;
		}).join('');
		
		const modalHtml = `
			<div class="modal-overlay">
				<div class="modal" style="width: 700px; max-height: 80vh;">
					<div class="modal-header">
						<h3>Boyahane Fiyat Listesi (TL/KG)</h3>
						<button class="modal-close" onclick="ModalManager.hide()">×</button>
					</div>
					<div class="modal-content">
						<div class="alert alert-info">
							<strong>Bilgi:</strong> Her kumaş için TL/KG fiyatını girin. Stoğa giriş yapıldığında bu fiyatlar otomatik olarak kullanılacak.
						</div>
						<table class="data-table">
							<thead>
								<tr>
									<th>Kumaş Adı</th>
									<th>Fiyat (TL/KG)</th>
									<th>İşlem</th>
								</tr>
							</thead>
							<tbody>
								${productRows}
							</tbody>
						</table>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">Kapat</button>
						<button type="button" class="btn btn-primary" onclick="saveAllPrices()">Tümünü Kaydet</button>
					</div>
				</div>
			</div>
		`;
		
		ModalManager.show(modalHtml);
		
	} catch (error) {
		console.error('Fiyat listesi modal hatası:', error);
		Toast.error('Fiyat listesi yüklenirken hata oluştu');
	}
}

async function saveProductPrice(productId) {
	try {
		const input = document.querySelector(`input[data-product-id="${productId}"]`);
		const price = NumberUtils.parseNumber(input.value);
		
		if (price < 0) {
			Toast.error('Fiyat negatif olamaz');
			return;
		}
		
		await SupplierService.setProductPrice('boyahane', productId, price, 'TRY');
		Toast.success('Fiyat kaydedildi');
		
	} catch (error) {
		console.error('Fiyat kaydetme hatası:', error);
		Toast.error('Fiyat kaydedilirken hata oluştu');
	}
}

async function saveAllPrices() {
	try {
		const inputs = document.querySelectorAll('.price-input');
		let savedCount = 0;
		
		for (const input of inputs) {
			const productId = input.dataset.productId;
			const price = NumberUtils.parseNumber(input.value);
			
			if (price > 0) {
				await SupplierService.setProductPrice('boyahane', productId, price, 'TRY');
				savedCount++;
			}
		}
		
		Toast.success(`${savedCount} fiyat kaydedildi`);
		ModalManager.hide();
		
	} catch (error) {
		console.error('Toplu fiyat kaydetme hatası:', error);
		Toast.error('Fiyatlar kaydedilirken hata oluştu');
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

// Exchange Rate Functions
async function loadExchangeRate() {
	const rateInput = document.getElementById('exchange-rate');
	const statusSpan = document.getElementById('exchange-rate-status');
	
	if (!rateInput || !statusSpan) return;
	
	try {
		statusSpan.textContent = 'Kur yükleniyor...';
		const rate = await ExchangeRateService.getUSDToTRY();
		rateInput.value = rate.toFixed(2);
		statusSpan.textContent = `Son güncelleme: ${new Date().toLocaleTimeString('tr-TR')}`;
		
		// Store rate globally for use in calculations
		window.currentExchangeRate = rate;
		
	} catch (error) {
		console.error('Döviz kuru yüklenemedi:', error);
		statusSpan.textContent = 'Kur yüklenemedi';
		rateInput.value = '30.50'; // Default rate
		window.currentExchangeRate = 30.50;
	}
}

async function updateExchangeRate() {
	const rateInput = document.getElementById('exchange-rate');
	const statusSpan = document.getElementById('exchange-rate-status');
	
	if (!rateInput || !statusSpan) return;
	
	try {
		statusSpan.textContent = 'Güncelleniyor...';
		
		// Clear cache to force fresh rate
		ExchangeRateService.clearCache();
		
		const rate = await ExchangeRateService.getUSDToTRY();
		rateInput.value = rate.toFixed(2);
		statusSpan.textContent = `Son güncelleme: ${new Date().toLocaleTimeString('tr-TR')}`;
		
		// Store rate globally
		window.currentExchangeRate = rate;
		
		// Update all existing line calculations
		if (window.shipmentLines) {
			for (const line of window.shipmentLines) {
				await updateLineTotal(line.id);
			}
		}
		
	} catch (error) {
		console.error('Döviz kuru güncellenemedi:', error);
		statusSpan.textContent = 'Güncelleme başarısız';
	}
}

// Manual exchange rate change handler
function onExchangeRateChange() {
	const rateInput = document.getElementById('exchange-rate');
	if (rateInput) {
		const newRate = NumberUtils.parseNumber(rateInput.value);
		if (newRate > 0) {
			window.currentExchangeRate = newRate;
			
			// Update all existing line calculations
			if (window.shipmentLines) {
				window.shipmentLines.forEach(line => {
					updateLineTotal(line.id);
				});
			}
		}
	}
}

// Tedarikçi Fiyat Listesi Modal
async function showSupplierPriceListModal() {
	try {
		const supplierId = window.currentSupplierId;
		if (!supplierId) {
			Toast.error('Tedarikçi bulunamadı');
			return;
		}
		
		const supplier = await SupplierService.getById(supplierId);
		if (!supplier) {
			Toast.error('Tedarikçi bilgisi alınamadı');
			return;
		}
		
		// İplik tedarikçileri için iplik çeşitleri fiyat listesi modalını göster
		if (supplier.type === 'iplik') {
			await showYarnTypePriceListModal();
			return;
		}
		
		// Örme tedarikçileri için USD, diğerleri için TL
		const isUSD = supplier.type === 'orme';
		const currencyLabel = isUSD ? 'USD/KG' : 'TL/KG';
		const currencyCode = isUSD ? 'USD' : 'TRY';
		
		const [products, priceList] = await Promise.all([
			ProductService.getAll(),
			SupplierService.getPriceListBySupplier(supplierId)
		]);
		
		const rows = products.map(p => {
			const existing = priceList.find(x => x.productId === p.id);
			// Mevcut fiyatı göster (currency'ye göre)
			let val = '';
			if (existing && existing.pricePerKg) {
				// Eğer mevcut currency farklıysa dönüştür
				if (existing.currency === 'TRY' && isUSD) {
					// TL'den USD'ye çevir
					const exchangeRate = window.currentExchangeRate || 30.50;
					val = NumberUtils.round(existing.pricePerKg / exchangeRate, 2);
				} else if (existing.currency === 'USD' && !isUSD) {
					// USD'den TL'ye çevir
					const exchangeRate = window.currentExchangeRate || 30.50;
					val = NumberUtils.round(existing.pricePerKg * exchangeRate, 2);
				} else {
					val = existing.pricePerKg;
				}
			}
			return `
				<tr>
					<td>${p.name}</td>
					<td>
						<input type=\"number\" class=\"price-input\" data-product-id=\"${p.id}\" value=\"${val}\" step=\"0.01\" min=\"0\" placeholder=\"${currencyLabel}\">
					</td>
					<td>
						<button class=\"btn btn-sm btn-primary\" onclick=\"saveSupplierProductPrice('${p.id}')\">Kaydet</button>
					</td>
				</tr>
			`;
		}).join('');
		
		const html = `
			<div class=\"modal-overlay\">
				<div class=\"modal\" style=\"width: 700px; max-height: 80vh;\">
					<div class=\"modal-header\">
						<h3>Tedarikçi Fiyat Listesi (${currencyLabel})</h3>
						<button class=\"modal-close\" onclick=\"ModalManager.hide()\">×</button>
					</div>
					<div class=\"modal-content\">
						<table class=\"data-table\">
							<thead>
								<tr>
									<th>Kumaş</th>
									<th>Fiyat (${currencyLabel})</th>
									<th>İşlem</th>
								</tr>
							</thead>
							<tbody>${rows}</tbody>
						</table>
					</div>
					<div class=\"modal-footer\">
						<button type=\"button\" class=\"btn btn-secondary\" onclick=\"ModalManager.hide()\">Kapat</button>
						<button type=\"button\" class=\"btn btn-primary\" onclick=\"saveAllSupplierPrices()\">Tümünü Kaydet</button>
					</div>
				</div>
			</div>`;
		ModalManager.show(html);
	} catch (e) {
		console.error('Supplier price list modal error:', e);
		Toast.error('Fiyat listesi yüklenirken hata oluştu');
	}
}

async function saveSupplierProductPrice(productId) {
	try {
		const supplierId = window.currentSupplierId;
		const supplier = await SupplierService.getById(supplierId);
		if (!supplier) {
			Toast.error('Tedarikçi bulunamadı');
			return;
		}
		
		// Örme ve İplik tedarikçileri için USD, diğerleri için TRY
		const isUSD = supplier.type === 'orme' || supplier.type === 'iplik';
		const currency = isUSD ? 'USD' : 'TRY';
		
		const input = document.querySelector(`.price-input[data-product-id=\"${productId}\"]`);
		const price = NumberUtils.parseNumber(input.value);
		if (price < 0) { Toast.error('Fiyat negatif olamaz'); return; }
		
		await SupplierService.setSupplierProductPrice(supplierId, productId, price, currency);
		Toast.success(`Fiyat kaydedildi (${currency})`);
	} catch (e) {
		console.error('saveSupplierProductPrice error:', e);
		Toast.error('Fiyat kaydedilemedi');
	}
}

async function saveAllSupplierPrices() {
	try {
		const supplierId = window.currentSupplierId;
		const supplier = await SupplierService.getById(supplierId);
		if (!supplier) {
			Toast.error('Tedarikçi bulunamadı');
			return;
		}
		
		// Örme ve İplik tedarikçileri için USD, diğerleri için TRY
		const isUSD = supplier.type === 'orme' || supplier.type === 'iplik';
		const currency = isUSD ? 'USD' : 'TRY';
		
		const inputs = document.querySelectorAll('.price-input');
		let count = 0;
		for (const input of inputs) {
			const price = NumberUtils.parseNumber(input.value);
			if (price > 0) {
				await SupplierService.setSupplierProductPrice(supplierId, input.dataset.productId, price, currency);
				count++;
			}
		}
		Toast.success(`${count} fiyat kaydedildi (${currency})`);
		ModalManager.hide();
	} catch (e) {
		console.error('saveAllSupplierPrices error:', e);
		Toast.error('Toplu kayıt sırasında hata');
	}
}

// Export global functions
window.ModalManager = ModalManager;
window.showNewCustomerModal = showNewCustomerModal;
window.showNewProductModal = showNewProductModal;
window.showNewLotModal = showNewLotModal;
window.showNewPaymentModalFromModals = showNewPaymentModal; // Rename for clarity
window.showNewPaymentModal = showNewPaymentModal; // Keep original name too
window.showNewShipmentModal = showNewShipmentModal;
window.showConfirmModal = showConfirmModal;
window.showImportCSVModal = showImportCSVModal;
window.showImportDataModal = showImportDataModal;
window.selectLot = selectLot;
window.updateLineTotal = updateLineTotal;
window.removeLine = removeLine;
window.addShipmentLine = addShipmentLine;
window.addShipmentLineByParty = addShipmentLineByParty;
window.saveShipment = saveShipment;
window.saveCustomer = saveCustomer;
window.saveProduct = saveProduct;
window.saveLot = saveLot;
window.savePayment = savePayment;
window.confirmAction = confirmAction;
window.confirmActionAsync = confirmActionAsync;
window.resolveConfirm = null; // Global resolver function
window.importCSV = importCSV;
window.importData = importData;
window.showNewSupplierModal = showNewSupplierModal;
window.showNewSupplierPaymentModal = showNewSupplierPaymentModal;
window.saveSupplier = saveSupplier;
window.saveSupplierPayment = saveSupplierPayment;
window.loadExchangeRate = loadExchangeRate;
window.updateExchangeRate = updateExchangeRate;
window.onExchangeRateChange = onExchangeRateChange;
window.updatePaymentCurrency = updatePaymentCurrency;
window.updatePaymentAmount = updatePaymentAmount;
window.updatePaymentExchangeRate = updatePaymentExchangeRate;
window.showPriceListModal = showPriceListModal;
window.saveProductPrice = saveProductPrice;
window.saveAllPrices = saveAllPrices;
window.showSupplierPriceListModal = showSupplierPriceListModal;
window.saveSupplierProductPrice = saveSupplierProductPrice;
window.saveAllSupplierPrices = saveAllSupplierPrices;

// Ham Kumaş Gönderimi Modalı (Örme Tedarikçileri için)
async function showNewRawMaterialShipmentModal() {
    const supplierId = window.currentSupplierId;
    if (!supplierId) {
        Toast.error('Tedarikçi seçilmedi');
        return;
    }
    
    const supplier = await SupplierService.getById(supplierId);
    if (!supplier || supplier.type !== 'orme') {
        Toast.error('Bu işlem sadece örme tedarikçileri için geçerlidir');
        return;
    }
    
    const [products, priceList] = await Promise.all([
        ProductService.getAll(),
        SupplierService.getPriceListBySupplier(supplierId)
    ]);
    
    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal" style="width: 600px;">
                <div class="modal-header">
                    <h3>Ham Kumaş Gönderimi - ${supplier.name}</h3>
                    <button class="modal-close" onclick="ModalManager.hide()">×</button>
                </div>
                <div class="modal-content">
                    <form id="raw-material-shipment-form">
                        <div class="form-group">
                            <label for="raw-material-product">Ham Kumaş *</label>
                            <select id="raw-material-product" name="productId" required>
                                <option value="">Seçin</option>
                                ${products.map(p => `<option value="${p.id}" data-name="${p.name}">${p.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="raw-material-kg">Miktar (KG) *</label>
                                <input type="number" id="raw-material-kg" name="kg" required step="0.01" min="0.01" 
                                       placeholder="0.00" onchange="updateRawMaterialTotal()">
                            </div>
                            <div class="form-group">
                                <label for="raw-material-date">Tarih *</label>
                                <input type="date" id="raw-material-date" name="date" required 
                                       value="${DateUtils.getInputDate()}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="raw-material-price-per-kg">Birim Fiyat (USD/kg) *</label>
                                <input type="number" id="raw-material-price-per-kg" name="pricePerKg" required 
                                       step="0.01" min="0" placeholder="0.00" onchange="updateRawMaterialTotal()">
                                <small class="form-hint">Örme tedarikçisinin sabit fiyatı</small>
                            </div>
                            <div class="form-group">
                                <label for="raw-material-total">Toplam (USD)</label>
                                <input type="text" id="raw-material-total" readonly 
                                       placeholder="Otomatik hesaplanacak" style="font-weight: bold; color: #2563eb;">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="raw-material-note">Not</label>
                            <textarea id="raw-material-note" name="note" 
                                      placeholder="İsteğe bağlı notlar"></textarea>
                        </div>
                        <input type="hidden" name="supplierId" value="${supplierId}">
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                    <button type="button" class="btn btn-primary" onclick="saveRawMaterialShipment()">Kaydet</button>
                </div>
            </div>
        </div>
    `;
    
    ModalManager.show(modalHtml);
    
    // Ürün seçildiğinde fiyatı otomatik doldur
    const productSelect = document.getElementById('raw-material-product');
    const priceInput = document.getElementById('raw-material-price-per-kg');
    
    if (productSelect && priceInput) {
        productSelect.addEventListener('change', () => {
            const productId = productSelect.value;
            if (productId) {
                const price = priceList.find(p => p.productId === productId);
                if (price && price.pricePerKg) {
                    // Fiyat USD olarak saklanıyor mu kontrol et
                    // Eğer TL ise USD'ye çevir
                    let priceUSD = price.pricePerKg;
                    if (price.currency === 'TRY') {
                        const exchangeRate = window.currentExchangeRate || 30.50;
                        priceUSD = NumberUtils.round(price.pricePerKg / exchangeRate, 2);
                    }
                    priceInput.value = priceUSD.toFixed(2);
                    updateRawMaterialTotal();
                }
            }
        });
    }
}

// Ham kumaş gönderimi toplamını güncelle
function updateRawMaterialTotal() {
    const kg = NumberUtils.parseNumber(document.getElementById('raw-material-kg')?.value || 0);
    const pricePerKg = NumberUtils.parseNumber(document.getElementById('raw-material-price-per-kg')?.value || 0);
    const total = NumberUtils.round(kg * pricePerKg, 2);
    const totalInput = document.getElementById('raw-material-total');
    if (totalInput) {
        totalInput.value = NumberUtils.formatUSD(total);
    }
}

// Ham kumaş gönderimi kaydet
async function saveRawMaterialShipment() {
    try {
        const form = document.getElementById('raw-material-shipment-form');
        if (!form) {
            Toast.error('Form bulunamadı');
            return;
        }
        
        const formData = new FormData(form);
        const supplierId = formData.get('supplierId');
        const productId = formData.get('productId');
        const kg = NumberUtils.parseNumber(formData.get('kg'));
        const pricePerKg = NumberUtils.parseNumber(formData.get('pricePerKg'));
        const date = formData.get('date');
        const note = formData.get('note')?.trim() || '';
        
        if (!supplierId || !productId || !kg || !pricePerKg || !date) {
            Toast.error('Lütfen tüm zorunlu alanları doldurun');
            return;
        }
        
        const supplier = await SupplierService.getById(supplierId);
        if (!supplier || supplier.type !== 'orme') {
            Toast.error('Bu işlem sadece örme tedarikçileri için geçerlidir');
            return;
        }
        
        const product = await ProductService.getById(productId);
        if (!product) {
            Toast.error('Ürün bulunamadı');
            return;
        }
        
        const totalCost = NumberUtils.round(kg * pricePerKg, 2);
        
        // 1. Raw Material Shipment kaydı oluştur
        const shipmentData = {
            supplierId: supplierId,
            productId: productId,
            productName: product.name,
            kg: kg,
            pricePerKg: pricePerKg,
            totalCost: totalCost,
            currency: 'USD',
            date: date,
            note: note
        };
        
        const shipment = await db.create('rawMaterialShipments', shipmentData);
        console.log('✅ Ham kumaş gönderimi kaydedildi:', shipment);
        
        // 2. ProductionCost oluştur (ormeCost dolu, diğerleri 0)
        const costData = {
            lotId: null, // Ham kumaş gönderimi için lot yok
            productId: productId,
            supplierId: supplierId,
            iplikCost: 0,
            ormeCost: totalCost, // USD olarak
            boyahaneCost: 0,
            totalCost: totalCost,
            paidAmount: 0,
            status: 'pending',
            pricePerKg: pricePerKg,
            currency: 'USD',
            rawMaterialShipmentId: shipment.id // İlişki için
        };
        
        const productionCost = await ProductionCostService.create(costData);
        console.log('✅ ProductionCost oluşturuldu:', productionCost);
        
        ModalManager.hide();
        Toast.success(`Ham kumaş gönderimi kaydedildi: ${kg}kg × $${pricePerKg.toFixed(2)} = ${NumberUtils.formatUSD(totalCost)}`);
        
        // Ekstre sayfasını yenile
        if (document.getElementById('supplier-detail-page')?.classList.contains('active')) {
            await loadSupplierExtract(supplierId);
        }
        
    } catch (error) {
        console.error('Ham kumaş gönderimi kaydetme hatası:', error);
        Toast.error(error.message || 'Kayıt sırasında hata oluştu');
    }
}

window.showNewRawMaterialShipmentModal = showNewRawMaterialShipmentModal;
window.saveRawMaterialShipment = saveRawMaterialShipment;
window.updateRawMaterialTotal = updateRawMaterialTotal;

// İplik Çeşitleri Fiyat Listesi Modalı (İplik Tedarikçileri için)
async function showYarnTypePriceListModal() {
    try {
        const supplierId = window.currentSupplierId;
        if (!supplierId) {
            Toast.error('Tedarikçi seçilmedi');
            return;
        }
        
        const supplier = await SupplierService.getById(supplierId);
        if (!supplier || supplier.type !== 'iplik') {
            Toast.error('Bu işlem sadece iplik tedarikçileri için geçerlidir');
            return;
        }
        
        const [yarnTypes, priceList] = await Promise.all([
            YarnTypeService.getAll(),
            SupplierService.getPriceListBySupplier(supplierId)
        ]);
        
        const rows = yarnTypes.map(yt => {
            const existing = priceList.find(x => x.yarnTypeId === yt.id);
            let val = '';
            if (existing && existing.pricePerKg) {
                val = existing.pricePerKg;
            }
            return `
                <tr>
                    <td>${yt.name}</td>
                    <td>${yt.code || '-'}</td>
                    <td>
                        <input type="number" class="yarn-price-input" data-yarn-type-id="${yt.id}" value="${val}" step="0.01" min="0" placeholder="USD/KG">
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="saveYarnTypePrice('${yt.id}')">Kaydet</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        const html = `
            <div class="modal-overlay">
                <div class="modal" style="width: 700px; max-height: 80vh;">
                    <div class="modal-header">
                        <h3>İplik Çeşitleri Fiyat Listesi (USD/KG)</h3>
                        <button class="modal-close" onclick="ModalManager.hide()">×</button>
                    </div>
                    <div class="modal-content">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>İplik Çeşidi</th>
                                    <th>Kod</th>
                                    <th>Fiyat (USD/KG)</th>
                                    <th>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">Kapat</button>
                        <button type="button" class="btn btn-primary" onclick="saveAllYarnTypePrices()">Tümünü Kaydet</button>
                    </div>
                </div>
            </div>`;
        ModalManager.show(html);
    } catch (e) {
        console.error('Yarn type price list modal error:', e);
        Toast.error('Fiyat listesi yüklenirken hata oluştu');
    }
}

async function saveYarnTypePrice(yarnTypeId) {
    try {
        const supplierId = window.currentSupplierId;
        const supplier = await SupplierService.getById(supplierId);
        if (!supplier || supplier.type !== 'iplik') {
            Toast.error('Bu işlem sadece iplik tedarikçileri için geçerlidir');
            return;
        }
        
        const input = document.querySelector(`.yarn-price-input[data-yarn-type-id="${yarnTypeId}"]`);
        const price = NumberUtils.parseNumber(input.value);
        if (price < 0) {
            Toast.error('Fiyat negatif olamaz');
            return;
        }
        
        // İplik çeşidi fiyatını kaydet (supplierPriceLists tablosuna yarnTypeId ile)
        const priceData = {
            supplierId: supplierId,
            supplierType: 'iplik',
            yarnTypeId: yarnTypeId,
            pricePerKg: price,
            currency: 'USD'
        };
        
        const all = await db.readAll('supplierPriceLists');
        const existing = all.find(p => p.supplierId === supplierId && p.yarnTypeId === yarnTypeId);
        
        if (existing) {
            existing.pricePerKg = price;
            existing.updatedAt = new Date().toISOString();
            await db.update('supplierPriceLists', existing);
        } else {
            await db.create('supplierPriceLists', priceData);
        }
        
        Toast.success('Fiyat kaydedildi (USD)');
    } catch (e) {
        console.error('saveYarnTypePrice error:', e);
        Toast.error('Fiyat kaydedilemedi');
    }
}

async function saveAllYarnTypePrices() {
    try {
        const supplierId = window.currentSupplierId;
        const supplier = await SupplierService.getById(supplierId);
        if (!supplier || supplier.type !== 'iplik') {
            Toast.error('Bu işlem sadece iplik tedarikçileri için geçerlidir');
            return;
        }
        
        const inputs = document.querySelectorAll('.yarn-price-input');
        let count = 0;
        for (const input of inputs) {
            const price = NumberUtils.parseNumber(input.value);
            if (price > 0) {
                const yarnTypeId = input.dataset.yarnTypeId;
                const priceData = {
                    supplierId: supplierId,
                    supplierType: 'iplik',
                    yarnTypeId: yarnTypeId,
                    pricePerKg: price,
                    currency: 'USD'
                };
                
                const all = await db.readAll('supplierPriceLists');
                const existing = all.find(p => p.supplierId === supplierId && p.yarnTypeId === yarnTypeId);
                
                if (existing) {
                    existing.pricePerKg = price;
                    existing.updatedAt = new Date().toISOString();
                    await db.update('supplierPriceLists', existing);
                } else {
                    await db.create('supplierPriceLists', priceData);
                }
                count++;
            }
        }
        Toast.success(`${count} fiyat kaydedildi (USD)`);
        ModalManager.hide();
    } catch (e) {
        console.error('saveAllYarnTypePrices error:', e);
        Toast.error('Toplu kayıt sırasında hata');
    }
}

// İplik Girişi Modalı (İplik Tedarikçileri için)
async function showNewYarnShipmentModal() {
    const supplierId = window.currentSupplierId;
    if (!supplierId) {
        Toast.error('Tedarikçi seçilmedi');
        return;
    }
    
    const supplier = await SupplierService.getById(supplierId);
    if (!supplier || supplier.type !== 'iplik') {
        Toast.error('Bu işlem sadece iplik tedarikçileri için geçerlidir');
        return;
    }
    
    const [yarnTypes, priceList] = await Promise.all([
        YarnTypeService.getAll(),
        SupplierService.getPriceListBySupplier(supplierId)
    ]);
    
    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal" style="width: 600px;">
                <div class="modal-header">
                    <h3>İplik Girişi - ${supplier.name}</h3>
                    <button class="modal-close" onclick="ModalManager.hide()">×</button>
                </div>
                <div class="modal-content">
                    <form id="yarn-shipment-form">
                        <div class="form-group">
                            <label for="yarn-type">İplik Çeşidi *</label>
                            <select id="yarn-type" name="yarnTypeId" required onchange="updateYarnPrice()">
                                <option value="">Seçin</option>
                                ${yarnTypes.map(yt => `<option value="${yt.id}" data-name="${yt.name}">${yt.name}${yt.code ? ` (${yt.code})` : ''}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="yarn-kg">Miktar (KG) *</label>
                                <input type="number" id="yarn-kg" name="kg" required step="0.01" min="0.01" 
                                       placeholder="0.00" onchange="updateYarnTotal()">
                            </div>
                            <div class="form-group">
                                <label for="yarn-date">Tarih *</label>
                                <input type="date" id="yarn-date" name="date" required 
                                       value="${DateUtils.getInputDate()}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="yarn-price-per-kg">Birim Fiyat (USD/kg) *</label>
                                <input type="number" id="yarn-price-per-kg" name="pricePerKg" required 
                                       step="0.01" min="0" placeholder="0.00" onchange="updateYarnTotal()">
                                <small class="form-hint">İplik tedarikçisinin sabit fiyatı</small>
                            </div>
                            <div class="form-group">
                                <label for="yarn-total">Toplam (USD)</label>
                                <input type="text" id="yarn-total" readonly 
                                       placeholder="Otomatik hesaplanacak" style="font-weight: bold; color: #2563eb;">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="yarn-note">Not</label>
                            <textarea id="yarn-note" name="note" 
                                      placeholder="İsteğe bağlı notlar"></textarea>
                        </div>
                        <input type="hidden" name="supplierId" value="${supplierId}">
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                    <button type="button" class="btn btn-primary" onclick="saveYarnShipment()">Kaydet</button>
                </div>
            </div>
        </div>
    `;
    
    ModalManager.show(modalHtml);
    
    // İplik çeşidi seçildiğinde fiyatı otomatik doldur
    const yarnTypeSelect = document.getElementById('yarn-type');
    const priceInput = document.getElementById('yarn-price-per-kg');
    
    if (yarnTypeSelect && priceInput) {
        yarnTypeSelect.addEventListener('change', () => {
            const yarnTypeId = yarnTypeSelect.value;
            if (yarnTypeId) {
                const price = priceList.find(p => p.yarnTypeId === yarnTypeId);
                if (price && price.pricePerKg) {
                    priceInput.value = price.pricePerKg.toFixed(2);
                    updateYarnTotal();
                }
            }
        });
    }
}

// İplik girişi toplamını güncelle
function updateYarnTotal() {
    const kg = NumberUtils.parseNumber(document.getElementById('yarn-kg')?.value || 0);
    const pricePerKg = NumberUtils.parseNumber(document.getElementById('yarn-price-per-kg')?.value || 0);
    const total = NumberUtils.round(kg * pricePerKg, 2);
    const totalInput = document.getElementById('yarn-total');
    if (totalInput) {
        totalInput.value = NumberUtils.formatUSD(total);
    }
}

// İplik girişi kaydet
async function saveYarnShipment() {
    try {
        const form = document.getElementById('yarn-shipment-form');
        if (!form) {
            Toast.error('Form bulunamadı');
            return;
        }
        
        const formData = new FormData(form);
        const supplierId = formData.get('supplierId');
        const yarnTypeId = formData.get('yarnTypeId');
        const kg = NumberUtils.parseNumber(formData.get('kg'));
        const pricePerKg = NumberUtils.parseNumber(formData.get('pricePerKg'));
        const date = formData.get('date');
        const note = formData.get('note')?.trim() || '';
        
        if (!supplierId || !yarnTypeId || !kg || !pricePerKg || !date) {
            Toast.error('Lütfen tüm zorunlu alanları doldurun');
            return;
        }
        
        const supplier = await SupplierService.getById(supplierId);
        if (!supplier || supplier.type !== 'iplik') {
            Toast.error('Bu işlem sadece iplik tedarikçileri için geçerlidir');
            return;
        }
        
        const yarnType = await YarnTypeService.getById(yarnTypeId);
        if (!yarnType) {
            Toast.error('İplik çeşidi bulunamadı');
            return;
        }
        
        const totalCost = NumberUtils.round(kg * pricePerKg, 2);
        
        // 1. Yarn Shipment kaydı oluştur
        const shipmentData = {
            supplierId: supplierId,
            yarnTypeId: yarnTypeId,
            yarnTypeName: yarnType.name,
            kg: kg,
            pricePerKg: pricePerKg,
            totalCost: totalCost,
            currency: 'USD',
            date: date,
            note: note
        };
        
        const shipment = await db.create('yarnShipments', shipmentData);
        console.log('✅ İplik girişi kaydedildi:', shipment);
        
        // 2. ProductionCost oluştur (iplikCost dolu, diğerleri 0)
        const costData = {
            lotId: null, // İplik girişi için lot yok
            productId: null, // İplik girişi için ürün yok
            supplierId: supplierId,
            yarnTypeId: yarnTypeId,
            iplikCost: totalCost, // USD olarak
            ormeCost: 0,
            boyahaneCost: 0,
            totalCost: totalCost,
            paidAmount: 0,
            status: 'pending',
            pricePerKg: pricePerKg,
            currency: 'USD',
            yarnShipmentId: shipment.id // İlişki için
        };
        
        const productionCost = await ProductionCostService.create(costData);
        console.log('✅ ProductionCost oluşturuldu:', productionCost);
        
        ModalManager.hide();
        Toast.success(`İplik girişi kaydedildi: ${kg}kg × $${pricePerKg.toFixed(2)} = ${NumberUtils.formatUSD(totalCost)}`);
        
        // Ekstre sayfasını yenile
        if (document.getElementById('supplier-detail-page')?.classList.contains('active')) {
            await loadSupplierExtract(supplierId);
        }
        
    } catch (error) {
        console.error('İplik girişi kaydetme hatası:', error);
        Toast.error(error.message || 'Kayıt sırasında hata oluştu');
    }
}

window.showYarnTypePriceListModal = showYarnTypePriceListModal;
window.saveYarnTypePrice = saveYarnTypePrice;
window.saveAllYarnTypePrices = saveAllYarnTypePrices;
window.showNewYarnShipmentModal = showNewYarnShipmentModal;
window.saveYarnShipment = saveYarnShipment;
window.updateYarnTotal = updateYarnTotal;
window.updateYarnPrice = updateYarnTotal; // Alias

// ==== İPLİK TÜRLERİ YÖNETİM MODALI ====
async function showYarnTypesManageModal() {
    try {
        const yarnTypes = await YarnTypeService.getAll();
        
        const typeRows = yarnTypes.length > 0 
            ? yarnTypes.map(yt => `
                <tr data-id="${yt.id}">
                    <td>
                        <input type="text" class="form-control yarn-type-name" value="${yt.name || ''}" placeholder="İplik adı">
                    </td>
                    <td>
                        <input type="text" class="form-control yarn-type-desc" value="${yt.description || ''}" placeholder="Açıklama (opsiyonel)">
                    </td>
                    <td class="text-center">
                        <button class="action-btn action-btn-delete" onclick="deleteYarnType('${yt.id}')">
                            🗑️
                        </button>
                    </td>
                </tr>
            `).join('')
            : '<tr><td colspan="3" class="text-center">Henüz iplik türü eklenmemiş</td></tr>';
        
        const html = `
        <div class="modal-overlay">
            <div class="modal" style="width: 600px; max-height: 80vh;">
                <div class="modal-header">
                    <h3>🧶 İplik Türleri Yönetimi</h3>
                    <button class="modal-close" onclick="ModalManager.hide()">×</button>
                </div>
                <div class="modal-content" style="max-height: 50vh; overflow-y: auto;">
                    <div class="form-section">
                        <h4>Mevcut İplik Türleri</h4>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>İplik Adı</th>
                                    <th>Açıklama</th>
                                    <th style="width: 60px;">Sil</th>
                                </tr>
                            </thead>
                            <tbody id="yarn-types-list">
                                ${typeRows}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="form-section" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <h4>Yeni İplik Türü Ekle</h4>
                        <div class="form-row">
                            <div class="form-group" style="flex: 2;">
                                <label>İplik Adı *</label>
                                <input type="text" id="new-yarn-type-name" class="form-control" placeholder="Örn: Pamuk 30/1">
                            </div>
                            <div class="form-group" style="flex: 2;">
                                <label>Açıklama</label>
                                <input type="text" id="new-yarn-type-desc" class="form-control" placeholder="Opsiyonel açıklama">
                            </div>
                            <div class="form-group" style="flex: 1; display: flex; align-items: flex-end;">
                                <button class="btn btn-success" onclick="addYarnType()" style="width: 100%;">
                                    + Ekle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="ModalManager.hide()">Kapat</button>
                    <button class="btn btn-primary" onclick="saveAllYarnTypes()">Değişiklikleri Kaydet</button>
                </div>
            </div>
        </div>`;
        
        ModalManager.show(html);
        
    } catch (error) {
        console.error('Yarn types modal error:', error);
        Toast.error('İplik türleri yüklenirken hata oluştu');
    }
}

async function addYarnType() {
    try {
        const nameInput = document.getElementById('new-yarn-type-name');
        const descInput = document.getElementById('new-yarn-type-desc');
        
        const name = nameInput.value.trim();
        const description = descInput.value.trim();
        
        if (!name) {
            Toast.error('İplik adı zorunludur');
            return;
        }
        
        await YarnTypeService.create({ name, description });
        Toast.success('İplik türü eklendi');
        
        // Modal'ı yenile
        await showYarnTypesManageModal();
        
    } catch (error) {
        console.error('Add yarn type error:', error);
        Toast.error(error.message || 'İplik türü eklenirken hata oluştu');
    }
}

async function deleteYarnType(id) {
    try {
        if (!confirm('Bu iplik türünü silmek istediğinizden emin misiniz?')) {
            return;
        }
        
        await YarnTypeService.delete(id);
        Toast.success('İplik türü silindi');
        
        // Modal'ı yenile
        await showYarnTypesManageModal();
        
    } catch (error) {
        console.error('Delete yarn type error:', error);
        Toast.error(error.message || 'İplik türü silinirken hata oluştu');
    }
}

async function saveAllYarnTypes() {
    try {
        const rows = document.querySelectorAll('#yarn-types-list tr[data-id]');
        let updated = 0;
        
        for (const row of rows) {
            const id = row.dataset.id;
            const nameInput = row.querySelector('.yarn-type-name');
            const descInput = row.querySelector('.yarn-type-desc');
            
            if (!nameInput) continue;
            
            const name = nameInput.value.trim();
            const description = descInput ? descInput.value.trim() : '';
            
            if (!name) continue;
            
            await YarnTypeService.update({ id, name, description });
            updated++;
        }
        
        Toast.success(`${updated} iplik türü güncellendi`);
        ModalManager.hide();
        
    } catch (error) {
        console.error('Save yarn types error:', error);
        Toast.error(error.message || 'İplik türleri kaydedilirken hata oluştu');
    }
}

window.showYarnTypesManageModal = showYarnTypesManageModal;
window.addYarnType = addYarnType;
window.deleteYarnType = deleteYarnType;
window.saveAllYarnTypes = saveAllYarnTypes;

// Statement modal for Raw USD Balance
async function showRawBalanceStatementModal() {
    try {
        const { rows, balance } = await RawBalanceService.getStatement();
        const tableRows = rows.map(r => `
            <tr>
                <td>${DateUtils.formatDate(r.date)}</td>
                <td>${r.description}</td>
                <td class="text-right">${r.kg ? NumberUtils.formatKg(r.kg) : '-'}</td>
                <td class="text-right">${r.pricePerKg ? NumberUtils.formatUnitPrice(r.pricePerKg) : '-'}</td>
                <td class="text-right text-danger">${r.type !== 'payment' ? NumberUtils.formatUSD(r.amountUsd) : '-'}</td>
                <td class="text-right text-success">${r.type === 'payment' ? NumberUtils.formatUSD(r.amountUsd) : '-'}</td>
                <td class="text-right">${NumberUtils.formatUSD(r.runningBalance)}</td>
            </tr>
        `).join('') || '<tr><td colspan="7" class="text-center">Hareket yok</td></tr>';

        const html = `
        <div class="modal-overlay">
            <div class="modal" style="width: 860px;">
                <div class="modal-header">
                    <h3>Ham USD Cari Hareketleri</h3>
                    <button class="modal-close" onclick="ModalManager.hide()">×</button>
                </div>
                <div class="modal-content">
                    <div class="simple-summary" style="margin-bottom:8px;">
                        <div class="summary-row">
                            <div class="summary-item total">
                                <span class="label">Güncel Bakiye:</span>
                                <span class="amount">${NumberUtils.formatUSD(balance)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Açıklama</th>
                                    <th class="text-right">Kg</th>
                                    <th class="text-right">USD/kg</th>
                                    <th class="text-right">Borç (USD)</th>
                                    <th class="text-right">Ödeme (USD)</th>
                                    <th class="text-right">Bakiye (USD)</th>
                                </tr>
                            </thead>
                            <tbody>${tableRows}</tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="ModalManager.hide()">Kapat</button>
                </div>
            </div>
        </div>`;
        ModalManager.show(html);
    } catch (e) {
        console.error('showRawBalanceStatementModal error:', e);
        Toast.error('Hareketler yüklenemedi');
    }
}

// --- RAW USD AÇILIŞ BAKİYESİ MODALI ---
function showRawOpeningModal() {
    const html = `
    <div class="modal-overlay">
        <div class="modal" style="width: 420px;">
            <div class="modal-header">
                <h3>Ham USD Açılış Bakiyesi</h3>
                <button class="modal-close" onclick="ModalManager.hide()">×</button>
            </div>
            <div class="modal-content">
                <form id="raw-opening-form">
                    <div class="form-group">
                        <label for="opening-date">Tarih *</label>
                        <input type="date" id="opening-date" name="date" required value="${DateUtils.getInputDate()}">
                    </div>
                    <div class="form-group">
                        <label for="opening-amount">Tutar (USD) *</label>
                        <input type="number" id="opening-amount" name="amountUsd" step="0.01" min="0" required placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label for="opening-note">Not</label>
                        <textarea id="opening-note" name="note" placeholder="İsteğe bağlı"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                <button class="btn btn-primary" onclick="saveRawOpening()">Kaydet</button>
            </div>
        </div>
    </div>`;
    ModalManager.show(html);
}

async function saveRawOpening() {
    try {
        const f = document.getElementById('raw-opening-form');
        const fd = new FormData(f);
        const date = fd.get('date');
        const amountUsd = NumberUtils.parseNumber(fd.get('amountUsd'));
        const note = (fd.get('note') || '').trim();
        if (!date || !(amountUsd >= 0)) { throw new Error('Tarih ve tutar zorunludur'); }
        await RawBalanceService.addOpeningBalance(amountUsd, date);
        ModalManager.hide();
        Toast.success('Açılış bakiyesi kaydedildi');
    } catch (e) {
        console.error('saveRawOpening error:', e);
        Toast.error(e.message || 'Açılış bakiyesi kaydedilemedi');
    }
}

// --- RAW USD ÖDEME MODALI ---
function showRawUsdPaymentModal() {
    const html = `
    <div class="modal-overlay">
        <div class="modal" style="width: 420px;">
            <div class="modal-header">
                <h3>Ham USD Ödeme</h3>
                <button class="modal-close" onclick="ModalManager.hide()">×</button>
            </div>
            <div class="modal-content">
                <form id="raw-usd-payment-form">
                    <div class="form-group">
                        <label for="rp-date">Tarih *</label>
                        <input type="date" id="rp-date" name="date" required value="${DateUtils.getInputDate()}">
                    </div>
                    <div class="form-group">
                        <label for="rp-amount">Tutar (USD) *</label>
                        <input type="number" id="rp-amount" name="amountUsd" step="0.01" min="0.01" required placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label for="rp-note">Not</label>
                        <input type="text" id="rp-note" name="note" placeholder="İsteğe bağlı">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                <button class="btn btn-primary" onclick="saveRawUsdPayment()">Kaydet</button>
            </div>
        </div>
    </div>`;
    ModalManager.show(html);
}

async function saveRawUsdPayment() {
    try {
        const f = document.getElementById('raw-usd-payment-form');
        const fd = new FormData(f);
        const date = fd.get('date');
        const amountUsd = NumberUtils.parseNumber(fd.get('amountUsd'));
        const note = (fd.get('note') || '').trim();
        if (!date || !(amountUsd > 0)) { throw new Error('Tarih ve tutar zorunludur'); }
        await RawBalanceService.addPayment({ amountUsd, method: '', note, date });
        ModalManager.hide();
        Toast.success('Ödeme kaydedildi');
    } catch (e) {
        console.error('saveRawUsdPayment error:', e);
        Toast.error(e.message || 'USD ödeme kaydedilemedi');
    }
}

// --- TEDARİKÇİ HIZLI MAKBUZ (Placeholder) ---
function showSupplierQuickReceiptModal() {
    const html = `
    <div class="modal-overlay">
        <div class="modal" style="width:420px;">
            <div class="modal-header">
                <h3>Tedarikçi Hızlı Makbuz</h3>
                <button class="modal-close" onclick="ModalManager.hide()">×</button>
            </div>
            <div class="modal-content">
                <div class="alert alert-info">Bu özellik henüz tamamlanmadı. Demo içerik.</div>
                <button class="btn btn-primary" onclick="printSupplierQuickReceipt()">Yazdır (Demo)</button>
            </div>
            <div class="modal-footer">
                <button class="btn" onclick="ModalManager.hide()">Kapat</button>
            </div>
        </div>
    </div>`;
    ModalManager.show(html);
}

function printSupplierQuickReceipt() {
    console.warn('printSupplierQuickReceipt: demo stub çağrıldı.');
    Toast.info('Makbuz yazdırma demo: henüz gerçek veri bağlı değil');
}

// =========================
// SAFE GLOBAL EXPOSE (REPLACE)
// =========================
(function exposeGlobalsSafely() {
    const g = window;
    const bind = (name, fn) => {
        if (typeof fn === 'function' && typeof g[name] !== 'function') g[name] = fn;
    };
    // mevcutlar
    bind('ModalManager', ModalManager);
    bind('showNewCustomerModal', showNewCustomerModal);
    bind('showNewProductModal', showNewProductModal);
    bind('showNewLotModal', showNewLotModal);
    bind('showNewPaymentModalFromModals', showNewPaymentModal);
    bind('showNewPaymentModal', showNewPaymentModal);
    bind('showNewShipmentModal', showNewShipmentModal);
    bind('showConfirmModal', showConfirmModal);
    bind('showImportCSVModal', showImportCSVModal);
    bind('showImportDataModal', showImportDataModal);
    bind('selectLot', selectLot);
    bind('updateLineTotal', updateLineTotal);
    bind('removeLine', removeLine);
    bind('addShipmentLine', addShipmentLine);
    bind('addShipmentLineByParty', addShipmentLineByParty);
    bind('saveShipment', saveShipment);
    bind('saveCustomer', saveCustomer);
    bind('saveProduct', saveProduct);
    bind('saveLot', saveLot);
    bind('savePayment', savePayment);
    bind('confirmAction', confirmAction);
    bind('confirmActionAsync', confirmActionAsync);
    bind('importCSV', importCSV);
    bind('importData', importData);
    bind('showNewSupplierModal', showNewSupplierModal);
    bind('showNewSupplierPaymentModal', showNewSupplierPaymentModal);
    bind('saveSupplier', saveSupplier);
    bind('saveSupplierPayment', saveSupplierPayment);
    bind('loadExchangeRate', loadExchangeRate);
    bind('updateExchangeRate', updateExchangeRate);
    bind('onExchangeRateChange', onExchangeRateChange);
    bind('updatePaymentCurrency', updatePaymentCurrency);
    bind('updatePaymentAmount', updatePaymentAmount);
    bind('updatePaymentExchangeRate', updatePaymentExchangeRate);
    bind('showPriceListModal', showPriceListModal);
    bind('saveProductPrice', saveProductPrice);
    bind('saveAllPrices', saveAllPrices);
    bind('showSupplierPriceListModal', showSupplierPriceListModal);
    bind('saveSupplierProductPrice', saveSupplierProductPrice);
    bind('saveAllSupplierPrices', saveAllSupplierPrices);
    bind('showRawBalanceStatementModal', showRawBalanceStatementModal);
    // eksikler (yeni eklediklerimiz)
    bind('showRawOpeningModal', showRawOpeningModal);
    bind('saveRawOpening', saveRawOpening);
    bind('showRawUsdPaymentModal', showRawUsdPaymentModal);
    bind('saveRawUsdPayment', saveRawUsdPayment);
    bind('showSupplierQuickReceiptModal', showSupplierQuickReceiptModal);
    bind('printSupplierQuickReceipt', printSupplierQuickReceipt);
})();

// --- CASCADE DELETE: raw lot silinince ham USD cari kaydını da sil ---
(function attachInventoryLotCascadeDelete() {
    // db henüz yüklenmemişse bekle (max 10 saniye)
    let attempts = 0;
    const maxAttempts = 100;
    
    const tryAttach = () => {
        attempts++;
        
        // window.db yoksa ve deneme hakkı kaldıysa bekle
        if (!window.db) {
            if (attempts < maxAttempts) {
                setTimeout(tryAttach, 100);
            }
            // Sessizce çık, uyarı verme
            return;
        }
        
        // Firebase Firestore kullanılıyorsa delete fonksiyonu farklı bir yapıda olabilir
        // Bu durumda sessizce çık, hook ekleme
        if (typeof window.db.delete !== 'function') {
            // Sessizce çık - Firebase senaryosunda bu normaldir
            return;
        }
        
        // Hook'u ekle
        attachHook();
    };
    
    const attachHook = () => {
        // Son kontrol
        if (typeof window.db.delete !== 'function') {
            return;
        }

        const originalDelete = window.db.delete.bind(window.db);

        window.db.delete = async function(storeName, id) {
            // inventoryLots dışı ise aynen çalış
            if (storeName !== 'inventoryLots') {
                return originalDelete(storeName, id);
            }

            // Silmeden önce lot'u oku (isRaw ve id kontrolü için)
            let lot = null;
            try { lot = await window.db.read('inventoryLots', id); } catch (e) { /* sessiz */ }

            const res = await originalDelete(storeName, id);

            try {
                if (lot && lot.isRaw) {
                    // Önce RawBalanceService varsa onu kullan
                    if (window.RawBalanceService && typeof window.RawBalanceService.removeByLotId === 'function') {
                        await window.RawBalanceService.removeByLotId(id);
                    } else {
                        // Fallback: Servis yoksa lotId ile tek tek sil
                        let items = [];
                        try {
                            items = await window.db.readAll('rawBalances');
                        } catch (e) {
                            // sessiz geç
                        }
                        for (const it of (items || [])) {
                            const rid = it?.id || it?.docId || it;
                            if (it && (it.lotId === id)) {
                                try {
                                    await window.db.delete('rawBalances', rid);
                                } catch (e) {
                                    // sessiz geç
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                // Ham cari kaskad silme hatası - sessiz geç
            }

            // Dashboard sayfası açıksa yenile (opsiyonel)
            try {
                if (document.getElementById('dashboard-page')?.classList.contains('active')) {
                    await window.loadDashboard?.();
                }
            } catch (e) {
                // sessiz geç
            }

            return res;
        };

        // Hook başarıyla eklendi (sadece IndexedDB senaryosunda)
        // console.log('✅ cascadeDelete hook aktif'); // Gerekirse açılabilir
    };
    
    // İlk denemeyi başlat
    tryAttach();
})();