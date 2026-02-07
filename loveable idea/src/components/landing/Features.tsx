import { FileSearch, MessageCircle, MapPin, Calendar, ClipboardList, Shield } from "lucide-react";

const features = [
  {
    icon: FileSearch,
    title: "Medical Bill Breakdown",
    description: "Upload hospital bills and EOBs. Get plain-English explanations of charges, coverage, deductibles, and what you actually owe.",
    color: "secondary",
  },
  {
    icon: MessageCircle,
    title: "Insurance-Aware Assistant",
    description: "Ask about your plan, symptoms, or care options. Get personalized answers based on your insurance, age, and medical context.",
    color: "primary",
  },
  {
    icon: MapPin,
    title: "In-Network Navigation",
    description: "Find nearby in-network doctors, clinics, and urgent care. Avoid surprise bills with confidence.",
    color: "success",
  },
  {
    icon: ClipboardList,
    title: "Health Tracking",
    description: "Log symptoms, concerns, and health notes over time. Build a comprehensive health timeline.",
    color: "secondary",
  },
  {
    icon: Calendar,
    title: "Appointment Prep",
    description: "Before appointments, get summaries of your history and help articulating concerns to doctors.",
    color: "primary",
  },
  {
    icon: Shield,
    title: "Preventive Care Reminders",
    description: "Get age-appropriate preventive care recommendations and help booking those important appointments.",
    color: "success",
  },
];

const iconColorClasses = {
  secondary: "bg-secondary/10 text-secondary",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
};

const Features = () => {
  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            Your Complete Healthcare Companion
          </h2>
          <p className="text-lg text-muted-foreground">
            From understanding bills to finding care, CareMap empowers you to make informed healthcare decisions.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group bg-card rounded-2xl p-6 lg:p-8 shadow-card hover:shadow-card-hover border border-border transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 ${iconColorClasses[feature.color as keyof typeof iconColorClasses]}`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-semibold text-xl text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
