"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { getCurrentUser } from "@/utils/AuthApi.js";

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

export default function DashboardHeader() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    let active = true;
    const updateTime = () => {
      if (active) setCurrentTime(new Date());
    };
    const initialTimer = window.setTimeout(updateTime, 0);
    const clockTimer = window.setInterval(updateTime, 30_000);

    const updateUser = () => {
      getCurrentUser()
        .then(({ user }) => {
          if (active) setUserName(user.name);
        })
        .catch(() => {
          if (active) setUserName("");
        });
    };
    updateUser();

    window.addEventListener("inventra:auth-change", updateUser);
    return () => {
      active = false;
      window.clearTimeout(initialTimer);
      window.clearInterval(clockTimer);
      window.removeEventListener("inventra:auth-change", updateUser);
    };
  }, []);

  const greeting = currentTime ? getGreeting(currentTime) : "Welcome";
  const timestamp = currentTime
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(currentTime)
    : "";

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          {greeting}{userName ? `, ${userName}` : ""}!
        </h1>
        <p className="text-sm text-text-secondary">Here&apos;s what&apos;s happening with your inventory today.</p>
      </div>
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Calendar className="h-4 w-4" />
        <span>{timestamp}</span>
      </div>
    </div>
  );
}
