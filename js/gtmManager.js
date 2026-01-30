/**
 * GTM Manager - Gerenciador de Eventos do Google Tag Manager
 * 
 * Este módulo gerencia o envio de eventos para o Google Tag Manager, suportando:
 * - Envio de eventos customizados com payload
 * - Validação de eventos contra uma lista predefinida
 * - Categorização de eventos em 'purchase', 'user' e 'sign_up'
 * - Modo de debug
 * 
 * @author Privacy Team
 * @version 1.0.0
 */

class DOMEventListenerManager {
    constructor(gtmEventManager) {
        this.gtmEventManager = gtmEventManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('gtm:push', (event) => {
            const { eventName, payload } = event.detail;
            this.gtmEventManager.pushEvent(eventName, payload);
        });
    }
}

class EnvironmentDetector {
    static isProduction() {
        const hostname = window.location.hostname;
        const nonProductionPatterns = ['dev', 'hml', 'localhost', '127.0.0.1'];
        return !nonProductionPatterns.some(pattern => hostname.includes(pattern));
    }
}

class PayloadSanitizer {
    static sanitize(payload) {
        if (!payload || typeof payload !== 'object') {
            return {};
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(payload)) {
            if (value !== undefined && value !== null && typeof value !== 'function') {
                if (typeof value === 'object' && !Array.isArray(value)) {
                    sanitized[key] = PayloadSanitizer.sanitize(value);
                } else {
                    sanitized[key] = value;
                }
            }
        }
        return sanitized;
    }
}

class DebugLogger {
    constructor(debugMode = false) {
        this.debugMode = debugMode;
    }

    setDebugMode(enabled) {
        this.debugMode = !!enabled;
        console.log('[GTM Debug]', `Debug mode ${enabled ? 'enabled' : 'disabled'}.`);
    }

    log(...args) {
        if (this.debugMode && !EnvironmentDetector.isProduction()) {
            console.log('[GTM Debug]', ...args);
        }
    }

    error(...args) {
        console.error('[GTM Error]', ...args);
    }
}

class DataLayerAdapter {
    constructor(dataLayerName, logger) {
        this.dataLayerName = dataLayerName;
        this.logger = logger;
        this.isAvailable = this._checkAvailability();

        if (!this.isAvailable) {
            this.logger.error('Google Tag Manager not detected. Events will not be sent.');
        } else {
            this.logger.log('Google Tag Manager detected and ready.');
        }
    }

    _checkAvailability() {
        return typeof window[this.dataLayerName] !== 'undefined' &&
            Array.isArray(window[this.dataLayerName]);
    }

    push(data) {
        if (!this.isAvailable) {
            this.logger.error('Google Tag Manager is not available.');
            return false;
        }

        if (!EnvironmentDetector.isProduction()) {
            this.logger.log(`**NON-PRODUCTION** Event would be sent to GTM:`, data);
            this.logger.log(`**NON-PRODUCTION** Current URL: ${window.location.hostname}`);
            return true;
        }

        try {
            window[this.dataLayerName].push(data);
            this.logger.log('Event sent to DataLayer:', data);
            return true;
        } catch (error) {
            this.logger.log('Error sending event to DataLayer:', error, data);
            return false;
        }
    }

    getAvailability() {
        return this.isAvailable;
    }
}

class GTMEventManager {
    constructor(dataLayerAdapter, logger, allowedEvents = []) {
        this.dataLayerAdapter = dataLayerAdapter;
        this.logger = logger;
        this.allowedEvents = new Set(allowedEvents);
    }

    /**
     * Envia um evento para o GTM.
     * @param {string} eventName - Nome do evento.
     * @param {Object} payload - Dados do evento.
     * @returns {boolean} - Retorna true se o evento foi enviado com sucesso, false caso contrário.
     */
    pushEvent(eventName, payload = {}) {
        if (!eventName || typeof eventName !== 'string') {
            this.logger.error('GTMManager: Event name is invalid.');
            return false;
        }

        if (!this.allowedEvents.has(eventName)) {
            this.logger.log(`GTMManager: Event '${eventName}' is not in the allowed events list. Not sent.`);
            return false;
        }

        const eventData = {
            event: eventName,
            timestamp: Date.now(),
            ...PayloadSanitizer.sanitize(payload)
        };

        const success = this.dataLayerAdapter.push(eventData);
        if (success) {
            this._dispatchCustomEvent('gtm:event-sent', { data: eventData });
        }
        return success;
    }

    _dispatchCustomEvent(eventType, detail = {}) {
        const event = new CustomEvent(eventType, {
            detail: {
                timestamp: Date.now(),
                ...detail
            }
        });
        document.dispatchEvent(event);
    }
}

class GTMStatsAndHealth {
    constructor(dataLayerAdapter, logger, eventManager) {
        this.dataLayerAdapter = dataLayerAdapter;
        this.logger = logger;
        this.eventManager = eventManager;
    }

    getStats() {
        return {
            isGTMLoaded: this.dataLayerAdapter.getAvailability(),
            debugMode: this.logger.debugMode,
            dataLayerName: this.dataLayerAdapter.dataLayerName,
            allowedEvents: Array.from(this.eventManager.allowedEvents)
        };
    }

    healthCheck() {
        const isHealthy = this.dataLayerAdapter.getAvailability();
        this.logger.log(`Health check - ${isHealthy ? 'OK' : 'FAILED'}`);
        return isHealthy;
    }
}

class PrivacyGTMManagerFacade {
    constructor(dataLayerName = 'dataLayer', debugMode = false, allowedEvents = []) {
        this.logger = new DebugLogger(debugMode);
        this.dataLayerAdapter = new DataLayerAdapter(dataLayerName, this.logger);
        this.eventManager = new GTMEventManager(this.dataLayerAdapter, this.logger, allowedEvents);
        this.domListenerManager = new DOMEventListenerManager(this.eventManager);
        this.statsAndHealth = new GTMStatsAndHealth(this.dataLayerAdapter, this.logger, this.eventManager);
    }

    push(eventName, payload) {
        return this.eventManager.pushEvent(eventName, payload);
    }

    setDebug(enabled) {
        this.logger.setDebugMode(enabled);
    }

    getStats() {
        return this.statsAndHealth.getStats();
    }

    healthCheck() {
        return this.statsAndHealth.healthCheck();
    }
}

let privacyGTMManagerInstance;

const initializeGTM = () => {
    if (!privacyGTMManagerInstance) {
        const allowedEvents = [
            'purchase_intent',
            'purchase',

            'sign_up',
            'sign_up_email_password',
            'sign_up_google',
            'sign_up_x',
            'sign_up_apple',

            'login',
            'login_email_password',
            'login_google',
            'login_x',
            'login_apple',

            'user_login',
            'user_profile_view',
            'user_settings_update',
            'user_become_creator_start',
            'user_become_creator_complete',
            
            'chat_room_session',
            'chat_load_messages',
            'chat_interaction_message',
            
        ];

        privacyGTMManagerInstance = new PrivacyGTMManagerFacade('dataLayer', false, allowedEvents);
        window.PrivacyGTMManagerFacade = privacyGTMManagerInstance;
        window.PrivacyGTM = {
            push: (eventName, payload) => privacyGTMManagerInstance.push(eventName, payload),
            setDebug: (enabled) => privacyGTMManagerInstance.setDebug(enabled),
            getStats: () => privacyGTMManagerInstance.getStats(),
            healthCheck: () => privacyGTMManagerInstance.healthCheck(),
        };
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGTM);
} else {
    initializeGTM();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PrivacyGTM: PrivacyGTMManagerFacade
    };
}