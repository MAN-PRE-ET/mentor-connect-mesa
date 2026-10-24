import { createMiddleware } from "@tanstack/react-start";
import { currentStudentKey } from "./student-key";

export const attachStudentKey = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const key = currentStudentKey();
  return next({ headers: key ? { "X-Student-Key": key } : {} });
});