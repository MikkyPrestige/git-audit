"use client";

import { motion } from "framer-motion";
import { ScoreCardProps } from "@/types/audit";

export function ScoreCard({ label, score }: ScoreCardProps) {
    const getColorBase = (s: number) => {
        if (s >= 80) return "emerald";
        if (s >= 50) return "amber";
        return "rose";
    };

    const color = getColorBase(score);

    return (
        <div className="p-4 rounded-xl border bg-card shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
                <motion.span
                    key={score}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`text-2xl font-bold text-${color}-500`}
                >
                    {score}
                </motion.span>
                <span className="text-xs text-muted-foreground">/ 100</span>
            </div>

            <div className="mt-3 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full bg-${color}-500`}
                />
            </div>
        </div>
    );
}