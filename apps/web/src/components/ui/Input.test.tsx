import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Input } from "./Input.js";
import { Label } from "./Label.js";

describe("Input and Label Components", () => {
  it("associates label with input using htmlFor and id", () => {
    render(
      <div>
        <Label htmlFor="med-name">Medication Name</Label>
        <Input id="med-name" placeholder="Enter medicine" />
      </div>,
    );

    const input = screen.getByLabelText("Medication Name");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("id", "med-name");
  });

  it("links error message via aria-describedby and sets aria-invalid", () => {
    render(
      <div>
        <Label htmlFor="dosage">Dosage</Label>
        <Input id="dosage" error="Dosage cannot be blank" />
      </div>,
    );

    const input = screen.getByLabelText("Dosage");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "dosage-error");

    const errorAlert = screen.getByRole("alert");
    expect(errorAlert).toHaveTextContent("Dosage cannot be blank");
    expect(errorAlert).toHaveAttribute("id", "dosage-error");
  });

  it("passes axe accessibility tests", async () => {
    const { container } = render(
      <div>
        <Label htmlFor="accessible-input">Caregiver Phone</Label>
        <Input id="accessible-input" helperText="Include country code" />
      </div>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
