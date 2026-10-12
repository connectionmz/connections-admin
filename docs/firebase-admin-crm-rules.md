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

## Cloud Functions (`connection-master/functions`)

As Functions usam o Admin SDK, que ignora as regras. Escrevem apenas em `adminCrm`:

| Nó | Quem escreve | Conteúdo |
|----|--------------|----------|
| `adminCrm/engagementState/<companyId>` | `engagementDailySweep` | Último estado de cada empresa (`status`, `since`, `autoActivityAt`), para detetar quando passa a offline. |
| `adminCrm/engagementSweep/lastRun` | `engagementDailySweep` | Resumo da última execução diária. |
| `adminCrm/activities/<id>` com `source: 'engagement_auto'` | `engagementDailySweep` | Follow-ups pendentes criados automaticamente. |
| `adminCrm/followUps/<id>` com `status: 'queued'` | admin (com `REACT_APP_EMAIL_QUEUE=true`) | Campanha e mapa `recipients/<companyId>: { email, nome }`. A Function grava `deliveries`, contagens e `status`. |
| `adminCrm/emailOptOut/<companyId>` | `unsubscribe` | Empresas que cancelaram os emails comerciais (`at`, `source`). |

Como `adminCrm` só é legível por admin, as páginas públicas nunca leem estes nós.

## Registo de acessos (`accessLogs`)

A app cliente grava um registo por empresa e por dia em `accessLogs/<uid>/<AAAA-MM-DD>` com `{ timestamp, accessedAt }`. Regra sugerida:

```json
"accessLogs": {
  ".read": "<mesma expressão de admin de adminCrm/.read>",
  "$uid": {
    "$day": {
      ".write": "auth != null && auth.uid === $uid",
      ".validate": "$day.matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/) && newData.hasChildren(['timestamp', 'accessedAt'])"
    }
  }
}
```

Os registos antigos (chaves como `Fri Sep 04 2026`) continuam a ser lidos pelo admin. A regra só se aplica a escritas novas.

Estas regras são apenas documentação local e não foram aplicadas ao Firebase.
