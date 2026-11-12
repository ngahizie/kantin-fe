import { UtensilsCrossed, Utensils } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  return (
    <div className='relative min-h-screen w-full flex bg-background text-foreground overflow-hidden'>
      {/* SISI KIRI: CREATIVE (Hero Ilustrasi Kantin) */}
      <div className='relative hidden w-1/2 lg:flex flex-col justify-between overflow-hidden bg-muted/30 border-r border-border'>
        {/* Subtle Grid Background */}
        <div className='absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none' />

        {/* Backdrop decorative circles */}
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] rounded-full border border-border/50 z-0' />
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full border border-border/70 z-0 border-dashed' />

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
              <div className='absolute inset-0 rounded-xl bg-card/85 backdrop-blur-2xl border border-border shadow-xs flex flex-col overflow-hidden z-20'>
                {/* Window Header */}
                <div className='h-14 border-b border-border flex items-center px-6 gap-3 bg-muted/30'>
                  <div className='flex gap-2'>
                    <div className='h-3 w-3 rounded-full bg-[#ff5f56]' />
                    <div className='h-3 w-3 rounded-full bg-[#ffbd2e]' />
                    <div className='h-3 w-3 rounded-full bg-[#27c93f]' />
                  </div>
                  <div className='ml-4 h-6 w-64 bg-muted rounded-lg mx-auto' />
                </div>

                {/* Window Body */}
                <div className='flex-1 flex flex-col p-6 gap-5 bg-card/30'>
                  {/* Title Mockup */}
                  <div className='flex items-center gap-4'>
                    <div className='w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0'>
                      <UtensilsCrossed className='w-6 h-6 text-amber-600 dark:text-amber-400' />
                    </div>
                    <div className='flex flex-col gap-2'>
                      <div className='h-3.5 w-36 rounded-full bg-muted-foreground/30' />
                      <div className='h-2.5 w-24 rounded-full bg-muted' />
                    </div>
                  </div>

                  {/* Cards Skeleton Row */}
                  <div className='flex gap-4'>
                    <div className='h-20 flex-1 bg-card/90 backdrop-blur-md rounded-xl border border-border flex flex-col justify-center px-5 gap-2'>
                      <div className='h-3.5 w-36 rounded-full bg-muted-foreground/30' />
                      <div className='h-2.5 w-20 rounded-full bg-muted' />
                    </div>
                    <div className='h-20 flex-1 bg-card/90 backdrop-blur-md rounded-xl border border-border flex items-center px-4'>
                      <div className='h-10 w-10 rounded-full bg-emerald-500/15 flex items-center justify-center mr-3 shrink-0'>
                        <Utensils className='w-5 h-5 text-emerald-600 dark:text-emerald-400' />
                      </div>
                      <div className='flex-1 min-w-0 flex flex-col gap-2'>
                        <div className='h-3.5 w-28 rounded-full bg-muted-foreground/30' />
                        <div className='h-2.5 w-16 rounded-full bg-muted' />
                      </div>
                    </div>
                  </div>

                  {/* Chart Section */}
                  <div className='flex-1 w-full bg-card/90 backdrop-blur-md rounded-xl border border-border p-4 lg:p-5 flex items-end overflow-hidden'>
                    <div className='flex items-end gap-3 xl:gap-4 h-full w-full pt-2'>
                      {[35, 60, 45, 95, 75, 100, 80].map((h, i) => (
                        <div
                          key={i}
                          className='flex-1 bg-primary/80 rounded-t-lg'
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
            <p className='text-sm text-muted-foreground font-medium'>
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
            <h1 className='text-3xl font-bold tracking-tight text-foreground'>
              Selamat Datang!
            </h1>
            <p className='text-muted-foreground text-sm sm:text-base'>
              Masuk ke sistem operasional & kasir kantin.
            </p>
          </div>

          <Card className='p-6 sm:p-8'>
            <CardContent className='p-0'>
              <UserAuthForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default SignIn
