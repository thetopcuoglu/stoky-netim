// IndexedDB Database Layer for Kumaş Stok Yönetimi

// IndexedDB Database Class (renamed for Firebase compatibility)
class IndexedDBDatabase {
    constructor() {
        this.dbName = 'KumasStokDB';
        this.version = 6;
        this.db = null;
        this.stores = {
            customers: 'customers',
            products: 'products',
            inventoryLots: 'inventoryLots',
            shipments: 'shipments',
            payments: 'payments',
            productionCosts: 'productionCosts',
            supplierPayments: 'supplierPayments',
            supplierPriceLists: 'supplierPriceLists',
            rawMaterialShipments: 'rawMaterialShipments',
            yarnTypes: 'yarnTypes',
            yarnShipments: 'yarnShipments',
            settings: 'settings'
        };
    }

    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                return resolve(this.db);
            }
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

        // Supplier Price Lists store (ürün bazlı fiyat listeleri)
        if (!db.objectStoreNames.contains('supplierPriceLists')) {
            const priceListsStore = db.createObjectStore('supplierPriceLists', { keyPath: 'id' });
            priceListsStore.createIndex('supplierId', 'supplierId', { unique: false });
            priceListsStore.createIndex('supplierType', 'supplierType', { unique: false });
            priceListsStore.createIndex('productId', 'productId', { unique: false });
        }

        // Raw Balances store (USD cari)
        if (!db.objectStoreNames.contains('rawBalances')) {
            const rawBalancesStore = db.createObjectStore('rawBalances', { keyPath: 'id' });
            rawBalancesStore.createIndex('date', 'date', { unique: false });
        }

        // Raw Material Shipments store (Ham kumaş gönderimleri)
        if (!db.objectStoreNames.contains('rawMaterialShipments')) {
            const rawMaterialShipmentsStore = db.createObjectStore('rawMaterialShipments', { keyPath: 'id' });
            rawMaterialShipmentsStore.createIndex('supplierId', 'supplierId', { unique: false });
            rawMaterialShipmentsStore.createIndex('productId', 'productId', { unique: false });
            rawMaterialShipmentsStore.createIndex('date', 'date', { unique: false });
        }

        // Yarn Types store (İplik çeşitleri)
        if (!db.objectStoreNames.contains('yarnTypes')) {
            const yarnTypesStore = db.createObjectStore('yarnTypes', { keyPath: 'id' });
            yarnTypesStore.createIndex('name', 'name', { unique: false });
            yarnTypesStore.createIndex('code', 'code', { unique: false });
        }

        // Yarn Shipments store (İplik girişleri)
        if (!db.objectStoreNames.contains('yarnShipments')) {
            const yarnShipmentsStore = db.createObjectStore('yarnShipments', { keyPath: 'id' });
            yarnShipmentsStore.createIndex('supplierId', 'supplierId', { unique: false });
            yarnShipmentsStore.createIndex('yarnTypeId', 'yarnTypeId', { unique: false });
            yarnShipmentsStore.createIndex('date', 'date', { unique: false });
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
            const range = IDBKeyRange.bound(startDate.toISOString(), endDate.toISOString());
            const request = index.getAll(range);

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async batchCreate(storeName, dataArray) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            let completed = 0;
            dataArray.forEach(data => {
                const request = store.add(data);
                request.onsuccess = () => {
                    completed++;
                    if (completed === dataArray.length) {
                        resolve();
                    }
                };
            });

            transaction.oncomplete = () => {
                console.log(`Batch create for ${storeName} completed`);
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }

    // Batch update multiple records
    async batchUpdate(storeName, dataArray) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            let completed = 0;
            const results = [];

            if (dataArray.length === 0) {
                resolve([]);
                return;
            }

            dataArray.forEach((data, index) => {
                const updateData = {
                    ...data,
                    updatedAt: new Date()
                };

                const request = store.put(updateData);

                request.onsuccess = () => {
                    results[index] = request.result;
                    completed++;
                    if (completed === dataArray.length) {
                        resolve(results);
                    }
                };

                request.onerror = () => reject(request.error);
            });

            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }
    
    async exportData() {
        const exportData = {};
        for (const storeName of this.db.objectStoreNames) {
            exportData[storeName] = await this.readAll(storeName);
        }
        return exportData;
    }
    
    async importData(importData) {
        for (const storeName of this.db.objectStoreNames) {
            if (importData[storeName]) {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                await store.clear();
                await this.batchCreate(storeName, importData[storeName]);
            }
        }
    }
    
    async clearAll() {
        for (const storeName of this.db.objectStoreNames) {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            await store.clear();
        }
    }
    
    async getSetting(key, defaultValue = null) {
        const setting = await this.read('settings', key);
        return setting ? setting.value : defaultValue;
    }

    async setSetting(key, value) {
        const setting = { key, value };
        await this.create('settings', setting);
        return setting;
    }
}

// Global database instance will be created in app.js main() function
// window.db will be set to either IndexedDBDatabase or FirestoreDatabase