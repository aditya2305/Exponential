import Head from 'next/head'
import { ChatBubbleLeftIcon, PhoneIcon, CalculatorIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

const features = [
  {
    name: 'AI Messaging',
    description: 'Using email, SMS, and more. Feli speaks to your data leads at scale to book appointments.',
    icon: ChatBubbleLeftIcon,
  },
  {
    name: 'AI Dialing',
    description: 'After a confirmed appointment, Feli dials and transfers the leads to you on pickup.',
    icon: PhoneIcon,
  },
  {
    name: 'AI Quality Checks',
    description: 'Feli looks at the agents that took the call, and reviewing it based on your parameters.',
    icon: CalculatorIcon,
  },
  {
    name: 'AI Firewall',
    description: 'Feli automatically scrubs data leads against the litigator and DNC list.',
    icon: ShieldCheckIcon,
  },
]

export default function Home() {
  return (
    <>
      <Head>
        <title>Feli AI - AI Appointments at scale</title>
        <meta name="description" content="Insurance AI agent that protects you against litigation, books calls, report feedback, and more." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="bg-black min-h-screen">
        <header className="absolute inset-x-0 top-0 z-50">
          <nav className="flex items-center justify-between p-6 lg:px-8">
            <div className="flex lg:flex-1">
              <a href="#" className="-m-1.5 p-1.5">
                <span className="text-white text-2xl font-bold">Feli</span>
              </a>
            </div>
            <div className="flex flex-1 justify-end">
              <a href="#" className="text-sm font-semibold leading-6 text-white mr-4">
                Join Waitlist
              </a>
              <a href="#" className="text-sm font-semibold leading-6 text-white">
                Login
              </a>
            </div>
          </nav>
        </header>

        <main>
          {/* Hero section */}
          <div className="relative isolate pt-14">
            <div className="py-24 sm:py-32">
              <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="text-center">
                  <p className="text-red-500 text-sm font-semibold">
                    Introducing Feli AI
                  </p>
                  <h1 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-6xl">
                    Get more sales through<br />AI Appointments at scale.
                  </h1>
                  <p className="mt-6 text-lg leading-8 text-gray-300">
                    Insurance AI agent that protects you against litigation,<br />
                    books calls, report feedback, and more.
                  </p>
                  <div className="mt-10">
                    <a
                      href="#"
                      className="rounded-md bg-red-600 px-8 py-3 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      JOIN WAITLIST
                    </a>
                  </div>
                </div>

                {/* Features grid */}
                <div className="mx-auto mt-32 max-w-2xl sm:mt-40 lg:mt-48 lg:max-w-4xl">
                  <div className="grid grid-cols-1 gap-y-16 gap-x-8 lg:grid-cols-2">
                    {features.map((feature) => (
                      <div key={feature.name} className="border border-gray-800 rounded-2xl p-8">
                        <div className="flex items-center gap-x-3">
                          <feature.icon className="h-5 w-5 text-white" aria-hidden="true" />
                          <h3 className="text-lg font-semibold leading-7 text-white">{feature.name}</h3>
                        </div>
                        <p className="mt-4 text-sm text-gray-300">{feature.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="mt-auto py-4 text-center text-gray-400 text-sm">
          <p>Feli AI is owned and operated by Magnitude.</p>
        </footer>
      </div>
    </>
  )
} 