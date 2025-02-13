import React, { useState, useEffect } from "react";
import { Modal, Box, Checkbox, Button, Typography, FormControlLabel } from "@mui/material";
import { getDatabase, ref, set, push, onValue } from "firebase/database";

const db = getDatabase();

const ModulosComponent = ({ empresa, user }) => {
  const [open, setOpen] = useState(false);
  const [selectedModules, setSelectedModules] = useState([]);
  const [modules, setModules] = useState({});
  const [loading, setLoading] = useState(true);

  const allModules = [
    { name: 'Proforma', key: 'moduloProforma' },
    { name: 'Market', key: 'moduloMarket' },
    { name: 'Anunciar', key: 'moduloAnunciar' },
    { name: 'SMS', key: 'moduloSMS' },
    { name: 'Call Center', key: 'moduloCallCenter' },
    { name: 'Procurement', key: 'moduloProcurement' },
    { name: 'Inquéritos', key: 'moduloInquerito' },
    { name: 'Destacar', key: 'moduloDestacar' },
    { name: 'Analises', key: 'moduloAnalises' },
  ];

  useEffect(() => {
    const modulesRef = ref(db, "modules/modulos");

    const unsubscribe = onValue(modulesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setModules(data);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleCheckboxChange = (moduleKey) => {
    setSelectedModules((prev) =>
      prev.includes(moduleKey)
        ? prev.filter((key) => key !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  const handleAddModules = async () => {
    try {
      if (selectedModules.length === 0) return;


      console.log("Módulos adicionados com sucesso:", selectedModules);

      selectedModules.forEach((moduleKey) => {
        const paymentDetails = {
          amount: modules[moduleKey] || 0,
          method: "Cartão de Crédito", 
        };

        UpdatePayment(empresa, moduleKey, paymentDetails);
      });

      handleClose();
    } catch (error) {
      console.error("Erro ao adicionar módulos:", error);
    }
  };

  if (loading) {
    return <Typography>Carregando módulos...</Typography>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">Módulos</h2>
      <Button variant="contained" color="primary" onClick={handleOpen}>
        Adicionar Módulos
      </Button>

      <Modal open={open} onClose={handleClose}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Selecionar Módulos
          </Typography>
          {allModules.map((module) => (
            <FormControlLabel
              key={module.key}
              control={
                <Checkbox
                  checked={selectedModules.includes(module.key)}
                  onChange={() => handleCheckboxChange(module.key)}
                />
              }
              label={`${module.name} - ${modules[module.key] || 'Preço não disponível'} MT`}
            />
          ))}
          <Box display="flex" justifyContent="space-between" mt={3}>
            <Button onClick={handleClose} color="secondary">
              Cancelar
            </Button>
            <Button
              onClick={handleAddModules}
              variant="contained"
              color="primary"
              disabled={selectedModules.length === 0}
            >
              Adicionar
            </Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

// Função para atualizar pagamentos
export const UpdatePayment = (user, moduleKey, paymentDetails) => {
  const { id: userId, displayName } = user; // Extrai informações do usuário
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  // Referências no Firebase
  const activeModulesRef = ref(db, `company/${userId}/activeModules/${moduleKey}`);
  const subscriptionsRef = ref(db, `subscriptions/${userId}/${year}/${month}`);

  // Dados para o módulo ativo
  const activeModuleData = {
    paidAt: currentDate.toISOString(),
    moduleKey: moduleKey,
    status: "active",
  };

  // Dados do pagamento
  const paymentData = {
    moduleKey: moduleKey,
    amount: paymentDetails.amount,
    method: paymentDetails.method,
    paidAt: currentDate.toISOString(),
    userName: displayName || "Cliente Anônimo",
  };

  try {
    // Atualiza o módulo ativo
    set(activeModulesRef, activeModuleData);

    // Adiciona detalhes do pagamento
    const newPaymentRef = push(subscriptionsRef);
    set(newPaymentRef, paymentData);

    console.log("Pagamento atualizado com sucesso!");
  } catch (error) {
    console.error("Erro ao atualizar pagamento:", error);
  }
};

export default ModulosComponent;
