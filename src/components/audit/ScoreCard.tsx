"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ScoreCardProps } from "@/types/audit";

export function ScoreCard({ label, score, insight, icon: Icon }: ScoreCardProps) {
    const getScoreColor = (s: number) => {
        if (s >= 80) return "text-emerald-500";
        if (s >= 50) return "text-amber-500";
        return "text-destructive";
    };

    return (
        <Card className="flex flex-col p-4 bg-card hover:border-primary/50 transition-colors group">
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                    {Icon && <Icon className="w-4 h-4" />}
                    <h4 className="text-sm font-semibold uppercase tracking-wider">{label}</h4>
                </div>
                <motion.span
                key={score}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                        >
                    <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                        {score}
                    </span>
                </motion.span>
            </div>

            <div className="mt-auto pt-3 border-t">
                <p className="text-xs text-muted-foreground leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                    {insight}
                </p>
            </div>
        </Card>
    );
}