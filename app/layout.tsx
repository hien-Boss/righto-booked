export const metadata = { title: "Righto Booked" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: 16, background: "#fafaf7" }}>
        {children}
      </body>
    </html>
  );
}
