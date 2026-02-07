"use client";

import { 
  User, 
  CreditCard, 
  Bell, 
  Shield, 
  HelpCircle,
  ChevronRight,
  LogOut
} from "lucide-react";
import { useState } from "react";

const settingsSections = [
  {
    title: "Account",
    items: [
      { icon: User, label: "Profile Information", description: "Name, email, phone number" },
      { icon: CreditCard, label: "Insurance Details", description: "Blue Cross Blue Shield - PPO Gold" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { icon: Bell, label: "Notifications", description: "Email, push, and SMS alerts", toggle: true },
      { icon: Shield, label: "Privacy & Security", description: "Password, 2FA, data sharing" },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: HelpCircle, label: "Help Center", description: "FAQs and guides" },
    ],
  },
];

export default function Settings() {
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl lg:text-3xl text-foreground mb-1">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {settingsSections.map((section) => (
          <div key={section.title} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="px-5 py-3 bg-muted/50 border-b border-border">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {section.title}
              </h2>
            </div>
            <div className="divide-y divide-border">
              {section.items.map((item, i) => (
                <div key={i} className="px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  {item.toggle ? (
                    <button
                      onClick={() => setNotifications(!notifications)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                        notifications ? 'bg-secondary' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notifications ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Sign Out */}
        <button className="w-full flex items-center justify-start gap-2 px-5 py-4 rounded-xl border border-border bg-card hover:bg-destructive/10 transition-colors text-destructive font-medium">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
