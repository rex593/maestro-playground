// src/inspector/FieldRenderer.tsx
// Renders the right shadcn control for a single ParamField, given the current
// value and an onChange callback. The properties form composes one per param.

import type { ParamField } from "@/schema/pathway-schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface FieldRendererProps {
  field: ParamField;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.key} className="text-xs font-medium">
        {field.label}
        {field.unit ? (
          <span className="ml-1 text-muted-foreground">({field.unit})</span>
        ) : null}
      </Label>

      <Control field={field} value={value} onChange={onChange} />

      {field.helpText && (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {field.helpText}
        </p>
      )}
    </div>
  );
}

function Control({ field, value, onChange }: FieldRendererProps) {
  switch (field.kind) {
    case "number": {
      const num = typeof value === "number" ? value : field.defaultValue;
      return (
        <div className="flex items-center gap-3">
          <Slider
            id={field.key}
            className="flex-1"
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            value={[num]}
            onValueChange={([v]) => onChange(v)}
          />
          <div className="flex items-center gap-1">
            <Input
              type="number"
              className="h-8 w-20"
              min={field.min}
              max={field.max}
              step={field.step}
              value={num}
              onChange={(e) => onChange(e.target.valueAsNumber)}
            />
            {field.unit && (
              <span className="text-xs text-muted-foreground">{field.unit}</span>
            )}
          </div>
        </div>
      );
    }

    case "select": {
      const str = typeof value === "string" ? value : field.defaultValue;
      return (
        <Select value={str} onValueChange={onChange}>
          <SelectTrigger id={field.key} className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    case "multiselect": {
      const arr = Array.isArray(value) ? (value as string[]) : field.defaultValue;
      return (
        <ToggleGroup
          type="multiple"
          value={arr}
          onValueChange={(v) => onChange(v)}
          className="flex flex-wrap justify-start gap-1"
        >
          {field.options.map((o) => (
            <ToggleGroupItem
              key={o.value}
              value={o.value}
              size="sm"
              variant="outline"
              className="h-7 text-xs"
            >
              {o.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      );
    }

    case "boolean": {
      const bool = typeof value === "boolean" ? value : field.defaultValue;
      return (
        <Switch
          id={field.key}
          checked={bool}
          onCheckedChange={(v) => onChange(v)}
        />
      );
    }

    default:
      return null;
  }
}

export default FieldRenderer;
