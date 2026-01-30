const TOKEN_GENERATION_TIMEOUT = 30_000;
const TOKEN_INTERNAL_TIMEOUT = 105_000;

class TurnstileController {
    static instance = null;

    constructor(container) {
        this.container = container;
        this.token = null;
        this.widgetId = null;
        this.refreshTimer = null;
        this._tokenResolver = null;
        this._tokenRejector = null;
        this._tokenPromise = this._createNewPromise();
    }

    _createNewPromise() {
        return new Promise((resolve, reject) => {
            this._tokenResolver = resolve;
            this._tokenRejector = reject;
        });
    }

    _invalidate() {
        this.token = null;
        this._tokenPromise = this._createNewPromise();
        this._stopRefreshTimer();
    }

    _startRefreshTimer() {
        this._stopRefreshTimer();
        this.refreshTimer = setTimeout(() => {
            this.reset();
        }, TOKEN_INTERNAL_TIMEOUT);
    }

    _stopRefreshTimer() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    static createInstance(elementId) {
        const container = document.getElementById(elementId);
        
        if (!container) {
            console.warn(`Turnstile element with ID #${elementId} not found in Light DOM.`);
        }

        if (!TurnstileController.instance) {
            TurnstileController.instance = new TurnstileController(container);
        } else if (TurnstileController.instance) {
            TurnstileController.instance.container = container;
        }

        return TurnstileController.instance;
    }

    async initialize(config) {
        this.destroy();

        if (!config?.active || !this.container) return;

        await this._loadScript();

        this.widgetId = window.turnstile.render(this.container, {
            sitekey: config.siteKey,
            theme: config.theme || 'auto',
            callback: (token) => {
                this.token = token;

                if (this._tokenResolver) this._tokenResolver(token);

                this._startRefreshTimer();
            },
            'error-callback': (error) => {
                if (this._tokenRejector) this._tokenRejector(new Error(error));

                this._invalidate();
            },
            'expired-callback': () => this.reset(),
            'timeout-callback': () => this.reset(),
        });
    }

    _loadScript() {
        return new Promise((resolve, reject) => {
            if (window.turnstile) return resolve();

            const script = document.createElement('script');
            
            script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;

            document.head.appendChild(script);
        });
    }

    reset() {
        this._invalidate();

        if (this.widgetId !== null) {
            window.turnstile.reset(this.widgetId);
        }
    }

    async getToken() {
        if (this.token) return this.token;

        return Promise.race([
            this._tokenPromise,
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Turnstile timeout after ${TOKEN_GENERATION_TIMEOUT}ms`));
                }, TOKEN_GENERATION_TIMEOUT);
            })
        ]);
    }

    destroy() {
        this._stopRefreshTimer();

        if (this.widgetId !== null) {
            window.turnstile.remove(this.widgetId);
            this.widgetId = null;
        }

        this.token = null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TurnstileController;
}

if (typeof window !== 'undefined') {
    window.TurnstileController = TurnstileController;
} 