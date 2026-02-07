import { FileText, MessageCircle, MapPin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const pillars = [
  {
    icon: FileText,
    title: "Medical Document Breakdown",
    subtitle: "Understand Every Charge",
    description: "Upload hospital bills, EOBs, and medical documents. Our AI breaks them down into plain English.",
    features: [
      "Automatic document scanning & parsing",
      "Plain-English explanations of medical codes",
      "Clear breakdown of insurance vs. out-of-pocket",
      "HSA/FSA usage tracking",
    ],
    gradient: "from-secondary to-secondary/70",
  },
  {
    icon: MessageCircle,
    title: "Insurance-Aware Chat",
    subtitle: "Personalized Health Guidance",
    description: "Ask questions about your health or insurance. Get answers tailored to your specific plan and situation.",
    features: [
      "Deductible & copay explanations",
      "Symptom assessment & care recommendations",
      "In-network vs. out-of-network guidance",
      "Coverage verification for procedures",
    ],
    gradient: "from-primary to-primary/70",
  },
  {
    icon: MapPin,
    title: "In-Network Care Navigation",
    subtitle: "Find the Right Care Nearby",
    description: "Discover covered providers near you. Get directions, availability, and cost estimates before you go.",
    features: [
      "Map of in-network providers",
      "Real-time availability check",
      "Cost estimates before visits",
      "Urgent care & specialist finder",
    ],
    gradient: "from-success to-success/70",
  },
];

const Pillars = () => {
  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4">
            Core Platform
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            Three Pillars of Care
          </h2>
          <p className="text-lg text-muted-foreground">
            Built around the moments when you need healthcare guidance most.
          </p>
        </div>

        {/* Pillars */}
        <div className="space-y-16 lg:space-y-24">
          {pillars.map((pillar, index) => (
            <div
              key={pillar.title}
              className={`flex flex-col ${index % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-10 lg:gap-16`}
            >
              {/* Content */}
              <div className="flex-1 max-w-xl">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${pillar.gradient} text-primary-foreground mb-6`}>
                  <pillar.icon className="w-7 h-7" />
                </div>
                <span className="text-secondary font-medium text-sm uppercase tracking-wide">
                  {pillar.subtitle}
                </span>
                <h3 className="font-display font-bold text-2xl sm:text-3xl text-foreground mt-2 mb-4">
                  {pillar.title}
                </h3>
                <p className="text-muted-foreground text-lg mb-6">
                  {pillar.description}
                </p>
                <ul className="space-y-3 mb-8">
                  {pillar.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-success/10 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-success" />
                      </div>
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="hero" size="lg">
                  Learn More
                </Button>
              </div>

              {/* Visual */}
              <div className="flex-1 w-full max-w-lg">
                <div className={`relative aspect-[4/3] rounded-3xl bg-gradient-to-br ${pillar.gradient} p-1`}>
                  <div className="absolute inset-1 rounded-[calc(1.5rem-4px)] bg-card flex items-center justify-center">
                    <pillar.icon className="w-24 h-24 text-muted-foreground/20" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pillars;
