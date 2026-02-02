# 🤝 Guia de Contribuição - ContaAê

Obrigado pelo interesse em contribuir com o ContaAê! Este documento explica como você pode ajudar.

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Posso Contribuir?](#como-posso-contribuir)
- [Reportando Bugs](#reportando-bugs)
- [Sugerindo Melhorias](#sugerindo-melhorias)
- [Enviando Código](#enviando-código)
- [Padrões de Código](#padrões-de-código)

---

## 📜 Código de Conduta

Este projeto segue um Código de Conduta simples:

- ✅ Seja respeitoso e inclusivo
- ✅ Aceite críticas construtivas
- ✅ Foque no que é melhor para a comunidade
- ❌ Não use linguagem ofensiva
- ❌ Não faça ataques pessoais

---

## 🎯 Como Posso Contribuir?

### 🐛 Reportando Bugs

Encontrou um problema? Abra uma Issue com:

1. **Título claro** descrevendo o bug
2. **Passos para reproduzir** o problema
3. **Comportamento esperado** vs. **comportamento atual**
4. **Screenshots** se aplicável
5. **Ambiente** (navegador, dispositivo)

**Template:**
```markdown
## Descrição do Bug
[Descreva o bug de forma clara]

## Passos para Reproduzir
1. Vá para '...'
2. Clique em '...'
3. Role até '...'
4. Veja o erro

## Comportamento Esperado
[O que deveria acontecer]

## Screenshots
[Se aplicável]

## Ambiente
- Navegador: [ex: Chrome 120]
- Dispositivo: [ex: iPhone 12, Desktop]
- Sistema: [ex: Windows 11, iOS 17]
```

### 💡 Sugerindo Melhorias

Tem uma ideia? Abra uma Issue com:

1. **Título claro** da sugestão
2. **Descrição detalhada** da funcionalidade
3. **Por que seria útil** para os usuários
4. **Mockups ou exemplos** se possível

### 💻 Enviando Código

1. **Fork** o repositório
2. **Clone** seu fork:
   ```bash
   git clone https://github.com/seu-usuario/contaae.git
   ```
3. **Crie uma branch**:
   ```bash
   git checkout -b feature/minha-feature
   ```
4. **Faça suas alterações**
5. **Teste** suas alterações
6. **Commit** com mensagem clara:
   ```bash
   git commit -m "feat: adiciona funcionalidade X"
   ```
7. **Push** para seu fork:
   ```bash
   git push origin feature/minha-feature
   ```
8. **Abra um Pull Request**

---

## 📝 Padrões de Código

### JavaScript

```javascript
// ✅ Bom: funções com nomes descritivos
function carregarHistoriasRecentes() {
    // código
}

// ❌ Ruim: nomes genéricos
function load() {
    // código
}

// ✅ Bom: comentários quando necessário
// Gera ID único baseado em timestamp + random
function gerarIdUsuario() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ✅ Bom: tratamento de erros
try {
    await db.collection('historias').add(historia);
} catch (erro) {
    console.error('Erro ao publicar:', erro);
    alert('Erro ao publicar história. Tente novamente.');
}
```

### CSS

```css
/* ✅ Bom: classes descritivas */
.historia-card {
    background: white;
    padding: 20px;
}

/* ❌ Ruim: classes genéricas */
.card1 {
    background: white;
}

/* ✅ Bom: mobile-first */
.container {
    padding: 10px;
}

@media (min-width: 600px) {
    .container {
        padding: 20px;
    }
}
```

### HTML

```html
<!-- ✅ Bom: semântico e acessível -->
<button onclick="publicarHistoria()" class="btn-primary">
    Publicar História
</button>

<!-- ❌ Ruim: div para tudo -->
<div onclick="publicarHistoria()" class="btn">
    Publicar
</div>
```

### Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

| Tipo | Uso |
|------|-----|
| `feat:` | Nova funcionalidade |
| `fix:` | Correção de bug |
| `docs:` | Documentação |
| `style:` | Formatação (não afeta código) |
| `refactor:` | Refatoração |
| `test:` | Testes |
| `chore:` | Manutenção |

**Exemplos:**
```
feat: adiciona sistema de curtidas
fix: corrige contador de continuações
docs: atualiza README com novas instruções
style: formata código CSS
refactor: simplifica função de navegação
```

---

## 🏷️ Labels de Issues

| Label | Descrição |
|-------|-----------|
| `bug` | Algo não está funcionando |
| `enhancement` | Nova funcionalidade |
| `good first issue` | Bom para iniciantes |
| `help wanted` | Precisa de ajuda |
| `documentation` | Melhorias na documentação |
| `question` | Dúvida |

---

## ❓ Dúvidas?

- Abra uma Issue com a label `question`
- Entre em contato pelo Twitter: [@seu_handle](https://twitter.com/seu_handle)

---

**Obrigado por contribuir! 🎉**
