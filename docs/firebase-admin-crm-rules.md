# Regras necessárias para o CRM administrativo

O CRM usa `adminCrm/accounts`, `adminCrm/opportunities`, `adminCrm/activities`, `adminCrm/followUps`, `adminCrm/invoices` e `adminCrm/counters`.

As regras atuais têm `".read": true` na raiz. No Realtime Database, uma permissão concedida num nível superior não pode ser retirada num filho. Portanto, adicionar apenas uma regra privada em `adminCrm` **não protege os dados** enquanto a leitura pública permanecer na raiz.

Ao rever as regras completas, remova a leitura pública da raiz e adicione este nó:

```json
"adminCrm": {
  ".read": "auth != null && (root.child('utilizadores').child(auth.uid).child('role').val() === 'admin' || root.child('utilizadores').child(auth.uid).child('roles').child(0).val() === 'admin' || root.child('utilizadores').child(auth.uid).child('roles').child(1).val() === 'admin' || root.child('utilizadores').child(auth.uid).child('roles').child(2).val() === 'admin')",
  ".write": "auth != null && (root.child('utilizadores').child(auth.uid).child('role').val() === 'admin' || root.child('utilizadores').child(auth.uid).child('roles').child(0).val() === 'admin' || root.child('utilizadores').child(auth.uid).child('roles').child(1).val() === 'admin' || root.child('utilizadores').child(auth.uid).child('roles').child(2).val() === 'admin')",
  "opportunities": { ".indexOn": ["companyId", "stage", "ownerId", "expectedCloseAt", "createdAt"] },
  "activities": { ".indexOn": ["companyId", "source", "status", "ownerId", "dueAt"] },
  "followUps": { ".indexOn": ["companyId", "source", "audience", "createdAt"] }
}
```

Esta expressão suporta o campo legado `role` e o atual array `roles`. A solução definitiva recomendada é usar Firebase custom claims (`auth.token.admin === true`), evitando depender de posições no array.

## Ecrã "Empresas offline" (`/utilizadores-offline`)

O ecrã lê `company`, `accessLogs` e `adminCrm`, e o CRM passou também a ler `accessLogs` para os públicos de follow-up e para o KPI de reativação.

- `accessLogs` contém o histórico de acessos de cada conta. A leitura do nó completo deve ficar **só para admin** (a mesma expressão de `adminCrm/.read`). Cada utilizador continua a precisar de escrever o seu próprio registo, por exemplo `"accessLogs": { "$uid": { ".write": "auth != null && auth.uid === $uid" } }`.
- O ecrã **não escreve** em `company/*` nem em `accessLogs/*`. Todos os contactos ficam em `adminCrm/activities`, com `source: 'engagement'` e `engagementStatus` (`active`, `at_risk`, `offline` ou `never`) no momento do contacto.
- As campanhas de email gravam `audience` em `adminCrm/followUps/<id>`. O último contacto por empresa é calculado a partir de `adminCrm/followUps/<id>/deliveries/<companyId>`.

Estas regras são apenas documentação local e não foram aplicadas ao Firebase.
