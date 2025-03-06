import React, { useState, useEffect } from "react";
import { Modal, Box, Checkbox, Button, Typography, FormControlLabel } from "@mui/material";
import { getDatabase, ref, set, push, onValue, update } from "firebase/database";

const db = getDatabase();

const ModulosComponent = ({ empresa, activeModules }) => {
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
    if (activeModules) {
      const activeModuleKeys = Object.keys(activeModules).filter(
        (key) => activeModules[key].status === "active"
      );
      setSelectedModules(activeModuleKeys);
    }
  }, [activeModules]);

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
      const updates = {};
      const now = new Date();
      
      selectedModules.forEach((moduleKey) => {
        const expirationDate = new Date(now);
        if (moduleKey === "moduloMarket") {
          expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        } else {
          expirationDate.setDate(expirationDate.getDate() + 31);
        }
        
        updates[`company/${empresa.id}/activeModules/${moduleKey}`] = {
          moduleKey: moduleKey,
          paidAt: now.toISOString(),
          expiresAt: expirationDate.toISOString(),
          status: "active",
        };
        
        if (moduleKey === "moduloSMS") {
          updates[`company/${empresa.id}/activeModules/${moduleKey}`].smsCount = 100; // Define um valor padrão
        }
      });
      
      Object.keys(activeModules).forEach((moduleKey) => {
        if (!selectedModules.includes(moduleKey)) {
          updates[`company/${empresa.id}/activeModules/${moduleKey}/status`] = "false";
        }
      });
      
      await update(ref(db), updates);
      console.log("Módulos atualizados com sucesso!");
      handleClose();
    } catch (error) {
      console.error("Erro ao atualizar módulos:", error);
    }
  };

  if (loading) {
    return <Typography>Carregando módulos...</Typography>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">Módulos</h2>
      <Button variant="contained" color="primary" onClick={handleOpen}>
        Gerenciar Módulos
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
              Salvar
            </Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default ModulosComponent;
