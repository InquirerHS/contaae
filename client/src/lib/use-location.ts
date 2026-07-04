import { useHashLocation } from "wouter/use-hash-location";

// wouter's useHashLocation keeps the query string in the returned location,
// which breaks route matching (e.g. /biblioteca?cat=creepy -> 404).
// This wrapper strips the query/search for routing purposes while leaving
// navigation intact. Pages read query params directly from window.location.hash.
export function useArcaneLocation() {
  const [loc, navigate] = useHashLocation();
  const clean = loc.split("?")[0] || "/";
  return [clean, navigate] as const;
}
