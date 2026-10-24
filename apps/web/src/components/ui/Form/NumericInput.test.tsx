import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { NumericInput } from "./NumericInput";

function TestWrapper({ initial }: { initial?: number }) {
  const [val, setVal] = useState<number | undefined>(initial);
  return (
    <div>
      <NumericInput
        label="Tutar"
        placeholder="0,00"
        value={val}
        onValueChange={setVal}
        data-testid="numeric-input"
      />
      <span data-testid="raw-val">{val ?? "empty"}</span>
    </div>
  );
}

describe("NumericInput", () => {
  it("renders and formats initial value with thousand separators", () => {
    render(<TestWrapper initial={1600000} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("1.600.000");
    expect(screen.getByTestId("raw-val").textContent).toBe("1600000");
  });

  it("updates raw value and formats on change", () => {
    render(<TestWrapper initial={23999} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("23.999");

    fireEvent.change(input, { target: { value: "1450000" } });
    expect(screen.getByTestId("raw-val").textContent).toBe("1450000");
  });

  it("handles decimal values properly", () => {
    render(<TestWrapper initial={1450000.5} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toContain("1.450.000");
  });
});
