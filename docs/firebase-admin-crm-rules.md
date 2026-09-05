# Regras necessárias para o CRM administrativo

O CRM usa `adminCrm/accounts`, `adminCrm/opportunities` e `adminCrm/activities`.

As regras atuais têm `".read": true` na raiz. No Realtime Database, uma permissão concedida num nível superior não pode ser retirada num filho. Portanto, adicionar apenas uma regra privada em `adminCrm` **não protege os dados** enquanto a leitura pública permanecer na raiz.

Ao rever as regras completas, remova a leitura pública da raiz e adicione este nó:

```json
"adminCrm": {
  ".read": "auth != null && (root.child('utilizadores').child(auth.uid).child('role').val() === 'admin' || root.child('utilizadores').child(auth.uid).child('roles').child(0).val() === 'admin' || root.child('utilizadores').child(auth.uid).child('roles').child(1).val() === 'admin' || root.child('utilizadores').child(auth.uid).child('roles').child(2).val() === 'admin')",
  ".write": "auth != null && (root.child('utilizadores').child(auth.uid).child('role').val() === 'admin' || root.child('utilizadores').child(auth.uid).child('roles').child(0).val() === 'admin' || root.child('utilizadores').child(auth.uid).child('roles').child(1).val() === 'admin' || root.child('utilizadores').child(auth.uid).child('roles').child(2).val() === 'admin')",
  "opportunities": { ".indexOn": ["companyId", "stage", "ownerId", "expectedCloseAt", "createdAt"] },
  "activities": { ".indexOn": ["companyId", "status", "ownerId", "dueAt"] }
}
```

Esta expressão suporta o campo legado `role` e o atual array `roles`. A solução definitiva recomendada é usar Firebase custom claims (`auth.token.admin === true`), evitando depender de posições no array.

Estas regras são apenas documentação local e não foram aplicadas ao Firebase.
