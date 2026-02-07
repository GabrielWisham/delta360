export const metadata = {
  title: "Delta 360 | Dispatch Command Center",
  description:
    "Professional team dispatch command center powered by GroupMe.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
