/**
 * Skeletscherm voor de Home pagina — getoond terwijl serverdata laadt.
 * Komt overeen met de lay-out van DashboardContent.
 */
export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-20 lg:pl-64 lg:pb-0">
      {/* Mobiele topbar placeholder */}
      <div className="lg:hidden px-4 pt-3 pb-1">
        <div className="flex items-center gap-3 h-9 mb-2">
          <div className="h-8 w-8 rounded-lg bg-gray-200 animate-pulse" />
          <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="h-10 w-full rounded-lg bg-gray-200 animate-pulse" />
      </div>

      <div className="p-4 lg:p-8 space-y-6">
        {/* Begroeting */}
        <div className="space-y-2">
          <div className="h-7 w-52 rounded-lg bg-gray-200 animate-pulse" />
          <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
        </div>

        {/* Snelle acties */}
        <div className="space-y-3">
          <div className="h-5 w-28 rounded bg-gray-200 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-gray-100 animate-pulse"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        </div>

        {/* Aankomende afspraken */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-44 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 shadow-sm space-y-2"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-2">
                <div className="h-4 w-3/5 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-16 rounded-full bg-gray-100 animate-pulse" />
              </div>
              <div className="h-3 w-2/5 rounded bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Laatste activiteit */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-36 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 shadow-sm flex items-start gap-3"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
                  <div className="h-3 w-16 rounded bg-gray-100 animate-pulse" />
                </div>
                <div className="h-3 w-full rounded bg-gray-100 animate-pulse" />
                <div className="h-3 w-4/5 rounded bg-gray-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
