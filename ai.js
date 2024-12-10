// Cookie utilities
const CookieManager = {
    set(value, minutes) {
        const date = new Date();
        date.setTime(date.getTime() + (minutes * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        const cookieValue = "workstatt-chat=" + JSON.stringify(value) + ";" + expires + ";path=/";
        document.cookie = cookieValue;
        console.log('Setting cookie with value:', cookieValue);
    },

    get() {
        const name = "workstatt-chat=";
        const cookies = document.cookie.split(';');
        for(let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            if (cookie.indexOf(name) === 0) {
                try {
                    const value = JSON.parse(cookie.substring(name.length, cookie.length));
                    console.log('Cookie retrieved:', value);
                    return value;
                } catch (e) {
                    console.error('Error parsing cookie:', e);
                    return null;
                }
            }
        }
        return null;
    },

    clear() {
        document.cookie = "workstatt-chat=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }
};

// Chat UI utilities
const ChatUI = {
    elements: {
        aiInput: null,
        submitButton: null,
        chatHolder: null,
        form: null,
        searchQuestions: null,
        aiFragenElement: null,
        aiInputHolder: null,
        openButton: null
    },

    initialize() {
        this.elements = {
            aiInput: document.querySelector('[hs-ai-input]'),
            submitButton: document.querySelector('[hs-api-submit]'),
            chatHolder: document.querySelector('.ai_chat'),
            form: document.querySelector('[ai-chat-form]'),
            searchQuestions: document.querySelectorAll('[hs-ai-copy]'),
            aiFragenElement: document.querySelector('[ai-fragen]'),
            aiInputHolder: document.querySelector('.ai_input-holder'),
            openButton: document.querySelector('[fs-modal-element="open-20"]')
        };
        return Object.values(this.elements).every(element => element !== null);
    },

    scrollToBottom() {
        this.elements.chatHolder.scrollTop = this.elements.chatHolder.scrollHeight;
    },

    clearChat() {
        if (this.elements.chatHolder) {
            this.elements.chatHolder.innerHTML = '';
        }
    },

    hideSearchQuestions() {
        if (this.elements.aiFragenElement) {
            this.elements.aiFragenElement.style.display = 'none';
        }
    },

    addLoadingMessage() {
        const loadingHTML = `
            <div hs-api-agent-answer-holder="" class="ai_chat-agent-bubble-holder">
                <div hs-api-agent-answer="" class="ai_chat-agent-bubble">
                    <div class="text-size-regular op_50">workstatt KI-Berater · vor weniger als 1 Minute</div>
                    <div class="text-size-regular" style="display: flex; align-items: center; gap: 8px;">
                        Denke nach...
                        <div class="lds-dual-ring is-small"></div>
                    </div>
                </div>
            </div>`;
        this.elements.chatHolder.insertAdjacentHTML('beforeend', loadingHTML);
        this.scrollToBottom();
    },

    removeLoadingMessage() {
        this.elements.chatHolder.lastElementChild?.remove();
    },

    async addMessage(message, isUser = true) {
        const messageHTML = isUser ? this.createUserMessageHTML(message) : this.createAgentMessageHTML(message);
        
        // Create a temporary container
        const temp = document.createElement('div');
        temp.innerHTML = messageHTML;
        
        // Add to chat
        this.elements.chatHolder.appendChild(temp.firstElementChild);
        this.scrollToBottom();
    },

    createUserMessageHTML(message) {
        return `
            <div hs-api-user-question="" class="ai_chat-human-bubble-holder">
                <div class="ai_chat-human-bubble">
                    <div class="text-size-regular op_50">Du · vor weniger als 1 Minute</div>
                    <div class="text-size-regular">${message}</div>
                </div>
                <img src="https://cdn.prod.website-files.com/66e15ba66b890988dcb296a0/6750792ac71b97d4d6a54dad_workstatt-human-polygon.svg" loading="lazy" alt="" class="ai_chat-human-poly">
            </div>`;
    },

    createAgentMessageHTML(message) {
        return `
            <div hs-api-agent-answer-holder="" class="ai_chat-agent-bubble-holder">
                ${message}
            </div>`;
    }
};

// Chat functionality
const ChatManager = {
    messageHistory: [],

    async init() {
        if (!ChatUI.initialize()) {
            console.error('Failed to initialize chat UI');
            return;
        }

        this.setupEventListeners();
        await this.checkAgentAvailability();
        
        // Add click handler for the chat opener
        ChatUI.elements.openButton.addEventListener('click', () => {
            console.log('Chat opened - initializing cookie');
            if (!CookieManager.get()) {
                CookieManager.set([], 60);
            }
        });
    },

    setupEventListeners() {
        // Prevent form submission in multiple ways
        const form = ChatUI.elements.form;
        const preventSubmit = (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };

        form.addEventListener('submit', preventSubmit, true);
        form.addEventListener('submit', preventSubmit);
        form.onsubmit = preventSubmit;
        
        // Handle enter key on input
        ChatUI.elements.aiInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                this.handleSubmit(e);
                return false;
            }
        }, true);

        // Add reset functionality
        document.querySelector('[ai-chat-reset]').addEventListener('click', () => {
            CookieManager.clear();
            ChatUI.clearChat();
            ChatManager.messageHistory = [];
        });

        ChatUI.elements.submitButton.addEventListener('click', (e) => this.handleSubmit(e));
        this.setupSearchQuestions();
    },

    setupSearchQuestions() {
        ChatUI.elements.searchQuestions.forEach(question => {
            question.addEventListener('click', (e) => {
                e.preventDefault();
                if (!ChatUI.elements.aiInput.closest('[hs-ai-input-holder]')?.classList.contains('is-disabled')) {
                    ChatUI.elements.aiInput.value = question.textContent;
                    ChatUI.elements.aiInput.focus();
                    ChatUI.hideSearchQuestions();
                }
            });
        });
    },

    async checkAgentAvailability() {
        try {
            const response = await fetch('https://assistant.workstatt.cloud/agent/available', {
                method: 'GET',
                headers: { 'accept': 'application/json' }
            });
            const data = await response.json();

            if (data.success) {
                ChatUI.elements.aiInputHolder.classList.remove('is-disabled');
                this.loadChatHistory();
            }
        } catch (error) {
            console.error('Error checking agent availability:', error);
        }
    },

    async loadChatHistory() {
        const savedHistory = CookieManager.get();
        console.log('Loading chat history:', savedHistory);

        if (savedHistory?.length > 0) {
            this.messageHistory = savedHistory;
            ChatUI.clearChat();
            ChatUI.hideSearchQuestions();
            
            // Process messages sequentially with delay
            for (const msg of savedHistory) {
                await new Promise(resolve => setTimeout(resolve, 20));
                if (msg.role === 'user') {
                    await ChatUI.addMessage(msg.content, true);
                } else if (msg.role === 'assistant') {
                    const formattedMessage = this.formatMessage(msg.content);
                    await ChatUI.addMessage(formattedMessage, false);
                }
            }
        }
    },

    async handleSubmit(e) {
        e.preventDefault();
        const question = ChatUI.elements.aiInput.value.trim();
        if (!question) return;

        ChatUI.hideSearchQuestions();
        await this.sendMessage(question);
    },

    async sendMessage(question) {
        this.messageHistory.push({ content: question, role: "user" });
        console.log('Saving message history to cookie:', this.messageHistory);
        CookieManager.set(this.messageHistory, 60);

        ChatUI.addMessage(question, true);
        ChatUI.elements.aiInput.value = '';
        ChatUI.addLoadingMessage();

        try {
            const response = await this.fetchResponse(question);
            ChatUI.removeLoadingMessage();
            await this.handleResponse(response);
        } catch (error) {
            console.error('Error sending message:', error);
            ChatUI.removeLoadingMessage();
        }
    },

    async fetchResponse(question) {
        const sessionId = await this.generateSessionId();
        const response = await fetch('https://assistant.workstatt.cloud/agent', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: sessionId,
                messages: this.messageHistory
            })
        });
        return response.text();
    },

    async handleResponse(response) {
        // Add the original response to message history
        this.messageHistory.push({
            content: response,
            role: "assistant"
        });
        
        // Save to cookie
        CookieManager.set(this.messageHistory, 60);

        // Format and display the message
        const formattedMessage = this.formatMessage(response);
        ChatUI.addMessage(formattedMessage, false);
    },

    parseResponse(response) {
        const messages = [];
        let currentMessage = '';
        
        response.split(/({.*?})/g).forEach(part => {
            if (part.trim().startsWith('{')) {
                if (currentMessage.trim()) messages.push(currentMessage.trim());
                messages.push(part);
                currentMessage = '';
            } else {
                currentMessage += part;
            }
        });
        
        if (currentMessage.trim()) messages.push(currentMessage.trim());
        return messages;
    },

    formatMessage(message) {
        const products = [];
        let counter = 1;
        
        // Extract and parse products
        const jsonMatches = message.match(/\{[^{}]*\}/g);
        jsonMatches?.forEach(jsonString => {
            try {
                const product = JSON.parse(jsonString);
                if (product.type === 'product') {
                    products.push(product);
                }
            } catch (e) {
                console.error('Error parsing product JSON:', e);
            }
        });

        // Remove JSON objects and clean up the message
        let cleanMessage = message
            .replace(/\{[^{}]*\}/g, '')
            // Remove all existing breaks
            .replace(/<br>/g, '')
            // Remove extra spaces
            .replace(/\s+/g, ' ')
            .trim();

        // Replace image markdown with numbered references, putting breaks after the number
        cleanMessage = cleanMessage.replace(/!\[.*?\]\(.*?\)\s*(\[\d+\])?/g, () => {
            return `<span class="product-reference-link" data-reference="${counter}" style="color: var(--green);">[${counter++}]</span><br><br>`;
        });

        // Updated product HTML with product URL
        const productsHTML = products.map((product, index) => `
            <a href="https://www.workstatt.de/products/${product.handle}" 
               class="ai_chat-agent-bubble-product w-inline-block" 
               data-product-reference="${index + 1}">
                <img src="${product.image}" 
                     loading="lazy" 
                     alt="${product.title}" 
                     class="search_produkte-img">
                <div class="search_produkte-inner">
                    <div>${product.title}</div>
                </div>
            </a>
        `).join('');

        // Only store the message once in history
        if (this.messageHistory && !this.messageHistory.some(msg => 
            msg.content === message && msg.role === "assistant"
        )) {
            this.messageHistory.push({
                content: message.replace(/"/g, '\\"'),
                role: "assistant"
            });
            
            CookieManager.set(this.messageHistory, 60);
        }

        return `
            <div class="ai_chat-agent-bubble">
                <div class="text-size-regular op_50">workstatt KI-Berater · vor weniger als 1 Minute</div>
                <div class="text-size-regular">${this.parseMarkdown(cleanMessage)}</div>
            </div>
            <div class="product-list">${productsHTML}</div>
        `;
    },

    parseMarkdown(text) {
        return text
            // Numbered list with bold text (keep number with title)
            .replace(/(\d+\.) \*\*(.*?)\*\*/g, '<br><br>$1 <strong>$2</strong>')
            // Other bold text with breaks
            .replace(/- \*\*(.*?)\*\*\./g, '<br><br><strong>- $1.</strong><br>')
            .replace(/\*\*(.*?)\*\*\./g, '<br><br><strong>$1.</strong><br>')
            .replace(/- \*\*(.*?)\*\*:/g, '<br><br><strong>- $1:</strong><br>')
            .replace(/\*\*(.*?)\*\*:/g, '<br><br><strong>$1:</strong><br>')
            .replace(/\*\*(.*?)\*\*/g, '<br><br><strong>$1</strong><br>')
            // Bullet points
            .replace(/^- /gm, '<br>• ')
            // Ensure line breaks before and after lists
            .replace(/(<br>• [^\n]+)(?=\n|$)/g, '$1<br>')
            // Paragraph breaks
            .replace(/\n\n/g, '<br><br>')
            // Line breaks
            .replace(/\n/g, '<br>');
    },

    async generateSessionId() {
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        const hashBuffer = await crypto.subtle.digest('SHA-256', randomBytes);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => ChatManager.init());