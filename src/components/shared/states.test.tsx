// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState, ErrorState, LoadingState } from "./states";

describe("shared state components", () => {
  it("LoadingState shows a default and a custom label", () => {
    const { rerender } = render(<LoadingState />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    rerender(<LoadingState label="Loading records…" />);
    expect(screen.getByText("Loading records…")).toBeInTheDocument();
  });

  it("EmptyState renders title and optional description", () => {
    render(<EmptyState title="No records" description="Add the first one." />);
    expect(screen.getByText("No records")).toBeInTheDocument();
    expect(screen.getByText("Add the first one.")).toBeInTheDocument();
  });

  it("ErrorState shows a fallback message and a provided one", () => {
    const { rerender } = render(<ErrorState />);
    expect(screen.getByText(/unable to load data/i)).toBeInTheDocument();
    rerender(<ErrorState message="Network failed" />);
    expect(screen.getByText("Network failed")).toBeInTheDocument();
  });
});
