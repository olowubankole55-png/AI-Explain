import { useState, type FormEvent, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";

const queryClient = new QueryClient();
const examples = [
  "Why is the sky blue?",
  "Explain photosynthesis like I am in 7th grade.",
  "How do I solve 2x + 5 = 17?",
];

type ExplainResponse = {
  answer: string | null;
  error: string | null;
};

function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submitQuestion(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setAnswer("");
      setError("Please enter a question before pressing Explain.");
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setAnswer("");
    setError("");

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion }),
      });
      const data = (await response
        .json()
        .catch(() => null)) as ExplainResponse | null;

      if (!response.ok || !data || data.error) {
        throw new Error(
          data?.error ||
            "The server could not explain that question. Please try again.",
        );
      }

      setAnswer(
        data.answer || "The AI returned an empty answer. Please try again.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "A network error occurred. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function clearAll() {
    setQuestion("");
    setAnswer("");
    setError("");
    setIsLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-3 sm:mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
            AI Explain
          </p>
          <div className="max-w-3xl">
            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
              Ask anything. Learn it step by step.
            </h1>
            <p className="mt-4 text-lg text-slate-300">
              A student-focused tutor that turns tough questions into clear
              answers, examples, and simple explanations.
            </p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <form
            onSubmit={submitQuestion}
            className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur sm:p-6"
          >
            <label htmlFor="question" className="text-lg font-bold">
              What do you want explained?
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              disabled={isLoading}
              rows={9}
              maxLength={2000}
              placeholder="Type a homework question, science concept, math problem, or confusing idea..."
              className="mt-3 w-full resize-y rounded-2xl border border-white/15 bg-slate-900/90 p-4 text-base text-white outline-none ring-cyan-300 transition placeholder:text-slate-500 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70"
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="rounded-2xl bg-cyan-300 px-6 py-3 font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Thinking…" : "Explain"}
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={isLoading && !question && !answer && !error}
                className="rounded-2xl border border-white/15 px-6 py-3 font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            </div>
            {isLoading && (
              <p className="mt-4 text-sm text-cyan-200" role="status">
                AI Explain is asking OpenAI for a tutor-style answer…
              </p>
            )}
            {error && (
              <p
                className="mt-4 rounded-2xl border border-red-300/30 bg-red-950/60 p-4 text-red-100"
                role="alert"
              >
                {error}
              </p>
            )}
          </form>

          <aside className="rounded-3xl border border-white/10 bg-white p-5 text-slate-950 shadow-2xl sm:p-6">
            <h2 className="text-xl font-black">Example questions</h2>
            <div className="mt-4 grid gap-3">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setQuestion(example)}
                  disabled={isLoading}
                  className="rounded-2xl border border-slate-200 p-3 text-left font-semibold transition hover:border-cyan-400 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {example}
                </button>
              ))}
            </div>
          </aside>
        </div>

        <section
          className="mt-6 min-h-48 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur sm:p-6"
          aria-live="polite"
        >
          <h2 className="text-2xl font-black">Answer</h2>
          {answer ? (
            <div className="prose prose-invert mt-4 max-w-none whitespace-pre-wrap text-slate-100">
              {answer}
            </div>
          ) : (
            <p className="mt-4 text-slate-400">
              Your explanation will appear here after you press Explain.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
