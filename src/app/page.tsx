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
        setError(null);
        setResult(null);

        const targetUrl = passedUrl || url;
        try {
            const res = await auditRepository(targetUrl, focus || undefined);
            if (!res.error && res.audit) {
                setResult(res);
                addToHistory(res);

                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set('repo', targetUrl);
                window.history.replaceState({}, '', newUrl.toString());
            }
            if (res.error) {
                setError(getFriendlyErrorMessage(res.error));
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
        setCompareError(null);

        const params = new URLSearchParams();
        params.set('repoA', urlA);
        params.set('repoB', urlB);
        window.history.pushState({}, '', `?${params.toString()}`);

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

    const chartData = useMemo(() => {
        if (!compareA?.audit || !compareB?.audit) return [];
        return [
            { subject: 'Overall', A: compareA.audit.overallScore, B: compareB.audit.overallScore, fullMark: 100 },
            { subject: 'Technical', A: compareA.audit.technicalScore, B: compareB.audit.technicalScore, fullMark: 100 },
            { subject: 'Docs', A: compareA.audit.documentationScore, B: compareB.audit.documentationScore, fullMark: 100 },
            { subject: 'Pro', A: compareA.audit.professionalismScore, B: compareB.audit.professionalismScore, fullMark: 100 }
        ];
    }, [compareA, compareB]);

    const HistoryList = () => (
        <div className="flex flex-col gap-2">
            {history.length === 0 && <p className="text-xs text-muted-foreground italic p-4">No history yet.</p>}
            {history.map((item, i) => (
                <button
                    key={i}
                    onClick={() => loadAuditFromHistory(item)}
                    className="text-left p-3 rounded-lg hover:bg-accent transition-all group border border-transparent hover:border-border"
                >
                    <p className="text-sm font-medium truncate">{item.metadata?.repo}</p>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-[10px] text-muted-foreground uppercase">{item.audit?.verdict}</p>
                        {item.metadata?.focus && <span className="text-[9px] text-primary"><Target className="w-4 h-4" /> Focus</span>}
                    </div>
                </button>
            ))}
        </div>
    );

    const handleCompareKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isComparing && (compareUrlA || compareA) && (compareUrlB || compareB)) {
            handleCompareRun();
        }
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
                                            size="icon"
                                            onClick={copyShareLink}
                                            disabled={
                                                viewMode === "single"
                                                    ? !result
                                                    : (!compareA || !compareB)
                                            }
                                            className="h-12 w-12 shrink-0"
                                            title="Share Audit"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </Button>

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
                                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <Badge variant="outline" className="px-3 py-1 bg-primary/5 border-primary/20 text-primary">
                                            {result.metadata?.repo}
                                        </Badge>
                                        {focus && <Badge className="flex gap-1"><Target className="w-3 h-3" /> {focus}</Badge>}
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                        <ScoreCard label="Overall" score={result.audit.overallScore} />
                                        <ScoreCard label="Technical" score={result.audit.technicalScore} />
                                        <ScoreCard label="Docs" score={result.audit.documentationScore} />
                                        <ScoreCard label="Pro" score={result.audit.professionalismScore} />
                                    </div>

                                    <div className="p-6 rounded-2xl border bg-card shadow-sm">
                                        <h3 className="font-bold mb-3 flex items-center gap-2 uppercase text-xs tracking-widest opacity-60"><GitCompare className="w-4 h-4 text-primary" />Architect&apos;s Summary</h3>
                                        <p className="text-muted-foreground leading-relaxed text-base sm:text-lg">{result.audit.summary}</p>
                                    </div>

                                    <div className="grid gap-3">
                                        <h3 className="font-bold uppercase text-xs tracking-widest opacity-60 px-1 flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-500" />Suggested Improvements</h3>
                                        {result.audit.improvements.map((item, i) => (
                                            <div key={i} className="flex gap-4 p-4 rounded-xl bg-muted/40 border border-transparent hover:border-border transition-all">
                                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black">
                                                    {i + 1}
                                                </span>
                                                <p className="text-sm sm:text-base leading-snug">{item}</p>
                                            </div>
                                        ))}
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
                                                    {[
                                                        { label: 'Overall', key: 'overallScore' },
                                                        { label: 'Technical', key: 'technicalScore' },
                                                        { label: 'Docs', key: 'documentationScore' }
                                                    ].map((stat) => (
                                                        <div key={stat.label} className="flex justify-between items-center p-3 border rounded-xl bg-background/50">
                                                            <span className="font-medium text-xs sm:text-sm">{stat.label}</span>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-lg sm:text-xl font-black">
                                                                    {res.audit?.[stat.key]}
                                                                </span>
                                                                <div className="hidden md:block">
                                                                    {typeof res.audit?.[stat.key] === 'number' && typeof other.audit?.[stat.key] === 'number'
                                                                        ? getDelta(res.audit[stat.key] as number, other.audit[stat.key] as number)
                                                                        : null
                                                                    }
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
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

                            {/* --- VERDICT --- */}
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

                                                {Math.abs(compareA.audit.technicalScore - compareB.audit.technicalScore) > 10 &&
                                                    " There is a significant gap in technical implementation."}
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Best Choice For...</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {compareA.audit.documentationScore > 80 && (
                                                    <span className="px-2 py-1 rounded bg-background border text-xs font-medium">
                                                        Best Docs: {compareA.metadata?.repo}
                                                    </span>
                                                )}
                                                {compareB.audit.technicalScore > compareA.audit.technicalScore && (
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
