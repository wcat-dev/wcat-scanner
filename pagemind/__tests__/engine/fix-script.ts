import { getIssueFixScript } from "../../src/core/lib/engine";
import { NO_SKIP_CONTENT } from "../../src/core/lib/engine/models/issue-type";
import { skipNavigationMethod } from "../../src/core/lib/engine/fix/js";

describe("Fix Script", () => {
  test("runs and returns empty string", () => {
    const data = getIssueFixScript({}, 0, {});
    expect(data).toBe("");
  });

  test("runs and returns script for skip navigation", () => {
    const data = getIssueFixScript({ message: NO_SKIP_CONTENT }, 0, {});
    expect(data).toBe(skipNavigationMethod);
  });
});
