import { Blocks, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Badge variant="secondary">Foundation ready</Badge>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Active communities, clearly managed.</h1>
        <p className="mt-2 text-muted-foreground">A clean architecture shell for Rely Active’s next generation.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Architecture', 'React 19 + Vite'],
          ['UI system', 'Complete shadcn registry'],
          ['API contract', 'Versioned and typed'],
        ].map(([title, value]) => (
          <Card key={title}>
            <CardHeader>
              <CardDescription>{title}</CardDescription>
              <CardTitle>{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Foundation status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <ShieldCheck />
            Protected routing and persisted auth
          </div>
          <div className="flex items-center gap-3">
            <Blocks />
            Composable UI and typed data tooling
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
