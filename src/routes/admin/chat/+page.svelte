<script lang="ts">
  import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-svelte';
  import { onMount } from 'svelte';

  interface Conversation {
    id: string;
    projectId: string;
    visitorId: string;
    visitorName: string | null;
    visitorEmail: string | null;
    status: 'OPEN' | 'CLOSED';
    updatedAt: string;
    project: {
      id: string;
      name: string;
      userId: string;
      user: { name: string | null; email: string };
    };
    messages: Array<{
      id: string;
      content: string;
      senderType: 'VISITOR' | 'OWNER';
      createdAt: string;
    }>;
    _count: { messages: number };
  }

  interface ExpandedConversation {
    messages: Array<{
      id: string;
      content: string;
      senderType: 'VISITOR' | 'OWNER';
      senderId: string | null;
      createdAt: string;
    }>;
  }

  let conversations = $state<Conversation[]>([]);
  let loading = $state(true);
  let expandedId = $state<string | null>(null);
  let expandedMessages = $state<ExpandedConversation['messages']>([]);
  let loadingExpanded = $state(false);

  onMount(async () => {
    const res = await fetch('/api/admin/chat');
    if (res.ok) {
      const data = await res.json();
      conversations = data.conversations;
    }
    loading = false;
  });

  async function toggleExpand(convId: string) {
    if (expandedId === convId) {
      expandedId = null;
      expandedMessages = [];
      return;
    }

    expandedId = convId;
    loadingExpanded = true;

    const res = await fetch(`/api/admin/chat/${convId}`);
    if (res.ok) {
      const data = await res.json();
      expandedMessages = data.conversation.messages;
    }
    loadingExpanded = false;
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleString();
  }
</script>

<div class="space-y-6">
  <h1 class="text-2xl font-bold text-foreground">All Chat Conversations</h1>
  <p class="text-sm text-muted-foreground">
    Read-only view of all chat conversations across all users and projects.
  </p>

  {#if loading}
    <div class="text-muted-foreground">Loading...</div>
  {:else if conversations.length === 0}
    <div class="rounded-lg border border-border bg-card p-12 text-center">
      <MessageCircle class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h2 class="text-lg font-semibold text-foreground mb-2">No conversations</h2>
      <p class="text-sm text-muted-foreground">No chat conversations have been created yet.</p>
    </div>
  {:else}
    <div class="rounded-lg border border-border bg-card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-accent/30">
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Visitor</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Project</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Owner</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Messages</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Last Activity</th>
            <th class="py-3 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {#each conversations as conv (conv.id)}
            <tr class="border-b border-border/50 hover:bg-accent/20">
              <td class="py-3 px-4">
                <div class="text-foreground">{conv.visitorName || conv.visitorId.slice(0, 8)}</div>
                {#if conv.visitorEmail}
                  <div class="text-xs text-muted-foreground">{conv.visitorEmail}</div>
                {/if}
              </td>
              <td class="py-3 px-4 text-foreground">{conv.project.name}</td>
              <td class="py-3 px-4">
                <div class="text-foreground">{conv.project.user.name || 'Unknown'}</div>
                <div class="text-xs text-muted-foreground">{conv.project.user.email}</div>
              </td>
              <td class="py-3 px-4">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {conv.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                  {conv.status}
                </span>
              </td>
              <td class="py-3 px-4 text-foreground">{conv._count.messages}</td>
              <td class="py-3 px-4 text-muted-foreground text-xs">{formatTime(conv.updatedAt)}</td>
              <td class="py-3 px-4">
                <button
                  onclick={() => toggleExpand(conv.id)}
                  class="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {#if expandedId === conv.id}
                    <ChevronUp class="h-4 w-4" />
                  {:else}
                    <ChevronDown class="h-4 w-4" />
                  {/if}
                </button>
              </td>
            </tr>
            {#if expandedId === conv.id}
              <tr>
                <td colspan="7" class="px-4 py-4 bg-accent/10">
                  {#if loadingExpanded}
                    <div class="text-sm text-muted-foreground">Loading messages...</div>
                  {:else}
                    <div class="space-y-2 max-h-80 overflow-y-auto">
                      {#each expandedMessages as msg (msg.id)}
                        <div class="flex gap-3 text-sm">
                          <span class="text-xs text-muted-foreground w-16 shrink-0 pt-0.5">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span class="font-medium w-16 shrink-0 {msg.senderType === 'VISITOR' ? 'text-blue-600' : 'text-green-600'}">
                            {msg.senderType === 'VISITOR' ? 'Visitor' : 'Owner'}
                          </span>
                          <span class="text-foreground">{msg.content}</span>
                        </div>
                      {/each}
                      {#if expandedMessages.length === 0}
                        <div class="text-sm text-muted-foreground">No messages in this conversation.</div>
                      {/if}
                    </div>
                  {/if}
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
