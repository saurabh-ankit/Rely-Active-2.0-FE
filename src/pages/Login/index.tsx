import { Activity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/stores/auth-store'

export default function Login() {
  const signIn = useAuthStore((state) => state.signIn)
  const navigate = useNavigate()
  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Activity />
          <CardTitle>Welcome to Rely Active</CardTitle>
          <CardDescription>Foundation workspace for connected community operations.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              signIn('foundation-demo-token')
              navigate('/')
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" defaultValue="admin@relyactive.local" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" type="password" defaultValue="foundation" required />
              </Field>
              <Button type="submit">Enter workspace</Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
