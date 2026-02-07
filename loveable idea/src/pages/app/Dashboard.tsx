import { 
  FileText, 
  MessageCircle, 
  MapPin,
  Calendar,
  AlertCircle,
  ArrowRight,
  DollarSign,
  Shield,
  Activity
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const quickActions = [
  {
    icon: FileText,
    title: "Upload Bill",
    description: "Analyze a new medical document",
    path: "/documents",
    color: "secondary",
  },
  {
    icon: MessageCircle,
    title: "Ask Question",
    description: "Get insurance-aware answers",
    path: "/chat",
    color: "primary",
  },
  {
    icon: MapPin,
    title: "Find Care",
    description: "Locate in-network providers",
    path: "/care-map",
    color: "success",
  },
];

const recentBills = [
  { id: 1, provider: "City Medical Center", date: "Jan 15, 2024", amount: 450.00, status: "pending" },
  { id: 2, provider: "Valley Lab Services", date: "Jan 8, 2024", amount: 125.50, status: "paid" },
  { id: 3, provider: "Downtown Imaging", date: "Dec 28, 2023", amount: 875.00, status: "insurance" },
];

const upcomingAppointments = [
  { id: 1, provider: "Dr. Sarah Chen", specialty: "Primary Care", date: "Feb 12, 2024", time: "10:30 AM" },
  { id: 2, provider: "Quest Diagnostics", specialty: "Lab Work", date: "Feb 18, 2024", time: "8:00 AM" },
];

const Dashboard = () => {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl lg:text-3xl text-foreground mb-2">
          Welcome back, Alex
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your healthcare information
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-xl p-5 border border-border shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-secondary" />
            </div>
            <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
              -12%
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mb-1">$1,250</p>
          <p className="text-sm text-muted-foreground">Pending Bills</p>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
              2024
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mb-1">$850/$2,500</p>
          <p className="text-sm text-muted-foreground">Deductible Met</p>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-success" />
            </div>
            <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
              +2
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mb-1">$1,420</p>
          <p className="text-sm text-muted-foreground">HSA Balance</p>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mb-1">1</p>
          <p className="text-sm text-muted-foreground">Action Required</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="font-display font-semibold text-lg text-foreground mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              to={action.path}
              className="group bg-card rounded-xl p-5 border border-border shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-12 h-12 rounded-xl bg-${action.color}/10 flex items-center justify-center mb-4`}>
                <action.icon className={`w-6 h-6 text-${action.color}`} />
              </div>
              <h3 className="font-semibold text-foreground mb-1 group-hover:text-secondary transition-colors">
                {action.title}
              </h3>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bills */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-display font-semibold text-foreground">Recent Bills</h2>
            <Link to="/documents" className="text-sm text-secondary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentBills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{bill.provider}</p>
                    <p className="text-sm text-muted-foreground">{bill.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">${bill.amount.toFixed(2)}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    bill.status === 'paid' ? 'bg-success/10 text-success' :
                    bill.status === 'pending' ? 'bg-destructive/10 text-destructive' :
                    'bg-secondary/10 text-secondary'
                  }`}>
                    {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-display font-semibold text-foreground">Upcoming Appointments</h2>
            <Link to="/appointments" className="text-sm text-secondary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {upcomingAppointments.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{apt.provider}</p>
                    <p className="text-sm text-muted-foreground">{apt.specialty}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">{apt.date}</p>
                  <p className="text-sm text-muted-foreground">{apt.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-border">
            <Button variant="outline" className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Appointment
            </Button>
          </div>
        </div>
      </div>

      {/* Insurance Summary Card */}
      <div className="mt-6 bg-hero-gradient rounded-xl p-6 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display font-semibold text-lg mb-2">Your Insurance Plan</h3>
            <p className="text-primary-foreground/80 mb-4">Blue Cross Blue Shield - PPO Gold</p>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-primary-foreground/60">Primary Care Copay</p>
                <p className="font-semibold">$25</p>
              </div>
              <div>
                <p className="text-primary-foreground/60">Specialist Copay</p>
                <p className="font-semibold">$50</p>
              </div>
              <div>
                <p className="text-primary-foreground/60">Out-of-Pocket Max</p>
                <p className="font-semibold">$6,500</p>
              </div>
            </div>
          </div>
          <Button size="sm" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
