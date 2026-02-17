(function () {
  'use strict';

  const script = document.currentScript;
  const projectId = script?.getAttribute('data-project-id');
  if (!projectId) return;

  const API_BASE = script.src.replace('/embed/chat-widget.js', '');
  const WS_BASE = API_BASE.replace(/^http/, 'ws');

  let visitorId = localStorage.getItem('specra-visitor-id');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem('specra-visitor-id', visitorId);
  }

  let conversationId = localStorage.getItem(`specra-conv-${projectId}`);
  let ws = null;
  let isOpen = false;
  let hasIntro = !conversationId;

  function init() {
    const host = document.createElement('div');
    host.id = 'specra-chat-host';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .sc-toggle {
        position: fixed; bottom: 24px; right: 24px; z-index: 99999;
        width: 56px; height: 56px; border-radius: 50%;
        background: #7c3aed; color: #fff; border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: transform 0.2s;
      }
      .sc-toggle:hover { transform: scale(1.05); }
      .sc-toggle svg { width: 24px; height: 24px; }
      .sc-panel {
        position: fixed; bottom: 92px; right: 24px; z-index: 99999;
        width: 380px; max-width: calc(100vw - 48px); height: 500px; max-height: calc(100vh - 120px);
        background: #fff; border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        display: none; flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
      }
      .sc-panel.open { display: flex; }
      .sc-header {
        padding: 16px 20px; background: #7c3aed; color: #fff;
        font-size: 16px; font-weight: 600; flex-shrink: 0;
      }
      .sc-messages {
        flex: 1; overflow-y: auto; padding: 16px;
        display: flex; flex-direction: column; gap: 8px;
      }
      .sc-msg {
        max-width: 80%; padding: 8px 12px; border-radius: 12px;
        font-size: 14px; line-height: 1.4; word-wrap: break-word;
      }
      .sc-msg.visitor {
        align-self: flex-end; background: #7c3aed; color: #fff;
        border-bottom-right-radius: 4px;
      }
      .sc-msg.owner {
        align-self: flex-start; background: #f3f4f6; color: #111827;
        border-bottom-left-radius: 4px;
      }
      .sc-intro { padding: 16px; flex-shrink: 0; }
      .sc-intro-field { margin-bottom: 10px; }
      .sc-intro-field label {
        display: block; font-size: 13px; font-weight: 500;
        color: #374151; margin-bottom: 3px;
      }
      .sc-intro-field input {
        width: 100%; padding: 7px 10px; border: 1px solid #d1d5db;
        border-radius: 6px; font-size: 14px; outline: none;
      }
      .sc-intro-field input:focus { border-color: #7c3aed; }
      .sc-input-area {
        display: flex; gap: 8px; padding: 12px 16px;
        border-top: 1px solid #e5e7eb; flex-shrink: 0;
      }
      .sc-input {
        flex: 1; padding: 8px 12px; border: 1px solid #d1d5db;
        border-radius: 8px; font-size: 14px; outline: none;
        font-family: inherit;
      }
      .sc-input:focus { border-color: #7c3aed; }
      .sc-send {
        padding: 8px 16px; background: #7c3aed; color: #fff;
        border: none; border-radius: 8px; font-size: 14px;
        cursor: pointer; font-weight: 500;
      }
      .sc-send:hover { background: #6d28d9; }
      .sc-send:disabled { opacity: 0.6; cursor: not-allowed; }
      .sc-empty { color: #9ca3af; text-align: center; padding: 40px 20px; font-size: 14px; }
    `;
    shadow.appendChild(style);

    const container = document.createElement('div');
    shadow.appendChild(container);

    // Toggle
    const toggle = document.createElement('button');
    toggle.className = 'sc-toggle';
    toggle.setAttribute('aria-label', 'Chat with us');
    toggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>';
    container.appendChild(toggle);

    // Panel
    const panel = document.createElement('div');
    panel.className = 'sc-panel';
    container.appendChild(panel);

    const header = document.createElement('div');
    header.className = 'sc-header';
    header.textContent = 'Chat with us';
    panel.appendChild(header);

    const messagesEl = document.createElement('div');
    messagesEl.className = 'sc-messages';
    panel.appendChild(messagesEl);

    // Intro form (shown if no existing conversation)
    let introEl = null;
    if (hasIntro) {
      introEl = document.createElement('div');
      introEl.className = 'sc-intro';
      introEl.innerHTML = `
        <div class="sc-intro-field">
          <label>Name (optional)</label>
          <input type="text" id="sc-intro-name" />
        </div>
        <div class="sc-intro-field">
          <label>Email (optional)</label>
          <input type="email" id="sc-intro-email" />
        </div>
      `;
      panel.appendChild(introEl);
    }

    // Input area
    const inputArea = document.createElement('div');
    inputArea.className = 'sc-input-area';
    inputArea.innerHTML = `
      <input type="text" class="sc-input" placeholder="Type a message..." />
      <button class="sc-send">Send</button>
    `;
    panel.appendChild(inputArea);

    const input = shadow.querySelector('.sc-input');
    const sendBtn = shadow.querySelector('.sc-send');

    toggle.addEventListener('click', () => {
      isOpen = !isOpen;
      panel.classList.toggle('open', isOpen);
      if (isOpen && conversationId) {
        loadMessages();
        connectWs();
      }
    });

    function addMessage(content, type) {
      const msg = document.createElement('div');
      msg.className = `sc-msg ${type}`;
      msg.textContent = content;
      messagesEl.appendChild(msg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    async function createConversation() {
      const name = introEl ? shadow.getElementById('sc-intro-name')?.value : undefined;
      const email = introEl ? shadow.getElementById('sc-intro-email')?.value : undefined;

      const res = await fetch(`${API_BASE}/api/embed/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, visitorId, visitorName: name, visitorEmail: email }),
      });
      const data = await res.json();
      conversationId = data.conversation.id;
      localStorage.setItem(`specra-conv-${projectId}`, conversationId);

      if (introEl) {
        introEl.remove();
        introEl = null;
      }

      connectWs();
    }

    async function sendMessage() {
      const content = input.value.trim();
      if (!content) return;

      input.value = '';

      if (!conversationId) {
        await createConversation();
      }

      addMessage(content, 'visitor');

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'message', conversationId, content }));
      }
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    function connectWs() {
      if (ws && ws.readyState === WebSocket.OPEN) return;
      if (!conversationId) return;

      try {
        ws = new WebSocket(
          `${WS_BASE}/ws/chat/visitor?projectId=${encodeURIComponent(projectId)}&visitorId=${encodeURIComponent(visitorId)}&conversationId=${encodeURIComponent(conversationId)}`
        );

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'message' && data.senderType === 'OWNER') {
              addMessage(data.content, 'owner');
            }
          } catch {}
        };

        ws.onclose = () => {
          setTimeout(() => {
            if (isOpen) connectWs();
          }, 3000);
        };

        // Heartbeat
        const heartbeat = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          } else {
            clearInterval(heartbeat);
          }
        }, 30000);
      } catch {}
    }

    async function loadMessages() {
      if (!conversationId) {
        messagesEl.innerHTML = '<div class="sc-empty">Send a message to start the conversation</div>';
        return;
      }

      try {
        const corsUrl = `${API_BASE}/api/embed/chat/messages?conversationId=${encodeURIComponent(conversationId)}&visitorId=${encodeURIComponent(visitorId)}`;
        const res = await fetch(corsUrl);
        if (!res.ok) return;
        const data = await res.json();
        messagesEl.innerHTML = '';
        if (data.messages && data.messages.length > 0) {
          data.messages.forEach((m) => {
            addMessage(m.content, m.senderType === 'VISITOR' ? 'visitor' : 'owner');
          });
        } else {
          messagesEl.innerHTML = '<div class="sc-empty">Send a message to start the conversation</div>';
        }
      } catch {}
    }

    // Check if chat is enabled
    fetch(`${API_BASE}/api/embed/chat?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => r.json())
      .then((config) => {
        if (!config.enabled) {
          host.remove();
        }
      })
      .catch(() => {
        host.remove();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
