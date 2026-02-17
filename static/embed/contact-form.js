(function () {
  'use strict';

  const script = document.currentScript;
  const projectId = script?.getAttribute('data-project-id');
  if (!projectId) return;

  const API_BASE = script.src.replace('/embed/contact-form.js', '');

  function init() {
    const host = document.createElement('div');
    host.id = 'specra-contact-form-host';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .specra-cf-toggle {
        position: fixed; bottom: 24px; right: 24px; z-index: 99999;
        width: 56px; height: 56px; border-radius: 50%;
        background: #2563eb; color: #fff; border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: transform 0.2s, background 0.2s;
      }
      .specra-cf-toggle:hover { transform: scale(1.05); background: #1d4ed8; }
      .specra-cf-toggle svg { width: 24px; height: 24px; }
      .specra-cf-panel {
        position: fixed; bottom: 92px; right: 24px; z-index: 99999;
        width: 380px; max-width: calc(100vw - 48px);
        background: #fff; border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        display: none; flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
      }
      .specra-cf-panel.open { display: flex; }
      .specra-cf-header {
        padding: 16px 20px; background: #2563eb; color: #fff;
        font-size: 16px; font-weight: 600;
      }
      .specra-cf-body { padding: 20px; }
      .specra-cf-field { margin-bottom: 14px; }
      .specra-cf-field label {
        display: block; font-size: 13px; font-weight: 500;
        color: #374151; margin-bottom: 4px;
      }
      .specra-cf-field input,
      .specra-cf-field textarea {
        width: 100%; padding: 8px 12px; border: 1px solid #d1d5db;
        border-radius: 6px; font-size: 14px; color: #111827;
        outline: none; transition: border-color 0.2s;
        font-family: inherit;
      }
      .specra-cf-field input:focus,
      .specra-cf-field textarea:focus { border-color: #2563eb; }
      .specra-cf-field textarea { resize: vertical; min-height: 80px; }
      .specra-cf-submit {
        width: 100%; padding: 10px; background: #2563eb; color: #fff;
        border: none; border-radius: 6px; font-size: 14px; font-weight: 500;
        cursor: pointer; transition: background 0.2s;
      }
      .specra-cf-submit:hover { background: #1d4ed8; }
      .specra-cf-submit:disabled { opacity: 0.6; cursor: not-allowed; }
      .specra-cf-msg { padding: 12px; text-align: center; font-size: 14px; }
      .specra-cf-msg.success { color: #059669; }
      .specra-cf-msg.error { color: #dc2626; }
    `;
    shadow.appendChild(style);

    const container = document.createElement('div');
    shadow.appendChild(container);

    // Toggle button
    const toggle = document.createElement('button');
    toggle.className = 'specra-cf-toggle';
    toggle.setAttribute('aria-label', 'Contact us');
    toggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>';
    container.appendChild(toggle);

    // Panel
    const panel = document.createElement('div');
    panel.className = 'specra-cf-panel';
    panel.innerHTML = `
      <div class="specra-cf-header">Contact Us</div>
      <div class="specra-cf-body">
        <form id="specra-cf-form">
          <div class="specra-cf-field">
            <label for="specra-cf-name">Name</label>
            <input type="text" id="specra-cf-name" name="name" required />
          </div>
          <div class="specra-cf-field">
            <label for="specra-cf-email">Email</label>
            <input type="email" id="specra-cf-email" name="email" required />
          </div>
          <div class="specra-cf-field">
            <label for="specra-cf-message">Message</label>
            <textarea id="specra-cf-message" name="message" required></textarea>
          </div>
          <button type="submit" class="specra-cf-submit">Send Message</button>
        </form>
        <div class="specra-cf-msg" style="display:none;"></div>
      </div>
    `;
    container.appendChild(panel);

    let isOpen = false;
    toggle.addEventListener('click', () => {
      isOpen = !isOpen;
      panel.classList.toggle('open', isOpen);
    });

    // Fetch config and set up form
    fetch(`${API_BASE}/api/embed/contact-form?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => r.json())
      .then((config) => {
        if (!config.enabled) {
          host.remove();
          return;
        }

        const form = shadow.getElementById('specra-cf-form');
        const msgEl = shadow.querySelector('.specra-cf-msg');

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = shadow.querySelector('.specra-cf-submit');
          btn.disabled = true;
          btn.textContent = 'Sending...';
          msgEl.style.display = 'none';

          const formData = new FormData(form);
          formData.append('access_key', config.accessKey);

          try {
            const res = await fetch('https://api.web3forms.com/submit', {
              method: 'POST',
              body: formData,
            });
            const data = await res.json();

            if (data.success) {
              form.style.display = 'none';
              msgEl.className = 'specra-cf-msg success';
              msgEl.textContent = 'Message sent successfully!';
              msgEl.style.display = 'block';
              setTimeout(() => {
                form.reset();
                form.style.display = 'block';
                msgEl.style.display = 'none';
                isOpen = false;
                panel.classList.remove('open');
              }, 3000);
            } else {
              throw new Error(data.message || 'Failed to send');
            }
          } catch (err) {
            msgEl.className = 'specra-cf-msg error';
            msgEl.textContent = 'Failed to send message. Please try again.';
            msgEl.style.display = 'block';
          } finally {
            btn.disabled = false;
            btn.textContent = 'Send Message';
          }
        });
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
