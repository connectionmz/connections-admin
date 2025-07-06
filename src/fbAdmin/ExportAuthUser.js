const admin = require('firebase-admin');
const fs = require('fs');

// Inicialize o app do projeto de origem
const sourceApp = admin.initializeApp({
  credential: admin.credential.cert('../connectionmozambique-23a1b-firebase-adminsdk-fbsvc-9b0dbadb7f.json'),
databaseURL: "https://connectionmozambique-23a1b-default-rtdb.firebaseio.com"
}, 'source');

async function exportUsers() {
  try {
    // Lista todos os usuários
    const listUsersResult = await sourceApp.auth().listUsers();
    const users = listUsersResult.users;
    
    // Salva em um arquivo JSON
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
    console.log(`Exportados ${users.length} usuários para users.json`);
  } catch (error) {
    console.error('Erro ao exportar usuários:', error);
  }
}

exportUsers();