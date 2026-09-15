import React, { useState, useEffect } from "react";
import { 
  Modal, Box, Checkbox, Button, Typography,
  Chip, Alert, Snackbar, CircularProgress, Divider, IconButton,
  Tooltip, Paper, Grid
} from "@mui/material";
import { 
  getDatabase, ref, onValue, update, get 
} from "firebase/database";
import { 
  MonetizationOn, CheckCircle, Refresh,
  Warning, Add
} from "@mui/icons-material";

const db = getDatabase();

const ModulosComponent = ({ empresa, activeModules, onModuleUpdate }) => {
  const [open, setOpen] = useState(false);
  const [selectedModules, setSelectedModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [moduleDetails, setModuleDetails] = useState({});
  const [expiredModules, setExpiredModules] = useState([]);
  const [activeModuleKeys, setActiveModuleKeys] = useState([]);
  const [modulesList, setModulesList] = useState([]);

  // Buscar módulos do Realtime Database
  useEffect(() => {
    const modulosRef = ref(db, 'modules/modulos');
    
    const unsubscribe = onValue(modulosRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        console.log('📦 Módulos carregados do Firebase:', data);
        
        // Criar lista de módulos a partir dos dados do Firebase
        const modulesArray = Object.keys(data).map(key => ({
          key: key,
          name: data[key].name || key.replace('modulo', 'Módulo '),
          price: data[key].price || 0,
          description: data[key].description || '',
          duration: data[key].duration || 30,
          isActive: data[key].isActive !== false
        }));
        setModulesList(modulesArray);
        
        // Processar detalhes dos módulos
        const details = {};
        Object.keys(data).forEach(key => {
          if (data[key]) {
            details[key] = {
              price: data[key].price || 0,
              description: data[key].description || '',
              name: data[key].name || key,
              isActive: data[key].isActive !== false,
              duration: data[key].duration || 30
            };
          }
        });
        setModuleDetails(details);
      } else {
        console.warn('⚠️ Nenhum módulo encontrado no Firebase');
        setModuleDetails({});
        setModulesList([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("❌ Erro ao buscar módulos:", error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar módulos da base de dados',
        severity: 'error'
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Atualizar módulos ativos da empresa
  useEffect(() => {
    if (activeModules) {
      const activeKeys = Object.keys(activeModules).filter(
        (key) => activeModules[key]?.status === "active"
      );
      setActiveModuleKeys(activeKeys);
      setSelectedModules(activeKeys);
      
      // Verificar módulos expirados
      const expired = Object.keys(activeModules).filter(key => {
        const module = activeModules[key];
        return module?.status === "active" && 
               module?.expiresAt && 
               new Date(module.expiresAt) < new Date();
      });
      setExpiredModules(expired);
    }
  }, [activeModules]);

  const handleOpen = () => {
    setSelectedModules(activeModuleKeys);
    setOpen(true);
  };
  
  const handleClose = () => {
    if (!saving) {
      setOpen(false);
    }
  };

  const handleCheckboxChange = (moduleKey) => {
    setSelectedModules((prev) =>
      prev.includes(moduleKey)
        ? prev.filter((key) => key !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  const handleAddModules = async () => {
    if (selectedModules.length === 0) {
      setSnackbar({
        open: true,
        message: 'Selecione pelo menos um módulo',
        severity: 'warning'
      });
      return;
    }

    setSaving(true);
    try {
      const updates = {};
      const now = new Date();
      
      // Adicionar ou atualizar módulos selecionados
      selectedModules.forEach((moduleKey) => {
        const moduleInfo = moduleDetails[moduleKey] || {};
        const durationDays = moduleInfo.duration || 30;
        
        const expirationDate = new Date(now);
        expirationDate.setDate(expirationDate.getDate() + durationDays);
        const marketExpirationDate = new Date(now);
        marketExpirationDate.setFullYear(marketExpirationDate.getFullYear() + 1);
        
        const modulePath = `company/${empresa.id}/activeModules/${moduleKey}`;
        updates[modulePath] = {
          moduleKey: moduleKey,
          paidAt: now.toISOString(),
          expiresAt: expirationDate.toISOString(),
          status: "active",
          durationDays: durationDays,
          ...(moduleKey === "moduloSMS" && { smsCount: 100 }),
          ...(moduleKey === "moduloMarket" && { 
            isPremium: true,
            expiresAt: marketExpirationDate.toISOString()
          })
        };
      });
      
      // Desativar módulos não selecionados
      activeModuleKeys.forEach((moduleKey) => {
        if (!selectedModules.includes(moduleKey)) {
          updates[`company/${empresa.id}/activeModules/${moduleKey}/status`] = "inactive";
        }
      });
      
      await update(ref(db), updates);
      
      setSnackbar({
        open: true,
        message: `${selectedModules.length} módulo(s) atualizado(s) com sucesso!`,
        severity: 'success'
      });
      
      // Notificar o componente pai sobre a atualização
      if (onModuleUpdate) {
        onModuleUpdate(selectedModules);
      }
      
      handleClose();
      
    } catch (error) {
      console.error("Erro ao atualizar módulos:", error);
      setSnackbar({
        open: true,
        message: 'Erro ao atualizar módulos: ' + error.message,
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshModules = async () => {
    setLoading(true);
    try {
      const modulosRef = ref(db, 'modules/modulos');
      const snapshot = await get(modulosRef);
      const data = snapshot.val();
      if (data) {
        
        const modulesArray = Object.keys(data).map(key => ({
          key: key,
          name: data[key].name || key.replace('modulo', 'Módulo '),
          price: data[key].price || 0,
          description: data[key].description || '',
          duration: data[key].duration || 30,
          isActive: data[key].isActive !== false
        }));
        setModulesList(modulesArray);
        
        const details = {};
        Object.keys(data).forEach(key => {
          if (data[key]) {
            details[key] = {
              price: data[key].price || 0,
              description: data[key].description || '',
              name: data[key].name || key,
              isActive: data[key].isActive !== false,
              duration: data[key].duration || 30
            };
          }
        });
        setModuleDetails(details);
        
        setSnackbar({
          open: true,
          message: 'Módulos recarregados com sucesso!',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error("Erro ao recarregar módulos:", error);
      setSnackbar({
        open: true,
        message: 'Erro ao recarregar módulos',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <CircularProgress />
        <Typography className="ml-4">Carregando módulos...</Typography>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <Typography variant="h6" className="font-semibold">
            Gerenciamento de Módulos
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {activeModuleKeys.length} módulo(s) ativo(s) • {modulesList.length} disponível(eis)
          </Typography>
        </div>
        <div className="flex space-x-2">
          <Tooltip title="Recarregar módulos">
            <IconButton onClick={handleRefreshModules} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpen}
            startIcon={<Add />}
            disabled={loading || modulesList.length === 0}
          >
            Gerenciar Módulos
          </Button>
        </div>
      </div>

      {/* Estatísticas dos módulos */}
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <Paper className="p-3 text-center bg-green-50">
            <Typography variant="caption" color="textSecondary">Ativos</Typography>
            <Typography variant="h6" className="text-green-600">
              {activeModuleKeys.length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper className="p-3 text-center bg-red-50">
            <Typography variant="caption" color="textSecondary">Expirados</Typography>
            <Typography variant="h6" className="text-red-600">
              {expiredModules.length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper className="p-3 text-center bg-blue-50">
            <Typography variant="caption" color="textSecondary">Disponíveis</Typography>
            <Typography variant="h6" className="text-blue-600">
              {modulesList.length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper className="p-3 text-center bg-yellow-50">
            <Typography variant="caption" color="textSecondary">Total</Typography>
            <Typography variant="h6" className="text-yellow-600">
              {Object.keys(activeModules || {}).length}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Modal para gerenciar módulos */}
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="gerenciar-modulos-modal"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: '90%', sm: 500, md: 600 },
            maxHeight: '80vh',
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            overflow: 'auto'
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <Typography variant="h6" component="h2">
              Gerenciar Módulos
            </Typography>
            <Chip 
              label={`${selectedModules.length} selecionados`}
              color="primary"
              size="small"
            />
          </div>

          <Divider className="mb-4" />

          {modulesList.length === 0 ? (
            <Alert severity="info" className="mb-4">
              Nenhum módulo encontrado na base de dados. Verifique se os módulos foram configurados corretamente.
            </Alert>
          ) : (
            <div className="space-y-2">
              {modulesList.map((module) => {
                const isActive = selectedModules.includes(module.key);
                const isExpired = expiredModules.includes(module.key);
                
                return (
                  <Paper
                    key={module.key}
                    className={`p-3 transition-all ${
                      isActive ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                    } ${isExpired ? 'border-red-200 bg-red-50' : ''}`}
                    variant="outlined"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <Checkbox
                          checked={isActive}
                          onChange={() => handleCheckboxChange(module.key)}
                          color="primary"
                        />
                        <div className="ml-2">
                          <Typography variant="subtitle1" className="font-medium">
                            {module.name}
                            {isExpired && (
                              <Chip
                                size="small"
                                label="Expirado"
                                color="error"
                                className="ml-2"
                                icon={<Warning />}
                              />
                            )}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {module.description || 'Módulo disponível para assinatura'}
                          </Typography>
                          {module.duration && (
                            <Typography variant="caption" color="textSecondary">
                              Duração: {module.duration} dias
                            </Typography>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Chip
                          icon={<MonetizationOn />}
                          label={`${module.price} MT`}
                          size="small"
                          color={module.price > 0 ? "primary" : "default"}
                        />
                        {isActive && (
                          <Tooltip title="Módulo ativo">
                            <CheckCircle className="text-green-500" />
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </Paper>
                );
              })}
            </div>
          )}

          <Divider className="my-4" />

          <div className="flex justify-between items-center">
            <Typography variant="body2" color="textSecondary">
              Total: {selectedModules.length} módulo(s) selecionado(s)
            </Typography>
            <div className="space-x-2">
              <Button onClick={handleClose} color="inherit">
                Cancelar
              </Button>
              <Button
                onClick={handleAddModules}
                variant="contained"
                color="primary"
                disabled={selectedModules.length === 0 || saving || modulesList.length === 0}
                startIcon={saving ? <CircularProgress size={20} /> : null}
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </Box>
      </Modal>

      {/* Snackbar para feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ModulosComponent;
