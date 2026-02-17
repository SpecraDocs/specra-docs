<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { ArrowLeft, Trash2, ExternalLink } from 'lucide-svelte';

  interface Project {
    id: string;
    name: string;
    slug: string;
    subdomain: string;
    customDomain: string | null;
    githubRepo: string | null;
    githubBranch: string | null;
    web3formsKey: string | null;
    chatEnabled: boolean;
  }

  let { data } = $props();

  const projectId = $derived($page.params.projectId);
  const planSlug = $derived(data.planSlug);

  let project = $state<Project | null>(null);
  let domain = $state('');
  let domainError = $state('');
  let domainSuccess = $state('');
  let verifying = $state(false);
  let deleting = $state(false);

  // Web3Forms state
  let web3formsKey = $state('');
  let web3formsSaving = $state(false);
  let web3formsMsg = $state('');

  // Chat state
  let chatEnabled = $state(false);
  let chatSaving = $state(false);
  let chatMsg = $state('');

  const canContactForm = $derived(
    planSlug === 'starter' || planSlug === 'pro' || planSlug === 'enterprise' || planSlug === 'admin'
  );

  const canChat = $derived(
    planSlug === 'pro' || planSlug === 'enterprise' || planSlug === 'admin'
  );

  $effect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        project = data;
        domain = data.customDomain || '';
        web3formsKey = data.web3formsKey || '';
        chatEnabled = data.chatEnabled || false;
      });
  });

  async function handleSetDomain(e: SubmitEvent) {
    e.preventDefault();
    domainError = '';
    domainSuccess = '';

    const res = await fetch(`/api/projects/${projectId}/domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    });

    if (!res.ok) {
      const data = await res.json();
      domainError = data.error;
      return;
    }

    const data = await res.json();
    domainSuccess = `Domain set. Add a CNAME record: ${data.dnsInstructions.name} \u2192 ${data.dnsInstructions.value}`;
    project = data.project;
  }

  async function handleVerifyDomain() {
    verifying = true;
    domainError = '';
    domainSuccess = '';

    const res = await fetch(`/api/projects/${projectId}/domain/verify`, {
      method: 'POST',
    });
    const data = await res.json();

    if (data.verified) {
      domainSuccess = 'Domain verified and active!';
    } else {
      domainError = data.error || 'DNS verification failed';
    }
    verifying = false;
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this project? This will stop all running deployments and cannot be undone.')) {
      return;
    }
    deleting = true;
    const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    if (res.ok) {
      goto('/dashboard/projects');
    }
    deleting = false;
  }

  async function disconnectGithub() {
    await fetch(`/api/projects/${projectId}/github`, {
      method: 'DELETE',
    });
    if (project) {
      project = { ...project, githubRepo: null, githubBranch: null };
    }
  }

  async function handleSaveWeb3Forms(e: SubmitEvent) {
    e.preventDefault();
    web3formsSaving = true;
    web3formsMsg = '';

    const res = await fetch(`/api/projects/${projectId}/web3forms`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessKey: web3formsKey }),
    });

    if (res.ok) {
      const data = await res.json();
      if (project) project = { ...project, web3formsKey: data.web3formsKey };
      web3formsMsg = web3formsKey ? 'Contact form key saved!' : 'Contact form key removed.';
    } else {
      const data = await res.json();
      web3formsMsg = data.error || 'Failed to save';
    }
    web3formsSaving = false;
  }

  async function handleToggleChat() {
    chatSaving = true;
    chatMsg = '';

    const res = await fetch(`/api/projects/${projectId}/chat`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !chatEnabled }),
    });

    if (res.ok) {
      const data = await res.json();
      chatEnabled = data.chatEnabled;
      if (project) project = { ...project, chatEnabled: data.chatEnabled };
      chatMsg = chatEnabled ? 'Live chat enabled!' : 'Live chat disabled.';
    } else {
      const data = await res.json();
      chatMsg = data.error || 'Failed to update';
    }
    chatSaving = false;
  }
</script>

{#if !project}
  <div class="text-muted-foreground">Loading...</div>
{:else}
  <div class="space-y-8 max-w-2xl">
    <div>
      <a
        href="/dashboard/projects/{projectId}"
        class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <ArrowLeft class="h-3 w-3" />
        {project.name}
      </a>
      <h1 class="text-2xl font-bold text-foreground">
        Project Settings
      </h1>
    </div>

    <!-- Custom Domain -->
    <div class="rounded-lg border border-border bg-card p-6 space-y-4">
      <h2 class="text-lg font-semibold text-foreground">Custom Domain</h2>
      <p class="text-sm text-muted-foreground">
        Point your own domain to this project. Add a CNAME record pointing to
        <code class="bg-accent px-1 py-0.5 rounded text-xs">
          docs.specra.dev
        </code>
      </p>
      <form onsubmit={handleSetDomain} class="flex gap-2">
        <input
          type="text"
          bind:value={domain}
          placeholder="docs.example.com"
          class="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
        <button
          type="submit"
          class="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
        >
          Set Domain
        </button>
      </form>
      {#if project.customDomain}
        <button
          onclick={handleVerifyDomain}
          disabled={verifying}
          class="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {verifying ? 'Verifying...' : 'Verify DNS'}
        </button>
      {/if}
      {#if domainError}
        <p class="text-sm text-destructive">{domainError}</p>
      {/if}
      {#if domainSuccess}
        <p class="text-sm text-green-600">{domainSuccess}</p>
      {/if}
    </div>

    <!-- GitHub Connection -->
    <div class="rounded-lg border border-border bg-card p-6 space-y-4">
      <h2 class="text-lg font-semibold text-foreground">
        GitHub Integration
      </h2>
      {#if project.githubRepo}
        <div class="space-y-2">
          <p class="text-sm text-muted-foreground">
            Connected to
            <code class="bg-accent px-1 py-0.5 rounded text-xs">
              {project.githubRepo}
            </code>
            (branch: {project.githubBranch})
          </p>
          <button
            onclick={disconnectGithub}
            class="rounded-md border border-destructive/30 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            Disconnect
          </button>
        </div>
      {:else}
        <div>
          <p class="text-sm text-muted-foreground mb-3">
            Connect a GitHub repository to auto-deploy on push.
          </p>
          <a
            href="https://github.com/apps/specra/installations/new?state={projectId}"
            class="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Connect GitHub
          </a>
        </div>
      {/if}
    </div>

    <!-- Contact Form (Web3Forms) -->
    <div class="rounded-lg border border-border bg-card p-6 space-y-4">
      <h2 class="text-lg font-semibold text-foreground">Contact Form</h2>
      {#if canContactForm}
        <p class="text-sm text-muted-foreground">
          Add a contact form widget to your published doc site using
          <a href="https://web3forms.com/" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline inline-flex items-center gap-1">
            Web3Forms <ExternalLink class="h-3 w-3" />
          </a>. Get your free access key from their site, then paste it below.
        </p>
        <form onsubmit={handleSaveWeb3Forms} class="flex gap-2">
          <input
            type="text"
            bind:value={web3formsKey}
            placeholder="Your Web3Forms access key"
            class="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
          <button
            type="submit"
            disabled={web3formsSaving}
            class="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {web3formsSaving ? 'Saving...' : 'Save'}
          </button>
        </form>
        {#if web3formsMsg}
          <p class="text-sm text-green-600">{web3formsMsg}</p>
        {/if}
      {:else}
        <p class="text-sm text-muted-foreground">
          Contact form requires the Starter plan or above.
        </p>
        <a
          href="/pricing"
          class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Upgrade Plan
        </a>
      {/if}
    </div>

    <!-- Live Chat -->
    <div class="rounded-lg border border-border bg-card p-6 space-y-4">
      <h2 class="text-lg font-semibold text-foreground">Live Chat</h2>
      {#if canChat}
        <p class="text-sm text-muted-foreground">
          Enable a live chat widget on your published doc site. Visitors can chat with you in real-time from your dashboard.
        </p>
        <div class="flex items-center gap-4">
          <button
            onclick={handleToggleChat}
            disabled={chatSaving}
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {chatEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {chatEnabled ? 'translate-x-6' : 'translate-x-1'}"
            ></span>
          </button>
          <span class="text-sm text-foreground">
            {chatEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        {#if chatMsg}
          <p class="text-sm text-green-600">{chatMsg}</p>
        {/if}
      {:else}
        <p class="text-sm text-muted-foreground">
          Live chat requires the Pro plan or above.
        </p>
        <a
          href="/pricing"
          class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Upgrade Plan
        </a>
      {/if}
    </div>

    <!-- Danger Zone -->
    <div class="rounded-lg border border-destructive/30 bg-card p-6 space-y-4">
      <h2 class="text-lg font-semibold text-destructive">Danger Zone</h2>
      <p class="text-sm text-muted-foreground">
        Deleting this project will stop all running deployments and remove all
        data. This action cannot be undone.
      </p>
      <button
        onclick={handleDelete}
        disabled={deleting}
        class="inline-flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
      >
        <Trash2 class="h-4 w-4" />
        {deleting ? 'Deleting...' : 'Delete Project'}
      </button>
    </div>
  </div>
{/if}
