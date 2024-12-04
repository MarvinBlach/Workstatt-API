// First function - Check agent availability
function checkAgentAvailability() {
    const openButton = document.querySelector('[fs-modal-element="open-20"]');
    const aiInputHolder = document.querySelector('.ai_input-holder');

    if (!openButton || !aiInputHolder) {
        console.error('Required elements not found');
        return;
    }

    openButton.addEventListener('click', async () => {
        try {
            const response = await fetch('https://assistant.workstatt.cloud/agent/available', {
                method: 'GET',
                headers: {
                    'accept': 'application/json'
                }
            });
            const data = await response.json();

            if (data.success === true) {
                aiInputHolder.classList.remove('is-disabled');
                // Initialize chat functionality when agent is available
                initializeChat();
            } else {
                console.log('Agent not available');
                return;
            }
        } catch (error) {
            console.error('Error checking agent availability:', error);
            return;
        }
    });
}

function initializeChat() {
    const aiInput = document.querySelector('[hs-ai-input]');
    const submitButton = document.querySelector('[hs-api-submit]');
    const chatHolder = document.querySelector('.ai_chat');
    const form = document.querySelector('.w-form');
    const searchQuestions = document.querySelectorAll('[li-ai-copy]');
    const aiFragenElement = document.querySelector('[ai-fragen]');

    let messageHistory = [];

    if (!aiInput || !submitButton || !chatHolder || !form) {
        console.error('Chat elements not found');
        return;
    }

    // Set up search questions handler
    setupSearchQuestions(searchQuestions, aiInput, aiFragenElement);

    // Prevent form default submission
    form.addEventListener('submit', (e) => e.preventDefault());

    function scrollToBottom() {
        chatHolder.scrollTop = chatHolder.scrollHeight;
    }

    function updateTimestamps() {
        document.querySelectorAll('[hs-ai-date-user], [hs-ai-date-agent]').forEach(span => {
            span.textContent = 'vor weniger als 1 Minute';
        });
    }

    function parseMarkdown(text) {
        // Bold text
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Bullet points
        text = text.replace(/^- /gm, '• ');
        
        // Convert newlines to <br> tags
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }

    async function generateSessionId() {
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        const hashBuffer = await crypto.subtle.digest('SHA-256', randomBytes);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function addLoadingMessage() {
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
        chatHolder.insertAdjacentHTML('beforeend', loadingHTML);
        scrollToBottom();
    }

    function parseResponse(response) {
        const messages = [];
        let currentMessage = '';
        
        const parts = response.split(/({.*?})/g);
        
        parts.forEach(part => {
            if (part.trim().startsWith('{')) {
                if (currentMessage.trim()) {
                    messages.push(currentMessage.trim());
                }
                messages.push(part);
                currentMessage = '';
            } else {
                currentMessage += part;
            }
        });
        
        if (currentMessage.trim()) {
            messages.push(currentMessage.trim());
        }

        return messages;
    }

    submitButton.addEventListener('click', async (e) => {
        e.preventDefault();
        const question = aiInput.value.trim();
        if (!question) return;

        if (aiFragenElement) {
            aiFragenElement.style.display = 'none';
        }

        const sessionId = await generateSessionId();

        messageHistory.push({
            content: question,
            role: "user"
        });

        const userMessageHTML = `
            <div hs-api-user-question="" class="ai_chat-human-bubble-holder">
                <div class="ai_chat-human-bubble">
                    <div class="text-size-regular op_50">Du · vor weniger als 1 Minute</div>
                    <div class="text-size-regular">${question}</div>
                </div>
                <img src="https://cdn.prod.website-files.com/66e15ba66b890988dcb296a0/6750792ac71b97d4d6a54dad_workstatt-human-polygon.svg" loading="lazy" alt="" class="ai_chat-human-poly">
            </div>`;
        chatHolder.insertAdjacentHTML('beforeend', userMessageHTML);
        scrollToBottom();

        aiInput.value = '';
        addLoadingMessage();

        try {
            const response = await fetch('https://assistant.workstatt.cloud/agent', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    messages: messageHistory
                })
            });

            const answer = await response.text();
            console.log('Raw API Response:', answer);
            
            chatHolder.lastElementChild.remove();

            const messages = parseResponse(answer);
            console.log('Parsed Messages:', messages);
            
            messageHistory.push({
                content: answer,
                role: "assistant"
            });
            
            messages.forEach((message, index) => {
                let displayText = message;
                if (message.trim().startsWith('{')) {
                    try {
                        const jsonData = JSON.parse(message);
                        displayText = `Product ID: ${jsonData.id}`;
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                    }
                } else {
                    // Apply Markdown parsing to non-JSON messages
                    displayText = parseMarkdown(displayText);
                }

                const messageHTML = `
                    <div hs-api-agent-answer-holder="" class="ai_chat-agent-bubble-holder">
                        <div hs-api-agent-answer="" class="ai_chat-agent-bubble">
                            ${index === 0 ? `<div class="text-size-regular op_50">workstatt KI-Berater · vor weniger als 1 Minute</div>` : ''}
                            <div class="text-size-regular">${displayText}</div>
                        </div>
                    </div>`;
                
                chatHolder.insertAdjacentHTML('beforeend', messageHTML);
                scrollToBottom();
            });

        } catch (error) {
            console.error('Error sending message:', error);
            chatHolder.lastElementChild.remove();
        }
    });
}

// Separate function to handle search questions
function setupSearchQuestions(searchQuestions, inputElement, aiFragenElement) {
    if (!searchQuestions || !inputElement) return;
    
    searchQuestions.forEach(question => {
        question.addEventListener('click', (e) => {
            e.preventDefault();
            const inputHolder = inputElement.closest('[hs-ai-input-holder]');
            
            if (!inputHolder?.classList.contains('is-disabled')) {
                inputElement.value = question.textContent;
                inputElement.focus();
                
                if (aiFragenElement) {
                    aiFragenElement.style.display = 'none';
                }
            }
        });
    });
}

// Initialize the availability check when DOM is loaded
document.addEventListener('DOMContentLoaded', checkAgentAvailability);
