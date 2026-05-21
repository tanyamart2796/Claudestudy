import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup, waitFor } from "@testing-library/react";

const mockPush = vi.fn();
const mockSignInAction = vi.fn();
const mockSignUpAction = vi.fn();
const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
const mockGetProjects = vi.fn();
const mockCreateProject = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignInAction(...args),
  signUp: (...args: unknown[]) => mockSignUpAction(...args),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

import { useAuth } from "@/hooks/use-auth";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInAction.mockResolvedValue({ success: true });
    mockSignUpAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "new-project-id" });
  });

  afterEach(() => {
    cleanup();
  });

  describe("initial state", () => {
    test("exposes signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signIn — happy paths", () => {
    test("calls the signIn action with the provided credentials", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "secret123");
      });

      expect(mockSignInAction).toHaveBeenCalledTimes(1);
      expect(mockSignInAction).toHaveBeenCalledWith(
        "user@example.com",
        "secret123"
      );
    });

    test("returns the result from the signIn action", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useAuth());

      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signIn("a@b.com", "pw12345678");
      });

      expect(returnValue).toEqual({ success: true });
    });

    test("creates a project from anon work when messages exist, clears anon work, and routes to the new project", async () => {
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "hi" }],
        fileSystemData: { "/App.jsx": { type: "file", content: "x" } },
      });
      mockCreateProject.mockResolvedValue({ id: "anon-promoted-id" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pw12345678");
      });

      expect(mockCreateProject).toHaveBeenCalledTimes(1);
      const createArg = mockCreateProject.mock.calls[0][0];
      expect(createArg.messages).toEqual([{ role: "user", content: "hi" }]);
      expect(createArg.data).toEqual({
        "/App.jsx": { type: "file", content: "x" },
      });
      expect(typeof createArg.name).toBe("string");
      expect(createArg.name).toMatch(/^Design from /);

      expect(mockClearAnonWork).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/anon-promoted-id");
      // Should NOT have queried projects in this branch
      expect(mockGetProjects).not.toHaveBeenCalled();
    });

    test("routes to the most recent existing project when no anon work is present", async () => {
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "recent-id" },
        { id: "older-id" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pw12345678");
      });

      expect(mockGetProjects).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/recent-id");
      // No project creation in this branch
      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockClearAnonWork).not.toHaveBeenCalled();
    });

    test("creates a new empty project when there is no anon work and no existing projects", async () => {
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "fresh-id" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pw12345678");
      });

      expect(mockCreateProject).toHaveBeenCalledTimes(1);
      const arg = mockCreateProject.mock.calls[0][0];
      expect(arg.messages).toEqual([]);
      expect(arg.data).toEqual({});
      expect(arg.name).toMatch(/^New Design #\d+$/);
      expect(mockPush).toHaveBeenCalledWith("/fresh-id");
      expect(mockClearAnonWork).not.toHaveBeenCalled();
    });
  });

  describe("signUp — happy paths", () => {
    test("calls the signUp action with the provided credentials", async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password1");
      });

      expect(mockSignUpAction).toHaveBeenCalledTimes(1);
      expect(mockSignUpAction).toHaveBeenCalledWith(
        "new@example.com",
        "password1"
      );
    });

    test("returns the result from the signUp action", async () => {
      mockSignUpAction.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useAuth());

      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signUp("a@b.com", "pw12345678");
      });

      expect(returnValue).toEqual({ success: true });
    });

    test("runs the same post-auth flow as signIn (promotes anon work)", async () => {
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "hi" }],
        fileSystemData: { "/App.jsx": { type: "file", content: "y" } },
      });
      mockCreateProject.mockResolvedValue({ id: "anon-via-signup" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("a@b.com", "pw12345678");
      });

      expect(mockCreateProject).toHaveBeenCalledTimes(1);
      expect(mockClearAnonWork).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/anon-via-signup");
    });
  });

  describe("failed auth", () => {
    test("signIn returns the failure result without running post-auth flow", async () => {
      mockSignInAction.mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signIn("a@b.com", "wrong");
      });

      expect(returnValue).toEqual({
        success: false,
        error: "Invalid credentials",
      });
      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockGetProjects).not.toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("signUp returns the failure result without running post-auth flow", async () => {
      mockSignUpAction.mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signUp("a@b.com", "pw12345678");
      });

      expect(returnValue).toEqual({
        success: false,
        error: "Email already registered",
      });
      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("isLoading lifecycle", () => {
    test("is true while signIn is in flight and false after it resolves", async () => {
      let resolveAction: (v: { success: boolean }) => void;
      mockSignInAction.mockImplementation(
        () =>
          new Promise((res) => {
            resolveAction = res;
          })
      );

      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);

      let pending: Promise<unknown>;
      act(() => {
        pending = result.current.signIn("a@b.com", "pw12345678");
      });

      await waitFor(() => expect(result.current.isLoading).toBe(true));

      await act(async () => {
        resolveAction!({ success: true });
        await pending!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("is true while signUp is in flight and false after it resolves", async () => {
      let resolveAction: (v: { success: boolean }) => void;
      mockSignUpAction.mockImplementation(
        () =>
          new Promise((res) => {
            resolveAction = res;
          })
      );

      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);

      let pending: Promise<unknown>;
      act(() => {
        pending = result.current.signUp("a@b.com", "pw12345678");
      });

      await waitFor(() => expect(result.current.isLoading).toBe(true));

      await act(async () => {
        resolveAction!({ success: true });
        await pending!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false even when signIn rejects", async () => {
      mockSignInAction.mockRejectedValue(new Error("network down"));
      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signIn("a@b.com", "pw12345678");
        })
      ).rejects.toThrow("network down");

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false even when signUp rejects", async () => {
      mockSignUpAction.mockRejectedValue(new Error("boom"));
      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signUp("a@b.com", "pw12345678");
        })
      ).rejects.toThrow("boom");

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("anon work with an empty messages array falls through to the projects branch", async () => {
      mockGetAnonWorkData.mockReturnValue({
        messages: [],
        fileSystemData: { "/foo.jsx": { type: "file", content: "z" } },
      });
      mockGetProjects.mockResolvedValue([{ id: "fallback-id" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pw12345678");
      });

      // Did not treat empty-messages anon work as promotable
      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/fallback-id");
    });

    test("uses the first project from getProjects when several exist", async () => {
      mockGetProjects.mockResolvedValue([
        { id: "first" },
        { id: "second" },
        { id: "third" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pw12345678");
      });

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/first");
    });

    test("new-project fallback name uses an integer in [0, 99999]", async () => {
      const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99999);
      try {
        mockGetAnonWorkData.mockReturnValue(null);
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "fresh-id" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("a@b.com", "pw12345678");
        });

        const arg = mockCreateProject.mock.calls[0][0];
        const match = arg.name.match(/^New Design #(\d+)$/);
        expect(match).not.toBeNull();
        const n = Number(match![1]);
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(99999);
      } finally {
        randomSpy.mockRestore();
      }
    });
  });
});
