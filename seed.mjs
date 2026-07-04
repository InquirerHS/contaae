// Seed demo content via the API.
const BASE = "http://localhost:5000";

async function register(username, email, birthDate, hue) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      email,
      password: "senha123",
      birthDate,
      avatarHue: hue,
    }),
  });
  if (!res.ok) throw new Error(`register ${username}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function createStory(token, data) {
  const res = await fetch(`${BASE}/api/stories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-auth-token": token },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`create: ${res.status} ${await res.text()}`);
  return res.json();
}

async function addPart(token, storyId, content) {
  const res = await fetch(`${BASE}/api/stories/${storyId}/parts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-auth-token": token },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`part: ${res.status} ${await res.text()}`);
  return res.json();
}

async function like(token, storyId) {
  await fetch(`${BASE}/api/stories/${storyId}/like`, {
    method: "POST",
    headers: { "x-auth-token": token },
  });
}

async function comment(token, storyId, content) {
  await fetch(`${BASE}/api/stories/${storyId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-auth-token": token },
    body: JSON.stringify({ content }),
  });
}

(async () => {
  const u1 = await register("lyra_neon", "lyra@neoarcana.city", "1995-03-12", 276);
  const u2 = await register("terno_sombrio", "terno@neoarcana.city", "1990-11-02", 190);
  const u3 = await register("mago_arkan", "mago@neoarcana.city", "1988-07-21", 41);
  const u4 = await register("cronista_anon", "cronista@neoarcana.city", "1999-01-30", 332);

  // Real story by lyra
  const s1 = await createStory(u1.token, {
    title: "A noite que a cidade parou para ouvir o trovão",
    synopsis: "Um relato verdadeiro sobre quando o apagão atingiu o centro e descobri que vizinhos são gente.",
    category: "real",
    tags: ["urbano", "memória", "são-paulo"],
    accentHue: 41,
    isMature: false,
  });
  await addPart(u1.token, s1.id, "Eram três da manhã quando todas as luzes da avenida morreram juntas, como se alguém tivesse apagado uma vela gigante. Eu subia a rampa do estacionamento quando ouvi o primeiro trovão — não no céu, mas no peito. O silêncio que se seguiu era tão grande que dava para ouvir o respirar da cidade, coisa que eu nunca tinha percebido existir. Foi ali, no escuro, com o celular sem sinal, que percebi: a gente só conhece os vizinhos quando a luz falha.");
  await addPart(u1.token, s1.id, "A dona do 42 bateu na minha porta com uma lanterna e um pote de feijão. 'Você come?', ela perguntou, como se apagão combinasse com jantar. Ali, naquele corredor gelado, a cidade futurista que eu achava tão fria de repente parecia uma cozinha de vó. Comemos em silêncio, ouvindo o gerador do prédio tentar acordar.");
  await like(u2.token, s1.id);
  await like(u3.token, s1.id);
  await like(u4.token, s1.id);
  await comment(u2.token, s1.id, "Isso aqui me pegou. Morei num prédio assim por anos e nunca soube o nome de ninguém.");

  // Creepy story by terno
  const s2 = await createStory(u2.token, {
    title: "ODécimoTerceiroAndar",
    synopsis: "O elevador só tinha doze botões. Toda noite, às 3:33, ele subia sozinho.",
    category: "creepy",
    tags: ["terror", "urbano", "elevador"],
    accentHue: 332,
    isMature: true,
  });
  await addPart(u2.token, s2.id, "O prédio tinha doze andares. O painel do elevador também. Eu contava toda noite: um, dois, três... doze. Nunca treze. Mas às três e trinta e três da manhã, o elevador subia. Eu ouvia o motor arranhando, aquele chiado seco de cabo velho, e o marcador digital passava do 12 para um traço que não era número. Era só uma linha. Como se o prédio lembrasse de um andar que não existia mais.");
  await addPart(u2.token, s2.id, "Na terceira noite, eu apertei o ouvido contra a porta. De dentro vinha uma respiração. Não de máquina. De gente. Devagar. Paciente. Como quem espera há muito tempo que alguém aperte o botão errado.");
  await like(u1.token, s2.id);
  await like(u4.token, s2.id);
  await comment(u3.token, s2.id, "Não vou mais olhar pro painel do elevador hoje.");

  // Roleplay story
  const s3 = await createStory(u3.token, {
    title: "O Mago, o Terno e a Cidade que Não Dorme",
    synopsis: "Numa metrópole de neon e feitiços, um executivo e um arcanista fazem um pacto. História colaborativa por turnos.",
    category: "roleplay",
    tags: ["fantasia", "cyberpunk", "colaborativa"],
    accentHue: 190,
    isMature: false,
  });
  await addPart(u3.token, s3.id, "O mago entrou no bar de terno. Não o dele — o do outro. O executivo esperava na mesa dos fundos, com um contrato em nanotubo e dois copos de algo que cheirava a ozônio e caju. 'Você está atrasado', disse o terno. 'O tempo', respondeu o mago, 'é só uma sugestão que os relógios levam a sério demais.' O contrato brilhou. Alguém, num andar acima, tossiu fumaça roxa.");
  await addPart(u1.token, s3.id, "Lyra, a hacker que ninguém convidou, largou uma pastilha de dados na mesa. 'Antes de assinarem', ela disse, 'talvez queiram saber o que o contrato realmente pede.' O mago sorriu. O terno não. 'Ela não deveria estar aqui.' — 'Ninguém deveria', concordou Lyra, 'e ainda assim a cidade está cheia.'");
  await like(u2.token, s3.id);
  await like(u4.token, s3.id);
  await comment(u4.token, s3.id, "Quero entrar nessa! Alguém continua?");

  // Another real short
  const s4 = await createStory(u4.token, {
    title: "Achei um diário num sebo de Ribeirão",
    synopsis: "Um caderno esquecido, com anotações de alguém que morava na minha rua trinta anos antes de mim.",
    category: "real",
    tags: ["memória", "sebo", "ribeirão-preto"],
    accentHue: 152,
    isMature: false,
  });
  await addPart(u4.token, s4.id, "Comprei o caderno por cinco reais, só pela capa. Só em casa percebi que estava escrito. A letra era pequena, apressada, e a primeira página dizia: 'Se você está lendo isso, eu já mudei de endereço. Mas a vista da janela da cozinha continua a mesma.' Fui até a janela. Era a mesma vista mesmo. Trinta anos depois, a mesma árvore, o mesmo posto, o mesmo céu que muda de ideia o tempo todo.");
  await like(u1.token, s4.id);

  console.log("seeded OK");
})().catch((e) => { console.error("SEED ERROR:", e); process.exit(1); });
