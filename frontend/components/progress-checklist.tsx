"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Circle } from "lucide-react";

interface Step {
  label: string;
  complete: boolean;
}

interface ProgressChecklistProps {
  steps: Step[];
}

export default function ProgressChecklist({ steps }: ProgressChecklistProps) {
  const currentIndex = steps.findIndex((s) => !s.complete);
  const stepNum = currentIndex >= 0 ? currentIndex + 1 : steps.length;

  return (
    <div
      className="flex flex-col gap-3"
      role="status"
      aria-live="polite"
      aria-label={`Analysis progress: step ${stepNum} of ${steps.length}`}
    >
      {steps.map((step, index) => {
        const isComplete = step.complete;
        const isCurrent = currentIndex === index;

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.3,
              delay: index * 0.1,
              ease: "easeOut",
            }}
            className="flex items-center gap-3"
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center">
              {isComplete ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                  }}
                >
                  <CheckCircle2 className="h-5 w-5 text-savings" />
                </motion.div>
              ) : isCurrent ? (
                <Loader2 className="h-5 w-5 animate-spin text-trust" />
              ) : (
                <Circle className="h-5 w-5 text-slate-400" strokeWidth={2} />
              )}
            </div>
            <span
              className={`text-sm ${
                isComplete
                  ? "text-savings font-medium"
                  : isCurrent
                    ? "text-trust font-medium"
                    : "text-slate-400"
              }`}
            >
              {step.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
