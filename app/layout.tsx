import "./globals.css";

export const metadata = {
  title: "Grantispro — Scholarships. Sponsors. Transparency.",
  description: "Multi-tenant scholarship & donor management platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ivory text-plum-deep">{children}</body>
    </html>
  );
}
