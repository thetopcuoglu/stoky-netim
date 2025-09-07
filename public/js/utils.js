// Utility Functions for Kumaş Stok Yönetimi

/**
 * Date and Time Utilities
 */
const DateUtils = {
    // Get current date in Istanbul timezone
    getCurrentDate() {
        return new Date().toLocaleDateString('tr-TR');
    },
    
    // Get current datetime in Istanbul timezone
    getCurrentDateTime() {
        return new Date().toLocaleString('tr-TR', {
            timeZone: 'Europe/Istanbul'
        });
    },
    
    // Format date for display
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('tr-TR');
    },
    
    // Format datetime for display
    formatDateTime(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleString('tr-TR', {
            timeZone: 'Europe/Istanbul'
        });
    },
    
    // Get date for input[type="date"]
    getInputDate(date = new Date()) {
        return date.toISOString().split('T')[0];
    },
    
    // Get start of day
    getStartOfDay(date = new Date()) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    },
    
    // Get end of day
    getEndOfDay(date = new Date()) {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
    },
    
    // Get date N days ago
    getDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date;
    },
    
    // Check if date is within range
    isInRange(date, startDate, endDate) {
        const d = new Date(date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return d >= start && d <= end;
    }
};

/**
 * Number Formatting Utilities
 */
const NumberUtils = {
    // Format kg with 2 decimal places
    formatKg(value) {
        if (value === null || value === undefined) return '0.00';
        return Number(value).toFixed(2);
    },
    
    // Format USD with 2 decimal places and thousand separators
    formatUSD(value) {
        if (value === null || value === undefined) return '$0.00';
        const num = Number(value);
        return '$' + num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },
    
    // Format TRY with 2 decimal places and thousand separators
    formatTRY(value) {
        if (value === null || value === undefined) return '₺0.00';
        const num = Number(value);
        return '₺' + num.toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },
    
    // Format USD for receipt (with Turkish thousand separators)
    formatUSDReceipt(value) {
        if (value === null || value === undefined) return '$0,00';
        const num = Number(value);
        return '$' + num.toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },
    
    // Format TRY for receipt (with Turkish thousand separators)
    formatTRYReceipt(value) {
        if (value === null || value === undefined) return '₺0,00';
        const num = Number(value);
        return '₺' + num.toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },
    
    // Convert number to Turkish text
    numberToTurkishText(num) {
        if (num === 0) return 'sıfır';
        
        const ones = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
        const tens = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
        const hundreds = ['', 'yüz', 'iki yüz', 'üç yüz', 'dört yüz', 'beş yüz', 'altı yüz', 'yedi yüz', 'sekiz yüz', 'dokuz yüz'];
        
        function convertGroup(n) {
            if (n === 0) return '';
            if (n < 10) return ones[n];
            if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 > 0 ? ' ' + ones[n % 10] : '');
            if (n < 1000) return hundreds[Math.floor(n / 100)] + (n % 100 > 0 ? ' ' + convertGroup(n % 100) : '');
            return '';
        }
        
        const integerPart = Math.floor(num);
        const decimalPart = Math.round((num - integerPart) * 100);
        
        let result = '';
        
        if (integerPart === 0) {
            result = 'sıfır';
        } else {
            const billions = Math.floor(integerPart / 1000000000);
            const millions = Math.floor((integerPart % 1000000000) / 1000000);
            const thousands = Math.floor((integerPart % 1000000) / 1000);
            const remainder = integerPart % 1000;
            
            if (billions > 0) {
                result += (billions === 1 ? 'bir milyar' : convertGroup(billions) + ' milyar') + ' ';
            }
            if (millions > 0) {
                result += (millions === 1 ? 'bir milyon' : convertGroup(millions) + ' milyon') + ' ';
            }
            if (thousands > 0) {
                result += (thousands === 1 ? 'bin' : convertGroup(thousands) + ' bin') + ' ';
            }
            if (remainder > 0) {
                result += convertGroup(remainder);
            }
        }
        
        if (decimalPart > 0) {
            result += ' virgül ' + convertGroup(decimalPart) + ' kuruş';
        }
        
        return result.trim();
    },
    
    // Format unit price with 4 decimal places
    formatUnitPrice(value) {
        if (value === null || value === undefined) return '$0.0000';
        return '$' + Number(value).toFixed(4);
    },
    
    // Parse number from string (handles Turkish decimal separator)
    parseNumber(value) {
        if (!value) return 0;
        // Handle both . and , as decimal separators
        const str = String(value).replace(',', '.');
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    },
    
    // Round to specified decimal places
    round(value, decimals = 2) {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
};

/**
 * String Utilities
 */
const StringUtils = {
    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // Capitalize first letter
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },
    
    // Clean and normalize text for search
    normalizeText(text) {
        if (!text) return '';
        return text.toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .trim();
    },
    
    // Search text contains query
    searchMatch(text, query) {
        if (!query) return true;
        const normalizedText = this.normalizeText(text);
        const normalizedQuery = this.normalizeText(query);
        return normalizedText.includes(normalizedQuery);
    }
};

/**
 * Array Utilities
 */
const ArrayUtils = {
    // Sort array by property
    sortBy(array, property, direction = 'asc') {
        return [...array].sort((a, b) => {
            let aVal = a[property];
            let bVal = b[property];
            
            // Handle null/undefined values
            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';
            
            // Handle different data types
            if (typeof aVal === 'string') {
                aVal = StringUtils.normalizeText(aVal);
                bVal = StringUtils.normalizeText(bVal);
            }
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    },
    
    // Group array by property
    groupBy(array, property) {
        return array.reduce((groups, item) => {
            const key = item[property];
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
            return groups;
        }, {});
    },
    
    // Sum array by property
    sumBy(array, property) {
        return array.reduce((sum, item) => sum + (item[property] || 0), 0);
    }
};

/**
 * DOM Utilities
 */
const DOMUtils = {
    // Show element
    show(selector) {
        const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (element) {
            element.classList.remove('hidden');
        }
    },
    
    // Hide element
    hide(selector) {
        const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (element) {
            element.classList.add('hidden');
        }
    },
    
    // Toggle element visibility
    toggle(selector) {
        const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (element) {
            element.classList.toggle('hidden');
        }
    },
    
    // Clear element content
    clear(selector) {
        const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (element) {
            element.innerHTML = '';
        }
    },
    
    // Set element text content
    setText(selector, text) {
        const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (element) {
            element.textContent = text;
        }
    },
    
    // Set element HTML content
    setHTML(selector, html) {
        const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (element) {
            element.innerHTML = html;
        }
    },
    
    // Add event listener
    on(selector, event, handler) {
        const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (element) {
            element.addEventListener(event, handler);
        }
    },
    
    // Remove event listener
    off(selector, event, handler) {
        const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (element) {
            element.removeEventListener(event, handler);
        }
    }
};

/**
 * Toast Notification System
 */
const Toast = {
    show(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, duration);
        }
        
        return toast;
    },
    
    success(message, duration) {
        return this.show(message, 'success', duration);
    },
    
    error(message, duration) {
        return this.show(message, 'error', duration);
    },
    
    warning(message, duration) {
        return this.show(message, 'warning', duration);
    },
    
    info(message, duration) {
        return this.show(message, 'info', duration);
    }
};

/**
 * CSV Export/Import Utilities
 */
const CSVUtils = {
    // Convert array of objects to CSV
    arrayToCSV(data, headers = null) {
        if (!data || data.length === 0) return '';
        
        // Use provided headers or extract from first object
        const keys = headers || Object.keys(data[0]);
        
        // Create CSV header row
        const csvHeaders = keys.map(key => `"${key}"`).join(',');
        
        // Create CSV data rows
        const csvRows = data.map(row => {
            return keys.map(key => {
                let value = row[key] || '';
                // Escape quotes and wrap in quotes if contains comma or quote
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',');
        });
        
        return [csvHeaders, ...csvRows].join('\n');
    },
    
    // Parse CSV to array of objects
    csvToArray(csv, headers = null) {
        const lines = csv.split('\n').filter(line => line.trim());
        if (lines.length === 0) return [];
        
        // Use provided headers or extract from first line
        const headerLine = headers ? headers : lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const dataLines = headers ? lines : lines.slice(1);
        
        return dataLines.map(line => {
            const values = line.split(',').map(v => v.replace(/"/g, '').trim());
            const obj = {};
            headerLine.forEach((header, index) => {
                obj[header] = values[index] || '';
            });
            return obj;
        });
    },
    
    // Download CSV file
    downloadCSV(data, filename, headers = null) {
        const csv = this.arrayToCSV(data, headers);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
};

/**
 * Loading State Management
 */
const LoadingState = {
    show() {
        DOMUtils.show('#loading');
    },
    
    hide() {
        DOMUtils.hide('#loading');
    }
};

/**
 * Form Validation Utilities
 */
const Validation = {
    // Validate required field
    required(value, fieldName) {
        if (!value || String(value).trim() === '') {
            return `${fieldName} zorunludur`;
        }
        return null;
    },
    
    // Validate number
    number(value, fieldName, min = null, max = null) {
        const num = NumberUtils.parseNumber(value);
        if (isNaN(num)) {
            return `${fieldName} geçerli bir sayı olmalıdır`;
        }
        if (min !== null && num < min) {
            return `${fieldName} en az ${min} olmalıdır`;
        }
        if (max !== null && num > max) {
            return `${fieldName} en fazla ${max} olmalıdır`;
        }
        return null;
    },
    
    // Validate email
    email(value, fieldName) {
        if (!value) return null; // Optional field
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return `${fieldName} geçerli bir e-posta adresi olmalıdır`;
        }
        return null;
    },
    
    // Validate phone
    phone(value, fieldName) {
        if (!value) return null; // Optional field
        
        // Çok esnek telefon validasyonu - sadece minimum uzunluk kontrolü
        const cleanPhone = value.replace(/\s/g, ''); // Boşlukları temizle
        
        if (cleanPhone.length < 10) {
            return `${fieldName} en az 10 haneli olmalıdır`;
        }
        
        // Türk telefon formatları için esnek regex
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(value)) {
            return `${fieldName} geçerli karakterler içermelidir (rakam, boşluk, tire, parantez)`;
        }
        
        return null;
    }
};

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    
    // Ignore specific errors that are not critical
    if (event.error && event.error.message && 
        (event.error.message.includes('mobileSidebar') || 
         event.error.message.includes('null is not an object'))) {
        return; // Don't show toast for these non-critical errors
    }
    
    Toast.error('Bir hata oluştu. Lütfen sayfayı yenileyin.');
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    Toast.error('Bir hata oluştu. Lütfen tekrar deneyin.');
});

// Export utilities to global scope
window.DateUtils = DateUtils;
window.NumberUtils = NumberUtils;
window.StringUtils = StringUtils;
window.ArrayUtils = ArrayUtils;
window.DOMUtils = DOMUtils;
window.Toast = Toast;
window.CSVUtils = CSVUtils;
window.LoadingState = LoadingState;
window.Validation = Validation;