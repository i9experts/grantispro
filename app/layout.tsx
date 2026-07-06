import "./globals.css";
import Providers from "@/components/providers";

export const metadata = {
  title: "Grantispro — Scholarships. Sponsors. Transparency.",
  description: "Multi-tenant scholarship & donor management platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ivory text-plum-deep">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
