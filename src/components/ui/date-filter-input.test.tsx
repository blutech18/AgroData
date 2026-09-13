// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DateFilterInput, formatDisplayDate } from "./date-filter-input";

describe("DateFilterInput", () => {
  it("renders with placeholder text instead of mm/dd/yyyy when empty", () => {
    render(<DateFilterInput value="" onChange={() => {}} placeholder="From" />);
    const input = screen.getByPlaceholderText("From");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
    expect(screen.queryByText(/mm\/dd\/yyyy/i)).not.toBeInTheDocument();
  });

  it("retains placeholder and never displays mm/dd/yyyy when clicked or focused", () => {
    render(<DateFilterInput value="" onChange={() => {}} placeholder="To" />);
    const input = screen.getByPlaceholderText("To");
    fireEvent.focus(input);
    expect(input).toHaveAttribute("type", "text");
    expect(screen.queryByText(/mm\/dd\/yyyy/i)).not.toBeInTheDocument();
    fireEvent.click(input);
    expect(screen.queryByText(/mm\/dd\/yyyy/i)).not.toBeInTheDocument();
  });

  it("displays the formatted date when value is present", () => {
    render(<DateFilterInput value="2026-09-13" onChange={() => {}} placeholder="From" />);
    const expected = formatDisplayDate("2026-09-13");
    const input = screen.getByDisplayValue(expected);
    expect(input).toBeInTheDocument();
  });

  it("calls onChange when a date is selected via the native picker", () => {
    const onChange = vi.fn();
    const { container } = render(<DateFilterInput value="" onChange={onChange} placeholder="From" />);
    const hiddenDateInput = container.querySelector('input[type="date"]');
    expect(hiddenDateInput).toBeInTheDocument();
    fireEvent.change(hiddenDateInput!, { target: { value: "2026-09-13" } });
    expect(onChange).toHaveBeenCalledWith("2026-09-13");
  });

  it("provides a clear button to reset the date", () => {
    const onChange = vi.fn();
    render(<DateFilterInput value="2026-09-13" onChange={onChange} placeholder="From" />);
    const clearBtn = screen.getByRole("button", { name: /clear date/i });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("clears on Backspace / Delete keydown", () => {
    const onChange = vi.fn();
    render(<DateFilterInput value="2026-09-13" onChange={onChange} placeholder="From" />);
    const input = screen.getByDisplayValue(formatDisplayDate("2026-09-13"));
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(onChange).toHaveBeenCalledWith("");
  });
});
