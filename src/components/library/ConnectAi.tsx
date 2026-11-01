"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Plug, Trash2 } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { API_URL } from "@/lib/api/http";
import { createToken, listTokens, revokeToken, type AccessToken } from "@/lib/api/tokens";
import { useAuth } from "@/lib/store/auth";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, Spinner } from "@/components/ui/Form";
import { toast } from "@/components/ui/Toast";
import { formatWhen } from "@/components/support/TicketBits";

/** The MCP endpoint lives beside the REST API: https://api…/mcp */
export const MCP_URL = `${API_URL.replace(/\/api\/v1$/, "")}/mcp`;

const TOOLS: [string, string][] = [
  ["search_books", "Find books by title, author or a description of the plot or feeling"],
  ["get_book · read_chapter", "Details, contents and the full text of any chapter"],
  ["recommend_by_mood · recommend_for_me", "Picks for a mood, or from your shelves"],
  ["ask_my_library", "Answers from your own books, with citations"],
  ["list_my_shelf · add_to_shelf", "See and update your shelves"],
  ["summarize_chapter", "An AI summary of any chapter"],
];

type Client = "claude-code" | "claude-desktop" | "cursor";
const CLIENTS: { id: Client; label: string; where: string }[] = [
  { id: "claude-code", label: "Claude Code", where: "Run in a terminal:" },
  { id: "claude-desktop", label: "Claude Desktop", where: "Settings → Developer → Edit Config, then add to claude_desktop_config.json:" },
  { id: "cursor", label: "Cursor", where: "Add to .cursor/mcp.json (or Settings → MCP):" },
];

function snippet(client: Client, token: string) {
  if (client === "claude-code") return `claude mcp add --transport http storyshelf ${MCP_URL} \\\n  --header "Authorization: Bearer ${token}"`;
  if (client === "claude-desktop")
    return JSON.stringify(
      { mcpServers: { storyshelf: { command: "npx", args: ["-y", "mcp-remote", MCP_URL, "--header", "Authorization:${AUTH}"], env: { AUTH: `Bearer ${token}` } } } },
      null,
      2,
    );
  return JSON.stringify({ mcpServers: { storyshelf: { url: MCP_URL, headers: { Authorization: `Bearer ${token}` } } } }, null, 2);
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard?.writeText(text).then(
          () => {
            setDone(true);
            window.setTimeout(() => setDone(false), 1600);
          },
          () => toast.error("Couldn't copy", "Select the text and copy it by hand."),
        )
      }
      className="inline-flex items-center gap-1.5 rounded-pill border border-line-strong px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-accent"
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {done ? "Copied" : label}
    </button>
  );
}

/** /library/connect: personal access tokens and set-up snippets for the reader's own AI assistant. */
export function ConnectAi() {
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const [tokens, setTokens] = useState<AccessToken[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("Claude Desktop");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null); // the secret, shown once
  const [client, setClient] = useState<Client>("claude-code");

  useEffect(() => {
    if (hydrated && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, user, router, pathname]);

  useEffect(() => {
    if (!user) return;
    listTokens()
      .then(setTokens)
      .catch((e) => setLoadError(errorMessage(e)));
  }, [user]);

  if (!hydrated || !user) return <div className="container-x min-h-[60vh] pt-40" />;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Give the token a name, like the app it's for.");
    setBusy(true);
    setError(null);
    try {
      const t = await createToken(name.trim());
      setFresh(t.token);
      setTokens((list) => [t, ...(list ?? [])]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (t: AccessToken) => {
    try {
      await revokeToken(t.id);
      setTokens((list) => list?.filter((x) => x.id !== t.id) ?? null);
      toast.success("Token revoked", `${t.name} can no longer reach your library.`);
    } catch (err) {
      toast.error("Couldn't revoke the token", errorMessage(err));
    }
  };

  const shown = fresh ?? "ssk_your-token-here";
  return (
    <main className="container-x pb-28 pt-32 md:pt-40">
      <p className="eyebrow flex items-center gap-2">
        <Plug className="size-3.5" /> Connect your AI
      </p>
      <h1 className="display-lg mt-4 max-w-3xl">
        Your library, inside <em className="gold-text italic">your own</em> AI assistant.
      </h1>
      <p className="mt-5 max-w-2xl text-muted">
        StoryShelf speaks the Model Context Protocol (MCP). Connect Claude, Cursor or any MCP client and it can search the library, read chapters, recommend by mood and answer questions from your shelves, acting as you, with your access token.
      </p>

      <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_0.8fr]">
        <section aria-labelledby="setup" className="space-y-8">
          <div className="rounded-xl border border-line bg-surface p-6 md:p-8">
            <h2 id="setup" className="font-serif text-2xl">
              1. Create an access token
            </h2>
            <form onSubmit={create} className="mt-5 flex flex-wrap items-end gap-3">
              <Field label="Name it after the app" className="min-w-0 flex-1">
                {(a) => <Input id={a.id} aria-describedby={a.describedBy} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />}
              </Field>
              <Button type="submit" disabled={busy}>
                {busy ? <Spinner /> : <KeyRound className="size-4" />} Create token
              </Button>
            </form>
            <div className="mt-4">
              <FormError message={error} />
            </div>
            {fresh && (
              <div className="mt-5 rounded-lg border border-accent/40 bg-accent-soft p-4" role="status">
                <p className="text-sm font-semibold text-fg">Copy it now: it won&rsquo;t be shown again.</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <code className="min-w-0 flex-1 break-all rounded-md bg-bg px-3 py-2 font-mono text-xs">{fresh}</code>
                  <CopyButton text={fresh} label="Copy token" />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-line bg-surface p-6 md:p-8">
            <h2 className="font-serif text-2xl">2. Add StoryShelf to your app</h2>
            <div role="tablist" aria-label="AI app" className="mt-5 flex flex-wrap gap-2">
              {CLIENTS.map((c) => (
                <button
                  key={c.id}
                  role="tab"
                  type="button"
                  aria-selected={client === c.id}
                  onClick={() => setClient(c.id)}
                  className={cn("rounded-pill border px-4 py-1.5 text-sm transition-colors", client === c.id ? "border-accent bg-accent text-on-accent" : "border-line-strong text-muted hover:text-fg")}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="mt-5 text-sm text-muted">{CLIENTS.find((c) => c.id === client)?.where}</p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-bg p-4 font-mono text-xs leading-relaxed text-fg">{snippet(client, shown)}</pre>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-faint">{fresh ? "Your new token is filled in." : "Create a token above and it will be filled in here."}</p>
              <CopyButton text={snippet(client, shown)} label="Copy" />
            </div>
            <p className="mt-5 text-xs text-faint">
              Server URL: <code className="font-mono">{MCP_URL}</code> · Streamable HTTP · Bearer token
            </p>
          </div>
        </section>

        <aside className="space-y-8">
          <div className="rounded-xl border border-line p-6">
            <h2 className="font-serif text-xl">What your assistant can do</h2>
            <ul className="mt-4 space-y-3">
              {TOOLS.map(([tool, what]) => (
                <li key={tool}>
                  <code className="font-mono text-xs text-accent">{tool}</code>
                  <p className="text-sm text-muted">{what}</p>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-faint">Questions it asks appear in Ask My Library too, and AI answers spend your daily allowance like the site does.</p>
          </div>

          <div className="rounded-xl border border-line p-6">
            <h2 className="font-serif text-xl">Your tokens</h2>
            {loadError ? (
              <p className="mt-4 text-sm text-danger">{loadError}</p>
            ) : !tokens ? (
              <div className="skeleton mt-4 h-16 rounded-lg" />
            ) : tokens.length === 0 ? (
              <p className="mt-4 text-sm text-muted">None yet. Each app gets its own token, so you can revoke one without touching the others.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {tokens.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.name}</p>
                      <p className="font-mono text-[11px] text-faint">
                        {t.prefix}… · {t.lastUsedAt ? `used ${formatWhen(t.lastUsedAt)}` : "never used"}
                      </p>
                    </div>
                    <button type="button" onClick={() => revoke(t)} aria-label={`Revoke ${t.name}`} className="grid size-9 place-items-center rounded-full border border-line-strong text-muted hover:border-danger hover:text-danger">
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
