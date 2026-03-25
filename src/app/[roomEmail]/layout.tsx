import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "JunkBox - Room",
  description: "Collaborative Spotify Playlist App",
};

export default async function RoomLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
