import localFont from "next/font/local";

export const unbounded = localFont({
  src: [
    { path: "../public/fonts/Unbounded-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/Unbounded-ExtraBold.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-unbounded",
  display: "swap",
});
