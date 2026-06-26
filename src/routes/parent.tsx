import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/parent")({
  component: () => <Outlet />,
});
