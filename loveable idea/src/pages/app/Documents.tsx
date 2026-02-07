import { useState } from "react";
import { 
  Upload, 
  FileText, 
  Search, 
  Filter,
  Eye,
  Download,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const documents = [
  {
    id: 1,
    name: "Hospital Bill - City Medical Center",
    type: "Hospital Bill",
    date: "Jan 15, 2024",
    status: "analyzed",
    totalAmount: 2450.00,
    insurancePaid: 1800.00,
    youOwe: 450.00,
  },
  {
    id: 2,
    name: "Lab Results - Quest Diagnostics",
    type: "EOB",
    date: "Jan 8, 2024",
    status: "analyzed",
    totalAmount: 325.50,
    insurancePaid: 200.00,
    youOwe: 125.50,
  },
  {
    id: 3,
    name: "MRI Scan - Downtown Imaging",
    type: "Hospital Bill",
    date: "Dec 28, 2023",
    status: "processing",
    totalAmount: 0,
    insurancePaid: 0,
    youOwe: 0,
  },
  {
    id: 4,
    name: "Annual Checkup - Dr. Chen",
    type: "EOB",
    date: "Dec 15, 2023",
    status: "analyzed",
    totalAmount: 250.00,
    insurancePaid: 225.00,
    youOwe: 25.00,
  },
];

const statusConfig = {
  analyzed: { icon: CheckCircle, color: "text-success", bg: "bg-success/10", label: "Analyzed" },
  processing: { icon: Clock, color: "text-secondary", bg: "bg-secondary/10", label: "Processing" },
  error: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Error" },
};

const Documents = () => {
  const [selectedDoc, setSelectedDoc] = useState<number | null>(null);
  const selectedDocument = documents.find(d => d.id === selectedDoc);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 lg:p-8 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl lg:text-3xl text-foreground mb-1">
              Documents
            </h1>
            <p className="text-muted-foreground">
              Upload and analyze your medical bills and EOBs
            </p>
          </div>
          <Button variant="hero" size="lg">
            <Upload className="w-5 h-5" />
            Upload Document
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search documents..." 
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="default">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document List */}
        <div className={`${selectedDoc ? 'w-1/2 border-r border-border' : 'w-full'} overflow-y-auto`}>
          <div className="divide-y divide-border">
            {documents.map((doc) => {
              const status = statusConfig[doc.status as keyof typeof statusConfig];
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc.id)}
                  className={`flex items-center justify-between p-5 cursor-pointer transition-colors ${
                    selectedDoc === doc.id ? 'bg-muted/50' : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">{doc.name}</p>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{doc.type}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{doc.date}</span>
                        <span className={`flex items-center gap-1 ${status.color}`}>
                          <status.icon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  {doc.status === 'analyzed' && (
                    <div className="text-right">
                      <p className="font-semibold text-foreground">${doc.youOwe.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">You owe</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Document Detail */}
        {selectedDocument && selectedDocument.status === 'analyzed' && (
          <div className="w-1/2 overflow-y-auto p-6 bg-muted/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-semibold text-xl text-foreground">
                Bill Breakdown
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4" />
                  View Original
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-card rounded-xl border border-border p-5 mb-6">
              <h3 className="font-semibold text-foreground mb-4">Cost Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Charges</span>
                  <span className="font-medium text-foreground">${selectedDocument.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Insurance Paid</span>
                  <span className="font-medium text-success">-${selectedDocument.insurancePaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applied to Deductible</span>
                  <span className="font-medium text-foreground">$200.00</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">Your Responsibility</span>
                  <span className="font-bold text-lg text-foreground">${selectedDocument.youOwe.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-card rounded-xl border border-border overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Itemized Charges</h3>
              </div>
              <div className="divide-y divide-border">
                <div className="px-5 py-3 flex justify-between">
                  <div>
                    <p className="font-medium text-foreground">Office Visit - Level 3</p>
                    <p className="text-sm text-muted-foreground">CPT: 99213</p>
                  </div>
                  <span className="font-medium text-foreground">$150.00</span>
                </div>
                <div className="px-5 py-3 flex justify-between">
                  <div>
                    <p className="font-medium text-foreground">Laboratory - Blood Panel</p>
                    <p className="text-sm text-muted-foreground">CPT: 80053</p>
                  </div>
                  <span className="font-medium text-foreground">$200.00</span>
                </div>
                <div className="px-5 py-3 flex justify-between">
                  <div>
                    <p className="font-medium text-foreground">Facility Fee</p>
                    <p className="text-sm text-muted-foreground">General hospital services</p>
                  </div>
                  <span className="font-medium text-foreground">$100.00</span>
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <div className="bg-secondary/10 rounded-xl p-5 border border-secondary/20">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                AI Insights
              </h3>
              <ul className="space-y-2 text-sm text-foreground">
                <li>• This visit applied $200 to your deductible, leaving $1,650 remaining.</li>
                <li>• The facility fee is higher than average. You could ask for an itemized statement.</li>
                <li>• Your insurance covered 73% of this bill, which is typical for in-network care.</li>
              </ul>
            </div>
          </div>
        )}

        {selectedDocument && selectedDocument.status === 'processing' && (
          <div className="w-1/2 flex items-center justify-center p-6 bg-muted/20">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-secondary animate-pulse" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Analyzing Document</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                We're extracting and analyzing the information from your document. This usually takes 1-2 minutes.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Documents;
