import "./globals.css";

export const metadata = {
  title: "PayProof — Income Passport on Stellar",
  description:
    "A mobile-first income reputation app that turns Stellar payments into verifiable credibility",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
