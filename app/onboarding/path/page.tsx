'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Day = { id: string; day_number: number; title: string; description?: string }
type Progress = {
  day_id: string
  status: 'locked' | 'in_progress' | 'completed'
  materials_viewed: boolean
  test_passed: boolean
  homework_submitted: boolean
  day: Day
}
type Manager = { id: string; first_name: string; attestation_passed: boolean }

const DAY_ICONS = ['🏢', '📦', '🎯', '🏆']

export default function OnboardingPathPage() {
  const router = useRouter()
  const [manager, setManager] = useState<Manager | null>(null)
  const [progress, setProgress] = useState<Progress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('ob_token')
    if (!token) { router.push('/onboarding'); return }

    fetch('/api/onboarding/progress', { headers: { 'x-session-token': token } })
      .then(r => r.json())
      .then(data => {
        if (data.error) { router.push('/onboarding'); return }
        setManager(data.manager)
        setProgress(data.progress || [])
      })
      .finally(() => setLoading(false))
  }, [router])

  const completedCount = progress.filter(p => p.status === 'completed').length
  const totalCount = progress.length
  const overallPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-gray-500">Загрузка...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Шапка */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Привет, {manager?.first_name}! 👋</h1>
              <p className="text-gray-500 text-sm mt-1">Твой путь онбординга</p>
            </div>
            <Link href="/onboarding/chat" className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl px-4 py-2 text-sm font-medium transition">
              🤖 AI-ментор
            </Link>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Общий прогресс</span>
              <span>{overallPercent}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className="bg-indigo-500 h-2.5 rounded-full transition-all" style={{ width: `${overallPercent}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{completedCount} из {totalCount} дней пройдено</p>
          </div>
        </div>

        {/* Дни */}
        <div className="space-y-3">
          {progress.map((p, idx) => {
            const isLocked = p.status === 'locked'
            const isCompleted = p.status === 'completed'

            return (
              <div key={p.day_id} className={`bg-white rounded-2xl shadow-sm p-5 transition ${isLocked ? 'opacity-50' : 'hover:shadow-md'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${isCompleted ? 'bg-green-100' : p.status === 'in_progress' ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                    {isCompleted ? '✅' : DAY_ICONS[idx] || '📖'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">ДЕНЬ {p.day.day_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isCompleted ? 'bg-green-100 text-green-700' : p.status === 'in_progress' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isCompleted ? 'Пройден' : p.status === 'in_progress' ? 'Доступен' : 'Закрыт'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mt-0.5">{p.day.title}</h3>
                    {p.day.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{p.day.description}</p>}
                    {!isLocked && (
                      <div className="flex gap-3 mt-2">
                        <span className={`text-xs ${p.materials_viewed ? 'text-green-600' : 'text-gray-400'}`}>{p.materials_viewed ? '✓' : '○'} Материалы</span>
                        <span className={`text-xs ${p.test_passed ? 'text-green-600' : 'text-gray-400'}`}>{p.test_passed ? '✓' : '○'} Тест</span>
                        {p.day.day_number === 2 && (
                          <span className={`text-xs ${p.homework_submitted ? 'text-green-600' : 'text-gray-400'}`}>{p.homework_submitted ? '✓' : '○'} Домашка</span>
                        )}
                      </div>
                    )}
                  </div>
                  {!isLocked ? (
                    <Link href={`/onboarding/day/${p.day_id}`} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${isCompleted ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                      {isCompleted ? 'Повторить' : 'Перейти →'}
                    </Link>
                  ) : (
                    <div className="text-gray-300 text-xl">🔒</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Сертификат */}
        {manager?.attestation_passed && (
          <div className="mt-4 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-6 text-white text-center shadow-lg">
            <div className="text-4xl mb-2">🏆</div>
            <h2 className="text-xl font-bold">Поздравляем!</h2>
            <p className="text-sm opacity-90 mt-1">Ты успешно прошёл онбординг</p>
            <Link href="/onboarding/certificate" className="inline-block mt-3 bg-white text-orange-500 font-semibold px-6 py-2 rounded-xl hover:bg-orange-50 transition">
              Получить сертификат
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
