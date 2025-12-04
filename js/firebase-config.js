// Firebase Configuration and Database Class
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, initializeFirestore, collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBYdAgtFju1PfZ7IygsrKCegSWGcNfPoDM",
    authDomain: "stokyonetimi-f45b5.firebaseapp.com",
    projectId: "stokyonetimi-f45b5",
    storageBucket: "stokyonetimi-f45b5.appspot.com", // Düzeltildi: .appspot.com olmalı
    messagingSenderId: "231496598024",
    appId: "1:231496598024:web:8452d65fb284778b7207bd",
    measurementId: "G-MNYPE3XTSS"
};

// Firestore uzun anket (long polling) ayarını test amaçlı zorla
// Not: v9 modular SDK'da initializeFirestore ile ayarlanır; burada getFirestore sonrası internal parametre üzerinden kullanmıyoruz.
// Bu projede doğrudan getFirestore kullanıldığı için, CORS dinleme hatalarını kesmek adına offline persistence kullanmıyoruz ve real-time listener'a mecbur değiliz.

// Firebase Initialization
let app, db, analytics;

export async function initializeFirebase() {
    try {
        console.log('Firebase başlatılıyor...');
        
        // Firebase App'i başlat
        app = initializeApp(firebaseConfig);
        
        // Firestore'u başlat (long polling zorla)
        try {
            initializeFirestore(app, { experimentalForceLongPolling: true, useFetchStreams: false });
        } catch (e) {
            console.warn('initializeFirestore opsiyonu ayarlanamadı:', e?.message);
        }
        db = getFirestore(app);
        
        // Analytics'i başlat (opsiyonel)
        try {
            analytics = getAnalytics(app);
            console.log('Firebase Analytics başlatıldı');
        } catch (analyticsError) {
            console.warn('Analytics başlatılamadı (normal):', analyticsError.message);
        }
        
        console.log('Firebase başarıyla başlatıldı');
        return { success: true, db };
        
    } catch (error) {
        console.error('Firebase başlatma hatası:', error);
        return { success: false, error: error.message };
    }
}

// Firestore Database Class
export class FirestoreDatabase {
    constructor(firestoreDb) {
        this.db = firestoreDb;
        this.collections = {
            customers: 'customers',
            products: 'products', 
            inventoryLots: 'inventoryLots',
            shipments: 'shipments',
            payments: 'payments',
            productionCosts: 'productionCosts',
            rawBalances: 'rawBalances',
            suppliers: 'suppliers',
            supplierPayments: 'supplierPayments',
            supplierPriceLists: 'supplierPriceLists',
            settings: 'settings'
        };
    }

    // Guarded collection reference creator
    safeCollection(path) {
        const finalPath = typeof path === 'string' ? path.trim() : '';
        if (!finalPath) {
            console.error('🔥 Empty collection path!', { path });
            throw new Error('Empty collection path');
        }
        return collection(this.db, finalPath);
    }

    // Clean data for Firestore (remove undefined, null, functions, etc.)
    cleanDataForFirestore(data) {
        if (data === null || data === undefined) {
            return {};
        }

        const cleaned = {};
        
        for (const [key, value] of Object.entries(data)) {
            // Skip undefined values
            if (value === undefined) {
                continue;
            }
            
            // Convert null to appropriate defaults
            if (value === null) {
                cleaned[key] = '';
                continue;
            }
            
            // Handle different types
            if (typeof value === 'string') {
                cleaned[key] = value;
            } else if (typeof value === 'number') {
                // Make sure it's a valid number
                cleaned[key] = isNaN(value) ? 0 : value;
            } else if (typeof value === 'boolean') {
                cleaned[key] = value;
            } else if (value instanceof Date) {
                cleaned[key] = value;
            } else if (Array.isArray(value)) {
                // Recursively clean array items
                cleaned[key] = value.map(item => {
                    if (typeof item === 'object' && item !== null) {
                        return this.cleanDataForFirestore(item);
                    }
                    return item;
                });
            } else if (typeof value === 'object') {
                // Recursively clean nested objects
                cleaned[key] = this.cleanDataForFirestore(value);
            } else {
                // For other types, convert to string safely
                try {
                    cleaned[key] = String(value);
                } catch (e) {
                    console.warn(`Veri temizleme uyarısı - ${key}:`, value, e);
                    cleaned[key] = '';
                }
            }
        }
        
        return cleaned;
    }

    // Create - Yeni kayıt oluştur
    async create(storeName, data) {
        try {
            console.log('➕ Firebase create çağrıldı:', { storeName, data });
            
            const collName = this.collections[storeName] || storeName;
            const collectionRef = this.safeCollection(collName);
            
            // Clean data for Firebase (remove undefined, convert dates, etc.)
            const cleanData = this.cleanDataForFirestore(data);
            console.log('🧹 Temizlenmiş veri (create):', cleanData);
            
            const docRef = await addDoc(collectionRef, {
                ...cleanData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            
            console.log('✅ Firebase create başarılı, ID:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error(`❌ Create error for ${storeName}:`, error);
            console.error('Hata detayları:', { storeName, data });
            throw error;
        }
    }

    // Read All - Tüm kayıtları getir
    async readAll(storeName) {
        try {
            const collName = this.collections[storeName] || storeName;
            if (!collName || collName.trim() === '') {
                console.warn(`ReadAll: Geçersiz collection adı: ${storeName}`);
                return [];
            }
            const collectionRef = this.safeCollection(collName);
            const querySnapshot = await getDocs(collectionRef);
            
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`ReadAll error for ${storeName}:`, error);
            // Hata durumunda boş dizi dön (uygulamanın çökmesini önle)
            return [];
        }
    }

    // Read - Tek kayıt getir
    async read(storeName, id) {
        try {
            const collName = this.collections[storeName] || storeName;
            
            // ID'yi string'e çevir ve validate et
            const docId = String(id).trim();
            if (!docId || docId === 'undefined' || docId === 'null') {
                console.warn(`Geçersiz read ID: ${id}`);
                return null;
            }
            
            const docRef = doc(this.db, collName, docId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...docSnap.data()
                };
            }
            return null;
        } catch (error) {
            console.error(`❌ Read error for ${storeName}:`, error);
            throw error;
        }
    }

    // Update - Kayıt güncelle
    async update(storeName, idOrData, maybeData) {
        try {
            const collName = this.collections[storeName] || storeName;
            
            // İmza esnekliği: update(store, id, data) veya update(store, data)
            const isSecondParamObject = typeof idOrData === 'object' && idOrData !== null && !maybeData;
            const data = isSecondParamObject ? idOrData : maybeData;
            const rawId = isSecondParamObject ? idOrData.id : idOrData;

            console.log('🔄 Firebase update çağrıldı:', { storeName, rawId, rawIdType: typeof rawId, data });

            // ID güvenli dönüştürme ve doğrulama
            const docId = String(rawId).trim();
            if (!docId || docId === 'undefined' || docId === 'null' || docId === '[object Object]') {
                console.error('❌ Geçersiz ID tespit edildi:', { originalId: rawId, convertedId: docId });
                throw new Error(`Geçersiz document ID: ${rawId} (tip: ${typeof rawId})`);
            }

            console.log('📝 Document ID (final):', docId);

            const docRef = doc(this.db, collName, docId);

            // Firebase için veriyi temizle
            const cleanData = this.cleanDataForFirestore(data || {});
            console.log('🧹 Temizlenmiş veri:', cleanData);

            await updateDoc(docRef, {
                ...cleanData,
                updatedAt: new Date()
            });

            console.log('✅ Firebase update başarılı');
            return true;
        } catch (error) {
            console.error(`❌ Update error for ${storeName}:`, error);
            console.error('Hata detayları:', { storeName, idOrData, maybeData });
            throw error;
        }
    }

    // Delete - Kayıt sil
    async delete(storeName, id) {
        try {
            const collName = this.collections[storeName] || storeName;
            
            const docId = String(id).trim();
            if (!docId || docId === 'undefined' || docId === 'null' || docId === '[object Object]') {
                throw new Error(`Geçersiz document ID: ${id} (tip: ${typeof id})`);
            }
            const docRef = doc(this.db, collName, docId);
            await deleteDoc(docRef);
            return true;
        } catch (error) {
            console.error(`Delete error for ${storeName}:`, error);
            throw error;
        }
    }

    // Query by Index - Index ile sorgula
    async queryByIndex(storeName, indexName, value) {
        try {
            const collName = this.collections[storeName] || storeName;
            if (!collName) {
                console.warn(`QueryByIndex: Geçersiz collection adı: ${storeName}`);
                return [];
            }
            const collectionRef = this.safeCollection(collName);
            const q = query(collectionRef, where(indexName, '==', value));
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`QueryByIndex error for ${storeName}:`, error);
            throw error;
        }
    }

    // Batch Create - Toplu oluşturma
    async batchCreate(storeName, dataArray) {
        try {
            const results = [];
            for (const data of dataArray) {
                // Clean data before create
                const cleanData = this.cleanDataForFirestore(data);
                const id = await this.create(storeName, cleanData);
                results.push(id);
            }
            return results;
        } catch (error) {
            console.error(`BatchCreate error for ${storeName}:`, error);
            throw error;
        }
    }

    // Batch Update - Toplu güncelleme
    async batchUpdate(storeName, dataArray) {
        try {
            const results = [];
            for (const data of dataArray) {
                // Clean data before update
                const cleanData = this.cleanDataForFirestore(data);
                const success = await this.update(storeName, cleanData.id, cleanData);
                results.push(success);
            }
            return results;
        } catch (error) {
            console.error(`BatchUpdate error for ${storeName}:`, error);
            throw error;
        }
    }

    // Export Data - Veri dışa aktarma
    async exportData() {
        try {
            const data = {};
            for (const [key, collectionName] of Object.entries(this.collections)) {
                data[key] = await this.readAll(key);
            }
            return data;
        } catch (error) {
            console.error('Export data error:', error);
            throw error;
        }
    }

    // Import Data - Veri içe aktarma
    async importData(data) {
        try {
            const results = {};
            for (const [storeName, records] of Object.entries(data)) {
                if (Array.isArray(records) && records.length > 0) {
                    results[storeName] = await this.batchCreate(storeName, records);
                }
            }
            return results;
        } catch (error) {
            console.error('Import data error:', error);
            throw error;
        }
    }

    // Clear All - Tüm verileri sil
    async clearAll() {
        try {
            const results = {};
            for (const storeName of Object.keys(this.collections)) {
                const records = await this.readAll(storeName);
                for (const record of records) {
                    await this.delete(storeName, record.id);
                }
                results[storeName] = `${records.length} kayıt silindi`;
            }
            return results;
        } catch (error) {
            console.error('Clear all error:', error);
            throw error;
        }
    }

    // Get Setting - Ayar getir
    async getSetting(key) {
        try {
            const settings = await this.readAll('settings');
            const setting = settings.find(s => s.key === key);
            return setting ? setting.value : null;
        } catch (error) {
            console.error(`Get setting error for ${key}:`, error);
            return null;
        }
    }

    // Set Setting - Ayar kaydet
    async setSetting(key, value) {
        try {
            const settings = await this.readAll('settings');
            const existingSetting = settings.find(s => s.key === key);
            
            if (existingSetting) {
                await this.update('settings', existingSetting.id, { key, value });
            } else {
                await this.create('settings', { key, value });
            }
            return true;
        } catch (error) {
            console.error(`Set setting error for ${key}:`, error);
            throw error;
        }
    }
} 