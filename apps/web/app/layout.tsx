import React from "react";
import Link from "next/link";
import { SignOutButton } from "./components/SignOutButton";
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <header style={{ display:'flex', gap: 16, alignItems:'center', marginBottom: 24 }}>
          <Link href="/">Home</Link>
          <Link href="/sign-in">Sign In</Link>
          <SignOutButton />
        </header>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
