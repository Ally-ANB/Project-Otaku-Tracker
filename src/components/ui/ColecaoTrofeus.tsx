export default function ColecaoTrofeus({ trofeusAtivos, aura }: { trofeusAtivos: any[], aura: any }) {
  return (
    <section className="max-w-6xl mx-auto mb-32 p-12 bg-[#0e0e11]/50 rounded-[4rem] border border-white/5 shadow-inner">
      <h3 className="text-[12px] font-black text-zinc-600 uppercase tracking-[0.6em] mb-12 text-center italic">Achievement Collection</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8">
        {trofeusAtivos.map((t: any) => (
          <div key={t.id} className={`flex flex-col items-center text-center transition-all duration-700 ${t.check ? 'opacity-100 scale-100' : 'opacity-20 grayscale scale-90'}`} title={t.desc}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-4 bg-zinc-900 border-2 ${t.check ? `border-white shadow-lg ${aura.shadow}` : 'border-zinc-800'}`}>{t.icone}</div>
            <p className={`text-[10px] font-black uppercase tracking-tighter mb-1 ${t.check ? aura.text : 'text-zinc-600'} transition-colors`}>{t.nome}</p>
            <p className="text-[8px] text-zinc-500 font-bold leading-tight px-2">{t.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}