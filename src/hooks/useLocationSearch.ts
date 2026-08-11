import { useEffect, useState } from "react";

export function useLocationSearch() {
  const [search, setSearch] = useState(() => (typeof window === "undefined" ? "" : window.location.search));

  useEffect(() => {
    const handlePopState = () => setSearch(window.location.search);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return search;
}
