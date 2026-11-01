import type { Metadata } from "next";
import { ConnectAi } from "@/components/library/ConnectAi";

export const metadata: Metadata = {
  title: "Connect your AI",
  description: "Use the StoryShelf library from Claude, Cursor or any MCP client: search, read, recommend and ask with your own access token.",
  robots: { index: false },
};

export default function ConnectPage() {
  return <ConnectAi />;
}
