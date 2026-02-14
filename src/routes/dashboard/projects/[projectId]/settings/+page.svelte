<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { ArrowLeft, Trash2 } from 'lucide-svelte';

  interface Project {
    id: string;
    name: string;
    slug: string;
    subdomain: string;
    customDomain: string | null;
    githubRepo: string | null;
    githubBranch: string | null;
  }

  const projectId = $derived($page.params.projectId);

  let project = $state<Project | null>(null);
  let domain = $state('');
  let domainError = $state('');
  let domainSuccess = $state('');
  let verifying = $state(false);
  let deleting = $state(false);

  $effect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        project = data;
        domain = data.customDomain || '';
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
