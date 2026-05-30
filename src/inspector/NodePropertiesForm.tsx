// src/inspector/NodePropertiesForm.tsx
// Schema-driven properties form for the selected node. Builds a Zod schema from
// the block's paramSchema, wires react-hook-form (onChange validation), and
// pushes validated values back to the store (debounced) so zundo isn't hammered.

import { useEffect, useMemo, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ParamField } from "@/schema/pathway-schema";
import { getBlock } from "@/state/catalog";
import { usePathwayStore } from "@/state/usePathwayStore";
import { FieldRenderer } from "@/inspector/FieldRenderer";

type Values = Record<string, unknown>;

function buildSchema(fields: ParamField[]): z.ZodType<Values> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    switch (f.kind) {
      case "number":
        shape[f.key] = z
          .number()
          .min(f.min ?? -Infinity)
          .max(f.max ?? Infinity);
        break;
      case "select":
        shape[f.key] = z.enum(
          f.options.map((o) => o.value) as [string, ...string[]]
        );
        break;
      case "multiselect":
        shape[f.key] = z.array(
          z.enum(f.options.map((o) => o.value) as [string, ...string[]])
        );
        break;
      case "boolean":
        shape[f.key] = z.boolean();
        break;
    }
  }
  return z.object(shape) as unknown as z.ZodType<Values>;
}

export function NodePropertiesForm({ nodeId }: { nodeId: string }) {
  const node = usePathwayStore((s) => s.nodes.find((n) => n.id === nodeId));
  const updateNode = usePathwayStore((s) => s.updateNode);
  const def = node ? getBlock(node.data.blockId) : undefined;

  const schema = useMemo(() => buildSchema(def?.paramSchema ?? []), [def]);

  const { control, watch } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      ...(def?.defaultParams ?? {}),
      ...(node?.data.params ?? {}),
    },
  });

  // Debounced write-back to the store so dragging a slider doesn't flood zundo.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const sub = watch((values) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        updateNode(nodeId, { data: { params: { ...values } } });
      }, 100);
    });
    return () => {
      sub.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [watch, updateNode, nodeId]);

  if (!node || !def) return null;
  if (def.paramSchema.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        This block has no configurable parameters.
      </p>
    );
  }

  return (
    <form className="space-y-4">
      {def.paramSchema.map((field) => (
        <Controller
          key={field.key}
          name={field.key}
          control={control}
          render={({ field: rhf }) => (
            <FieldRenderer
              field={field}
              value={rhf.value}
              onChange={rhf.onChange}
            />
          )}
        />
      ))}
    </form>
  );
}

export default NodePropertiesForm;
