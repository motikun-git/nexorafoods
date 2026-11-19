import { InitialData } from '../context/InitialDataContext.jsx'
import { serverGet } from '../lib/serverApi.js'
import HomePage from '../views/HomePage.jsx'

export default async function Home() {
  const { body } = await serverGet('/home')
  return (
    <InitialData seed={body ? { '/home': body } : {}}>
      <HomePage />
    </InitialData>
  )
}
