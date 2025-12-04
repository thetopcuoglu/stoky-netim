// Business Logic Services for Kumaş Stok Yönetimi

/**
 * Customer Service
 */
class CustomerService {
    static async getAll() {
        return await db.readAll('customers');
    }

    static async getById(id) {
        return await db.read('customers', id);
    }

    static async create(customerData) {
        const errors = this.validate(customerData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        const customer = await db.create('customers', customerData);

        // Clear dashboard cache
        if (typeof DashboardCache !== 'undefined') {
            DashboardCache.clear();
        }

        return customer;
    }

    static async update(customerData) {
        const errors = this.validate(customerData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        // ID'yi çıkar ve sadece güncellenecek verileri gönder
        const { id, ...updateData } = customerData;
        
        console.log('👤 CustomerService.update çağrıldı:', { id, updateData });
        
        const customer = await db.update('customers', id, updateData);

        // Clear dashboard cache
        if (typeof DashboardCache !== 'undefined') {
            DashboardCache.clear();
        }

        return customer;
    }

    static async delete(id) {
        // Check if customer has any shipments
        const shipments = await db.queryByIndex('shipments', 'customerId', id);
        if (shipments.length > 0) {
            throw new Error('Bu müşterinin sevk kayıtları bulunduğu için silinemez.');
        }

        // Check if customer has any payments
        const payments = await db.queryByIndex('payments', 'customerId', id);
        if (payments.length > 0) {
            throw new Error('Bu müşterinin ödeme kayıtları bulunduğu için silinemez.');
        }

        const customer = await db.delete('customers', id);

        // Clear dashboard cache
        if (typeof DashboardCache !== 'undefined') {
            DashboardCache.clear();
        }

        return customer;
    }

    static validate(customerData) {
        const errors = [];

        const nameError = Validation.required(customerData.name, 'Müşteri adı');
        if (nameError) errors.push(nameError);

        if (customerData.email) {
            const emailError = Validation.email(customerData.email, 'E-posta');
            if (emailError) errors.push(emailError);
        }

        if (customerData.phone) {
            const phoneError = Validation.phone(customerData.phone, 'Telefon');
            if (phoneError) errors.push(phoneError);
        }

        return errors;
    }

    // Calculate customer balance
    static async getBalance(customerId) {
        const customer = await db.read('customers', customerId);
        
        // Sadece müşterinin direkt balance alanını döndür
        return NumberUtils.round(customer?.balance || 0, 2);
    }

    // Get customer summary for last N days
    static async getSummary(customerId, days = 30) {
        const startDate = DateUtils.getDaysAgo(days);
        const endDate = new Date();

        const shipments = await db.queryByIndex('shipments', 'customerId', customerId);
        const recentShipments = shipments.filter(s => 
            DateUtils.isInRange(s.date, startDate, endDate));

        let totalKg = 0;
        let totalUsd = 0;
        let weightedSum = 0;

        recentShipments.forEach(shipment => {
            shipment.lines?.forEach(line => {
                totalKg += line.kg || 0;
                const lineTotal = line.lineTotalUsd || 0;
                totalUsd += lineTotal;
                weightedSum += (line.kg || 0) * (line.unitUsd || 0);
            });
        });

        const avgPrice = totalKg > 0 ? NumberUtils.round(weightedSum / totalKg, 4) : 0;
        const totalBalance = await this.getBalance(customerId);

        return {
            totalKg: NumberUtils.round(totalKg, 2),
            totalUsd: NumberUtils.round(totalUsd, 2),
            avgPrice: avgPrice,
            totalBalance: totalBalance,
            shipmentsCount: recentShipments.length
        };
    }

    // Get customer ledger (statement)
    static async getLedger(customerId, startDate = null, endDate = null) {
        let shipments = await db.queryByIndex('shipments', 'customerId', customerId);
        let payments = await db.queryByIndex('payments', 'customerId', customerId);

        // Filter by date range if provided
        if (startDate && endDate) {
            shipments = shipments.filter(s => 
                DateUtils.isInRange(s.date, startDate, endDate));
            payments = payments.filter(p => 
                DateUtils.isInRange(p.date, startDate, endDate));
        }

        // Combine and sort by date
        const entries = [];

        shipments.forEach(shipment => {
            entries.push({
                date: shipment.date,
                type: 'shipment',
                description: `Sevk #${shipment.id.substr(-6)}`,
                debit: shipment.totals?.totalUsd || 0,
                credit: 0,
                reference: shipment
            });
        });

        payments.forEach(payment => {
            entries.push({
                date: payment.date,
                type: 'payment',
                description: `Tahsilat - ${payment.method || ''}`,
                debit: 0,
                credit: payment.amountUsd || 0,
                reference: payment
            });
        });

        // Sort by date
        entries.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate running balance
        let balance = 0;
        entries.forEach(entry => {
            balance += entry.debit - entry.credit;
            entry.balance = NumberUtils.round(balance, 2);
        });

        return entries;
    }
}

/**
 * Product Service
 */
class ProductService {
    static async getAll() {
        return await db.readAll('products');
    }

    static async getById(id) {
        return await db.read('products', id);
    }

    static async create(productData) {
        const errors = this.validate(productData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        // Ensure unit is kg
        productData.unit = 'kg';

        return await db.create('products', productData);
    }

    static async update(productData) {
        const errors = this.validate(productData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        productData.unit = 'kg';
        return await db.update('products', productData);
    }

    static async delete(id) {
        // Check if product has inventory lots
        const lots = await db.queryByIndex('inventoryLots', 'productId', id);
        
        if (lots.length > 0) {
            throw new Error('Bu ürüne ait stok kayıtları bulunduğu için silinemez.');
        }

        return await db.delete('products', id);
    }

    static validate(productData) {
        const errors = [];

        const nameError = Validation.required(productData.name, 'Ürün adı');
        if (nameError) errors.push(nameError);

        return errors;
    }
}

/**
 * Inventory Service
 */
class InventoryService {
    static async getAll() {
        const lots = await db.readAll('inventoryLots');
        const products = await db.readAll('products');
        const shipments = await db.readAll('shipments');
        
        // Compute shipped tops per lot
        const shippedTopsByLot = new Map();
        shipments.forEach(shipment => {
            shipment.lines?.forEach(line => {
                const lotId = line.lotId;
                const tops = NumberUtils.parseNumber(line.tops || 0);
                if (!lotId || !tops) return;
                shippedTopsByLot.set(lotId, (shippedTopsByLot.get(lotId) || 0) + tops);
            });
        });
        
        // Enrich lots with product information
        return lots.map(lot => {
            const productName = products.find(p => p.id === lot.productId)?.name || 'Bilinmeyen Ürün';
            // Derive remainingTops if missing
            let remainingTops = lot.remainingTops;
            const totalTops = NumberUtils.parseNumber(lot.totalTops ?? lot.rolls ?? 0);
            if (typeof remainingTops !== 'number') {
                const shipped = shippedTopsByLot.get(lot.id) || 0;
                remainingTops = Math.max(0, totalTops - shipped);
            }
            
            // Calculate dynamic tops based on remaining kg and average kg per roll
            let calculatedRemainingTops = remainingTops;
            if (lot.avgKgPerRoll > 0 && lot.remainingKg > 0) {
                calculatedRemainingTops = Math.floor(lot.remainingKg / lot.avgKgPerRoll);
            }
            
            return {
                ...lot,
                productName,
                totalTops,
                remainingTops: calculatedRemainingTops
            };
        });
    }

    static async getById(id) {
        return await db.read('inventoryLots', id);
    }

    static async getByProductId(productId) {
        return await db.queryByIndex('inventoryLots', 'productId', productId);
    }

    // Parti numarasına göre lot bul (case-insensitive, trim)
    static async getByParty(party) {
        const allLots = await db.readAll('inventoryLots');
        const norm = (v) => (v || '').toString().trim().toLowerCase();
        const key = norm(party);
        return allLots.filter(l => norm(l.party) === key);
    }

    static async create(lotData) {
        const errors = this.validate(lotData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        // Calculate derived fields - totalKg now comes from form
        lotData.remainingKg = lotData.totalKg;
        // Top takibi
        lotData.totalTops = NumberUtils.parseNumber(lotData.rolls);
        lotData.remainingTops = lotData.totalTops;
        lotData.status = 'Stokta';
        // Ham stok işareti (raw)
        if (lotData.isRaw === true) {
            lotData.isRaw = true;
        }

        const lot = await db.create('inventoryLots', lotData);

        // Otomatik boyahane maliyeti hesapla ve kaydet
        try {
            const boyahaneCost = await SupplierService.calculateBoyahaneCost(lot.id, lotData.productId, lotData.totalKg);
            
            if (boyahaneCost > 0) {
                // Production cost kaydı oluştur
                const costData = {
                    lotId: lot.id,
                    productId: lotData.productId,
                    iplikCost: 0,
                    ormeCost: 0,
                    boyahaneCost: boyahaneCost,
                    totalCost: boyahaneCost,
                    paidAmount: 0,
                    status: 'pending',
                    // O günkü fiyat bilgisini sakla
                    pricePerKg: pricePerKg,
                    exchangeRate: currentExchangeRate,
                    supplierId: activeBoyahane?.id
                };
                
                await ProductionCostService.create(costData);
                console.log(`✅ Otomatik boyahane maliyeti kaydedildi: ${NumberUtils.formatUSD(boyahaneCost)}`);
            }
        } catch (error) {
            console.error('Otomatik boyahane maliyeti hesaplama hatası:', error);
        }

        // Clear dashboard cache
        if (typeof DashboardCache !== 'undefined') {
            DashboardCache.clear();
        }

        return lot;
    }

    static async update(lotData) {
        const errors = this.validate(lotData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        // Get existing lot data first
        const existingLot = await this.getById(lotData.id);
        if (!existingLot) {
            throw new Error('Parti bulunamadı');
        }

        // Merge existing data with new data
        const updatedLot = {
            ...existingLot,
            ...lotData
        };

        // Recalculate totals if rolls or avgKgPerRoll changed
        if (updatedLot.rolls && updatedLot.avgKgPerRoll) {
            const newTotal = NumberUtils.round(updatedLot.rolls * updatedLot.avgKgPerRoll, 2);
            const usedKg = (existingLot.totalKg || 0) - (existingLot.remainingKg || 0);
            updatedLot.totalKg = newTotal;
            updatedLot.remainingKg = Math.max(0, newTotal - usedKg);

            // Top bilgisi
            const newTotalTops = NumberUtils.parseNumber(updatedLot.rolls);
            const usedTops = (existingLot.totalTops || existingLot.rolls || 0) - (existingLot.remainingTops ?? existingLot.rolls ?? 0);
            updatedLot.totalTops = newTotalTops;
            updatedLot.remainingTops = Math.max(0, newTotalTops - Math.max(0, usedTops));
        }

        // Update status based on remaining quantity
        this.updateStatus(updatedLot);

        const lot = await db.update('inventoryLots', updatedLot.id, updatedLot);

        // Clear dashboard cache
        if (typeof DashboardCache !== 'undefined') {
            DashboardCache.clear();
        }

        return lot;
    }

    static async delete(id) {
        // Check if lot is used in any shipments
        const shipments = await db.readAll('shipments');
        const hasShipments = shipments.some(shipment => 
            shipment.lines?.some(line => line.lotId === id));
        
        if (hasShipments) {
            throw new Error('Bu parti sevk kayıtlarında kullanıldığı için silinemez.');
        }

        const lot = await db.delete('inventoryLots', id);

        // Clear dashboard cache
        if (typeof DashboardCache !== 'undefined') {
            DashboardCache.clear();
        }

        return lot;
    }

    static validate(lotData) {
        const errors = [];

        const productIdError = Validation.required(lotData.productId, 'Ürün');
        if (productIdError) errors.push(productIdError);

        const partyError = Validation.required(lotData.party, 'Parti');
        if (partyError) errors.push(partyError);

        const rollsError = Validation.number(lotData.rolls, 'Rulo sayısı', 0);
        if (rollsError) errors.push(rollsError);

        const totalKgError = Validation.number(lotData.totalKg, 'Toplam kg', 0);
        if (totalKgError) errors.push(totalKgError);

        const avgKgError = Validation.number(lotData.avgKgPerRoll, 'Ortalama kg/rulo', 0);
        if (avgKgError) errors.push(avgKgError);

        return errors;
    }

    // Update lot status based on remaining quantity
    static updateStatus(lot) {
        if (lot.remainingKg <= 0) {
            lot.status = 'Bitti';
        } else if (lot.remainingKg < lot.totalKg) {
            lot.status = 'Kısmi';
        } else {
            lot.status = 'Stokta';
        }
    }

    // Get available lots for a product (FIFO order)
    static async getAvailableLots(productId, requiredKg = 0) {
        const lots = await this.getByProductId(productId);
        
        // Filter available lots and sort by date (FIFO)
        const availableLots = lots
            .filter(lot => lot.remainingKg > 0)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Mark suggested allocation if requiredKg is provided
        if (requiredKg > 0) {
            let remaining = requiredKg;
            availableLots.forEach(lot => {
                if (remaining > 0) {
                    lot.suggestedKg = Math.min(remaining, lot.remainingKg);
                    remaining -= lot.suggestedKg;
                } else {
                    lot.suggestedKg = 0;
                }
            });
        }

        return availableLots;
    }

    // Allocate stock from lots (FIFO)
    static async allocateStock(allocations) {
        const updatedLots = [];

        for (const allocation of allocations) {
            const lot = await this.getById(allocation.lotId);
            if (!lot) {
                throw new Error(`Parti bulunamadı: ${allocation.lotId}`);
            }

            if (allocation.kg > lot.remainingKg) {
                throw new Error(`Yetersiz stok. Parti: ${lot.party}, Mevcut: ${lot.remainingKg}kg, İstenen: ${allocation.kg}kg`);
            }

            // Update remaining quantity
            lot.remainingKg = NumberUtils.round(lot.remainingKg - allocation.kg, 2);
            // Eğer tops bilgisi verildiyse düş
            if (typeof allocation.tops === 'number') {
                lot.remainingTops = Math.max(0, NumberUtils.parseNumber(lot.remainingTops ?? lot.rolls ?? 0) - NumberUtils.parseNumber(allocation.tops));
            }
            this.updateStatus(lot);

            updatedLots.push(lot);
        }

        // Update all lots in batch
        await db.batchUpdate('inventoryLots', updatedLots);

        return updatedLots;
    }

    // Get total stock summary
    static async getStockSummary() {
        try {
            const startTime = performance.now();
        const lots = await this.getAll();
        
        const totalStock = lots.reduce((sum, lot) => sum + (lot.remainingKg || 0), 0);
        const totalLots = lots.length;
        const activeLots = lots.filter(lot => lot.remainingKg > 0).length;
        
        const byStatus = ArrayUtils.groupBy(lots, 'status');
        const statusCounts = {
            'Stokta': byStatus['Stokta']?.length || 0,
            'Kısmi': byStatus['Kısmi']?.length || 0,
            'Bitti': byStatus['Bitti']?.length || 0
        };

            const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
            console.log(`📦 Stok özeti: ${totalTime}s - ${totalStock}kg (${activeLots}/${totalLots} aktif)`);

        return {
            totalStock: NumberUtils.round(totalStock, 2),
            totalLots,
            activeLots,
            statusCounts
        };
        } catch (error) {
            console.error('Stock summary error:', error);
            return {
                totalStock: 0,
                totalLots: 0,
                activeLots: 0,
                statusCounts: { 'Stokta': 0, 'Kısmi': 0, 'Bitti': 0 }
            };
        }
    }
}

/**
 * Shipment Service
 */
class ShipmentService {
    static async getAll() {
        const shipments = await db.readAll('shipments');
        const customers = await db.readAll('customers');
        
        // Enrich shipments with customer information
        return shipments.map(shipment => ({
            ...shipment,
            customerName: customers.find(c => c.id === shipment.customerId)?.name || 'Bilinmeyen Müşteri'
        }));
    }

    static async getById(id) {
        return await db.read('shipments', id);
    }

    static async getByCustomerId(customerId) {
        return await db.queryByIndex('shipments', 'customerId', customerId);
    }

    static async update(id, shipmentData) {
        // Clear dashboard cache
        if (typeof DashboardCache !== 'undefined') {
            DashboardCache.clear();
        }
        
        return await db.update('shipments', id, shipmentData);
    }

    static async create(shipmentData) {
        const errors = this.validate(shipmentData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        // Calculate totals
        this.calculateTotals(shipmentData);

        // Validate stock availability
        await this.validateStockAvailability(shipmentData.lines);

        // Create shipment
        const shipment = await db.create('shipments', shipmentData);

        // Allocate stock
        const allocations = shipmentData.lines.map(line => ({
            lotId: line.lotId,
            kg: line.kg
        }));
        
        await InventoryService.allocateStock(allocations);

        // Update customer balance
        const customer = await db.read('customers', shipmentData.customerId);
        if (customer) {
            const shipmentTotal = shipmentData.totals?.totalUsd || 0;
            const oldBalance = customer.balance || 0;
            const newBalance = NumberUtils.round(oldBalance + shipmentTotal, 2);
            
            console.log(`🔍 Debug - Sevk Toplamı: ${NumberUtils.formatUSD(shipmentTotal)}`);
            console.log(`🔍 Debug - Eski Bakiye: ${NumberUtils.formatUSD(oldBalance)}`);
            console.log(`🔍 Debug - Yeni Bakiye: ${NumberUtils.formatUSD(newBalance)}`);
            console.log(`🔍 Debug - Müşteri ID: ${shipmentData.customerId}`);
            console.log(`🔍 Debug - Müşteri Adı: ${customer.name}`);
            
            await db.update('customers', customer.id, {
                ...customer,
                balance: newBalance
            });
            
            console.log(`👤 Müşteri ${customer.name}: Bakiye ${NumberUtils.formatUSD(oldBalance)} → ${NumberUtils.formatUSD(newBalance)} (+${NumberUtils.formatUSD(shipmentTotal)} sevk eklendi)`);
        } else {
            console.error(`❌ Müşteri bulunamadı: ${shipmentData.customerId}`);
        }

        // Clear dashboard cache
        if (typeof DashboardCache !== 'undefined') {
            DashboardCache.clear();
        }

        return shipment;
    }

    static async delete(id) {
        const shipment = await this.getById(id);
        if (!shipment) {
            throw new Error('Sevk bulunamadı');
        }

        console.log(`Sevk siliniyor: #${id.substr(-8).toUpperCase()}`);

        // 1. Reverse stock allocation (stok ve top miktarlarını geri al)
        const lots = await db.readAll('inventoryLots');
        const updatedLots = [];

        shipment.lines?.forEach(line => {
            const lot = lots.find(l => l.id === line.lotId);
            if (lot) {
                const oldRemaining = lot.remainingKg;
                lot.remainingKg = NumberUtils.round(lot.remainingKg + line.kg, 2);
                // Top geri ekle
                if (typeof lot.remainingTops === 'number') {
                    lot.remainingTops = NumberUtils.parseNumber(lot.remainingTops) + NumberUtils.parseNumber(line.tops || 0);
                }
                InventoryService.updateStatus(lot);
                updatedLots.push(lot);
                
                console.log(`Parti ${lot.batchNumber}: ${oldRemaining}kg → ${lot.remainingKg}kg (+${line.kg}kg geri eklendi)`);
            }
        });

        // 2. Remove from customer balance (müşteri bakiyesinden çıkar)
        const customer = await db.read('customers', shipment.customerId);
        if (customer) {
            const shipmentTotal = shipment.totals?.totalUsd || 0;
            const oldBalance = customer.balance || 0;
            const newBalance = NumberUtils.round(oldBalance - shipmentTotal, 2);
            
            await db.update('customers', customer.id, {
                ...customer,
                balance: newBalance
            });
            
            console.log(`Müşteri ${customer.name}: Bakiye ${NumberUtils.formatUSD(oldBalance)} → ${NumberUtils.formatUSD(newBalance)} (-${NumberUtils.formatUSD(shipmentTotal)} sevk iptal edildi)`);
        }

        // 3. Update inventory lots and delete shipment
        if (updatedLots.length > 0) {
            await db.batchUpdate('inventoryLots', updatedLots);
        }
        
        // Clear dashboard cache
        if (typeof DashboardCache !== 'undefined') {
            DashboardCache.clear();
        }

        return await db.delete('shipments', id);

        console.log(`✅ Sevk başarıyla silindi ve tüm etkiler geri alındı`);
        return true;
    }

    static validate(shipmentData) {
        const errors = [];

        const customerIdError = Validation.required(shipmentData.customerId, 'Müşteri');
        if (customerIdError) errors.push(customerIdError);

        const dateError = Validation.required(shipmentData.date, 'Tarih');
        if (dateError) errors.push(dateError);

        if (!shipmentData.lines || shipmentData.lines.length === 0) {
            errors.push('En az bir sevk satırı gereklidir');
        } else {
            shipmentData.lines.forEach((line, index) => {
                const lineErrors = this.validateLine(line, index + 1);
                errors.push(...lineErrors);
            });
        }

        return errors;
    }

    static validateLine(line, lineNumber) {
        const errors = [];
        const prefix = `Satır ${lineNumber}:`;

        const lotIdError = Validation.required(line.lotId, `${prefix} Parti`);
        if (lotIdError) errors.push(lotIdError);

        const kgError = Validation.number(line.kg, `${prefix} Kg`, 0.01);
        if (kgError) errors.push(kgError);

        const unitUsdError = Validation.number(line.unitUsd, `${prefix} Birim fiyat`, 0);
        if (unitUsdError) errors.push(unitUsdError);

        return errors;
    }

    static async validateStockAvailability(lines) {
        for (const line of lines) {
            const lot = await InventoryService.getById(line.lotId);
            if (!lot) {
                throw new Error(`Parti bulunamadı: ${line.lotId}`);
            }
            if (line.kg > lot.remainingKg) {
                throw new Error(`Yetersiz stok. Parti: ${lot.party}, Mevcut: ${lot.remainingKg}kg, İstenen: ${line.kg}kg`);
            }
        }
    }

    static calculateTotals(shipmentData) {
        let totalKg = 0;
        let totalTops = 0;
        let totalUsd = 0;
        let totalVat = 0;
        let totalWithVat = 0;

        shipmentData.lines?.forEach(line => {
            line.kg = NumberUtils.parseNumber(line.kg);
            line.tops = NumberUtils.parseNumber(line.tops);
            line.unitUsd = NumberUtils.parseNumber(line.unitUsd);
            line.lineTotalUsd = NumberUtils.round(line.kg * line.unitUsd, 2);
            
            // KDV hesaplama
            line.vat = NumberUtils.parseNumber(line.vat) || 0;
            line.vatTry = NumberUtils.parseNumber(line.vatTry) || 0;
            line.totalWithVat = NumberUtils.parseNumber(line.totalWithVat) || line.lineTotalUsd;
            line.totalWithVatTry = NumberUtils.parseNumber(line.totalWithVatTry) || line.lineTotalTry || 0;
            
            totalKg += line.kg;
            totalTops += line.tops;
            totalUsd += line.lineTotalUsd;
            totalVat += line.vat;
            totalWithVat += line.totalWithVat;
        });

        shipmentData.totals = {
            totalKg: NumberUtils.round(totalKg, 2),
            totalTops: totalTops,
            totalUsd: NumberUtils.round(totalUsd, 2),
            totalVat: NumberUtils.round(totalVat, 2),
            totalWithVat: NumberUtils.round(totalWithVat, 2)
        };
    }

    // Get shipments summary for dashboard
    static async getSummary(days = 30) {
        try {
            const startTime = performance.now();
        const startDate = DateUtils.getDaysAgo(days);
        const endDate = new Date();
        
        const allShipments = await this.getAll();
        const recentShipments = allShipments.filter(s => 
            DateUtils.isInRange(s.date, startDate, endDate));

        const totalKg = recentShipments.reduce((sum, s) => sum + (s.totals?.totalKg || 0), 0);
        const totalUsd = recentShipments.reduce((sum, s) => sum + (s.totals?.totalUsd || 0), 0);

            const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
            console.log(`🚚 Sevk özeti: ${totalTime}s - ${recentShipments.length} sevk, ${totalKg}kg, ${NumberUtils.formatUSD(totalUsd)}`);

        return {
            totalKg: NumberUtils.round(totalKg, 2),
            totalUsd: NumberUtils.round(totalUsd, 2),
            count: recentShipments.length
        };
        } catch (error) {
            console.error('Shipment summary error:', error);
            return {
                totalKg: 0,
                totalUsd: 0,
                count: 0
            };
        }
    }
}

/**
 * Payment Service
 */
class PaymentService {
    static async getAll() {
        const payments = await db.readAll('payments');
        const customers = await db.readAll('customers');
        
        // Enrich payments with customer information
        return payments.map(payment => ({
            ...payment,
            customerName: customers.find(c => c.id === payment.customerId)?.name || 'Bilinmeyen Müşteri'
        }));
    }

    static async getById(id) {
        return await db.read('payments', id);
    }

    static async getByCustomerId(customerId) {
        return await db.queryByIndex('payments', 'customerId', customerId);
    }

    static async create(paymentData) {
        const errors = this.validate(paymentData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        // Parse amount
        paymentData.amountUsd = NumberUtils.parseNumber(paymentData.amountUsd);

        const payment = await db.create('payments', paymentData);

        // Update customer balance (tahsilat alacağı azaltır)
        try {
            const customer = await db.read('customers', paymentData.customerId);
            if (customer) {
                const oldBalance = customer.balance || 0;
                const newBalance = NumberUtils.round(oldBalance - (paymentData.amountUsd || 0), 2);
                await db.update('customers', customer.id, {
                    ...customer,
                    balance: newBalance
                });
                console.log(`👤 Müşteri ${customer.name}: Bakiye ${NumberUtils.formatUSD(oldBalance)} → ${NumberUtils.formatUSD(newBalance)} (-${NumberUtils.formatUSD(paymentData.amountUsd)} tahsilat)`);
            } else {
                console.error(`❌ Müşteri bulunamadı (tahsilat create): ${paymentData.customerId}`);
            }
        } catch (e) {
            console.error('Tahsilat sonrası bakiye güncelleme hatası (create):', e);
        }

        // Clear dashboard cache
        if (typeof DashboardCache !== 'undefined') {
            DashboardCache.clear();
        }

        return payment;
    }

    static async update(paymentData) {
        const errors = this.validate(paymentData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        paymentData.amountUsd = NumberUtils.parseNumber(paymentData.amountUsd);
        
        // Bakiye farkını hesaplamak için mevcut kaydı al
        const existing = await this.getById(paymentData.id);
        if (!existing) {
            throw new Error('Tahsilat bulunamadı');
        }
        
        const payment = await db.update('payments', paymentData);

        // Eğer müşteri veya tutar değiştiyse bakiyeleri düzelt
        try {
            // Eski müşterinin bakiyesine eski tutarı geri ekle (tahsilatı geri al)
            const oldCustomer = await db.read('customers', existing.customerId);
            if (oldCustomer) {
                const oldBalance = oldCustomer.balance || 0;
                const reverted = NumberUtils.round(oldBalance + (existing.amountUsd || 0), 2);
                await db.update('customers', oldCustomer.id, {
                    ...oldCustomer,
                    balance: reverted
                });
                console.log(`👤 Müşteri ${oldCustomer.name}: Bakiye ${NumberUtils.formatUSD(oldBalance)} → ${NumberUtils.formatUSD(reverted)} (+${NumberUtils.formatUSD(existing.amountUsd)} eski tahsilat geri alındı)`);
            }

            // Yeni müşterinin bakiyesinden yeni tutarı düş
            const newCustomer = await db.read('customers', paymentData.customerId);
            if (newCustomer) {
                const oldBalance = newCustomer.balance || 0;
                const newBalance = NumberUtils.round(oldBalance - (paymentData.amountUsd || 0), 2);
                await db.update('customers', newCustomer.id, {
                    ...newCustomer,
                    balance: newBalance
                });
                console.log(`👤 Müşteri ${newCustomer.name}: Bakiye ${NumberUtils.formatUSD(oldBalance)} → ${NumberUtils.formatUSD(newBalance)} (-${NumberUtils.formatUSD(paymentData.amountUsd)} yeni tahsilat)`);
            } else {
                console.error(`❌ Müşteri bulunamadı (tahsilat update): ${paymentData.customerId}`);
            }
        } catch (e) {
            console.error('Tahsilat sonrası bakiye güncelleme hatası (update):', e);
        }

        // Clear dashboard cache
        if (typeof DashboardCache !== 'undefined') {
            DashboardCache.clear();
        }

        return payment;
    }

    static async delete(id) {
        // Silmeden önce tahsilatı getir
        const existing = await this.getById(id);
        const payment = await db.delete('payments', id);

        // Bakiye düzeltmesi: tahsilat silinince alacak geri artar → bakiyeye ekle
        try {
            if (existing) {
                const customer = await db.read('customers', existing.customerId);
                if (customer) {
                    const oldBalance = customer.balance || 0;
                    const newBalance = NumberUtils.round(oldBalance + (existing.amountUsd || 0), 2);
                    await db.update('customers', customer.id, {
                        ...customer,
                        balance: newBalance
                    });
                    console.log(`👤 Müşteri ${customer.name}: Bakiye ${NumberUtils.formatUSD(oldBalance)} → ${NumberUtils.formatUSD(newBalance)} (+${NumberUtils.formatUSD(existing.amountUsd)} tahsilat silindi)`);
                }
            }
        } catch (e) {
            console.error('Tahsilat silme sonrası bakiye güncelleme hatası (delete):', e);
        }

        // Clear dashboard cache
        if (typeof DashboardCache !== 'undefined') {
            DashboardCache.clear();
        }

        return payment;
    }

    static validate(paymentData) {
        const errors = [];

        const customerIdError = Validation.required(paymentData.customerId, 'Müşteri');
        if (customerIdError) errors.push(customerIdError);

        const dateError = Validation.required(paymentData.date, 'Tarih');
        if (dateError) errors.push(dateError);

        const amountError = Validation.number(paymentData.amountUsd, 'Tutar', 0.01);
        if (amountError) errors.push(amountError);

        return errors;
    }

    // KASA HESAPLAMA İÇİN YENİ METODLAR
    static async getCustomerPayments(customerId, fromDate) {
        const allPayments = await db.queryByIndex('payments', 'customerId', customerId);
        return allPayments.filter(p => new Date(p.date) >= fromDate);
    }

    static async getSupplierPayments(fromDate) {
        const allSupplierPayments = await db.readAll('supplierPayments');
        return allSupplierPayments.filter(p => new Date(p.date) >= fromDate);
    }
}

/**
 * Supplier Service
 */
class SupplierService {
    static async getAll() {
        return await db.readAll('suppliers');
    }

    static async getById(id) {
        return await db.read('suppliers', id);
    }

    static async create(supplierData) {
        const errors = this.validate(supplierData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        return await db.create('suppliers', supplierData);
    }

    static async update(supplierData) {
        const errors = this.validate(supplierData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        return await db.update('suppliers', supplierData);
    }

    static async setOpeningSettings(supplierId, openingBalance, accrualStartDateISO) {
        const supplier = await this.getById(supplierId);
        if (!supplier) throw new Error('Tedarikçi bulunamadı');
        
        // Örme, İplik tedarikçileri ve ENSA için USD, diğerleri için TL
        const isUSD = supplier.type === 'orme' || supplier.type === 'iplik' || supplierId === 'vMtmBGwmTq0rRsjhHUEm';
        
        if (isUSD) {
            supplier.openingBalanceUSD = NumberUtils.parseNumber(openingBalance);
            supplier.openingBalanceTRY = 0; // USD kullanılıyorsa TRY'yi sıfırla
        } else {
            supplier.openingBalanceTRY = NumberUtils.parseNumber(openingBalance);
            supplier.openingBalanceUSD = 0; // TRY kullanılıyorsa USD'yi sıfırla
        }
        
        supplier.accrualStartDate = accrualStartDateISO;
        supplier.updatedAt = new Date().toISOString();
        return await db.update('suppliers', supplier);
    }

    static async delete(id) {
        // Check if supplier has payments
        const payments = await db.queryByIndex('supplierPayments', 'supplierId', id);
        
        if (payments.length > 0) {
            throw new Error('Bu tedarikçiye ait ödeme kayıtları bulunduğu için silinemez.');
        }

        return await db.delete('suppliers', id);
    }

    static validate(supplierData) {
        const errors = [];

        const nameError = Validation.required(supplierData.name, 'Tedarikçi adı');
        if (nameError) errors.push(nameError);

        const typeError = Validation.required(supplierData.type, 'Tedarikçi türü');
        if (typeError) errors.push(typeError);

        if (supplierData.type && !['iplik', 'orme', 'boyahane'].includes(supplierData.type)) {
            errors.push('Geçersiz tedarikçi türü');
        }

        return errors;
    }

    // Create supplier payment
    static async createPayment(paymentData) {
        const errors = this.validatePayment(paymentData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        paymentData.amount = NumberUtils.parseNumber(paymentData.amount);
        
        return await db.create('supplierPayments', paymentData);
    }

    static validatePayment(paymentData) {
        const errors = [];

        const supplierTypeError = Validation.required(paymentData.supplierType, 'Tedarikçi');
        if (supplierTypeError) errors.push(supplierTypeError);

        const amountError = Validation.number(paymentData.amount, 'Tutar', 0.01);
        if (amountError) errors.push(amountError);

        const dateError = Validation.required(paymentData.date, 'Tarih');
        if (dateError) errors.push(dateError);

        return errors;
    }

    // Get supplier debt by type
    static async getSupplierDebt(supplierType) {
        try {
            const productionCosts = await db.readAll('productionCosts');
            const payments = await db.queryByIndex('supplierPayments', 'supplierType', supplierType);

            let totalCost = 0;
            let totalPaid = 0;

            // Calculate total costs for this supplier type
            productionCosts.forEach(cost => {
                switch (supplierType) {
                    case 'iplik':
                        totalCost += cost.iplikCost || 0;
                        break;
                    case 'orme':
                        totalCost += cost.ormeCost || 0;
                        break;
                    case 'boyahane':
                        totalCost += cost.boyahaneCost || 0;
                        break;
                }
            });

            // Calculate total payments
            totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

            return NumberUtils.round(totalCost - totalPaid, 2);
        } catch (error) {
            console.error('Get supplier debt error:', error);
            return 0;
        }
    }

    // Get last payment date for supplier type
    static async getLastPaymentDate(supplierType) {
        try {
            const payments = await db.queryByIndex('supplierPayments', 'supplierType', supplierType);
            
            if (payments.length === 0) return null;

            // Sort by date descending
            payments.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            return payments[0].date;
        } catch (error) {
            console.error('Get last payment date error:', error);
            return null;
        }
    }

    // Get all supplier payments
    static async getAllPayments() {
        return await db.readAll('supplierPayments');
    }

    // Get supplier price list by supplier type
    static async getPriceList(supplierType) {
        return await db.queryByIndex('supplierPriceLists', 'supplierType', supplierType);
    }

    // Get supplier price list by supplier ID
    static async getPriceListBySupplier(supplierId) {
        const priceList = await db.readAll('supplierPriceLists');
        return priceList.filter(p => p.supplierId === supplierId);
    }

    // Get price for specific product and supplier
    static async getProductPrice(supplierType, productId) {
        const priceList = await this.getPriceList(supplierType);
        const price = priceList.find(p => p.productId === productId);
        return price ? price.pricePerKg : 0;
    }

    // Create or update price list entry (by supplier type)
    static async setProductPrice(supplierType, productId, pricePerKg, currency = 'TRY') {
        const existing = await db.queryByIndex('supplierPriceLists', 'supplierType', supplierType);
        const existingPrice = existing.find(p => p.productId === productId && !p.supplierId);
        
        if (existingPrice) {
            existingPrice.pricePerKg = NumberUtils.parseNumber(pricePerKg);
            existingPrice.currency = currency;
            existingPrice.updatedAt = new Date().toISOString();
            return await db.update('supplierPriceLists', existingPrice);
        } else {
            const priceData = {
                supplierType: supplierType,
                productId: productId,
                pricePerKg: NumberUtils.parseNumber(pricePerKg),
                currency: currency,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            return await db.create('supplierPriceLists', priceData);
        }
    }

    // Create or update price entry for specific supplier
    static async setSupplierProductPrice(supplierId, productId, pricePerKg, currency = 'TRY') {
        const supplier = await this.getById(supplierId);
        const supplierType = supplier?.type || '';
        const all = await db.readAll('supplierPriceLists');
        const existingPrice = all.find(p => p.supplierId === supplierId && p.productId === productId);
        
        if (existingPrice) {
            existingPrice.pricePerKg = NumberUtils.parseNumber(pricePerKg);
            existingPrice.currency = currency;
            existingPrice.updatedAt = new Date().toISOString();
            return await db.update('supplierPriceLists', existingPrice);
        } else {
            const priceData = {
                supplierId: supplierId,
                supplierType: supplierType,
                productId: productId,
                pricePerKg: NumberUtils.parseNumber(pricePerKg),
                currency: currency,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            return await db.create('supplierPriceLists', priceData);
        }
    }

    // Get active boyahane supplier (for automatic accrual)
    static async getActiveBoyahane() {
        const suppliers = await db.readAll('suppliers');
        return suppliers.find(s => s.type === 'boyahane' && s.isActive !== false);
    }

    // Calculate boyahane cost for a lot based on product price
    static async calculateBoyahaneCost(lotId, productId, totalKg) {
        try {
            const activeBoyahane = await this.getActiveBoyahane();
            if (!activeBoyahane) {
                console.warn('Aktif boyahane bulunamadı');
                return 0;
            }

            const pricePerKg = await this.getProductPrice('boyahane', productId);
            if (pricePerKg <= 0) {
                console.warn(`Ürün ${productId} için boyahane fiyatı bulunamadı`);
                return 0;
            }

            // Calculate total cost in TL
            const totalCostTL = NumberUtils.round(pricePerKg * totalKg, 2);
            
            // Convert to USD using current exchange rate
            const exchangeRate = window.currentExchangeRate || 30.50;
            const totalCostUSD = NumberUtils.round(totalCostTL / exchangeRate, 2);

            console.log(`🔍 Boyahane maliyeti hesaplandı: ${totalKg}kg × ${pricePerKg}TL/kg = ${totalCostTL}TL = ${totalCostUSD}USD (Kur: ${exchangeRate})`);

            return totalCostUSD;
        } catch (error) {
            console.error('Boyahane maliyeti hesaplama hatası:', error);
            return 0;
        }
    }
}

/**
 * Production Cost Service
 */
class ProductionCostService {
    static async getAll() {
        const costs = await db.readAll('productionCosts');
        const products = await db.readAll('products');
        const lots = await db.readAll('inventoryLots');
        
        // Enrich costs with product and lot information
        return costs.map(cost => {
            const product = products.find(p => p.id === cost.productId);
            const lot = lots.find(l => l.id === cost.lotId);
            
            return {
                ...cost,
                productName: product?.name || 'Bilinmeyen Ürün',
                party: lot?.party || 'Bilinmeyen Parti'
            };
        });
    }

    static async getById(id) {
        return await db.read('productionCosts', id);
    }

    static async getByLotId(lotId) {
        return await db.queryByIndex('productionCosts', 'lotId', lotId);
    }

    static async create(costData) {
        const errors = this.validate(costData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        // Calculate totals
        costData.iplikCost = NumberUtils.parseNumber(costData.iplikCost);
        costData.ormeCost = NumberUtils.parseNumber(costData.ormeCost);
        costData.boyahaneCost = NumberUtils.parseNumber(costData.boyahaneCost);
        costData.totalCost = NumberUtils.round(
            costData.iplikCost + costData.ormeCost + costData.boyahaneCost, 2
        );
        costData.paidAmount = 0;
        costData.status = 'pending';

        return await db.create('productionCosts', costData);
    }

    static async update(costData) {
        const errors = this.validate(costData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        // Recalculate totals
        costData.iplikCost = NumberUtils.parseNumber(costData.iplikCost);
        costData.ormeCost = NumberUtils.parseNumber(costData.ormeCost);
        costData.boyahaneCost = NumberUtils.parseNumber(costData.boyahaneCost);
        costData.totalCost = NumberUtils.round(
            costData.iplikCost + costData.ormeCost + costData.boyahaneCost, 2
        );

        // Update status based on payments
        this.updateStatus(costData);

        return await db.update('productionCosts', costData);
    }

    static validate(costData) {
        const errors = [];

        // İplik girişleri için lotId ve productId zorunlu değil (yarnShipmentId varsa)
        if (!costData.yarnShipmentId) {
            const lotIdError = Validation.required(costData.lotId, 'Parti');
            if (lotIdError) errors.push(lotIdError);

            const productIdError = Validation.required(costData.productId, 'Ürün');
            if (productIdError) errors.push(productIdError);
        }

        const iplikError = Validation.number(costData.iplikCost, 'İplik maliyeti', 0);
        if (iplikError) errors.push(iplikError);

        const ormeError = Validation.number(costData.ormeCost, 'Örme maliyeti', 0);
        if (ormeError) errors.push(ormeError);

        const boyahaneError = Validation.number(costData.boyahaneCost, 'Boyahane maliyeti', 0);
        if (boyahaneError) errors.push(boyahaneError);

        return errors;
    }

    static updateStatus(cost) {
        if (cost.paidAmount <= 0) {
            cost.status = 'pending';
        } else if (cost.paidAmount >= cost.totalCost) {
            cost.status = 'paid';
        } else {
            cost.status = 'partial';
        }
    }

    // Update paid amounts when payments are made
    static async updatePaidAmounts() {
        try {
            const costs = await db.readAll('productionCosts');
            const payments = await db.readAll('supplierPayments');

            // Group payments by supplier type
            const paymentsByType = ArrayUtils.groupBy(payments, 'supplierType');

            const updatedCosts = [];

            for (const cost of costs) {
                let paidAmount = 0;

                // Calculate paid amount for each supplier type
                ['iplik', 'orme', 'boyahane'].forEach(type => {
                    const typePayments = paymentsByType[type] || [];
                    const totalPaid = typePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                    
                    // Proportional allocation based on cost
                    const typeCost = cost[`${type}Cost`] || 0;
                    if (typeCost > 0) {
                        // This is a simplified allocation - in real world you might want more sophisticated logic
                        paidAmount += Math.min(totalPaid, typeCost);
                    }
                });

                cost.paidAmount = NumberUtils.round(paidAmount, 2);
                this.updateStatus(cost);
                updatedCosts.push(cost);
            }

            await db.batchUpdate('productionCosts', updatedCosts);
            
        } catch (error) {
            console.error('Update paid amounts error:', error);
        }
    }
    
    // Get yarn type price list by supplier ID (for iplik suppliers)
    static async getYarnTypePriceListBySupplier(supplierId) {
        const priceList = await db.readAll('supplierPriceLists');
        return priceList.filter(p => p.supplierId === supplierId && p.yarnTypeId);
    }
}

/**
 * Yarn Type Service (İplik Çeşitleri)
 */
class YarnTypeService {
    static async getAll() {
        return await db.readAll('yarnTypes');
    }

    static async getById(id) {
        return await db.read('yarnTypes', id);
    }

    static async create(yarnTypeData) {
        if (!yarnTypeData.name) {
            throw new Error('İplik çeşidi adı zorunludur');
        }
        return await db.create('yarnTypes', yarnTypeData);
    }

    static async update(yarnTypeData) {
        if (!yarnTypeData.name) {
            throw new Error('İplik çeşidi adı zorunludur');
        }
        return await db.update('yarnTypes', yarnTypeData);
    }

    static async delete(id) {
        // İplik girişleri kontrolü
        const shipments = await db.queryByIndex('yarnShipments', 'yarnTypeId', id);
        if (shipments.length > 0) {
            throw new Error('Bu iplik çeşidine ait giriş kayıtları bulunduğu için silinemez.');
        }
        return await db.delete('yarnTypes', id);
    }
}

// Raw Balance (USD) Service
class RawBalanceService {
    static async getAll() {
        return await db.readAll('rawBalances');
    }

    static async addOpeningBalance(amountUsd, date) {
        const entry = {
            type: 'opening',
            description: 'Açılış Bakiyesi',
            amountUsd: NumberUtils.round(NumberUtils.parseNumber(amountUsd), 2),
            date: date || DateUtils.getInputDate()
        };
        return await db.create('rawBalances', entry);
    }

    static async addDebt({ lotId, party, kg, pricePerKg, date }) {
        const entry = {
            type: 'debt',
            description: `Ham stok girişi - ${party || ''}`.trim(),
            lotId,
            kg: NumberUtils.parseNumber(kg),
            pricePerKg: NumberUtils.parseNumber(pricePerKg),
            amountUsd: NumberUtils.round(NumberUtils.parseNumber(kg) * NumberUtils.parseNumber(pricePerKg), 2),
            date: date || DateUtils.getInputDate()
        };
        return await db.create('rawBalances', entry);
    }

    static async addPayment({ amountUsd, method, note, date }) {
        const entry = {
            type: 'payment',
            description: `USD Ödeme${method ? ' - ' + method : ''}`,
            amountUsd: NumberUtils.round(NumberUtils.parseNumber(amountUsd), 2),
            method: method || '',
            note: note || '',
            date: date || DateUtils.getInputDate()
        };
        return await db.create('rawBalances', entry);
    }

    static async getStatement() {
        const entries = await this.getAll();
        entries.sort((a, b) => new Date(a.date) - new Date(b.date));
        let balance = 0;
        const rows = entries.map(e => {
            if (e.type === 'opening' || e.type === 'debt') balance += e.amountUsd;
            if (e.type === 'payment') balance -= e.amountUsd;
            return { ...e, runningBalance: NumberUtils.round(balance, 2) };
        });
        return { rows, balance: NumberUtils.round(balance, 2) };
    }
}

/**
 * Dashboard Service
 */
class DashboardService {
    static async getSummary() {
        try {
            console.log('📊 Dashboard summary başlatılıyor...');
            const startTime = performance.now();
            
            const [stockSummary, shipmentSummary, receivables] = await Promise.all([
                InventoryService.getStockSummary(),
                ShipmentService.getSummary(30),
                this.getOpenReceivables()
            ]);

            const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ Dashboard summary tamamlandı: ${totalTime}s`);

            return {
                totalStock: stockSummary.totalStock,
                last30DaysShipment: shipmentSummary,
                openReceivables: receivables
            };
        } catch (error) {
            console.error('Dashboard summary error:', error);
            throw error;
        }
    }

    static async getOpenReceivables() {
        try {
            console.log('💰 Alacaklar hesaplanıyor...');
            const startTime = performance.now();
            
        const customers = await CustomerService.getAll();

            // Tüm müşteri bakiyelerini paralel olarak hesapla
            const customerBalances = await Promise.all(
                customers.map(async (customer) => {
                    try {
            const balance = await CustomerService.getBalance(customer.id);
                        return balance > 0 ? balance : 0;
                    } catch (e) {
                        console.warn(`Müşteri ${customer.id} bakiyesi hesaplanamadı:`, e);
                        return 0;
                    }
                })
            );
            
            const totalReceivables = customerBalances.reduce((sum, balance) => sum + balance, 0);
            
            const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ Alacaklar hesaplandı: ${totalTime}s - Toplam: ${NumberUtils.formatUSD(totalReceivables)}`);

        return NumberUtils.round(totalReceivables, 2);
        } catch (error) {
            console.error('Open receivables error:', error);
            return 0;
        }
    }

    static async getRecentActivities(limit = 10) {
        try {
            const [shipments, payments] = await Promise.all([
                db.readAll('shipments'),
                db.readAll('payments')
            ]);

            const activities = [];

            // Add shipment activities
            shipments.forEach(shipment => {
                activities.push({
                    type: 'shipment',
                    date: shipment.date,
                    description: `Sevk: ${shipment.totals?.totalKg || 0}kg - ${NumberUtils.formatUSD(shipment.totals?.totalUsd || 0)}`,
                    id: shipment.id
                });
            });

            // Add payment activities
            payments.forEach(payment => {
                activities.push({
                    type: 'payment',
                    date: payment.date,
                    description: `Tahsilat: ${NumberUtils.formatUSD(payment.amountUsd || 0)}`,
                    id: payment.id
                });
            });

            // Sort by date descending and limit
            return activities
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, limit);
        } catch (error) {
            console.error('Recent activities error:', error);
            return [];
        }
    }
}

/**
 * Stock Alert Service
 */
class StockAlertService {
    // Kritik stok seviyesi kontrolü
    static async getLowStockAlerts() {
        try {
            const products = await ProductService.getAll();
            const lots = await InventoryService.getAll();
            
            // Normalize helper (TR -> ASCII, trim, lower)
            const normalize = (v) => (v || '')
                .toString()
                .toLowerCase()
                .trim()
                .replace(/ğ/g, 'g')
                .replace(/ü/g, 'u')
                .replace(/ş/g, 's')
                .replace(/ı/g, 'i')
                .replace(/ö/g, 'o')
                .replace(/ç/g, 'c');
            
            // Kritik stok seviyesi: 500kg altı
            const CRITICAL_THRESHOLD = 500;
            
            // İzlenecek kumaş türleri (geniş anahtar kelimeler)
            const WATCHED_KEYWORDS = [
                'kappa',
                'jarse',
                'lyc mens', 'lyc mensh', 'lyc mens', 'lyc mensj', 'lyc menş', 'lyc mensh', 'lyc mensi', 'lyc menş',
                'lyc suprem', 'lycra suprem', 'suprem',
                'polymens', 'poly mens', 'polymensh', 'polymen', 'polymenş',
                'yagmur', 'yagmur desen', 'damla',
                'petek'
            ].map(normalize);
            
            const alerts = [];
            
            // Her ürün için toplam stok hesapla
            for (const product of products) {
                const normalizedName = normalize(product.name);
                
                // İzlenecek kumaş anahtarlarından biriyle eşleşiyor mu?
                const isWatched = WATCHED_KEYWORDS.some(key => normalizedName.includes(key));
                if (!isWatched) continue;
                
                // Bu ürünün toplam stok miktarını hesapla
                const productLots = lots.filter(lot => lot.productId === product.id);
                const totalStock = productLots.reduce((sum, lot) => sum + (NumberUtils.parseNumber(lot.remainingKg) || 0), 0);
                
                // Kritik seviyenin altındaysa uyarı ekle
                if (totalStock < CRITICAL_THRESHOLD) {
                    alerts.push({
                        productId: product.id,
                        productName: product.name,
                        currentStock: NumberUtils.round(totalStock, 2),
                        threshold: CRITICAL_THRESHOLD,
                        severity: totalStock < 100 ? 'critical' : 'warning',
                        message: `${product.name} stok seviyesi kritik: ${NumberUtils.formatKg(totalStock)} (Min: ${NumberUtils.formatKg(CRITICAL_THRESHOLD)})`
                    });
                }
            }
            
            return alerts;
        } catch (error) {
            console.error('Stock alert service error:', error);
            return [];
        }
    }
    
    // Tüm uyarıları temizle (stok 500kg üzerine çıktığında)
    static async clearResolvedAlerts() {
        const alerts = await this.getLowStockAlerts();
        return alerts.length === 0;
    }
}

/**
 * Exchange Rate Service
 */
const ExchangeRateService = {
    // Cache for exchange rates
    cache: new Map(),
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    
    // Get USD to TRY exchange rate
    async getUSDToTRY() {
        const now = Date.now();
        const cached = this.cache.get('USD_TRY');
        
        // Return cached rate if still valid
        if (cached && (now - cached.timestamp) < this.cacheTimeout) {
            return cached.rate;
        }
        
        try {
            // Try multiple exchange rate APIs
            const apis = [
                'https://api.exchangerate-api.com/v4/latest/USD',
                'https://api.frankfurter.app/latest?from=USD&to=TRY',
                'https://api.currencyapi.com/v3/latest?apikey=free&currencies=TRY&base_currency=USD'
            ];
            
            for (const apiUrl of apis) {
                try {
                    const response = await fetch(apiUrl);
                    if (response.ok) {
                        const data = await response.json();
                        let rate = 0;
                        
                        // Parse different API formats
                        if (data.rates && data.rates.TRY) {
                            rate = data.rates.TRY;
                        } else if (data.rates && data.rates.try) {
                            rate = data.rates.try;
                        } else if (data.data && data.data.TRY) {
                            rate = data.data.TRY.value;
                        }
                        
                        if (rate > 0) {
                            // Cache the rate
                            this.cache.set('USD_TRY', {
                                rate: rate,
                                timestamp: now
                            });
                            
                            console.log(`💱 USD/TL kuru güncellendi: ${rate.toFixed(4)}`);
                            return rate;
                        }
                    }
                } catch (error) {
                    console.warn(`Döviz kuru API hatası (${apiUrl}):`, error);
                    continue;
                }
            }
            
            // Fallback to a default rate if all APIs fail
            console.warn('⚠️ Döviz kuru API\'leri başarısız, varsayılan kur kullanılıyor');
            const fallbackRate = 30.50; // Fallback rate
            
            this.cache.set('USD_TRY', {
                rate: fallbackRate,
                timestamp: now
            });
            
            return fallbackRate;
            
        } catch (error) {
            console.error('Döviz kuru servisi hatası:', error);
            
            // Return cached rate if available, otherwise fallback
            if (cached) {
                return cached.rate;
            }
            
            return 30.50; // Default fallback rate
        }
    },
    
    // Convert USD to TRY
    async convertUSDToTRY(usdAmount) {
        const rate = await this.getUSDToTRY();
        return NumberUtils.round(usdAmount * rate, 2);
    },
    
    // Clear cache
    clearCache() {
        this.cache.clear();
    }
};

// Export services to global scope
window.CustomerService = CustomerService;
window.ProductService = ProductService;
window.InventoryService = InventoryService;
window.ShipmentService = ShipmentService;
window.PaymentService = PaymentService;
window.SupplierService = SupplierService;
window.ProductionCostService = ProductionCostService;
window.DashboardService = DashboardService;
window.StockAlertService = StockAlertService;
window.YarnTypeService = YarnTypeService;