"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { toast } from "sonner";
import { auditRepository } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScoreCard } from "@/components/audit/ScoreCard";
import { Badge } from "@/components/ui/badge";
import { AuditResult } from "@/types/audit";
import { METRIC_CONFIG } from "@/constants/metrics"
import { AuditMetric } from "@/types/audit";
import {
    Menu,
    History,
    X,
    ArrowRightLeft,
    Search,
    Share2,
    Trash2,
    RotateCcw,
    Target,
    LayoutDashboard,
    Trophy,
    Users2,
    Scale,
    BarChart3,
    GitCompare,
    Sparkles
} from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

const AUDIT_STEPS = [
    "Fetching repository data...",
    "Analyzing Technical Architecture...",
    "Evaluating Security & Vulnerabilities...",
    "Scanning Modularity & Patterns...",
    "Checking Documentation Quality...",
    "Assessing Community & Activity...",
    "Testing Performance Bottlenecks...",
    "Reviewing Dependency Health...",
    "Finalizing Forensic Verdict..."
];

export default function Home() {
    const [url, setUrl] = useState("");
    const [focus, setFocus] = useState("");
    const [result, setResult] = useState<AuditResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<AuditResult[]>([]);
    const [viewMode, setViewMode] = useState<"single" | "compare">("single");
    const [compareA, setCompareA] = useState<AuditResult | null>(null);
    const [compareB, setCompareB] = useState<AuditResult | null>(null);
    const [compareUrlA, setCompareUrlA] = useState("");
    const [compareUrlB, setCompareUrlB] = useState("");
    const [isComparing, setIsComparing] = useState(false);
    const [compareError, setCompareError] = useState<string | null>(null);
    const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
    const [loadingStep, setLoadingStep] = useState(0);

    useEffect(() => {
        const saved = localStorage.getItem("git_audit_history");
        if (saved) {
            try {
                setHistory(JSON.parse(saved));
            } catch {
                console.error("Failed to parse history");
            }
        }
    }, []);

    useEffect(() => {
        if (result?.metadata?.repo) {
            document.title = `Audit: ${result.metadata.repo} | GitAudit AI`;
        } else if (compareA && compareB) {
            document.title = `${compareA.metadata?.repo} vs ${compareB.metadata?.repo} | GitAudit AI`;
        } else {
            document.title = "GitAudit AI";
        }
    }, [result, compareA, compareB]);

    const getFriendlyErrorMessage = (error: string) => {
        const err = error.toLowerCase();

        if (err.includes("overflow") || err.includes("503")) {
            return "Our analysis servers are currently at capacity. Please wait a moment and try again.";
        }
        if (err.includes("timeout") || err.includes("reset before headers")) {
            return "The repository is taking too long to respond. It might be too large for a deep audit right now.";
        }
        if (err.includes("404") || err.includes("not found")) {
            return "We couldn't find that repository. Double-check the URL or make sure it's public.";
        }

        return error;
    };

    const addToHistory = (newAudit: AuditResult) => {
        setHistory((prev) => {
            const filtered = prev.filter(
                (item) => item.metadata?.repo !== newAudit.metadata?.repo
            );
            const updated = [newAudit, ...filtered].slice(0, 10);
            localStorage.setItem("git_audit_history", JSON.stringify(updated));
            return updated;
        });
    };

    const clearAllHistory = () => {
        if (window.confirm("Are you sure you want to clear your entire audit history?")) {
            localStorage.removeItem("git_audit_history");
            setHistory([]);
        }
    };

    const deleteHistoryItem = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        const newHistory = history.filter((_, i) => i !== index);
        setHistory(newHistory);
        localStorage.setItem("git_audit_history", JSON.stringify(newHistory));
    };

    const loadAuditFromHistory = (item: AuditResult) => {
        const historyUrl = item.metadata?.url ||
            (item.metadata ? `https://github.com/${item.metadata.owner}/${item.metadata.repo}` : "");

        if (viewMode === "single") {
            setResult(item);
            setUrl(historyUrl);
            if (item.metadata) setFocus(item.metadata.focus || "");
        } else {
            if (activeSlot === 'A') {
                setCompareA(item);
                setCompareUrlA(historyUrl);
            } else {
                setCompareB(item);
                setCompareUrlB(historyUrl);
            }

            const params = new URLSearchParams(window.location.search);
            params.set('repoA', activeSlot === 'A' ? historyUrl : compareUrlA);
            params.set('repoB', activeSlot === 'B' ? historyUrl : compareUrlB);
            window.history.pushState({}, '', `?${params.toString()}`);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getDelta = (scoreA: number, scoreB: number) => {
        const diff = scoreA - scoreB;
        if (diff === 0) return <span className="text-muted-foreground text-xs font-normal">Tie</span>;
        if (diff > 0) return <span className="text-emerald-500 text-xs font-bold">+{diff}</span>;
        return <span className="text-rose-500 text-xs font-bold">{diff}</span>;
    };

    async function handleAudit(passedUrl?: string) {
        setLoading(true);
        setLoadingStep(0);
        setError(null);
        setResult(null);

        const targetUrl = passedUrl || url;

        const stepInterval = setInterval(() => {
            setLoadingStep((prev) => (prev < AUDIT_STEPS.length - 1 ? prev + 1 : prev));
        }, 2800);

        try {
            const res = await auditRepository(targetUrl, focus || undefined);
            if (!res.error && res.audit) {
                setTimeout(() => {
                    setResult(res);
                    addToHistory(res);

                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.set('repo', targetUrl);
                    window.history.replaceState({}, '', newUrl.toString());

                    clearInterval(stepInterval);
                    setLoading(false);
                }, 800);
            }
            if (res.error) {
                setError(getFriendlyErrorMessage(res.error));
                clearInterval(stepInterval);
                setLoading(false);
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    const handleCompareRun = useCallback(async (overrideUrlA?: string, overrideUrlB?: string) => {
        const urlA = overrideUrlA || compareUrlA;
        const urlB = overrideUrlB || compareUrlB;
        if (!urlA || !urlB) return;

        setIsComparing(true);
        setLoadingStep(0);
        setCompareError(null);

        const params = new URLSearchParams();
        params.set('repoA', urlA);
        params.set('repoB', urlB);
        window.history.pushState({}, '', `?${params.toString()}`);

        const stepInterval = setInterval(() => {
            setLoadingStep((prev) => (prev < AUDIT_STEPS.length - 1 ? prev + 1 : prev));
        }, 2800);

        try {
            let resultA = compareA;
            let resultB = compareB;

            if (!resultA && compareUrlA) {
                const resA = await auditRepository(compareUrlA);
                if (resA.error) throw new Error(`Repo A Error: ${resA.error}`);
                resultA = resA;
                addToHistory(resA);
            }

            if (!resultB && compareUrlB) {
                const resB = await auditRepository(compareUrlB);
                if (resB.error) throw new Error(`Repo B Error: ${resB.error}`);
                resultB = resB;
                addToHistory(resB);
            }

            setCompareA(resultA);
            setCompareB(resultB);
        } catch (err) {
            const rawMessage = err instanceof Error ? err.message : "An unexpected error occurred";
            const friendlyMessage = getFriendlyErrorMessage(rawMessage);
            setCompareError(friendlyMessage);
            toast.error("Audit Failed", { description: friendlyMessage });
        } finally {
            clearInterval(stepInterval);
            setIsComparing(false);
        }
    }, [compareUrlA, compareUrlB, compareA, compareB]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const repoA = params.get('repoA');
        const repoB = params.get('repoB');
        const singleRepo = params.get('repo');

        if (repoA && repoB) {
            setViewMode("compare");
            setCompareUrlA(repoA);
            setCompareUrlB(repoB);
            setTimeout(() => handleCompareRun(repoA, repoB), 0);
        } else if (singleRepo) {
            setViewMode("single");
            setUrl(singleRepo);
            setTimeout(() => handleAudit(singleRepo), 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const clearComparison = () => {
        setCompareA(null);
        setCompareB(null);
        setCompareUrlA("");
        setCompareUrlB("");
        setCompareError(null);
        window.history.replaceState({}, '', window.location.pathname);
        toast.success("Comparison cleared");
    };

    const handleClear = () => {
        setResult(null);
        setUrl("");
        setFocus("");
        window.history.replaceState({}, '', window.location.pathname);
        toast.success("Audit cleared");
    };

    const copyShareLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            toast.success("Link copied!", {
                description: viewMode === "compare"
                    ? "Comparison link is ready to share."
                    : "Audit link is ready to share."
            });
        });
    };

    const getScore = (data: unknown): number => {
        if (typeof data === 'number') {
            return data;
        }
        if (data !== null && typeof data === 'object' && 'score' in data) {
            return (data as { score: number }).score;
        }
        return 0;
    };

    const chartData = useMemo(() => {
        if (!compareA?.audit || !compareB?.audit) return [];

        const metrics = METRIC_CONFIG.map(metric => ({
            subject: metric.label,
            A: getScore(compareA.audit?.[metric.key]),
            B: getScore(compareB.audit?.[metric.key]),
            fullMark: 100
        }));

        return [
            {
                subject: 'Overall',
                A: compareA.audit.overallScore,
                B: compareB.audit.overallScore,
                fullMark: 100
            },
            ...metrics
        ];
    }, [compareA, compareB]);

    const HistoryList = () => (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {history.length} Saved
                </span>
                {history.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllHistory}
                        className="h-6 px-2 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                        Clear All
                    </Button>
                )}
            </div>

            {history.length === 0 && (
                <div className="text-center py-8 px-4 border border-dashed rounded-xl">
                    <p className="text-xs text-muted-foreground italic">No history yet.</p>
                </div>
            )}

            {history.map((item, i) => {

                return (
                    <div
                        key={i}
                        onClick={() => loadAuditFromHistory(item)}
                        role="button"
                        className="text-left p-3 rounded-lg hover:bg-accent transition-all group border border-transparent hover:border-border relative"
                    >
                        <div className="flex justify-between items-start gap-2">
                            <p className="text-sm font-semibold truncate flex-1">{item.metadata?.repo}</p>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => deleteHistoryItem(e, i)}
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all"
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>

                        <div className="flex justify-between items-center mt-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                {item.audit?.verdict}
                            </p>
                            <span className="text-[10px] font-mono font-bold text-primary">
                                {item.audit?.overallScore}%
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const handleCompareKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isComparing && (compareUrlA || compareA) && (compareUrlB || compareB)) {
            handleCompareRun();
        }
    };

    const renderMetricGroup = (groupKey: string, sectionTitle: string) => {
        if (!result?.audit) return null;

        const metricsInGroup = METRIC_CONFIG.filter((m) => m.group === groupKey);

        return (
            <div className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 px-1">
                    {sectionTitle}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {metricsInGroup.map((metric) => {
                        const data = result.audit![metric.key] as AuditMetric;
                        if (!data) return null;

                        return (
                            <ScoreCard
                                key={metric.key}
                                label={metric.label}
                                icon={metric.icon}
                                score={data.score}
                                insight={data.insight}
                            />
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="flex min-h-screen bg-background">
            {/* --- DESKTOP SIDEBAR --- */}
            <aside className="w-64 border-r bg-muted/30 p-6 hidden md:flex flex-col gap-4 h-screen sticky top-0">
                <div className="flex items-center gap-2 mb-2 shrink-0">
                    <History className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-[10px]">Recent Audits</h2>
                </div>

                <div className="flex-1 overflow-y-auto -mx-2 px-2 scrollbar-hide hover:scrollbar-default">
                    <HistoryList />
                </div>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 flex flex-col w-full max-w-5xl mx-auto">
                {/* Mobile Header */}
                <header className="flex md:hidden items-center justify-between p-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
                    <div className="flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 text-primary" />
                        <span className="font-bold text-lg">GitAudit AI</span>
                    </div>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="w-6 h-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
                            <SheetHeader className="p-6 border-b shrink-0">
                                <SheetTitle className="flex items-center gap-2">
                                    <History className="w-5 h-5" />
                                    Audit History
                                </SheetTitle>
                            </SheetHeader>

                            <div className="flex-1 overflow-y-auto p-4">
                                <HistoryList />
                            </div>
                        </SheetContent>
                    </Sheet>
                </header>

                <div className="p-6 md:p-12 lg:p-20 flex flex-col gap-8">
                    <div className="hidden md:block">
                        <h1 className="text-4xl font-black tracking-tight">GitAudit AI</h1>
                        <p className="text-muted-foreground mt-2">Deep architectural analysis for any GitHub repository.</p>
                    </div>

                    {/* View Toggle */}
                    <div className="flex bg-muted/50 p-1 rounded-xl w-full sm:w-max border self-center sm:self-start">
                        <button
                            onClick={() => {
                                setViewMode("single");
                                if (activeSlot === 'A') {
                                    setUrl(compareUrlA);
                                    setResult(compareA);
                                } else {
                                    setUrl(compareUrlB);
                                    setResult(compareB);
                                }
                                window.history.replaceState({}, '', window.location.pathname);
                                if (error) setError(null);
                            }}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${viewMode === "single" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            <Search className="w-4 h-4" />
                            Single
                        </button>
                        <button
                            onClick={() => {
                                setViewMode("compare");
                                if (result && !compareA) {
                                    setCompareA(result);
                                    setCompareUrlA(url);
                                }
                            }}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${viewMode === "compare" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            <ArrowRightLeft className="w-4 h-4" />
                            Compare
                        </button>
                    </div>

                    {/* --- SINGLE AUDIT VIEW --- */}
                    {viewMode === "single" && (
                        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex flex-col gap-3 p-4 sm:p-6 bg-card border rounded-2xl shadow-sm">
                                <Input
                                    placeholder="https://github.com/user/repo"
                                    value={url}
                                    onChange={(e) => {
                                        setUrl(e.target.value);
                                        if (result) setResult(null);
                                        if (error) setError(null);
                                    }}
                                    className="h-12 text-base"
                                    disabled={loading}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && url && !loading) handleAudit();
                                    }}
                                />
                                <Input
                                    placeholder="Optional: Focus (e.g. 'Security')"
                                    value={focus}
                                    onChange={(e) => setFocus(e.target.value)}
                                    disabled={loading}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && url && !loading) handleAudit();
                                    }}
                                    className="bg-muted/30 border-dashed h-10"
                                />

                                <div className="flex flex-col sm:flex-row gap-3 w-full">
                                    <Button
                                        onClick={() => handleAudit()}
                                        disabled={loading || !url.toLowerCase().includes("github.com")}
                                        className="flex-[2] h-12 text-lg"
                                    >
                                        {loading ? "Analyzing Repository..." : "Run Deep Audit"}
                                    </Button>

                                    <div className="flex flex-1 gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleClear}
                                            disabled={!url && !result && !error}
                                            className="flex-1 h-12 text-destructive hover:text-destructive"
                                        >
                                            <RotateCcw className="w-4 h-4 mr-2" />
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {loading && (
                                <div className="flex flex-col items-center justify-center py-10 space-y-8 animate-in fade-in zoom-in duration-500">
                                    <div className="relative flex items-center justify-center">
                                        <div className="w-20 h-20 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                                        <div className="absolute w-12 h-12 bg-primary/5 rounded-full animate-pulse flex items-center justify-center">
                                            <Search className="w-5 h-5 text-primary opacity-50" />
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                                        <div className="space-y-1 text-center">
                                            <h3 className="text-sm font-black tracking-[0.2em] uppercase text-primary">
                                                Audit in Progress
                                            </h3>
                                            <div className="flex items-center justify-center gap-2 text-muted-foreground font-mono text-[10px]">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                                </span>
                                                {AUDIT_STEPS[loadingStep]}
                                            </div>
                                        </div>

                                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden border border-border">
                                            <div
                                                className="h-full bg-primary transition-all duration-1000 ease-in-out"
                                                style={{ width: `${((loadingStep + 1) / AUDIT_STEPS.length) * 100}%` }}
                                            />
                                        </div>

                                        <p className="text-[9px] text-muted-foreground italic">
                                            Scanning file tree and analyzing package dependencies...
                                        </p>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="relative p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-destructive animate-in fade-in zoom-in-95 duration-300">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                                            <X className="w-5 h-5" />
                                        </div>

                                        <div className="flex-1 pt-1">
                                            <h4 className="font-bold text-[10px] uppercase tracking-widest opacity-70 mb-1">
                                                Audit Failed
                                            </h4>
                                            <p className="text-sm leading-relaxed font-medium">
                                                {error}
                                            </p>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setError(null)}
                                            className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="absolute inset-0 bg-destructive/5 blur-xl -z-10 pointer-events-none" />
                                </div>
                            )}

                            {result?.audit && !loading && (
                                <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

                                    {/* --- HEADER & OVERALL --- */}
                                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <Badge variant="outline" className="px-3 py-1 bg-primary/5 border-primary/20 text-primary font-mono">
                                                    {result.metadata?.repo}
                                                </Badge>
                                                {focus && (
                                                    <Badge className="flex gap-1 bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20">
                                                        <Target className="w-3 h-3" /> {focus}
                                                    </Badge>
                                                )}
                                            </div>
                                            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                                                Audit Report
                                                <span className="text-muted-foreground/20 font-light">|</span>
                                                <span className={result.audit.overallScore >= 80 ? "text-emerald-500" : "text-amber-500"}>
                                                    {result.audit.overallScore}%
                                                </span>
                                            </h2>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={copyShareLink} className="rounded-full h-9">
                                                <Share2 className="w-3.5 h-3.5 mr-2" /> Share Result
                                            </Button>
                                        </div>
                                    </div>

                                    {/* --- 9-POINT METRIC GRID --- */}
                                    <div className="flex flex-col gap-12">
                                        {renderMetricGroup("quality", "Code & Architecture")}
                                        {renderMetricGroup("vitality", "Project Vitality")}
                                        {renderMetricGroup("risk", "Security & Performance")}
                                    </div>

                                    {/* --- ARCHITECT SUMMARY --- */}
                                    <div className="p-8 rounded-3xl border bg-gradient-to-br from-card to-muted/20 shadow-sm relative overflow-hidden group">
                                        <div className="relative z-10">
                                            <h3 className="font-bold mb-4 flex items-center gap-2 uppercase text-[10px] tracking-[0.2em] opacity-60">
                                                <GitCompare className="w-4 h-4 text-primary" />
                                                Architect&apos;s Summary
                                            </h3>
                                            <p className="text-muted-foreground leading-relaxed text-lg md:text-xl font-medium decoration-primary/20 underline-offset-4">
                                                &quot;{result.audit.summary}&quot;
                                            </p>
                                            <div className="mt-6 flex items-center gap-3">
                                                <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase">
                                                    Verdict: {result.audit.verdict}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                            <Scale className="w-32 h-32 rotate-12" />
                                        </div>
                                    </div>

                                    {/* --- IMPROVEMENTS --- */}
                                    <div className="grid gap-4">
                                        <h3 className="font-bold uppercase text-[10px] tracking-[0.2em] opacity-60 px-1 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-blue-500" />
                                            Strategic Roadmap
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {result.audit.improvements.map((item, i) => (
                                                <div key={i} className="flex gap-4 p-5 rounded-2xl bg-muted/30 border border-transparent hover:border-border hover:bg-card transition-all group">
                                                    <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-background border shadow-sm text-primary flex items-center justify-center text-xs font-black group-hover:scale-110 transition-transform">
                                                        {i + 1}
                                                    </span>
                                                    <p className="text-sm leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors">
                                                        {item}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- COMPARE MODE VIEW --- */}
                    {viewMode === "compare" && (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className={`p-4 rounded-2xl border bg-card transition-all ${activeSlot === 'A' ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
                                    <h3 className="font-bold text-[10px] uppercase tracking-widest mb-3 opacity-50">Repository Alpha</h3>
                                    <Input
                                        placeholder="GitHub URL A"
                                        value={compareUrlA}
                                        onChange={(e) => {
                                            setCompareUrlA(e.target.value);
                                            setCompareA(null);
                                            if (compareError) setCompareError(null);
                                        }}
                                        onFocus={() => setActiveSlot('A')}
                                        onKeyDown={handleCompareKeyDown}
                                        className="border-none bg-transparent p-0 text-lg focus-visible:ring-0"
                                    />
                                </div>
                                <div className={`p-4 rounded-2xl border bg-card transition-all ${activeSlot === 'B' ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
                                    <h3 className="font-bold text-[10px] uppercase tracking-widest mb-3 opacity-50">Repository Beta</h3>
                                    <Input
                                        placeholder="GitHub URL B"
                                        value={compareUrlB}
                                        onChange={(e) => {
                                            setCompareUrlB(e.target.value);
                                            setCompareB(null);
                                            if (compareError) setCompareError(null);
                                        }}
                                        onFocus={() => setActiveSlot('B')}
                                        onKeyDown={handleCompareKeyDown}
                                        className="border-none bg-transparent p-0 text-lg focus-visible:ring-0"
                                    />
                                </div>
                            </div>

                            {compareError && (
                                <div className="relative p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-destructive animate-in fade-in zoom-in-95 duration-300">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                                            <X className="w-5 h-5" />
                                        </div>

                                        <div className="flex-1 pt-1">
                                            <h4 className="font-bold text-xs uppercase tracking-widest opacity-70 mb-1">
                                                Comparison Failed
                                            </h4>
                                            <p className="text-sm leading-relaxed font-medium">
                                                {compareError}
                                            </p>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setCompareError(null)}
                                            className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="absolute inset-0 bg-destructive/5 blur-xl -z-10 pointer-events-none" />
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3 w-full">
                                <Button
                                    onClick={() => handleCompareRun()}
                                    disabled={
                                        isComparing ||
                                        !compareUrlA.toLowerCase().includes("github.com") ||
                                        !compareUrlB.toLowerCase().includes("github.com")
                                    }
                                    className="flex-1 h-12 text-lg"
                                >
                                    {isComparing ? "Benchmarking..." : "Compare Repositories"}
                                </Button>

                                <div className="flex gap-2 w-full sm:flex-1">
                                    <Button
                                        variant="secondary"
                                        onClick={copyShareLink}
                                        disabled={!compareA || !compareB || isComparing}
                                        className="flex-1 h-12"
                                    >
                                        <Share2 className="w-4 h-4 mr-2" /> Share
                                    </Button>

                                    <Button
                                        variant="outline"
                                        onClick={clearComparison}
                                        disabled={!compareUrlA && !compareUrlB && !compareA && !compareB && !compareError}
                                        className="flex-1 h-12 text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" /> Clear
                                    </Button>
                                </div>
                            </div>

                            {isComparing && (
                                <div className="flex flex-col items-center justify-center py-10 space-y-10 animate-in fade-in zoom-in duration-500">
                                    <div className="relative flex items-center justify-center">
                                        <div className="absolute w-24 h-24 border-2 border-dashed border-primary/20 rounded-full animate-[spin_10s_linear_infinite]" />
                                        <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                                        <div className="absolute flex items-center gap-2">
                                            <GitCompare className="w-6 h-6 text-primary" />
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-6 w-full max-w-md text-center">
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-black tracking-[0.3em] uppercase text-primary">
                                                Dual-Engine Forensic Analysis
                                            </h3>
                                            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                                                Comparing: {compareUrlA.split('/').pop()} + {compareUrlB.split('/').pop()}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-center gap-3 text-muted-foreground font-mono text-[11px] bg-muted/50 px-4 py-2 rounded-full border border-border">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                            </span>
                                            {AUDIT_STEPS[loadingStep]}
                                        </div>

                                        <div className="w-full space-y-2">
                                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden border border-border p-[2px]">
                                                <div
                                                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-in-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                                                    style={{ width: `${((loadingStep + 1) / AUDIT_STEPS.length) * 100}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">
                                                <span>Initiating Scan</span>
                                                <span>{Math.round(((loadingStep + 1) / AUDIT_STEPS.length) * 100)}% Complete</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {compareA?.audit && compareB?.audit && !isComparing && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    {[compareA, compareB].map((res, idx) => {
                                        const other = idx === 0 ? compareB : compareA;
                                        const isWinner = res.audit!.overallScore > other.audit!.overallScore;
                                        const isDraw = res.audit!.overallScore === other.audit!.overallScore;

                                        return (
                                            <div key={idx} className={`flex flex-col gap-4 p-6 rounded-2xl border-2 transition-all relative ${isWinner ? "border-primary bg-primary/[0.02] shadow-xl" : "border-border bg-card"}`}>
                                                {isWinner && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary"><Trophy className="w-4 h-4" /> Top Rated</Badge>}
                                                {isDraw && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary"><Users2 className="w-4 h-4" /> Tie</Badge>}

                                                <h2 className="text-xl font-black truncate text-center">{res.metadata?.repo}</h2>

                                                <div className="md:hidden flex justify-between items-center px-3 py-1 bg-muted rounded-full mb-2">
                                                    <span className="text-[10px] font-bold uppercase opacity-60">vs {other.metadata?.repo}</span>
                                                    {getDelta(res.audit!.overallScore, other.audit!.overallScore)}
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center p-3 border rounded-xl bg-primary/5 border-primary/20">
                                                        <span className="font-bold text-xs sm:text-sm uppercase tracking-wider">Overall Grade</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xl font-black">{res.audit?.overallScore}</span>
                                                            <div className="hidden md:block">
                                                                {getDelta(res.audit?.overallScore ?? 0, other.audit?.overallScore ?? 0)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-1.5">
                                                        {METRIC_CONFIG.map((metric) => {
                                                            const scoreA = getScore(res.audit?.[metric.key]);
                                                            const scoreB = getScore(other.audit?.[metric.key]);
                                                            const Icon = metric.icon;

                                                            return (
                                                                <div key={metric.key} className="flex justify-between items-center p-2.5 border rounded-lg bg-background/50 group hover:bg-muted/50 transition-colors">
                                                                    <div className="flex items-center gap-2">
                                                                        <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                                        <span className="text-[11px] font-medium text-muted-foreground">{metric.label}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-bold">{scoreA}</span>
                                                                        <div className="scale-75 origin-right opacity-70">
                                                                            {getDelta(scoreA, scoreB)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="p-4 rounded-xl bg-muted/30 border text-xs sm:text-sm mt-2 italic text-muted-foreground leading-relaxed">
                                                    &quot;{res.audit?.summary}&quot;
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* --- CHART --- */}
                            {compareA && compareB && chartData.length > 0 && (
                                <div className="w-full h-[350px] sm:h-[450px] mt-8 p-4 sm:p-8 bg-card border rounded-3xl shadow-sm flex flex-col items-center">
                                    <h3 className="text-lg font-black mb-6 flex items-center gap-2 uppercase tracking-tighter"><span className="text-2xl"><BarChart3 className="w-4 h-4" /></span> Metric Comparison</h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                                            <PolarGrid strokeOpacity={0.1} />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 'bold' }} />
                                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px' }} />
                                            <Legend verticalAlign="bottom" height={36} />
                                            <Radar name={compareA.metadata?.repo} dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.5} />
                                            <Radar name={compareB.metadata?.repo} dataKey="B" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* --- VERDICT SECTION --- */}
                            {compareA?.audit && compareB?.audit && (
                                <div className="mt-8 p-6 border-2 border-primary/20 bg-primary/5 rounded-2xl">
                                    <h3 className="text-xl font-black mb-4 flex items-center gap-2 uppercase">
                                        <span className="text-2xl"><Scale className="w-4 h-4" /></span> Final Verdict
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">The Breakdown</h4>
                                            <p className="text-sm leading-relaxed">
                                                {compareA.audit.overallScore > compareB.audit.overallScore
                                                    ? `**${compareA.metadata?.repo}** leads in overall quality.`
                                                    : `**${compareB.metadata?.repo}** holds the higher overall score.`}

                                                {Math.abs(getScore(compareA.audit.technical) - getScore(compareB.audit.technical)) > 10 &&
                                                    " There is a significant gap in technical implementation."}
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Best Choice For...</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {getScore(compareA.audit.documentation) > 80 && (
                                                    <span className="px-2 py-1 rounded bg-background border text-xs font-medium">
                                                        Best Docs: {compareA.metadata?.repo}
                                                    </span>
                                                )}
                                                {getScore(compareB.audit.technical) > getScore(compareA.audit.technical) && (
                                                    <span className="px-2 py-1 rounded bg-background border text-xs font-medium">
                                                        Stronger Code: {compareB.metadata?.repo}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
