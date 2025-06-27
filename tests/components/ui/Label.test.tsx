import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Label } from "../../../src/components/ui/label";

describe("Label", () => {
  it("renders children correctly", () => {
    render(<Label>Test Label</Label>);
    expect(screen.getByText("Test Label")).toBeInTheDocument();
  });

  it("renders with default classes", () => {
    render(<Label>Test Label</Label>);
    const label = screen.getByText("Test Label");
    expect(label).toHaveClass(
      "block",
      "text-sm",
      "font-medium",
      "text-gray-700"
    );
  });

  it("merges custom className", () => {
    render(<Label className="custom-class">Test Label</Label>);
    const label = screen.getByText("Test Label");
    expect(label).toHaveClass("custom-class", "block");
  });

  it("passes through HTML attributes", () => {
    render(
      <Label
        htmlFor="test-input"
        data-testid="test-label"
      >
        Test Label
      </Label>
    );
    const label = screen.getByText("Test Label");
    expect(label).toHaveAttribute("for", "test-input");
    expect(label).toHaveAttribute("data-testid", "test-label");
  });

  it("works with form inputs", () => {
    render(
      <div>
        <Label htmlFor="test-input">Email</Label>
        <input id="test-input" type="email" />
      </div>
    );
    const label = screen.getByText("Email");
    const input = screen.getByRole("textbox");
    expect(label).toHaveAttribute("for", "test-input");
    expect(input).toHaveAttribute("id", "test-input");
  });
});
