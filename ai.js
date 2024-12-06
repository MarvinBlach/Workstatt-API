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
        
        // Get the message element and add the animation class
        const messageElement = temp.firstElementChild;
        messageElement.classList.add('message-fade-in');
        
        // Add to chat
        this.elements.chatHolder.appendChild(messageElement);
        this.scrollToBottom();
        
        // Return a promise that resolves when the animation is complete
        return new Promise(resolve => {
            messageElement.addEventListener('animationend', () => resolve(), { once: true });
        });
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
                await new Promise(resolve => setTimeout(resolve, 100));
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
        let productCount = 0;
        const products = [];
        
        // First pass: collect all product JSONs
        message.split(/({.*?})/g).forEach(part => {
            if (part.trim().startsWith('{')) {
                try {
                    const jsonData = JSON.parse(part);
                    products.push(jsonData);
                } catch (e) {
                    console.error('Error parsing JSON:', e);
                }
            }
        });
        
        // Second pass: replace JSON with numbered references
        let formattedMessage = message.replace(/({.*?})/g, () => {
            productCount++;
            return `<span class="product-reference-link" data-reference="${productCount}">[${productCount}]</span>`;
        });
        
        // Create separate HTML for products
        const productsHTML = products.map((product, index) => `
            <a href="#" class="ai_chat-agent-bubble-product w-inline-block" data-product-reference="${index + 1}">
                <img src="https://cdn.prod.website-files.com/plugins/Basic/assets/placeholder.60f9b1840c.svg" 
                     loading="lazy" 
                     alt="" 
                     class="search_produkte-img">
                <div class="search_produkte-inner">
                    <div>${product.name || 'Steelcase Product Name'}</div>
                    <div>€735,00</div>
                </div>
            </a>
        `).join('');
        
        // Add click handlers after message is added to DOM
        setTimeout(() => {
            document.querySelectorAll('.product-reference-link').forEach((link, index) => {
                link.addEventListener('click', () => {
                    document.querySelectorAll('.ai_chat-agent-bubble-product').forEach(ref => {
                        ref.classList.remove('highlighted');
                    });
                    
                    const productElements = document.querySelectorAll('.ai_chat-agent-bubble-product');
                    const productElement = productElements[index];
                    if (productElement) {
                        productElement.classList.add('highlighted');
                        productElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                });
            });
        }, 0);
        
        // Return a single structure with the message and products
        return `
            <div class="ai_chat-agent-bubble">
                <div class="text-size-regular op_50">workstatt KI-Berater · vor weniger als 1 Minute</div>
                <div class="text-size-regular">${this.parseMarkdown(formattedMessage)}</div>
            </div>
            <div class="product-list">${productsHTML}</div>
        `;
    },

    parseMarkdown(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^- /gm, '• ')
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

// Update the style with new colors and spacing
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .message-fade-in {
        animation: fadeIn 0.3s ease forwards;
        opacity: 0;
    }

    .product-reference-link {
        color: #ff6a6a;
        cursor: pointer;
        transition: opacity 0.2s ease;
    }

    .product-reference-link:hover {
        opacity: 0.7;
    }
    .ai_chat-agent-bubble-product.highlighted {
        background-color: rgba(255, 106, 106, 0.1);
        transition: background-color 0.2s ease;
    }

    .product-list {
        gap: 0.5rem;
        display: flex;
        flex-direction: column;
    }
`;
document.head.appendChild(style);

