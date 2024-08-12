import { MetaFunction, redirect } from '@remix-run/node'

export const meta: MetaFunction = () => {
  return [{ title: 'Demo Stack - Remix' }, { name: 'description', content: 'Welcome to the Demo Stack - Remix!' }]
}

export function loader() {
  return redirect('/todos')
}
