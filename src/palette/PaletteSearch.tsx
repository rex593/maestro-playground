// src/palette/PaletteSearch.tsx
// shadcn Input with a search icon. Local input state, debounced (~150ms) before
// it calls onChange so filtering doesn't run on every keystroke.

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function PaletteSearch({
  onChange,
  placeholder = "Search blocks…",
}: {
  onChange: (query: string) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const t = setTimeout(() => onChange(value.trim().toLowerCase()), 150);
    return () => clearTimeout(t);
  }, [value, onChange]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-8 pl-8"
      />
    </div>
  );
}

export default PaletteSearch;
