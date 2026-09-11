// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TablePagination } from "./TablePagination";

const baseProps = {
  page: 2,
  totalPages: 5,
  total: 60,
  pageSize: 12,
  onPageChange: () => {},
};

describe("TablePagination", () => {
  it("shows the current record range and total", () => {
    render(<TablePagination {...baseProps} label="records" />);
    // page 2, pageSize 12 -> 13–24 of 60
    expect(screen.getByText(/13/)).toBeInTheDocument();
    expect(screen.getByText(/24/)).toBeInTheDocument();
    expect(screen.getByText(/60/)).toBeInTheDocument();
  });

  it("reports an empty result set", () => {
    render(<TablePagination {...baseProps} page={1} total={0} label="catch records" />);
    expect(screen.getByText(/No catch records found/i)).toBeInTheDocument();
  });

  it("navigates to the next page when the control is clicked", async () => {
    const onPageChange = vi.fn();
    render(<TablePagination {...baseProps} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByTitle("Next page"));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("disables the previous/first controls on the first page", () => {
    render(<TablePagination {...baseProps} page={1} />);
    expect(screen.getByTitle("Previous page")).toBeDisabled();
    expect(screen.getByTitle("First page")).toBeDisabled();
  });

  it("hides pagination controls when there is a single page", () => {
    render(<TablePagination {...baseProps} page={1} totalPages={1} total={5} />);
    expect(screen.queryByTitle("Next page")).not.toBeInTheDocument();
  });
});
