import { ActionFunctionArgs, MetaFunction, redirect } from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server'

export const meta: MetaFunction = () => {
  return [
    { title: 'Todos | Demo Stack - Remix' },
    { name: 'description', content: 'The Todos page of the Demo Stack - Remix!' },
  ]
}

export async function loader() {
  const todos = await prisma.todo.findMany({ orderBy: [{ done: 'asc' }, { createdAt: 'asc' }] })
  return {
    todos: todos ?? [],
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')
  if (intent === 'create') {
    const title = formData.get('title')
    if (!title) return
    await prisma.todo.create({ data: { title: title.toString() } })
  }
  if (intent === 'delete') {
    const id = formData.get('id')
    if (!id) return
    await prisma.todo.delete({ where: { id: parseInt(id.toString()) } })
  }
  if (intent === 'toggle') {
    const id = formData.get('id')
    if (!id) return
    const done = formData.get('done') === 'true'
    await prisma.todo.update({
      where: { id: parseInt(id.toString()) },
      data: { done },
    })
  }

  return redirect('/todos')
}

export default function Todos() {
  const { todos } = useLoaderData<typeof loader>()

  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Demo Stack - Remix - Todos</h1>
      <Form method="post" action="/todos" className="space-x-4">
        <input
          type="text"
          name="title"
          placeholder="Create a new todo"
          className="border border-gray-200 rounded-lg p-4 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        />
        <button type="submit" className="bg-blue-500 text-white rounded-lg p-2 shadow-md py-4 px-8">
          Create
        </button>
        <input type="hidden" name="intent" value="create" />
      </Form>
      {todos?.length ? (
        <div className="space-y-4">
          {todos.map((todo) => (
            <div className="border border-gray-200 rounded-lg p-4 shadow-md" key={todo.id}>
              <div className="flex justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500 dark:text-gray-400">
                    {new Date(todo.createdAt).toLocaleDateString()}
                  </span>
                  <span>{todo.title}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Form method="post" action="/todos" className="space-x-4">
                    <input type="hidden" name="id" value={todo.id} />
                    <input type="hidden" name="intent" value="toggle" />
                    <input type="hidden" name="done" value={todo.done ? 'false' : 'true'} />
                    <button
                      type="submit"
                      className={`${todo.done ? 'bg-indigo-500' : 'bg-green-500'} text-white rounded-lg p-2 shadow-md flex items-center justify-center`}
                    >
                      {todo.done ? 'Not done' : 'Done'}
                    </button>
                  </Form>
                  <Form method="post" action="/todos" className="space-x-4">
                    <input type="hidden" name="id" value={todo.id} />
                    <input type="hidden" name="intent" value="delete" />
                    <button
                      type="submit"
                      className="border border-red-500 text-red-500 rounded-lg p-2 shadow-md w-8 h-8 flex items-center justify-center"
                    >
                      x
                    </button>
                  </Form>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <p className="text-gray-500 dark:text-gray-400">No todos yet</p>
        </div>
      )}
    </div>
  )
}
