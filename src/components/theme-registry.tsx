"use client";

import { type ReactNode } from "react";

interface ThemeRegistryProps {
  children: ReactNode;
}

export function ThemeRegistry({ children }: ThemeRegistryProps) {
  // Theme is applied at the page level via ThemeRenderer
  // This registry ensures the app wrapper is present
  return <>{children}</>;
}


