import { SuperAdminAuthProvider } from './super-admin-auth-context'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SuperAdminAuthProvider>{children}</SuperAdminAuthProvider>
}
