import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JunkBox - Room",
  description: "Collaborative Spotify Playlist App",
};

export default async function RoomLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ roomEmail: string }>;
}>) {
  const { roomEmail } = await params;
  const decodedEmail = decodeURIComponent(roomEmail);
  
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Room context provider can be added here in the future */}
        {children}
      </body>
    </html>
  );
}
