import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth/auth-context";
import { OrganizationProvider } from "@/lib/organizations/organization-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "SyncFlow",
  description: "Collaborative project and workflow management.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body><AuthProvider><OrganizationProvider>{children}</OrganizationProvider></AuthProvider></body>
    </html>
  );
}
