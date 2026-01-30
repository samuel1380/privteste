/**
 * Theme Manager - Gerenciador de Tema Dark/Light Mode
 * 
 * Este módulo gerencia o estado do tema da aplicação, suportando:
 * - Preferências do sistema operacional (prefers-color-scheme)
 * - Armazenamento local (localStorage)
 * - Toggle manual entre temas
 * - Persistência de preferências do usuário
 * - Bypass da aplicação de tema via atributo `data-theme-lock="true"` no HTML.
 * 
 * @author Privacy Team
 * @version 1.1.0
 */

class ThemeManager {
    constructor() {
        this.themeKey = 'privacy-theme';
        this.themeAttribute = 'data-theme';
        this.lockAttribute = 'data-theme-lock'
        this.darkClass = 'dark-mode';
        this.lightClass = 'light-mode';

        this.themes = {
            light: 'light',
            dark: 'dark',
            system: 'system'
        };

        this.currentTheme = null;
        this.systemTheme = null;

        this.init();
    }

    /**
     * Inicializa o gerenciador de tema
     */
    init() {
        this.detectSystemTheme();
        this.loadSavedTheme();
        this.applyTheme();
        this.setupEventListeners();
        this.setupMutationObserver();
    }

    /**
     * Verifica se a aplicação de tema está bloqueada.
     * @returns {boolean} - True se o tema estiver bloqueado, senão false.
     */
    isThemeLocked() {
        return document.documentElement.getAttribute(this.lockAttribute) === 'true';
    }

    /**
     * Detecta a preferência de tema do sistema operacional
     */
    detectSystemTheme() {
        this.systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

        // Listener para mudanças na preferência do sistema
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            this.systemTheme = e.matches ? 'dark' : 'light';
            if (this.currentTheme === 'system') {
                this.applyTheme();
            }
        });
    }

    /**
     * Carrega o tema salvo no localStorage
     */
    loadSavedTheme() {
        try {
            const savedTheme = localStorage.getItem(this.themeKey);
            this.currentTheme = savedTheme && this.themes[savedTheme] ? savedTheme : 'system';
        } catch (error) {
            console.warn('Erro ao carregar tema do localStorage:', error);
            this.currentTheme = 'system';
        }
    }

    /**
     * Salva o tema no localStorage
     */
    saveTheme(theme) {
        try {
            localStorage.setItem(this.themeKey, theme);
        } catch (error) {
            console.warn('Erro ao salvar tema no localStorage:', error);
        }
    }

    /**
     * Aplica o tema atual ao documento
     */
    applyTheme() {
        // Adicionado bypass se o tema estiver bloqueado
        if (this.isThemeLocked()) {
            return;
        }

        const effectiveTheme = this.getEffectiveTheme();
        const htmlElement = document.documentElement;
        const bodyElement = document.body;

        // Remove classes anteriores
        htmlElement.classList.remove(this.darkClass, this.lightClass);
        bodyElement.classList.remove(this.darkClass, this.lightClass);

        // Aplica o tema efetivo
        if (effectiveTheme === 'dark') {
            htmlElement.classList.add(this.darkClass);
            bodyElement.classList.add(this.darkClass);
            htmlElement.setAttribute(this.themeAttribute, 'dark');
        } else {
            htmlElement.classList.add(this.lightClass);
            bodyElement.classList.add(this.lightClass);
            htmlElement.setAttribute(this.themeAttribute, 'light');
        }

        this._applyThemeInWebComponent(effectiveTheme);

        // Dispara evento customizado
        this.dispatchThemeChangeEvent(effectiveTheme);
    }

    _findPrivacyElements(elementRoot) {
        return Array
            .from(elementRoot.querySelectorAll('*'))
            .filter(el => el.tagName.toLowerCase().startsWith('privacy-'))
    }

    _applyThemeInWebComponent(theme) {
        const visited = new Set();
        const stack = [document];

        while (stack.length > 0) {
            const root = stack.pop();
            let privacyElements;

            try {
                privacyElements = this._findPrivacyElements(root);
            } catch (e) {
                console.error(e);
                continue;
            }

            for (const webComponent of privacyElements) {
                if (visited.has(webComponent)) continue;
                visited.add(webComponent);

                const el = webComponent.shadowRoot?.querySelector('.app-wc');

                if (el) {
                    stack.push(el)

                    this._applyThemeInElement(el, theme);
                }
            }
        }
    }

    _applyThemeInElement(element, theme) {
        if (theme === 'dark') {
            element.classList.add(this.darkClass);
        } else {
            element.classList.remove(this.darkClass);
        }
    }

    /**
     * Obtém o tema efetivo (considerando preferência do sistema)
     */
    getEffectiveTheme() {
        if (this.currentTheme === 'system') {
            return this.systemTheme;
        }
        return this.currentTheme;
    }

    /**
     * Configura os event listeners
     */
    setupEventListeners() {
        // Listener para mudanças no localStorage (outras abas)
        window.addEventListener('storage', (e) => {
            if (e.key === this.themeKey) {
                this.loadSavedTheme();
                this.applyTheme();
            }
        });
    }

    /**
     * Configura observer para mudanças no DOM
     */
    setupMutationObserver() {
        // Observer para detectar quando elementos são adicionados dinamicamente
        const observer = new MutationObserver((mutations) => {
            // Adicionado bypass se o tema estiver bloqueado
            if (this.isThemeLocked()) {
                return;
            }
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Reaplica o tema em novos elementos se necessário
                    this.applyThemeToNewElements(mutation.addedNodes);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Aplica o tema a novos elementos adicionados dinamicamente
     */
    applyThemeToNewElements(nodes) {
        // Verificação é redundante para garantir a função não possa ser chamada indevidamente.
        if (this.isThemeLocked()) {
            return;
        }

        const effectiveTheme = this.getEffectiveTheme();

        nodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase().startsWith('privacy-')) {
                if (effectiveTheme === 'dark') {
                    node.classList.add(this.darkClass);
                } else {
                    node.classList.add(this.lightClass);
                }
            }
        });
    }

    /**
     * Dispara evento customizado de mudança de tema
     */
    dispatchThemeChangeEvent(theme) {
        const event = new CustomEvent('theme-changed', {
            detail: {
                theme: theme,
                previousTheme: this.currentTheme,
                isSystem: this.currentTheme === 'system'
            }
        });

        document.dispatchEvent(event);
    }

    /**
     * Define o tema manualmente
     */
    setTheme(theme) {
        if (!this.themes[theme]) {
            console.warn(`Tema inválido: ${theme}`);
            return false;
        }

        const previousTheme = this.currentTheme;
        this.currentTheme = theme;

        this.saveTheme(theme);
        this.applyTheme();

        return true;
    }

    /**
     * Alterna entre light e dark mode
     */
    toggleTheme() {
        const effectiveTheme = this.getEffectiveTheme();
        const newTheme = effectiveTheme === 'dark' ? 'light' : 'dark';

        this.setTheme(newTheme);
        return newTheme;
    }

    /**
     * Obtém o tema atual
     */
    getCurrentTheme() {
        return {
            current: this.currentTheme,
            effective: this.getEffectiveTheme(),
            system: this.systemTheme,
            isSystem: this.currentTheme === 'system'
        };
    }

    /**
     * Verifica se o tema atual é dark
     */
    isDarkMode() {
        return this.getEffectiveTheme() === 'dark';
    }

    /**
     * Verifica se o tema atual é light
     */
    isLightMode() {
        return this.getEffectiveTheme() === 'light';
    }

    /**
     * Reseta para o tema do sistema
     */
    resetToSystem() {
        this.setTheme('system');
    }

    /**
     * Obtém as estatísticas de uso dos temas
     */
    getThemeStats() {
        try {
            const stats = localStorage.getItem('privacy-theme-stats');
            return stats ? JSON.parse(stats) : { light: 0, dark: 0, system: 0 };
        } catch (error) {
            console.warn('Erro ao carregar estatísticas de tema:', error);
            return { light: 0, dark: 0, system: 0 };
        }
    }

    /**
     * Atualiza estatísticas de uso
     */
    updateThemeStats() {
        try {
            const stats = this.getThemeStats();
            stats[this.currentTheme]++;
            localStorage.setItem('privacy-theme-stats', JSON.stringify(stats));
        } catch (error) {
            console.warn('Erro ao atualizar estatísticas de tema:', error);
        }
    }
}

// Instância global do ThemeManager
let themeManager;

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    themeManager = new ThemeManager();

    // Atualiza estatísticas quando o tema é alterado
    document.addEventListener('theme-changed', () => {
        themeManager.updateThemeStats();
    });

    // Expõe o ThemeManager globalmente para uso em outros scripts
    window.PrivacyThemeManager = themeManager;
});

// Fallback para casos onde o script é carregado após o DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!themeManager) {
            themeManager = new ThemeManager();
            window.PrivacyThemeManager = themeManager;
        }
    });
} else {
    // DOM já está pronto
    themeManager = new ThemeManager();
    window.PrivacyThemeManager = themeManager;
}

// API pública para uso em outros scripts
window.PrivacyTheme = {
    setTheme: (theme) => themeManager?.setTheme(theme),
    toggleTheme: () => themeManager?.toggleTheme(),
    getCurrentTheme: () => themeManager?.getCurrentTheme(),
    isDarkMode: () => themeManager?.isDarkMode(),
    isLightMode: () => themeManager?.isLightMode(),
    resetToSystem: () => themeManager?.resetToSystem(),
    getThemeStats: () => themeManager?.getThemeStats(),
    getEffectiveTheme: () => themeManager?.getEffectiveTheme()
};

// Export para módulos ES6 (se suportado)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}