import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "../../../src/components/ui/input";

describe("Input", () => {
  it("renders with default classes", () => {
    render(<Input placeholder="Test Input" />);
    const input = screen.getByPlaceholderText("Test Input");
    expect(input).toHaveClass(
      "w-full",
      "border",
      "rounded-md",
      "shadow-sm"
    );
  });

  it("merges custom className", () => {
    render(<Input className="custom-class" placeholder="Test Input" />);
    const input = screen.getByPlaceholderText("Test Input");
    expect(input).toHaveClass("custom-class", "w-full");
  });

  it("handles user input", () => {
    const handleChange = vi.fn();
    render(<Input placeholder="Test Input" onChange={handleChange} />);
    const input = screen.getByPlaceholderText("Test Input");
    
    fireEvent.change(input, { target: { value: "test value" } });
    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue("test value");
  });

  it("passes through HTML attributes", () => {
    render(
      <Input
        type="email"
        required
        disabled
        placeholder="Email Input"
      />
    );
    const input = screen.getByPlaceholderText("Email Input");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("required");
    expect(input).toBeDisabled();
  });
});
