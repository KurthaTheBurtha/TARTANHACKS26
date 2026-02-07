"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import CountUp from "react-countup";
import { fadeIn, staggerContainer, staggerItem } from "@/lib/animations";
import {
  ArrowRight,
  DollarSign,
  MapPin,
  Pill,
  Upload,
  Sparkles,
  FileCheck,
} from "lucide-react";

export default function Home() {
  const statsRef = useRef(null);
  const isStatsInView = useInView(statsRef, { once: true, margin: "-50px" });

  const features = [
    {
      icon: DollarSign,
      iconColor: "text-savings",
      title: "Find Overcharges",
      description:
        "AI compares your charges to Medicare rates and finds errors worth $2,800 on average",
    },
    {
      icon: MapPin,
      iconColor: "text-trust",
      title: "Find Affordable Care",
      description:
        "See in-network options nearby based on your symptoms and insurance",
    },
    {
      icon: Pill,
      iconColor: "text-danger",
      title: "Check Your Meds",
      description:
        "Detect dangerous drug interactions and find cheaper alternatives",
    },
  ];

  const steps = [
    {
      number: 1,
      icon: Upload,
      title: "Upload Your Bill",
      description: "Drag and drop your medical bill PDF",
    },
    {
      number: 2,
      icon: Sparkles,
      title: "AI Analyzes in Seconds",
      description:
        "Our AI compares every charge to Medicare rates and industry standards",
    },
    {
      number: 3,
      icon: FileCheck,
      title: "Get Your Savings Report",
      description:
        "See exactly what was overcharged and download your appeal letter",
    },
  ];

  return (
    <main id="main-content" className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-slate-50 to-trust/5 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
        <motion.h1
          variants={fadeIn}
          initial="initial"
          animate="animate"
          className="mb-6 text-4xl font-bold text-slate-900 md:text-6xl"
        >
          Stop Overpaying for Healthcare
        </motion.h1>

        <motion.p
          variants={fadeIn}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.1 }}
          className="mb-8 text-xl text-slate-600"
        >
          Your AI-powered advocate finds billing errors, dangerous drug
          interactions, and affordable care nearby
        </motion.p>

        <motion.div
          variants={fadeIn}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.2 }}
        >
          <Link
            href="/upload"
            className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <motion.span
              className="flex items-center justify-center gap-2 rounded-xl bg-trust px-8 py-4 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-trust-dark hover:shadow-xl"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              Upload Your Bill
              <ArrowRight className="h-5 w-5" />
            </motion.span>
          </Link>
        </motion.div>

        <motion.div
          ref={statsRef}
          variants={fadeIn}
          initial="initial"
          animate={isStatsInView ? "animate" : "initial"}
          transition={{ delay: 0.4 }}
          className="mt-12 rounded-2xl border border-slate-200/80 bg-white/60 px-8 py-6 shadow-sm backdrop-blur-sm"
        >
          <p className="font-mono text-4xl font-bold text-savings md:text-6xl">
            {isStatsInView ? (
              <CountUp
                start={0}
                end={847392}
                duration={2.5}
                prefix="$"
                separator=","
                useEasing
              />
            ) : (
              "$0"
            )}
          </p>
          <p className="mt-2 text-slate-600">saved for patients</p>
        </motion.div>
        </div>
      </div>

      {/* Features section */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">
            Three Tools, One Mission
          </h2>
          <motion.div
            className="grid grid-cols-1 gap-8 md:grid-cols-3"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-2xl bg-slate-50 p-8 shadow-sm transition-shadow hover:shadow-card-hover"
              >
                <Icon
                  className={`mb-4 h-12 w-12 ${feature.iconColor}`}
                  strokeWidth={1.5}
                />
                <h3 className="text-xl font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-3 text-slate-600">{feature.description}</p>
              </motion.div>
            );
            })}
          </motion.div>
        </div>
      </section>

      {/* How It Works section */}
      <section className="bg-gradient-to-b from-white to-slate-50 py-12 md:py-24">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">
            Save Money in 3 Steps
          </h2>
          <div className="relative border-l-2 border-trust/30 pl-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: index * 0.15 }}
                  className="relative pb-12 last:pb-0"
                >
                  <div className="absolute left-0 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-trust text-2xl font-bold text-white">
                    {step.number}
                  </div>
                  <div className="flex items-center gap-6 rounded-xl bg-white p-6 shadow-card">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-trust/10">
                      <Icon className="h-6 w-6 text-trust" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-slate-600">{step.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
