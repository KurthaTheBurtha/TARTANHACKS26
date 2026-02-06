"use client";

import { useState, useCallback } from "react";
import { Loader2, FileText, AlertCircle, CheckCircle } from "lucide-react";
import type { BillData } from "@/lib/types";
import { BillResults } from "@/components/bill-results";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BillUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BillData | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  const validateFile = useCallback((f: File): string | null => {
    const isPdf =
      f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return `${f.name} is not a PDF. Please select a .pdf file.`;
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      return `${f.name} is too large (${formatFileSize(f.size)}). Maximum size is 10MB.`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (selectedFile: File | null) => {
      setError(null);
      setResult(null);
      if (!selectedFile) {
        setFile(null);
        return;
      }
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        setFile(null);
        return;
      }
      setFile(selectedFile);
    },
    [validateFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      handleFileSelect(selectedFile ?? null);
      e.target.value = ""; // Reset so same file can be selected again
    },
    [handleFileSelect]
  );

  const handleAnalyze = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse-bill", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to analyze bill");
      }

      setResult(data as BillData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze bill");
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleReset = useCallback(() => {
    setFile(null);
    setError(null);
    setResult(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-input")?.click()}
        className={`
          relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12
          cursor-pointer transition-all duration-200
          ${
            error && !file
              ? "border-red-400 bg-red-50/50 dark:border-red-500 dark:bg-red-950/20"
              : isDragging
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                : "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          }
        `}
      >
        <input
          id="file-input"
          type="file"
          accept="application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <FileText
          className={`mb-4 h-12 w-12 ${
            error && !file ? "text-red-500" : "text-blue-500"
          }`}
          strokeWidth={1.5}
        />
        <p className="text-center text-base font-medium text-gray-700 dark:text-gray-300">
          Drop PDF here or click to upload
        </p>
        <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
          Accepted: PDF files up to 10MB
        </p>
      </div>

      {/* Selected file info */}
      {file && (
        <div className="rounded-lg border-2 border-green-400 bg-green-50/50 px-4 py-3 dark:border-green-600 dark:bg-green-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {file.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={!file || loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Analyzing bill with AI... This may take 10-20 seconds
          </>
        ) : (
          "Analyze Bill"
        )}
      </button>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {error}
          </p>
        </div>
      )}

      {/* Success result */}
      {result && !error && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900/50 dark:bg-green-950/30">
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Bill analyzed successfully
              </p>
              {file && (
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-green-700 dark:text-green-300">
                  <FileText className="h-4 w-4" />
                  {file.name}
                </p>
              )}
            </div>
          </div>

          <BillResults billData={result} />

          <button
            onClick={handleReset}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Upload Another Bill
          </button>
        </div>
      )}
    </div>
  );
}
