"use client"

import { signIn, signOut, useSession } from "next-auth/react"

export default function LoginButton() {
  const { data: session } = useSession()
console.log("Irgendwas",session);

  if (!session) {
    return (
      <button
        className="px-4 py-2 bg-green-600 text-white rounded"
        onClick={() => signIn("google")}
      >
        Login
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span>Hi, {session.user?.name}</span>
      <button
        className="px-4 py-1 bg-red-600 text-white rounded"
        onClick={() => signOut()}
      >
        Logout
      </button>
    </div>
  )
}
