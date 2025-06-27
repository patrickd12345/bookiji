import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../../../src/components/ui/card";

describe("Card Components", () => {
  describe("Card", () => {
    it("renders with default classes", () => {
      render(<Card>Card Content</Card>);
      const card = screen.getByText("Card Content");
      expect(card).toHaveClass("bg-white", "border", "border-gray-200", "rounded-lg", "shadow-sm");
    });

    it("merges custom className", () => {
      render(<Card className="custom-class">Card Content</Card>);
      const card = screen.getByText("Card Content");
      expect(card).toHaveClass("custom-class", "bg-white");
    });
  });

  describe("CardHeader", () => {
    it("renders with default classes", () => {
      render(<CardHeader>Header Content</CardHeader>);
      const header = screen.getByText("Header Content");
      expect(header).toHaveClass("p-6", "pb-3");
    });
  });

  describe("CardTitle", () => {
    it("renders with default classes", () => {
      render(<CardTitle>Title Content</CardTitle>);
      const title = screen.getByText("Title Content");
      expect(title).toHaveClass("text-lg", "font-semibold", "text-gray-900");
    });
  });

  describe("CardContent", () => {
    it("renders with default classes", () => {
      render(<CardContent>Content</CardContent>);
      const content = screen.getByText("Content");
      expect(content).toHaveClass("p-6", "pt-0");
    });
  });

  describe("CardDescription", () => {
    it("renders with default classes", () => {
      render(<CardDescription>Description</CardDescription>);
      const description = screen.getByText("Description");
      expect(description).toHaveClass("text-sm", "text-gray-600");
    });
  });
});
