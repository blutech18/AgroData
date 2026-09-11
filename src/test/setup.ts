// Global Vitest setup. Registers @testing-library/jest-dom matchers (e.g.
// toBeInTheDocument, toBeDisabled) and unmounts rendered components after each
// test so DOM from one test does not leak into the next. Harmless for
// node-environment logic tests (cleanup is a no-op when nothing is mounted).
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
