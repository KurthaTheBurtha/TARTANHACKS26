import { 
  Calendar, 
  Plus,
  MapPin,
  ChevronRight,
  Bell,
  FileText,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

const upcomingAppointments = [
  {
    id: 1,
    provider: "Dr. Sarah Chen",
    specialty: "Primary Care Physician",
    date: "Feb 12, 2024",
    time: "10:30 AM",
    location: "456 Oak Ave, Floor 3",
    type: "Annual Checkup",
    prepNeeded: true,
  },
  {
    id: 2,
    provider: "Quest Diagnostics",
    specialty: "Laboratory",
    date: "Feb 18, 2024",
    time: "8:00 AM",
    location: "789 Pine Blvd",
    type: "Blood Work",
    prepNeeded: true,
  },
];

const pastAppointments = [
  {
    id: 3,
    provider: "City Medical Center",
    specialty: "Urgent Care",
    date: "Jan 15, 2024",
    type: "Walk-in Visit",
    summary: "Flu symptoms, prescribed Tamiflu",
  },
  {
    id: 4,
    provider: "Dr. Michael Park",
    specialty: "Dermatology",
    date: "Dec 8, 2023",
    type: "Skin Check",
    summary: "Routine examination, all clear",
  },
];

const preventiveCare = [
  { name: "Annual Wellness Visit", status: "due", dueDate: "Due now" },
  { name: "Flu Shot", status: "due", dueDate: "Recommended" },
  { name: "Colonoscopy", status: "upcoming", dueDate: "Due at age 45" },
  { name: "Eye Exam", status: "completed", dueDate: "Completed Oct 2023" },
];

const Appointments = () => {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl lg:text-3xl text-foreground mb-1">
            Appointments
          </h1>
          <p className="text-muted-foreground">
            Manage your healthcare appointments and preventive care
          </p>
        </div>
        <Button variant="hero" size="lg">
          <Plus className="w-5 h-5" />
          Schedule Appointment
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming */}
          <div className="bg-card rounded-xl border border-border shadow-card">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-display font-semibold text-foreground">Upcoming Appointments</h2>
            </div>
            <div className="divide-y divide-border">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-secondary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{apt.provider}</h3>
                        <p className="text-sm text-muted-foreground">{apt.specialty}</p>
                        <p className="text-sm text-secondary font-medium mt-1">{apt.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{apt.date}</p>
                      <p className="text-sm text-muted-foreground">{apt.time}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {apt.location}
                    </span>
                  </div>

                  {apt.prepNeeded && (
                    <div className="bg-secondary/10 rounded-lg p-3 mb-4">
                      <p className="text-sm font-medium text-secondary flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Preparation needed for this visit
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        View appointment prep notes and questions to ask
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" size="sm">
                      Reschedule
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileText className="w-4 h-4" />
                      Prep Notes
                    </Button>
                    <Button variant="hero" size="sm">
                      <ChevronRight className="w-4 h-4" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Past Appointments */}
          <div className="bg-card rounded-xl border border-border shadow-card">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-display font-semibold text-foreground">Past Appointments</h2>
            </div>
            <div className="divide-y divide-border">
              {pastAppointments.map((apt) => (
                <div key={apt.id} className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{apt.provider}</h3>
                      <p className="text-sm text-muted-foreground">{apt.type} • {apt.date}</p>
                      <p className="text-sm text-muted-foreground mt-1">{apt.summary}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    View Summary
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Preventive Care */}
          <div className="bg-card rounded-xl border border-border shadow-card">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-display font-semibold text-foreground">Preventive Care</h2>
              <p className="text-sm text-muted-foreground mt-1">Recommended for your age</p>
            </div>
            <div className="divide-y divide-border">
              {preventiveCare.map((item, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm">{item.name}</p>
                    <p className={`text-xs ${
                      item.status === 'due' ? 'text-destructive' :
                      item.status === 'completed' ? 'text-success' :
                      'text-muted-foreground'
                    }`}>
                      {item.dueDate}
                    </p>
                  </div>
                  {item.status === 'due' && (
                    <Button variant="outline" size="sm">
                      Schedule
                    </Button>
                  )}
                  {item.status === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-success" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-hero-gradient rounded-xl p-5 text-primary-foreground">
            <h3 className="font-semibold mb-2">Before Your Visit</h3>
            <ul className="text-sm text-primary-foreground/80 space-y-2">
              <li>• Review your recent symptoms and concerns</li>
              <li>• Bring a list of current medications</li>
              <li>• Prepare questions for your doctor</li>
              <li>• Bring your insurance card</li>
            </ul>
            <Button size="sm" className="mt-4 bg-secondary hover:bg-secondary/90 text-secondary-foreground">
              Get AI Prep Summary
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Appointments;
