export default function MuralFavoritos({ mangasUsuario, aura }: { mangasUsuario: any[], aura: any }) {
  // Filtra apenas os favoritos para exibir no mural
  const favoritos = mangasUsuario.filter(m => m.favorito === true || m.favorito === "true");

  return (
    <section className="max-w-6xl mx-auto pb-32">
      <h3 className="text-[13px] font-black text-zinc-800 uppercase tracking-[0.8em] mb-16 text-center italic">Personal Mural</h3>
      {favoritos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          {favoritos.map(m => (
            <div key={m.id} className={`relative aspect-[3/4.5] rounded-[3rem] overflow-hidden border border-white/5 group shadow-2xl transition-all duration-500 hover:border-white/20 hover:${aura.shadow}`}>
              <img src={m.capa} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
              <div className="absolute bottom-10 left-10 right-10">
                 <p className="text-white font-black text-lg uppercase italic line-clamp-1 tracking-tighter mb-1">{m.titulo}</p>
                 <div className="flex items-center gap-2">
                    <span className="text-yellow-500 font-bold text-xs italic">★ RANKED</span>
                    <span className="text-zinc-500 font-black text-xs">{m.nota_pessoal}</span>
                 </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-24 border-2 border-dashed border-white/5 rounded-[4rem] opacity-30">
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.5em]">O Mural está aguardando seus favoritos</p>
        </div>
      )}
    </section>
  );
}