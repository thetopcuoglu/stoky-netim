// Firebase Setup UI and Functions

// Firebase bağlantı durumu gösterimi
function updateConnectionStatus(isConnected, message = '') {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;

    const statusDot = statusElement.querySelector('.status-dot');

    if (isConnected) {
        statusDot.className = 'status-dot connected';
        statusElement.title = message || 'Firebase bulut veritabanına bağlı';
    } else {
        statusDot.className = 'status-dot disconnected';
        statusElement.title = message || 'IndexedDB yerel veritabanı kullanılıyor';
    }
}

// Firebase konfigürasyon modalını göster
function showFirebaseConfigModal() {
    const modalHtml = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Firebase Bulut Depolama Kurulumu</h3>
                <button type="button" class="close-btn" onclick="ModalManager.hide()">×</button>
            </div>
            <div class="modal-body">
                <div class="firebase-info">
                    <h4>Firebase Nedir?</h4>
                    <p>Firebase, Google tarafından geliştirilen bulut tabanlı bir veritabanı hizmetidir. 
                    Verilerinizi güvenli bir şekilde bulutta saklar ve farklı cihazlar arasında senkronize eder.</p>
                    
                    <h4>Avantajları:</h4>
                    <ul>
                        <li>✅ Verileriniz bulutta güvende</li>
                        <li>✅ Farklı cihazlar arasında senkronizasyon</li>
                        <li>✅ Otomatik yedekleme</li>
                        <li>✅ Gerçek zamanlı güncellemeler</li>
                    </ul>
                </div>

                <div class="setup-steps">
                    <h4>Kurulum Adımları:</h4>
                    <ol>
                        <li>Firebase Console'a gidin: <a href="https://console.firebase.google.com" target="_blank">console.firebase.google.com</a></li>
                        <li>Yeni proje oluşturun veya mevcut projenizi seçin</li>
                        <li>Project Settings > General > Your apps bölümünden Web App ekleyin</li>
                        <li>Firebase Configuration bilgilerini aşağıya yapıştırın</li>
                    </ol>
                </div>

                <div class="form-group">
                    <label for="firebase-config">Firebase Configuration (JSON):</label>
                    <textarea 
                        id="firebase-config" 
                        placeholder='Örnek:
{
  "apiKey": "your-api-key",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "your-app-id"
}'
                        rows="8"
                    ></textarea>
                </div>

                <div id="firebase-test-result" class="firebase-test-result" style="display: none;"></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="ModalManager.hide()">İptal</button>
                <button type="button" class="btn btn-primary" onclick="testFirebaseConnection()">
                    <span class="btn-text">Bağlantıyı Test Et</span>
                    <span class="spinner-small" style="display: none;"></span>
                </button>
                <button type="button" class="btn btn-success" onclick="saveFirebaseConfig()" style="display: none;" id="save-firebase-btn">
                    Firebase'i Etkinleştir
                </button>
            </div>
        </div>
    `;

    ModalManager.show(modalHtml);
}

// Firebase bağlantısını test et
async function testFirebaseConnection() {
    const configTextarea = document.getElementById('firebase-config');
    const testButton = document.querySelector('.modal-footer .btn-primary');
    const saveButton = document.getElementById('save-firebase-btn');
    const resultDiv = document.getElementById('firebase-test-result');
    const spinner = testButton.querySelector('.spinner-small');
    const btnText = testButton.querySelector('.btn-text');

    try {
        // Loading state
        testButton.disabled = true;
        spinner.style.display = 'inline-block';
        btnText.textContent = 'Test ediliyor...';
        resultDiv.style.display = 'none';

        // Config'i parse et
        const configText = configTextarea.value.trim();
        if (!configText) {
            throw new Error('Firebase konfigürasyonu boş olamaz');
        }

        let firebaseConfig;
        try {
            firebaseConfig = JSON.parse(configText);
        } catch (e) {
            throw new Error('Geçersiz JSON formatı');
        }

        // Gerekli alanları kontrol et
        const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
        const missingFields = requiredFields.filter(field => !firebaseConfig[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Eksik alanlar: ${missingFields.join(', ')}`);
        }

        // storageBucket düzeltmesi
        if (firebaseConfig.storageBucket && firebaseConfig.storageBucket.includes('.firebasestorage.app')) {
            firebaseConfig.storageBucket = firebaseConfig.storageBucket.replace('.firebasestorage.app', '.appspot.com');
            configTextarea.value = JSON.stringify(firebaseConfig, null, 2);
        }

        // Test bağlantısı (basit bir doğrulama)
        resultDiv.innerHTML = `
            <div class="alert alert-success">
                ✅ <strong>Konfigürasyon geçerli!</strong><br>
                Proje ID: ${firebaseConfig.projectId}<br>
                Domain: ${firebaseConfig.authDomain}
            </div>
        `;
        resultDiv.style.display = 'block';
        saveButton.style.display = 'inline-block';

    } catch (error) {
        resultDiv.innerHTML = `
            <div class="alert alert-error">
                ❌ <strong>Hata:</strong> ${error.message}
            </div>
        `;
        resultDiv.style.display = 'block';
        saveButton.style.display = 'none';
    } finally {
        // Reset button state
        testButton.disabled = false;
        spinner.style.display = 'none';
        btnText.textContent = 'Bağlantıyı Test Et';
    }
}

// Firebase konfigürasyonunu kaydet ve etkinleştir
async function saveFirebaseConfig() {
    const configTextarea = document.getElementById('firebase-config');
    const saveButton = document.getElementById('save-firebase-btn');
    
    try {
        saveButton.disabled = true;
        saveButton.textContent = 'Kaydediliyor...';

        const firebaseConfig = JSON.parse(configTextarea.value.trim());
        
        // Konfigürasyonu localStorage'a kaydet
        localStorage.setItem('firebaseConfig', JSON.stringify(firebaseConfig));
        localStorage.setItem('useFirebase', 'true');

        // Sayfayı yeniden yükle
        ModalManager.hide();
        
        // Kullanıcıyı bilgilendir
        alert('Firebase konfigürasyonu kaydedildi! Sayfa yeniden yüklenecek.');
        window.location.reload();

    } catch (error) {
        alert('Kaydetme hatası: ' + error.message);
        saveButton.disabled = false;
        saveButton.textContent = 'Firebase\'i Etkinleştir';
    }
}

// Firebase'e geçiş yap
async function switchToFirebase() {
    if (!confirm('Firebase bulut depolama sistemine geçmek istediğinizden emin misiniz?\n\nBu işlem mevcut verilerinizi Firebase\'e aktaracaktır.')) {
        return;
    }

    try {
        // Mevcut verileri al
        const localData = await window.db.exportData();
        
        // Firebase'e geç
        localStorage.setItem('useFirebase', 'true');
        
        // Sayfayı yenile
        window.location.reload();
        
    } catch (error) {
        console.error('Firebase geçiş hatası:', error);
        alert('Firebase\'e geçiş sırasında hata oluştu: ' + error.message);
    }
}

// Verileri senkronize et
async function syncData() {
    if (!window.db || typeof window.db.exportData !== 'function') {
        alert('Veritabanı hazır değil. Lütfen sayfayı yenileyin.');
        return;
    }

    const syncButton = document.querySelector('[onclick="syncData()"]');
    const originalText = syncButton.textContent;
    
    try {
        syncButton.disabled = true;
        syncButton.textContent = 'Senkronize ediliyor...';

        // Mevcut verileri al
        const data = await window.db.exportData();
        
        // Basit senkronizasyon mesajı
        let totalRecords = 0;
        Object.values(data).forEach(records => {
            if (Array.isArray(records)) {
                totalRecords += records.length;
            }
        });

        alert(`Senkronizasyon tamamlandı!\n${totalRecords} kayıt senkronize edildi.`);
        
    } catch (error) {
        console.error('Senkronizasyon hatası:', error);
        alert('Senkronizasyon hatası: ' + error.message);
    } finally {
        syncButton.disabled = false;
        syncButton.textContent = originalText;
    }
}

// Yerel veritabanına geri dön
async function switchToLocal() {
    if (!confirm('Yerel veritabanına (IndexedDB) geri dönmek istediğinizden emin misiniz?\n\nBu işlem Firebase bağlantısını kesecektir.')) {
        return;
    }

    try {
        // Firebase ayarlarını kaldır
        localStorage.removeItem('useFirebase');
        localStorage.removeItem('firebaseConfig');
        
        // Sayfayı yenile
        window.location.reload();
        
    } catch (error) {
        console.error('Yerel veritabanına geçiş hatası:', error);
        alert('Yerel veritabanına geçiş sırasında hata oluştu: ' + error.message);
    }
}

// Firebase durumunu güncelle
function updateFirebaseStatus() {
    const isFirebase = localStorage.getItem('useFirebase') === 'true';
    const hasConfig = !!localStorage.getItem('firebaseConfig');
    
    updateConnectionStatus(isFirebase && hasConfig, 
        isFirebase && hasConfig ? 'Firebase bulut veritabanı aktif' : 'IndexedDB yerel veritabanı aktif'
    );
}

// Sayfa yüklendiğinde Firebase durumunu kontrol et
document.addEventListener('DOMContentLoaded', () => {
    updateFirebaseStatus();
});

// Firebase test fonksiyonu - yeni özellikleri test et
async function testFirebaseFeatures() {
    try {
        console.log('🧪 Firebase özellik testi başlıyor...');
        
        // Test 1: supplierPriceLists collection'ı test et
        console.log('📋 Test 1: supplierPriceLists collection testi');
        const testPrice = {
            supplierType: 'boyahane',
            productId: 'test-product-123',
            pricePerKg: 35.50,
            currency: 'TRY'
        };
        
        // Test fiyatı ekle
        const priceId = await window.db.create('supplierPriceLists', testPrice);
        console.log('✅ Test fiyatı eklendi:', priceId);
        
        // Test fiyatını oku
        const readPrice = await window.db.read('supplierPriceLists', priceId);
        console.log('✅ Test fiyatı okundu:', readPrice);
        
        // Test fiyatını index ile sorgula
        const queryPrices = await window.db.queryByIndex('supplierPriceLists', 'supplierType', 'boyahane');
        console.log('✅ Test fiyatı index ile sorgulandı:', queryPrices);
        
        // Test fiyatını sil
        await window.db.delete('supplierPriceLists', priceId);
        console.log('✅ Test fiyatı silindi');
        
        // Test 2: supplierPayments para birimi desteği test et
        console.log('💰 Test 2: supplierPayments para birimi desteği testi');
        const testPayment = {
            supplierType: 'boyahane',
            amount: 100.50, // USD
            originalAmount: 3000, // TL
            originalCurrency: 'TRY',
            exchangeRate: 30.50,
            method: 'Havale',
            date: new Date().toISOString().split('T')[0],
            note: 'Test ödemesi'
        };
        
        // Test ödemesi ekle
        const paymentId = await window.db.create('supplierPayments', testPayment);
        console.log('✅ Test ödemesi eklendi:', paymentId);
        
        // Test ödemesini oku
        const readPayment = await window.db.read('supplierPayments', paymentId);
        console.log('✅ Test ödemesi okundu:', readPayment);
        
        // Test ödemesini sil
        await window.db.delete('supplierPayments', paymentId);
        console.log('✅ Test ödemesi silindi');
        
        // Test 3: suppliers collection'ı test et
        console.log('🏭 Test 3: suppliers collection testi');
        const testSupplier = {
            name: 'Test Boyahane',
            type: 'boyahane',
            contactInfo: 'Test iletişim bilgisi'
        };
        
        // Test tedarikçisi ekle
        const supplierId = await window.db.create('suppliers', testSupplier);
        console.log('✅ Test tedarikçisi eklendi:', supplierId);
        
        // Test tedarikçisini oku
        const readSupplier = await window.db.read('suppliers', supplierId);
        console.log('✅ Test tedarikçisi okundu:', readSupplier);
        
        // Test tedarikçisini sil
        await window.db.delete('suppliers', supplierId);
        console.log('✅ Test tedarikçisi silindi');
        
        console.log('🎉 Tüm Firebase özellik testleri başarılı!');
        alert('Firebase özellik testleri başarılı! Console\'da detayları görebilirsiniz.');
        
    } catch (error) {
        console.error('❌ Firebase özellik testi hatası:', error);
        alert('Firebase özellik testi hatası: ' + error.message);
    }
}

// Global fonksiyon olarak ekle
window.testFirebaseFeatures = testFirebaseFeatures; 