import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/admin')({
  // Redirect non-admin users before the component tree renders
  beforeLoad: ({ context }: any) => {
    const role = (context as any)?.user?.role;
    if (role && role !== 'admin') {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: () => <Outlet />,
});
