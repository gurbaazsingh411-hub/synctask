import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SupabaseProvider } from "@/contexts/SupabaseContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SupabaseProvider>
      <Component {...pageProps} />
    </SupabaseProvider>
  );
}
