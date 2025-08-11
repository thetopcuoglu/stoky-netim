// IndexedDB Database Layer for Kumaş Stok Yönetimi

class Database {
    constructor() {
        this.dbName = 'KumasStokDB';
        this.version = 2;
        this.db = null;
    }

    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Database error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createStores(db);
            };
        });
    }

    // Create object stores
    createStores(db) {
        // Customers store
        if (!db.objectStoreNames.contains('customers')) {
            const customersStore = db.createObjectStore('customers', { keyPath: 'id' });
            customersStore.createIndex('name', 'name', { unique: false });
            customersStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Products/Fabrics store
        if (!db.objectStoreNames.contains('products')) {
            const productsStore = db.createObjectStore('products', { keyPath: 'id' });
            productsStore.createIndex('name', 'name', { unique: false });
            productsStore.createIndex('code', 'code', { unique: false });
        }

        // Inventory Lots store
        if (!db.objectStoreNames.contains('inventoryLots')) {
            const lotsStore = db.createObjectStore('inventoryLots', { keyPath: 'id' });
            lotsStore.createIndex('productId', 'productId', { unique: false });
            lotsStore.createIndex('party', 'party', { unique: false });
            lotsStore.createIndex('status', 'status', { unique: false });
            lotsStore.createIndex('date', 'date', { unique: false });
        }

        // Shipments store
        if (!db.objectStoreNames.contains('shipments')) {
            const shipmentsStore = db.createObjectStore('shipments', { keyPath: 'id' });
            shipmentsStore.createIndex('customerId', 'customerId', { unique: false });
            shipmentsStore.createIndex('date', 'date', { unique: false });
        }

        // Payments store
        if (!db.objectStoreNames.contains('payments')) {
            const paymentsStore = db.createObjectStore('payments', { keyPath: 'id' });
            paymentsStore.createIndex('customerId', 'customerId', { unique: false });
            paymentsStore.createIndex('date', 'date', { unique: false });
        }

        // Suppliers store
        if (!db.objectStoreNames.contains('suppliers')) {
            const suppliersStore = db.createObjectStore('suppliers', { keyPath: 'id' });
            suppliersStore.createIndex('name', 'name', { unique: false });
            suppliersStore.createIndex('type', 'type', { unique: false });
        }

        // Production Costs store
        if (!db.objectStoreNames.contains('productionCosts')) {
            const costsStore = db.createObjectStore('productionCosts', { keyPath: 'id' });
            costsStore.createIndex('lotId', 'lotId', { unique: false });
            costsStore.createIndex('productId', 'productId', { unique: false });
            costsStore.createIndex('status', 'status', { unique: false });
        }

        // Supplier Payments store
        if (!db.objectStoreNames.contains('supplierPayments')) {
            const supplierPaymentsStore = db.createObjectStore('supplierPayments', { keyPath: 'id' });
            supplierPaymentsStore.createIndex('supplierId', 'supplierId', { unique: false });
            supplierPaymentsStore.createIndex('supplierType', 'supplierType', { unique: false });
            supplierPaymentsStore.createIndex('date', 'date', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
        }

        console.log('Database stores created');
    }

    // Generic CRUD operations
    async create(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Ensure ID and timestamps
            if (!data.id) {
                data.id = StringUtils.generateId();
            }
            if (!data.createdAt) {
                data.createdAt = new Date().toISOString();
            }
            if (!data.updatedAt) {
                data.updatedAt = new Date().toISOString();
            }

            const request = store.add(data);

            request.onsuccess = () => {
                resolve(data);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async read(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async readAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Update timestamp
            data.updatedAt = new Date().toISOString();

            const request = store.put(data);

            request.onsuccess = () => {
                resolve(data);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Query by index
    async queryByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Query by date range
    async queryByDateRange(storeName, startDate, endDate) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index('date');
            
            const range = IDBKeyRange.bound(
                startDate.toISOString(),
                endDate.toISOString()
            );
            
            const request = index.getAll(range);

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Batch operations
    async batchCreate(storeName, dataArray) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const promises = [];

        for (const data of dataArray) {
            // Ensure ID and timestamps
            if (!data.id) {
                data.id = StringUtils.generateId();
            }
            if (!data.createdAt) {
                data.createdAt = new Date().toISOString();
            }
            if (!data.updatedAt) {
                data.updatedAt = new Date().toISOString();
            }

            promises.push(new Promise((resolve, reject) => {
                const request = store.add(data);
                request.onsuccess = () => resolve(data);
                request.onerror = () => reject(request.error);
            }));
        }

        return Promise.all(promises);
    }

    async batchUpdate(storeName, dataArray) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const promises = [];

        for (const data of dataArray) {
            // Update timestamp
            data.updatedAt = new Date().toISOString();

            promises.push(new Promise((resolve, reject) => {
                const request = store.put(data);
                request.onsuccess = () => resolve(data);
                request.onerror = () => reject(request.error);
            }));
        }

        return Promise.all(promises);
    }

    // Clear all data
    async clearAll() {
        const storeNames = ['customers', 'products', 'inventoryLots', 'shipments', 'payments', 'suppliers', 'productionCosts', 'supplierPayments'];
        const transaction = this.db.transaction(storeNames, 'readwrite');
        
        const promises = storeNames.map(storeName => {
            return new Promise((resolve, reject) => {
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });

        return Promise.all(promises);
    }

    // Export all data
    async exportData() {
        const storeNames = ['customers', 'products', 'inventoryLots', 'shipments', 'payments', 'suppliers', 'productionCosts', 'supplierPayments', 'settings'];
        const exportData = {};

        for (const storeName of storeNames) {
            exportData[storeName] = await this.readAll(storeName);
        }

        exportData.exportDate = new Date().toISOString();
        exportData.version = this.version;

        return exportData;
    }

    // Import all data
    async importData(importData) {
        try {
            // Clear existing data first
            await this.clearAll();

            // Import each store's data
            const storeNames = ['customers', 'products', 'inventoryLots', 'shipments', 'payments', 'suppliers', 'productionCosts', 'supplierPayments'];
            
            for (const storeName of storeNames) {
                if (importData[storeName] && Array.isArray(importData[storeName])) {
                    await this.batchCreate(storeName, importData[storeName]);
                }
            }

            // Import settings
            if (importData.settings && Array.isArray(importData.settings)) {
                for (const setting of importData.settings) {
                    await this.create('settings', setting);
                }
            }

            return true;
        } catch (error) {
            console.error('Import error:', error);
            throw error;
        }
    }

    // Settings helpers
    async getSetting(key, defaultValue = null) {
        try {
            const setting = await this.read('settings', key);
            return setting ? setting.value : defaultValue;
        } catch (error) {
            return defaultValue;
        }
    }

    async setSetting(key, value) {
        try {
            const setting = { key, value, updatedAt: new Date().toISOString() };
            
            // Try to update first, if not exists then create
            try {
                await this.update('settings', setting);
            } catch (error) {
                await this.create('settings', setting);
            }
            
            return setting;
        } catch (error) {
            console.error('Error setting:', key, error);
            throw error;
        }
    }

    // Database health check
    async healthCheck() {
        try {
            const stores = ['customers', 'products', 'inventoryLots', 'shipments', 'payments', 'suppliers', 'productionCosts', 'supplierPayments'];
            const counts = {};
            
            for (const store of stores) {
                const data = await this.readAll(store);
                counts[store] = data.length;
            }
            
            return {
                healthy: true,
                counts,
                version: this.version,
                dbName: this.dbName
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
}

// Create global database instance
window.db = new Database();

// Initialize database when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        LoadingState.show();
        await window.db.init();
        console.log('Database initialized successfully');
        LoadingState.hide();
    } catch (error) {
        console.error('Database initialization failed:', error);
        Toast.error('Veritabanı başlatılamadı. Lütfen sayfayı yenileyin.');
        LoadingState.hide();
    }
});