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

        return await db.create('customers', customerData);
    }

    static async update(customerData) {
        const errors = this.validate(customerData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        return await db.update('customers', customerData);
    }

    static async delete(id) {
        // Check if customer has shipments or payments
        const shipments = await db.queryByIndex('shipments', 'customerId', id);
        const payments = await db.queryByIndex('payments', 'customerId', id);
        
        if (shipments.length > 0 || payments.length > 0) {
            throw new Error('Bu müşteriye ait sevk veya tahsilat kayıtları bulunduğu için silinemez.');
        }

        return await db.delete('customers', id);
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
        const shipments = await db.queryByIndex('shipments', 'customerId', customerId);
        const payments = await db.queryByIndex('payments', 'customerId', customerId);

        const totalShipments = shipments.reduce((sum, shipment) => 
            sum + (shipment.totals?.totalUsd || 0), 0);
        const totalPayments = payments.reduce((sum, payment) => 
            sum + (payment.amountUsd || 0), 0);

        return NumberUtils.round(totalShipments - totalPayments, 2);
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
        
        // Enrich lots with product information
        return lots.map(lot => ({
            ...lot,
            productName: products.find(p => p.id === lot.productId)?.name || 'Bilinmeyen Ürün'
        }));
    }

    static async getById(id) {
        return await db.read('inventoryLots', id);
    }

    static async getByProductId(productId) {
        return await db.queryByIndex('inventoryLots', 'productId', productId);
    }

    static async create(lotData) {
        const errors = this.validate(lotData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        // Calculate derived fields
        lotData.totalKg = NumberUtils.round(lotData.rolls * lotData.avgKgPerRoll, 2);
        lotData.remainingKg = lotData.totalKg;
        lotData.status = 'Stokta';

        return await db.create('inventoryLots', lotData);
    }

    static async update(lotData) {
        const errors = this.validate(lotData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        // Recalculate total if rolls or avgKgPerRoll changed
        if (lotData.rolls && lotData.avgKgPerRoll) {
            const newTotal = NumberUtils.round(lotData.rolls * lotData.avgKgPerRoll, 2);
            const usedKg = (lotData.totalKg || 0) - (lotData.remainingKg || 0);
            lotData.totalKg = newTotal;
            lotData.remainingKg = Math.max(0, newTotal - usedKg);
        }

        // Update status based on remaining quantity
        this.updateStatus(lotData);

        return await db.update('inventoryLots', lotData);
    }

    static async delete(id) {
        // Check if lot is used in any shipments
        const shipments = await db.readAll('shipments');
        const hasShipments = shipments.some(shipment => 
            shipment.lines?.some(line => line.lotId === id));
        
        if (hasShipments) {
            throw new Error('Bu parti sevk kayıtlarında kullanıldığı için silinemez.');
        }

        return await db.delete('inventoryLots', id);
    }

    static validate(lotData) {
        const errors = [];

        const productIdError = Validation.required(lotData.productId, 'Ürün');
        if (productIdError) errors.push(productIdError);

        const partyError = Validation.required(lotData.party, 'Parti');
        if (partyError) errors.push(partyError);

        const rollsError = Validation.number(lotData.rolls, 'Rulo sayısı', 0);
        if (rollsError) errors.push(rollsError);

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
            this.updateStatus(lot);

            updatedLots.push(lot);
        }

        // Update all lots in batch
        await db.batchUpdate('inventoryLots', updatedLots);

        return updatedLots;
    }

    // Get total stock summary
    static async getStockSummary() {
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

        return {
            totalStock: NumberUtils.round(totalStock, 2),
            totalLots,
            activeLots,
            statusCounts
        };
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

    static async delete(id) {
        // Note: This doesn't restore inventory quantities
        // In a real application, you might want to restore stock
        return await db.delete('shipments', id);
    }

    static async getByCustomerId(customerId) {
        return await db.queryByIndex('shipments', 'customerId', customerId);
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

        return shipment;
    }

    static async delete(id) {
        const shipment = await this.getById(id);
        if (!shipment) {
            throw new Error('Sevk bulunamadı');
        }

        // Reverse stock allocation
        const lots = await db.readAll('inventoryLots');
        const updatedLots = [];

        shipment.lines?.forEach(line => {
            const lot = lots.find(l => l.id === line.lotId);
            if (lot) {
                lot.remainingKg = NumberUtils.round(lot.remainingKg + line.kg, 2);
                InventoryService.updateStatus(lot);
                updatedLots.push(lot);
            }
        });

        // Update lots and delete shipment
        await db.batchUpdate('inventoryLots', updatedLots);
        await db.delete('shipments', id);

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
        let totalUsd = 0;

        shipmentData.lines?.forEach(line => {
            line.kg = NumberUtils.parseNumber(line.kg);
            line.unitUsd = NumberUtils.parseNumber(line.unitUsd);
            line.lineTotalUsd = NumberUtils.round(line.kg * line.unitUsd, 2);
            
            totalKg += line.kg;
            totalUsd += line.lineTotalUsd;
        });

        shipmentData.totals = {
            totalKg: NumberUtils.round(totalKg, 2),
            totalUsd: NumberUtils.round(totalUsd, 2)
        };
    }

    // Get shipments summary for dashboard
    static async getSummary(days = 30) {
        const startDate = DateUtils.getDaysAgo(days);
        const endDate = new Date();
        
        const allShipments = await this.getAll();
        const recentShipments = allShipments.filter(s => 
            DateUtils.isInRange(s.date, startDate, endDate));

        const totalKg = recentShipments.reduce((sum, s) => sum + (s.totals?.totalKg || 0), 0);
        const totalUsd = recentShipments.reduce((sum, s) => sum + (s.totals?.totalUsd || 0), 0);

        return {
            totalKg: NumberUtils.round(totalKg, 2),
            totalUsd: NumberUtils.round(totalUsd, 2),
            count: recentShipments.length
        };
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

        return await db.create('payments', paymentData);
    }

    static async update(paymentData) {
        const errors = this.validate(paymentData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        paymentData.amountUsd = NumberUtils.parseNumber(paymentData.amountUsd);
        return await db.update('payments', paymentData);
    }

    static async delete(id) {
        return await db.delete('payments', id);
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

        const lotIdError = Validation.required(costData.lotId, 'Parti');
        if (lotIdError) errors.push(lotIdError);

        const productIdError = Validation.required(costData.productId, 'Ürün');
        if (productIdError) errors.push(productIdError);

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
}

/**
 * Dashboard Service
 */
class DashboardService {
    static async getSummary() {
        try {
            const [stockSummary, shipmentSummary, receivables] = await Promise.all([
                InventoryService.getStockSummary(),
                ShipmentService.getSummary(30),
                this.getOpenReceivables()
            ]);

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
        const customers = await CustomerService.getAll();
        let totalReceivables = 0;

        for (const customer of customers) {
            const balance = await CustomerService.getBalance(customer.id);
            if (balance > 0) {
                totalReceivables += balance;
            }
        }

        return NumberUtils.round(totalReceivables, 2);
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

// Export services to global scope
window.CustomerService = CustomerService;
window.ProductService = ProductService;
window.InventoryService = InventoryService;
window.ShipmentService = ShipmentService;
window.PaymentService = PaymentService;
window.SupplierService = SupplierService;
window.ProductionCostService = ProductionCostService;
window.DashboardService = DashboardService;