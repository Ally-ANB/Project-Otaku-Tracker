# 📖 Dicionário do Projeto da Estante (Sora Architecture)

Este arquivo serve como mapa para entender onde cada peça do sistema vive e o que ela faz. Se você é novo no projeto, comece por aqui!

## 📂 Pastas Principais
- `src/app/`: O coração do site. É aqui que ficam as páginas que o usuário vê (ex: a rota inicial e o perfil).
- `src/app/components/`: Onde guardamos os "blocos de Lego". São os pedaços menores (botões, modais, cards) que usamos para montar as telas grandes.

## 📄 Páginas (Telas Inteiras)
- `page.tsx` (Raiz): A base da nossa **Estante Principal**. É ela que carrega o layout da Netflix/Sora, verifica quem está logado e exibe o painel principal.
- `perfil/page.tsx`: A **Página de Perfil**. Onde o usuário edita suas informações (Avatar, Bio, PIN) e escolhe a "Aura" (cor temática) do seu perfil.

## 🧩 Componentes Centrais (Os Blocos de Lego Mágicos)

### A Interface e Navegação
- **`SoraSidebar.tsx`**: A barra lateral esquerda (Guia de Navegação). É compacta ("Zero Scroll") e usa ícones do `lucide-react`. Guarda os atalhos para animes, mangás, configurações e logout.
- **`SoraHomeView.tsx`**: O cérebro da vitrine. Organiza a fileira de Favoritos, as abas de Status (Lendo, Completos, etc.) e controla a grade de obras que se expande para baixo.
- **`StatusMangaCarousel`**: O carrossel horizontal onde as obras deslizam. Ele possui a função de *Drag-to-Scroll* (arrastar com o mouse para o lado).

### Obras e Detalhes
- **`MangaCard.tsx`**: O "cartãozinho" individual de cada obra. Em repouso, mostra apenas capa e título. Ao passar o mouse (*Hover*), ele revela um painel de vidro escuro com os botões de controle de capítulos (`-`, `atual`, `+`).
- **`InspecaoModal.tsx`**: O "Painel de Controle" de uma obra. A janela escura e elegante que abre quando clicamos em um card, permitindo alterar notas, sinopse, status e progresso.

### Ferramentas Globais
- **`OmniSearch`**: Nosso motor de busca universal. É aqui que adicionamos novas obras buscando em bancos de dados mundiais (AniList, TMDB, RAWG, Google Books), tudo em uma interface de busca única.
- **`RadioHunter`**: O player de música fixado no canto da tela, que toca trilhas sonoras enquanto o usuário navega.

## 🧠 Conceitos e Ferramentas Importantes
- **Framer Motion**: A biblioteca que usamos para fazer as coisas aparecerem, sumirem ou se moverem na tela de forma suave (animações e expansões de grade).
- **Lucide React**: Nosso pacote oficial de ícones. **Regra visual**: Não usamos emojis (`📚`, `⭐`) na interface (UI) do projeto, usamos apenas ícones vetoriais do Lucide para manter um visual limpo e profissional.
- **Sistema Híbrido (Fallback)**: Quando buscamos um livro, tentamos o *Google Books* primeiro. Se ele falhar, o sistema automaticamente "cai" para o *Open Library*. Isso impede que a tela quebre.
- **Session Storage**: A memória de curto prazo do navegador. Garante que o login de um perfil (via PIN) seja esquecido por segurança assim que o usuário fecha a aba.

## 🗄️ Banco de Dados (Resumo Seguro)
- **Tabela `mangas/obras`**: Guarda os dados vitais das mídias (título, nota, progresso, status, de qual usuário é).
- **Tabela `perfis`**: Guarda a identidade de cada perfil do sistema (nome, link da imagem de avatar, bio e o tema de cor escolhido).
