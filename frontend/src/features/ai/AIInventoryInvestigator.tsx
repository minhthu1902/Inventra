import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowRight, CircleCheck, Database, LoaderCircle, Sparkles, WifiOff } from "lucide-react";
import { askInventoryInvestigator, loadInvestigatorDemoData, type InvestigatorResponse } from "./aiApi";

const starterQuestion = "Find unusual inventory patterns and recommend what I should review.";

export default function AIInventoryInvestigator() {
  const [question, setQuestion] = useState("");
  const [report, setReport] = useState<InvestigatorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [error, setError] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const runAnalysis = useCallback(async (prompt: string) => {
    if (!navigator.onLine) {
      setError("The assistant needs a connection to analyze the latest server data. Offline inventory recording continues to work.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      setReport(await askInventoryInvestigator(prompt));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to analyze inventory activity.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    void runAnalysis("");
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, [runAnalysis]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runAnalysis(question.trim() || starterQuestion);
  }

  async function handleLoadDemoData() {
    setIsLoadingDemo(true);
    setError("");
    try {
      await loadInvestigatorDemoData();
      setQuestion(starterQuestion);
      await runAnalysis(starterQuestion);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load synthetic demo data.");
    } finally {
      setIsLoadingDemo(false);
    }
  }

  return (
    <section className="ai-panel-gradient relative min-w-0 rounded-xl p-5 text-white shadow-lg" aria-labelledby="investigator-title">
      <div className="relative flex min-w-0 flex-col gap-4 break-words">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-100" />
            <h3 id="investigator-title" className="text-sm font-semibold text-white">AI Inventory Investigator</h3>
          </div>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-primary-100">{report?.generatedBy ?? "Analyzing"}</span>
        </div>

        <p className="text-xs text-white/75">Looks for unusual stock movements and gives evidence-based next steps from your inventory ledger.</p>

        <form onSubmit={handleSubmit} className="relative">
          <label className="sr-only" htmlFor="investigator-question">Ask about inventory activity</label>
          <input
            id="investigator-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={500}
            placeholder="Why did outbound activity spike for a SKU?"
            className="w-full rounded-lg border border-white/10 bg-white/10 py-2.5 pl-3 pr-11 text-xs text-white outline-none backdrop-blur-sm placeholder:text-white/55 focus:border-primary-300"
          />
          <button
            type="submit"
            disabled={isLoading || !isOnline}
            aria-label="Ask Inventory Investigator"
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-gradient-to-br from-primary-400 to-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </form>

        {!isOnline && <p className="flex items-center gap-1.5 text-[11px] text-white/75"><WifiOff className="h-3.5 w-3.5" /> Assistant needs a connection; offline stock operations remain available.</p>}
        {error && <p className="rounded-md border border-white/15 bg-black/10 p-2 text-xs text-white/90" role="alert">{error}</p>}

        {report?.analyzedItems === 0 && isOnline && (
          <div className="rounded-lg border border-white/10 bg-white/10 p-3">
            <p className="text-xs leading-relaxed text-white/80">This account has no inventory yet. Load a small, clearly labeled synthetic dataset to try the Investigator.</p>
            <button
              type="button"
              onClick={() => void handleLoadDemoData()}
              disabled={isLoadingDemo || isLoading}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingDemo ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
              Load synthetic demo data
            </button>
          </div>
        )}

        {report && (
          <div aria-live="polite">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-white/90">Inventory analysis</p>
              <p className="text-[10px] text-white/60">{report.analyzedTransactions} transactions · {report.periodDays} days</p>
            </div>
            <p tabIndex={0} className="max-h-72 overflow-y-auto whitespace-pre-line break-words rounded-lg border border-white/10 bg-white/10 p-3 text-xs leading-relaxed text-white/90">{report.answer}</p>

            {report.findings.length > 0 ? (
              <div className="mt-3 flex flex-col gap-2">
                {report.findings.slice(0, 3).map((finding) => (
                  <article key={finding.id} className="rounded-lg border border-white/10 bg-white/10 p-3">
                    <div className="flex items-start gap-2">
                      {finding.severity === "high" ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200" /> : <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-100" />}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white">{finding.title} · {finding.sku}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-white/75">{finding.evidence}</p>
                        <p className="mt-1 text-[11px] text-white/90">Next: {finding.recommendation}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 p-3 text-xs text-white/80"><CircleCheck className="h-4 w-4 text-primary-100" /> No flagged movement pattern in the available period.</p>
            )}
            <p className="mt-2 text-[10px] text-white/55">Signals are prompts for review, not proof of an inventory error.</p>
          </div>
        )}
      </div>
    </section>
  );
}
