import React, { useEffect, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Box,
  CircularProgress,
  Link,
} from '@mui/material';
import { db } from '../fb';
import { buildActiveModuleFromPayment, normalizePaymentStatus, PAYMENT_STATUS } from '../domain/subscriptions';

const ValidarPagamentos = () => {
  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pagamentosRef = ref(db, 'payments');
    const unsubscribe = onValue(pagamentosRef, (snapshot) => {
      const data = snapshot.val() || {};
      const lista = Object.entries(data).map(([id, value]) => ({ id, ...value, status: normalizePaymentStatus(value.status) }));
      setPagamentos(lista.filter(p => p.status === PAYMENT_STATUS.PENDING));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const validarPagamento = async (pagamento, aprovado = true) => {
    const updates = {};
    const now = Date.now();
    updates[`payments/${pagamento.id}/status`] = aprovado ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.REJECTED;
    updates[`payments/${pagamento.id}/updatedAt`] = now;

    if (aprovado) {
      const activeModule = buildActiveModuleFromPayment(pagamento, now);
      if (!activeModule) throw new Error('O pagamento não possui utilizador ou módulo associado.');
      updates[`company/${pagamento.userId}/activeModules/${pagamento.moduleKey}`] = activeModule;
    }

    await update(ref(db), updates);
    setPagamentos(prev => prev.filter(p => p.id !== pagamento.id));
  };

  if (loading) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>Pagamentos Pendentes</Typography>
      {pagamentos.length === 0 ? (
        <Typography>Nenhum pagamento pendente.</Typography>
      ) : (
        <Grid container spacing={2}>
          {pagamentos.map((p) => (
            <Grid item xs={12} md={6} lg={4} key={p.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{p.nome}</Typography>
                  <Typography variant="body2">Telefone: {p.telefone}</Typography>
                  <Typography variant="body2">Referência: {p.referencia}</Typography>
                  <Typography variant="body2" gutterBottom>Módulo: {p.moduleKey}</Typography>
                  <Link href={p.comprovativoUrl} target="_blank" rel="noopener noreferrer">
                    Ver Comprovativo
                  </Link>
                  <Box mt={2} display="flex" justifyContent="space-between">
                    <Button variant="contained" color="success" onClick={() => validarPagamento(p, true)}>Aprovar</Button>
                    <Button variant="outlined" color="error" onClick={() => validarPagamento(p, false)}>Rejeitar</Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ValidarPagamentos;
