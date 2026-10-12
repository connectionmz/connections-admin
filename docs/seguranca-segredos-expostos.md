# Segredos expostos no histórico do git: remediação

Verificação feita a 09/10/2026 nos repositórios `connectionmz/connections-admin` e `connectionmz/connection-master`.
Os ficheiros já não estão na versão atual, mas **continuam no histórico**: quem tiver acesso ao repositório pode recuperá-los com `git log`/`git show`.

## O que foi encontrado

| Repositório | Ficheiro no histórico | Risco |
|-------------|----------------------|-------|
| connections-admin | `src/connectionmozambique-23a1b-firebase-adminsdk-fbsvc-9b0dbadb7f.json` | Chave de service account: acesso total ao projeto `connectionmozambique-23a1b`, passa por cima de todas as regras. |
| connections-admin | `src/connectionmz-firebase-adminsdk-fbsvc-3bd6baa6f4.json` | Chave de service account do projeto de produção `connectionmz`. |
| connections-admin | `src/fbAdmin/users.json` | Exportação dos utilizadores do Firebase Auth (emails, UIDs e possivelmente hashes de senha). |
| connection-master | `functions/serviceAccountKey.json` | Chave de service account (adicionada e removida várias vezes; a última em 31/08/2026). |
| connection-master | `functions/test.js` (até ao commit desta correção) | Account SID e Auth Token da Twilio em texto simples. |

A `apiKey` em `src/fb.js` **não** é segredo: identifica o projeto no browser e a proteção vem das regras e do Auth.

## 1. Revogar (fazer primeiro; limpar o histórico não chega)

1. **Google Cloud Console → IAM e administração → Contas de serviço**, em cada projeto (`connectionmz`, `connectionmozambique-23a1b`, e o projeto da `serviceAccountKey.json`):
   abrir a conta `firebase-adminsdk-…` → separador **Chaves** → apagar as chaves com os IDs acima e qualquer chave que não reconheça.
   Gere uma chave nova só se precisar dela, e guarde-a fora de qualquer repositório.
2. **Twilio Console → Account → API keys & tokens**: rodar o Auth Token principal. Se o SMS por cotação ainda for necessário, reimplementar como Function com `defineSecret('TWILIO_AUTH_TOKEN')`.
3. **users.json**: se a exportação tinha `passwordHash`, considere forçar a redefinição de senha das contas antigas e verifique no Auth a existência de contas criadas por terceiros.
4. Confirmar em **GitHub → Settings** se os repositórios são privados e quem tem acesso. Se algum foi público, assuma que os dados foram copiados.

## 2. Limpar o histórico

Precisa do [git-filter-repo](https://github.com/newren/git-filter-repo) (`pip install git-filter-repo`). Trabalhe num clone novo, em modo espelho:

```bash
# connections-admin
git clone --mirror https://github.com/connectionmz/connections-admin.git
cd connections-admin.git
git filter-repo --invert-paths \
  --path-glob 'src/*firebase-adminsdk*.json' \
  --path src/fbAdmin/users.json
git push --force --mirror

# connection-master
git clone --mirror https://github.com/connectionmz/connection-master.git
cd connection-master.git
git filter-repo --invert-paths --path functions/serviceAccountKey.json --path functions/test.js
git push --force --mirror
```

Depois:
- todos os colaboradores apagam o clone local e clonam de novo (um `pull` volta a trazer o histórico antigo);
- os pull requests abertos e os forks continuam a ter os commits antigos: feche/recrie os PRs e apague forks desnecessários;
- se o repositório foi público, peça ao suporte do GitHub para remover as vistas em cache dos commits.

O `force push` reescreve todos os hashes de commit. Combine uma janela com a equipa antes de o fazer.

## 3. Prevenção (já aplicada nesta branch)

- `.gitignore` dos dois repositórios ignora `*adminsdk*.json`, `serviceAccountKey*.json`, `users.json` e `.env*`.
- Os scripts `firebase-admin` saíram de `src/` para `scripts/firebase-admin/` e leem a chave por `GOOGLE_APPLICATION_CREDENTIALS`.
- `firebase-admin` e `resend` deixaram de ser dependências da app React do admin.
- As Functions usam Secret Manager (`firebase functions:secrets:set`) em vez de credenciais no código.
- Recomendado: ativar **GitHub → Settings → Code security → Secret scanning e Push protection** nos dois repositórios.
