(function() {
    "use strict";

    // DOM refs
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const voiceBtn = document.getElementById('voiceBtn');

    // State
    let sessionId = localStorage.getItem('gamer_session') || 'session_' + Date.now();
    localStorage.setItem('gamer_session', sessionId);
    let isListening = false;
    let recognition = null;
    let isProcessing = false;

    // Speech recognition setup
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = function() {
            isListening = true;
            voiceBtn.classList.add('listening');
            voiceBtn.innerHTML = '<i class="fas fa-circle" style="color: #ffaa66; font-size: 1.2rem;"></i>';
        };

        recognition.onend = function() {
            isListening = false;
            voiceBtn.classList.remove('listening');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        };

        recognition.onresult = function(event) {
            const last = event.results.length - 1;
            const transcript = event.results[last][0].transcript.trim();
            if (transcript) {
                appendMessage(`[voice] ${transcript}`, 'user');
                sendToBackend(transcript);
            }
        };

        recognition.onerror = function(event) {
            console.warn('Speech error:', event.error);
            isListening = false;
            voiceBtn.classList.remove('listening');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            appendMessage('⚡ Voice error — try typing, Sir.', 'bot');
        };
    } else {
        voiceBtn.style.opacity = '0.4';
        voiceBtn.title = 'Voice not supported';
    }

    // Append message
    function appendMessage(text, sender = 'bot', isCode = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;

        if (sender === 'bot') {
            const icon = document.createElement('i');
            icon.className = 'fas fa-robot';
            msgDiv.appendChild(icon);
            msgDiv.appendChild(document.createTextNode(' '));
        }

        if (isCode) {
            const codeWrapper = document.createElement('div');
            codeWrapper.className = 'code-block';
            codeWrapper.textContent = text;
            msgDiv.appendChild(codeWrapper);
        } else {
            msgDiv.innerHTML += text;
        }

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Typing indicator
    function showTyping() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeTyping() {
        const typing = document.getElementById('typingIndicator');
        if (typing) typing.remove();
    }

    // Send to Flask backend
    async function sendToBackend(message) {
        if (isProcessing) return;
        isProcessing = true;
        showTyping();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    session_id: sessionId
                })
            });

            const data = await response.json();
            removeTyping();

            if (data.response.includes('<code>')) {
                const parts = data.response.split('<code>');
                const textPart = parts[0];
                const codePart = parts[1].replace('</code>', '');
                appendMessage(textPart, 'bot');
                setTimeout(() => {
                    appendMessage(codePart, 'bot', true);
                }, 300);
            } else {
                appendMessage(data.response, 'bot');
            }

        } catch (error) {
            removeTyping();
            appendMessage('⚠️ Error connecting to server. Make sure Flask is running!', 'bot');
            console.error('Error:', error);
        }

        isProcessing = false;
    }

    // Send message from input
    function sendMessage() {
        const text = userInput.value.trim();
        if (!text || isProcessing) return;
        appendMessage(text, 'user');
        sendToBackend(text);
        userInput.value = '';
        userInput.focus();
    }

    // Voice button toggle
    function toggleVoice() {
        if (!recognition) {
            appendMessage('⚠️ Voice not supported in this browser. Please type.', 'bot');
            return;
        }
        if (isListening) {
            recognition.stop();
            return;
        }
        try {
            recognition.start();
        } catch (e) {
            console.warn(e);
            appendMessage('⚡ Voice error — try again.', 'bot');
        }
    }

    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    voiceBtn.addEventListener('click', toggleVoice);

    userInput.focus();

    console.log('GAMER · connected to Flask backend');
    console.log('Session ID:', sessionId);
})();