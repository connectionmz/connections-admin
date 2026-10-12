// Script manual de migração (Node), não faz parte da app React.
// Instale firebase-admin à parte (npm i firebase-admin --no-save) e nunca guarde a chave nem o users.json no repositório.
const admin = require('firebase-admin');
const fs = require('fs');

// Inicialize o app do projeto de destino
const destApp = admin.initializeApp({
  credential: admin.credential.applicationDefault(), // GOOGLE_APPLICATION_CREDENTIALS=/caminho/fora/do/repo/chave.json
databaseURL: "https://connectionmz-default-rtdb.firebaseio.com"
}, 'destination');

async function importUsers() {
  try {
    const users = JSON.parse(fs.readFileSync('users.json'));
    
    for (const user of users) {
      try {
        await destApp.auth().createUser({
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          phoneNumber: user.phoneNumber,
          password: 'senha-temporaria', 
          displayName: user.displayName,
          photoURL: user.photoURL,
          disabled: user.disabled
        });
        console.log(`Usuário ${user.email} importado com sucesso`);
      } catch (error) {
        console.error(`Erro ao importar usuário ${user.email}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Erro ao importar usuários:', error);
  }
}

importUsers();