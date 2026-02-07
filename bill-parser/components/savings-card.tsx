"use client";

import { motion } from "framer-motion";
import CountUp from "react-countup";
import { DollarSign } from "lucide-react";
import { scaleIn } from "@/lib/animations";

interface SavingsCardProps {
  amount: number;
  billTotal: number;
  errorsFound: number;
}

export default function SavingsCard({
  amount,
  billTotal,
  errorsFound,
}: SavingsCardProps) {
  const savingsPercent =
    billTotal > 0 ? (amount / billTotal) * 100 : 0;

  return (
    <motion.div
      variants={scaleIn}
      initial="initial"
      animate="animate"
      className="rounded-2xl bg-gradient-to-br from-savings-light/10 to-savings/5 p-6 shadow-card transition-shadow hover:shadow-card-hover md:p-8"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-savings/20">
          <DollarSign className="h-6 w-6 text-savings" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">
            Potential savings
          </p>
          <p className="mt-1 font-mono text-3xl font-bold text-savings md:text-5xl">
            <CountUp
              start={0}
              end={amount}
              duration={2}
              prefix="$"
              decimals={2}
              decimal="."
              separator=","
              useEasing
            />
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Found {errorsFound} errors in your ${billTotal.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} bill
          </p>
          {billTotal > 0 && (
            <p className="mt-1 text-sm font-medium text-savings-dark dark:text-savings">
              {savingsPercent.toFixed(1)}% of bill
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
