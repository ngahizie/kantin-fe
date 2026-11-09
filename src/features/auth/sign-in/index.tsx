import { UtensilsCrossed, Utensils, CreditCard, Sparkles, Store, Zap } from 'lucide-react'
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
          <div className='absolute top-8 left-8 z-50'>
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
          <div className='flex-1 flex flex-col items-center justify-center relative animate-in fade-in slide-in-from-left-8 duration-1000 w-full px-8 mt-12'>
            <div className='relative w-full max-w-[540px] aspect-[4/3] flex items-center justify-center'>
              {/* Main Center Dashboard Mockup */}
              <div className='absolute inset-0 rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl has-border !border !border-white/60 dark:!border-slate-700/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden z-20 ring-1 ring-slate-900/5'>
                {/* Window Header */}
                <div className='h-14 has-border !border-b !border-white/40 dark:!border-slate-800/50 flex items-center px-6 gap-3 bg-white/40 dark:bg-slate-900/40'>
                  <div className='flex gap-2'>
                    <div className='h-3 w-3 rounded-full bg-[#ff5f56]' />
                    <div className='h-3 w-3 rounded-full bg-[#ffbd2e]' />
                    <div className='h-3 w-3 rounded-full bg-[#27c93f]' />
                  </div>
                  <div className='ml-4 h-7 px-3 bg-white/50 dark:bg-slate-800/50 rounded-lg mx-auto flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-xs'>
                    <Store className='w-3.5 h-3.5 text-blue-600 dark:text-blue-400' />
                    <span>Kantin Sehat SKOOLIA • POS Kasir</span>
                  </div>
                </div>

                {/* Window Body */}
                <div className='flex-1 flex flex-col p-6 gap-5 bg-gradient-to-br from-white/30 to-white/10 dark:from-slate-900/30 dark:to-slate-900/10'>
                  {/* Title Mockup */}
                  <div className='flex items-center gap-4'>
                    <div className='w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0'>
                      <UtensilsCrossed className='w-6 h-6 text-amber-600 dark:text-amber-400' />
                    </div>
                    <div>
                      <p className='text-sm font-bold text-slate-800 dark:text-white'>Operasional Kantin</p>
                      <p className='text-xs text-slate-500 dark:text-slate-400'>Sistem POS & Kasir Digital</p>
                    </div>
                  </div>

                  {/* Cards Skeleton Row */}
                  <div className='flex gap-4'>
                    <div className='h-20 flex-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl has-border !border !border-white/50 dark:!border-slate-700/50 shadow-sm flex items-center px-4'>
                      <div className='h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mr-3 shrink-0'>
                        <CreditCard className='w-5 h-5 text-indigo-500' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-xs font-bold text-slate-800 dark:text-white truncate'>1,250+ Transaksi</p>
                        <p className='text-[10px] text-emerald-500 font-semibold truncate'>Non-Tunai / RFID Aktif</p>
                      </div>
                    </div>
                    <div className='h-20 flex-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl has-border !border !border-white/50 dark:!border-slate-700/50 shadow-sm flex items-center px-4'>
                      <div className='h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mr-3 shrink-0'>
                        <Utensils className='w-5 h-5 text-emerald-500' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-xs font-bold text-slate-800 dark:text-white truncate'>Menu Siap Saji</p>
                        <p className='text-[10px] text-slate-500 font-medium truncate'>48 Pilihan Tersedia</p>
                      </div>
                    </div>
                  </div>

                  {/* Chart Section */}
                  <div className='flex-1 w-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl has-border !border !border-white/50 dark:!border-slate-700/50 shadow-sm p-4 lg:p-5 flex flex-col justify-between overflow-hidden'>
                    <div className='flex items-center justify-between'>
                      <span className='text-[11px] font-bold text-slate-600 dark:text-slate-400'>Aktivitas Transaksi Jam Istirahat</span>
                      <span className='text-[10px] font-semibold text-emerald-500'>+96% Kecepatan Kasir</span>
                    </div>
                    <div className='flex items-end gap-3 xl:gap-4 h-20 pt-2'>
                      {[35, 60, 45, 95, 75, 100, 80].map((h, i) => (
                        <div
                          key={i}
                          className='flex-1 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg transition-all duration-500 hover:from-blue-400 hover:to-cyan-300 hover:opacity-90'
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Element 1 - Transaksi Cepat RFID */}
              <div
                className='absolute -top-[10%] p-4 -right-[15%] z-30 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] has-border !border !border-slate-100 dark:!border-slate-700 flex items-center gap-4 animate-bounce'
                style={{ animationDuration: '4s' }}
              >
                <div className='w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0'>
                  <Zap className='w-6 h-6 text-emerald-600 dark:text-emerald-400' />
                </div>
                <div>
                  <p className='text-sm font-bold text-slate-800 dark:text-white'>Transaksi Cepat</p>
                  <p className='text-xs text-slate-500 font-medium'>Tap RFID &lt; 1 Detik</p>
                </div>
              </div>

              {/* Floating Element 2 - Siswa Terlayani */}
              <div
                className='absolute top-[45%] p-4 -left-[20%] z-30 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] has-border !border !border-slate-100 dark:!border-slate-700 animate-bounce flex items-center gap-4'
                style={{ animationDuration: '4.5s', animationDelay: '1s' }}
              >
                <div className='w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0 border-2 border-white dark:border-slate-800'>
                  <UtensilsCrossed className='w-6 h-6 text-blue-600 dark:text-blue-400' />
                </div>
                <div>
                  <p className='text-sm font-bold text-slate-800 dark:text-white'>1,500+ Siswa Terlayani</p>
                  <p className='text-xs text-emerald-500 font-semibold'>Layanan Bebas Antre</p>
                </div>
              </div>

              {/* Floating Element 3 - Menu Terlaris */}
              <div
                className='absolute -bottom-[5%] p-4 -right-[10%] z-30 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] has-border !border !border-slate-100 dark:!border-slate-700 animate-bounce'
                style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}
              >
                <div className='flex items-center gap-3 mb-2'>
                  <div className='w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0'>
                    <Sparkles className='w-4 h-4 text-amber-600 dark:text-amber-400' />
                  </div>
                  <div>
                    <p className='text-xs font-bold text-slate-800 dark:text-white'>Menu Terlaris Hari Ini</p>
                    <p className='text-[10px] text-slate-500 font-medium'>Stok Siap Saji Terpantau</p>
                  </div>
                </div>
                <div className='h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden'>
                  <div className='h-full bg-amber-500 w-[85%] rounded-full' />
                </div>
              </div>
            </div>

            {/* Gradient overlay to blend bottom into the background */}
            <div className='absolute bottom-0 left-0 w-full h-[25%] bg-gradient-to-t from-[#FDFCF8] via-[#FDFCF8]/90 to-transparent dark:from-[#050510] dark:via-[#050510]/90 pointer-events-none z-20' />
          </div>

          {/* Bottom Footer */}
          <div className='absolute bottom-8 left-8 right-8 z-30 flex justify-center lg:justify-start'>
            <p className='text-sm text-slate-500 font-medium'>
              &copy; {new Date().getFullYear()} Kantin SKOOLIA. Sistem Manajemen & Kasir Sekolah.
            </p>
          </div>
        </div>
      </div>

      {/* SISI KANAN: FORM LOGIN */}
      <div className='w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12'>
        <div className='mx-auto flex w-full max-w-[420px] flex-col justify-center space-y-8 animate-in fade-in slide-in-from-right-8 duration-700'>
          <div className='flex flex-col space-y-2 text-center lg:text-left'>
            <div className='lg:hidden mx-auto mb-6 inline-flex'>
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

          <div className='has-border !border sm:!border-2 !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a] rounded-3xl sm:rounded-4xl sm:shadow-xl sm:shadow-blue-100/40 dark:shadow-none p-6 sm:p-8'>
            <UserAuthForm />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignIn
