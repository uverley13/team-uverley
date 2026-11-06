import { createFileRoute, redirect } from '@tanstack/react-router'

// Orders are listed in "Mi cuenta"; keep the old URL working.
export const Route = createFileRoute('/orders')({
  beforeLoad: () => {
    throw redirect({ to: '/account' })
  },
})
