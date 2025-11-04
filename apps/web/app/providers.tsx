"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const client = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  console.log("Providers mounted");
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
