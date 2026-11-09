import { UtensilsCrossed, Utensils } from 'lucide-react'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  return (
    <div className='relative min-h-screen w-full flex bg-[#FDFCF8] dark:bg-[#050510] overflow-hidden'>
      {/* SISI KIRI: CREATIVE (Hero Ilustrasi Kantin) */}
      <div className='relative hidden w-1/2 lg:flex flex-col justify-between overflow-hidden bg-[#FDFCF8] dark:bg-[#050510] has-border !border-r !border-slate-200/60 dark:!border-slate-800/60'>
        {/* Subtle Grid Background */}
        <div className='absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none' />

        {/* Backdrop decorative circles */}
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] rounded-full border border-blue-50 dark:border-slate-800/30 z-0' />
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full border border-blue-100 dark:border-slate-800/50 z-0 border-dashed' />

        {/* Content */}
        <div className='relative z-10 flex flex-col h-full w-full'>
          {/* Top Logo */}
          <div className='absolute top-8 left-8 z-50 h-8 w-[130px] flex items-center'>
            <img
              src='/skoolia-gelap.png'
              alt='Skoolia Logo'
              className='h-8 w-auto object-contain dark:hidden'
            />
            <img
              src='/skoolia-terang.png'
              alt='Skoolia Logo'
              className='h-8 w-auto object-contain hidden dark:block'
            />
          </div>

          {/* Center Content / Hero Image - Fully Centered */}
          <div className='flex-1 flex flex-col items-center justify-center relative w-full px-8 mt-12'>
            <div className='relative w-full max-w-[540px] aspect-[4/3] flex items-center justify-center'>
              {/* Main Center Dashboard Mockup */}
              <div className='absolute inset-0 rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl has-border !border !border-slate-200/80 dark:!border-slate-800 shadow-none flex flex-col overflow-hidden z-20'>
                {/* Window Header */}
                <div className='h-14 has-border !border-b !border-slate-200/60 dark:!border-slate-800/80 flex items-center px-6 gap-3 bg-white/40 dark:bg-slate-900/40'>
                  <div className='flex gap-2'>
                    <div className='h-3 w-3 rounded-full bg-[#ff5f56]' />
                    <div className='h-3 w-3 rounded-full bg-[#ffbd2e]' />
                    <div className='h-3 w-3 rounded-full bg-[#27c93f]' />
                  </div>
                  <div className='ml-4 h-6 w-64 bg-slate-200/70 dark:bg-slate-800/80 rounded-lg mx-auto' />
                </div>

                {/* Window Body */}
                <div className='flex-1 flex flex-col p-6 gap-5 bg-white/20 dark:bg-slate-900/20'>
                  {/* Title Mockup */}
                  <div className='flex items-center gap-4'>
                    <div className='w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0'>
                      <UtensilsCrossed className='w-6 h-6 text-amber-600 dark:text-amber-400' />
                    </div>
                    <div className='flex flex-col gap-2'>
                      <div className='h-3.5 w-36 rounded-full bg-slate-300 dark:bg-slate-700/80' />
                      <div className='h-2.5 w-24 rounded-full bg-slate-200 dark:bg-slate-800/80' />
                    </div>
                  </div>

                  {/* Cards Skeleton Row */}
                  <div className='flex gap-4'>
                    <div className='h-20 flex-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl has-border !border !border-slate-200/60 dark:!border-slate-700/60 flex flex-col justify-center px-5 gap-2'>
                      <div className='h-3.5 w-36 rounded-full bg-slate-300 dark:bg-slate-700/80' />
                      <div className='h-2.5 w-20 rounded-full bg-slate-200 dark:bg-slate-800/80' />
                    </div>
                    <div className='h-20 flex-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl has-border !border !border-slate-200/60 dark:!border-slate-700/60 flex items-center px-4'>
                      <div className='h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mr-3 shrink-0'>
                        <Utensils className='w-5 h-5 text-emerald-500' />
                      </div>
                      <div className='flex-1 min-w-0 flex flex-col gap-2'>
                        <div className='h-3.5 w-28 rounded-full bg-slate-300 dark:bg-slate-700/80' />
                        <div className='h-2.5 w-16 rounded-full bg-slate-200 dark:bg-slate-800/80' />
                      </div>
                    </div>
                  </div>

                  {/* Chart Section */}
                  <div className='flex-1 w-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl has-border !border !border-slate-200/60 dark:!border-slate-700/60 p-4 lg:p-5 flex items-end overflow-hidden'>
                    <div className='flex items-end gap-3 xl:gap-4 h-full w-full pt-2'>
                      {[35, 60, 45, 95, 75, 100, 80].map((h, i) => (
                        <div
                          key={i}
                          className='flex-1 bg-blue-500 dark:bg-blue-500 rounded-t-lg'
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className='absolute bottom-8 left-8 right-8 z-30 flex justify-center lg:justify-start'>
            <p className='text-sm text-slate-500 font-medium'>
              &copy; {new Date().getFullYear()} Kantin Skoolia.
            </p>
          </div>
        </div>
      </div>

      {/* SISI KANAN: FORM LOGIN */}
      <div className='w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12'>
        <div className='mx-auto flex w-full max-w-[420px] flex-col justify-center space-y-8'>
          <div className='flex flex-col space-y-2 text-center lg:text-left'>
            <div className='lg:hidden mx-auto mb-6 flex items-center justify-center h-10 w-[160px]'>
              <img
                src='/skoolia-gelap.png'
                alt='Skoolia Logo'
                className='h-10 w-auto object-contain dark:hidden'
              />
              <img
                src='/skoolia-terang.png'
                alt='Skoolia Logo'
                className='h-10 w-auto object-contain hidden dark:block'
              />
            </div>
            <h1 className='text-3xl font-black tracking-tight text-slate-800 dark:text-white'>
              Selamat Datang!
            </h1>
            <p className='text-gray-500 dark:text-slate-400 font-medium text-base'>
              Masuk ke sistem operasional & kasir kantin.
            </p>
          </div>

          <div className='has-border !border sm:!border-2 !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a] rounded-3xl sm:rounded-4xl shadow-none p-6 sm:p-8'>
            <UserAuthForm />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignIn
