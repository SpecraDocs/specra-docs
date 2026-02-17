<script lang="ts">
  import { MessageCircle, Send, XCircle } from 'lucide-svelte';

  interface Conversation {
    id: string;
    projectId: string;
    projectName: string;
    visitorId: string;
    visitorName: string | null;
    visitorEmail: string | null;
    status: 'OPEN' | 'CLOSED';
    messageCount: number;
    lastMessage: string | null;
    lastMessageAt: string | null;
    updatedAt: string;
  }

  interface Message {
    id: string;
    conversationId: string;
    senderType: 'VISITOR' | 'OWNER';
    senderId: string | null;
    content: string;
    createdAt: string;
  }

  let { data } = $props();

  let conversations = $state<Conversation[]>(data.conversations);
  let selectedConv = $state<string | null>(null);
  let messages = $state<Message[]>([]);
  let messageInput = $state('');
  let loadingMessages = $state(false);
  let sending = $state(false);
  let messagesContainer = $state<HTMLDivElement | undefined>(undefined);

  const selectedConversation = $derived(conversations.find((c) => c.id === selectedConv));

  async function selectConversation(convId: string) {
    selectedConv = convId;
    loadingMessages = true;

    const res = await fetch(`/api/chat/conversations/${convId}/messages`);
    if (res.ok) {
      const data = await res.json();
      messages = data.messages;
    }
    loadingMessages = false;

    // Scroll to bottom
    setTimeout(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 50);

    // Start polling for new messages
    startPolling(convId);
  }

  let pollTimer: ReturnType<typeof setInterval> | null = null;

  function startPolling(convId: string) {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      if (selectedConv !== convId) {
        if (pollTimer) clearInterval(pollTimer);
        return;
      }
      const res = await fetch(`/api/chat/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages.length > messages.length) {
          messages = data.messages;
          setTimeout(() => {
            if (messagesContainer) {
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          }, 50);
        }
      }
    }, 3000);
  }

  async function sendMessage() {
    if (!messageInput.trim() || !selectedConv) return;
    sending = true;

    const content = messageInput.trim();
    messageInput = '';

    const res = await fetch(`/api/chat/conversations/${selectedConv}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (res.ok) {
      const data = await res.json();
      messages = [...messages, data.message];

      // Update last message in conversation list
      const idx = conversations.findIndex((c) => c.id === selectedConv);
      if (idx >= 0) {
        conversations[idx] = {
          ...conversations[idx],
          lastMessage: content,
          lastMessageAt: new Date().toISOString(),
        };
      }

      setTimeout(() => {
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 50);
    }
    sending = false;
  }

  async function closeConversation(convId: string) {
    const res = await fetch(`/api/chat/conversations/${convId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CLOSED' }),
    });
    if (res.ok) {
      const idx = conversations.findIndex((c) => c.id === convId);
      if (idx >= 0) {
        conversations[idx] = { ...conversations[idx], status: 'CLOSED' };
      }
    }
  }

  function formatTime(dateStr: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  }
</script>

<div class="space-y-6">
  <h1 class="text-2xl font-bold text-foreground">Chat</h1>

  {#if conversations.length === 0}
    <div class="rounded-lg border border-border bg-card p-12 text-center">
      <MessageCircle class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h2 class="text-lg font-semibold text-foreground mb-2">No conversations yet</h2>
      <p class="text-sm text-muted-foreground max-w-md mx-auto">
        When visitors start chatting on your deployed doc sites, their conversations will appear here.
        Enable chat in your project settings first.
      </p>
    </div>
  {:else}
    <div class="flex gap-6 h-[calc(100vh-200px)] min-h-[400px]">
      <!-- Conversation list -->
      <div class="w-80 flex-shrink-0 rounded-lg border border-border bg-card overflow-y-auto">
        {#each conversations as conv (conv.id)}
          <button
            onclick={() => selectConversation(conv.id)}
            class="w-full text-left p-4 border-b border-border/50 hover:bg-accent/50 transition-colors {selectedConv === conv.id ? 'bg-accent' : ''}"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium text-foreground truncate">
                {conv.visitorName || conv.visitorId.slice(0, 8)}
              </span>
              <span class="text-xs text-muted-foreground">
                {formatTime(conv.lastMessageAt || conv.updatedAt)}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <p class="text-xs text-muted-foreground truncate flex-1">
                {conv.lastMessage || 'No messages'}
              </p>
              <span class="ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium {conv.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                {conv.status}
              </span>
            </div>
            <p class="text-[10px] text-muted-foreground mt-1">{conv.projectName}</p>
          </button>
        {/each}
      </div>

      <!-- Message thread -->
      <div class="flex-1 rounded-lg border border-border bg-card flex flex-col">
        {#if !selectedConv}
          <div class="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a conversation to view messages
          </div>
        {:else if loadingMessages}
          <div class="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Loading messages...
          </div>
        {:else}
          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <span class="text-sm font-medium text-foreground">
                {selectedConversation?.visitorName || selectedConversation?.visitorId.slice(0, 8)}
              </span>
              {#if selectedConversation?.visitorEmail}
                <span class="text-xs text-muted-foreground ml-2">{selectedConversation.visitorEmail}</span>
              {/if}
            </div>
            {#if selectedConversation?.status === 'OPEN'}
              <button
                onclick={() => selectedConv && closeConversation(selectedConv)}
                class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <XCircle class="h-3.5 w-3.5" />
                Close
              </button>
            {/if}
          </div>

          <!-- Messages -->
          <div bind:this={messagesContainer} class="flex-1 overflow-y-auto p-4 space-y-3">
            {#each messages as msg (msg.id)}
              <div class="flex {msg.senderType === 'OWNER' ? 'justify-end' : 'justify-start'}">
                <div class="max-w-[70%] rounded-lg px-3 py-2 text-sm {msg.senderType === 'OWNER'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-foreground'}">
                  {msg.content}
                  <div class="text-[10px] opacity-60 mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            {/each}
          </div>

          <!-- Reply input -->
          {#if selectedConversation?.status === 'OPEN'}
            <div class="border-t border-border p-3 flex gap-2">
              <input
                type="text"
                bind:value={messageInput}
                onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type a reply..."
                class="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
              <button
                onclick={sendMessage}
                disabled={sending || !messageInput.trim()}
                class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Send class="h-4 w-4" />
              </button>
            </div>
          {:else}
            <div class="border-t border-border p-3 text-center text-sm text-muted-foreground">
              This conversation is closed
            </div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}
</div>
