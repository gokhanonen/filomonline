import { forwardRef, type ChangeEvent, type ReactNode } from "react";
import Cleave from "cleave.js/react";
import type { CleaveOptions } from "cleave.js/options";
import { Input, type InputProps } from "./Input";

export interface NumericInputProps
  extends Omit<
    InputProps<typeof Cleave>,
    "onChange" | "component" | "value" | "options"
  > {
  value?: number | string | null;
  onValueChange?: (value: number | undefined) => void;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  options?: CleaveOptions;
  suffix?: ReactNode;
  numeralDecimalScale?: number;
}

export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      value,
      onValueChange,
      onChange,
      options,
      suffix = "₺",
      numeralDecimalScale,
      ...props
    },
    ref,
  ) => {
    const defaultOptions: CleaveOptions = {
      numeral: true,
      numeralThousandsGroupStyle: "thousand",
      delimiter: ".",
      numeralDecimalMark: ",",
      numeralPositiveOnly: true,
      numeralDecimalScale: numeralDecimalScale ?? 2,
      ...options,
    };

    // Number veya string değeri Cleave için string'e çevir
    // JS number toString() "1450000.5" nokta içerir. Cleave'de decimalMark virgül olduğu için '.' -> ',' çeviriyoruz.
    const formattedValue =
      value === undefined || value === null || value === ""
        ? ""
        : typeof value === "number"
          ? String(value).replace(".", ",")
          : String(value);

    return (
      <Input
        component={Cleave}
        options={defaultOptions}
        value={formattedValue}
        suffix={suffix}
        {...props}
        onChange={(e: any) => {
          const rawVal = e?.target?.rawValue;
          if (onValueChange) {
            if (rawVal === "" || rawVal === undefined || rawVal === null) {
              onValueChange(undefined);
            } else {
              const num = Number(rawVal);
              onValueChange(Number.isNaN(num) ? undefined : num);
            }
          }
          if (onChange) {
            onChange(e);
          }
        }}
        ref={ref as any}
      />
    );
  },
);

NumericInput.displayName = "NumericInput";
