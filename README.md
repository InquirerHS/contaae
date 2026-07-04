# 📚 ContaAê - Histórias Colaborativas

> Onde histórias ganham vida com a sua ajuda!

[![Netlify Status](https://api.netlify.com/api/v1/badges/seu-badge-id/deploy-status)](https://contaae.netlify.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## 🎯 Sobre o Projeto

**ContaAê** é uma plataforma de histórias colaborativas onde qualquer pessoa pode começar uma história e outras pessoas podem continuar. É como uma rede social, mas ao invés de fotos... são histórias!

### Como funciona:
1. 📝 Alguém começa uma história
2. ✍️ Outras pessoas adicionam continuações
3. 📖 A história vai crescendo de forma colaborativa
4. 🎭 Cada um contribui com sua criatividade

🔗 **Acesse agora:** [contaae.netlify.app](https://contaae.netlify.app)

---

## ✨ Funcionalidades

- ✅ Criar novas histórias
- ✅ Continuar histórias existentes
- ✅ Categorias (Livre, Aventura, Romance, Terror, Comédia, Ficção Científica)
- ✅ Contador de continuações
- ✅ Interface responsiva (mobile-first)
- ✅ Sistema de feedback integrado

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Uso |
|------------|-----|
| **HTML5** | Estrutura |
| **CSS3** | Estilização |
| **JavaScript** | Lógica e interatividade |
| **Firebase Firestore** | Banco de dados |
| **Netlify** | Hospedagem |

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Navegador web moderno
- Conta no [Firebase](https://firebase.google.com) (gratuita)

### Passo a Passo

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/contaae.git
cd contaae
```

2. **Configure o Firebase**

Crie um projeto no Firebase Console e substitua as configurações no arquivo `app.js`:

```javascript
const firebaseConfig = {
    apiKey: "SUA-API-KEY",
    authDomain: "SEU-PROJETO.firebaseapp.com",
    projectId: "SEU-PROJETO",
    storageBucket: "SEU-PROJETO.appspot.com",
    messagingSenderId: "SEU-ID",
    appId: "SEU-APP-ID"
};
```

3. **Configure as regras do Firestore**

No Firebase Console → Firestore → Regras:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ **Nota:** Essas regras são apenas para desenvolvimento. Em produção, implemente regras mais restritivas.

4. **Abra o projeto**
```bash
# Simplesmente abra o index.html no navegador
# Ou use um servidor local:
npx serve .
# ou
python -m http.server 8000
```

---

## 📁 Estrutura do Projeto

```
contaae/
├── index.html      # Página principal com todas as telas
├── style.css       # Estilos e responsividade
├── app.js          # Lógica da aplicação e Firebase
└── README.md       # Documentação
```

---

## 🎨 Screenshots

### Tela Inicial
![Tela Inicial](screenshots/home.png)

### Criar História
![Criar História](screenshots/criar.png)

### Continuar História
![Continuar História](screenshots/continuar.png)

---

## 🗺️ Roadmap

### MVP (Atual) ✅
- [x] Sistema básico de histórias
- [x] Categorização
- [x] Interface responsiva
- [x] Deploy no Netlify

### Versão 1.1 (Planejado)
- [ ] Sistema de usuários/perfis
- [ ] Limite de continuações por história
- [ ] Notificações
- [ ] Filtro de conteúdo

### Versão 2.0 (Futuro)
- [ ] Sistema de curtidas/votos
- [ ] Rankings de histórias
- [ ] Modo RPG colaborativo
- [ ] Chat em tempo real

---

## 🤝 Como Contribuir

Contribuições são bem-vindas! 

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

### Ideias de Contribuição
- 🐛 Reportar bugs
- 💡 Sugerir novas funcionalidades
- 📝 Melhorar documentação
- 🎨 Melhorar UI/UX
- 🌐 Traduzir para outros idiomas

---

## 📊 Status do Projeto

🟢 **Ativo** - Em desenvolvimento contínuo

Este é um projeto indie sendo construído em público. Acompanhe o progresso no Twitter: [@seu_handle](https://twitter.com/seu_handle)

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👤 Autor

Desenvolvido com ❤️ por um dev brasileiro.

- 🐦 Twitter: [@seu_handle](https://twitter.com/seu_handle)
- 🔗 Projeto: [contaae.netlify.app](https://contaae.netlify.app)

---

## 💬 Feedback

Tem sugestões ou encontrou um bug? 

- Abra uma [Issue](https://github.com/seu-usuario/contaae/issues)
- Use o botão "Me ajude!" dentro do app
- Mande um tweet mencionando [@seu_handle](https://twitter.com/seu_handle)

---

<p align="center">
  <b>⭐ Se gostou do projeto, deixe uma estrela!</b>
</p>
