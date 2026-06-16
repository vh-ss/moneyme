interface Props {
  onExpense: () => void;
  onIncome: () => void;
}

// Дві великі кнопки швидкого додавання: «−» витрата, «+» надходження.
export default function QuickActions({ onExpense, onIncome }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={onExpense}
        className="flex items-center justify-center gap-3 rounded-2xl bg-red-50 py-5 text-red-600 transition hover:bg-red-100"
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-red-600 text-2xl font-bold leading-none text-white">
          −
        </span>
        <span className="text-base font-semibold">Витрата</span>
      </button>
      <button
        onClick={onIncome}
        className="flex items-center justify-center gap-3 rounded-2xl bg-green-50 py-5 text-green-700 transition hover:bg-green-100"
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-green-600 text-2xl font-bold leading-none text-white">
          +
        </span>
        <span className="text-base font-semibold">Надходження</span>
      </button>
    </div>
  );
}
