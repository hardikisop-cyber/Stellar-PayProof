import "./globals.css";

export const metadata = {
  title: "PayProof — Blockchain Income Verification",
  description: "Prove your on-chain income for freelancers and gig workers",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
