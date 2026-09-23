import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Checkbox,
  Chip, Alert, Snackbar, CircularProgress, IconButton,
  Tooltip
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
      <div className="flex min-h-32 items-center justify-center gap-3 rounded-2xl border border-gray-200/90 bg-white p-8">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" aria-hidden="true" />
        <p className="text-sm font-medium text-gray-600">A carregar módulos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Gestão de Módulos</h3>
          <p className="text-sm text-gray-500">
            {activeModuleKeys.length} módulo(s) ativo(s) &bull; {modulesList.length} disponível(eis)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip title="Recarregar módulos">
            <IconButton onClick={handleRefreshModules} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
          <button
            type="button"
            onClick={handleOpen}
            disabled={loading || modulesList.length === 0}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Add fontSize="small" />
            Gerir Módulos
          </button>
        </div>
      </div>

      {/* Estatísticas dos módulos */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200/90 bg-white p-4 text-center shadow-[0_8px_30px_rgba(15,28,45,0.05)]">
          <p className="text-xs font-medium text-gray-500">Ativos</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{activeModuleKeys.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200/90 bg-white p-4 text-center shadow-[0_8px_30px_rgba(15,28,45,0.05)]">
          <p className="text-xs font-medium text-gray-500">Expirados</p>
          <p className="mt-1 text-xl font-bold text-red-600">{expiredModules.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200/90 bg-white p-4 text-center shadow-[0_8px_30px_rgba(15,28,45,0.05)]">
          <p className="text-xs font-medium text-gray-500">Disponíveis</p>
          <p className="mt-1 text-xl font-bold text-blue-600">{modulesList.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200/90 bg-white p-4 text-center shadow-[0_8px_30px_rgba(15,28,45,0.05)]">
          <p className="text-xs font-medium text-gray-500">Total</p>
          <p className="mt-1 text-xl font-bold text-amber-600">{Object.keys(activeModules || {}).length}</p>
        </div>
      </div>

      {/* Modal para gerenciar módulos */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle className="flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900">Gerir Módulos</span>
          <Chip
            label={`${selectedModules.length} selecionado(s)`}
            size="small"
            className="!bg-blue-100 !text-blue-800"
          />
        </DialogTitle>

        <DialogContent dividers className="!p-4">
          {modulesList.length === 0 ? (
            <Alert severity="info">
              Nenhum módulo encontrado na base de dados. Verifique se os módulos foram configurados corretamente.
            </Alert>
          ) : (
            <div className="space-y-2">
              {modulesList.map((module) => {
                const isActive = selectedModules.includes(module.key);
                const isExpired = expiredModules.includes(module.key);

                return (
                  <label
                    key={module.key}
                    htmlFor={`module-${module.key}`}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition ${
                      isExpired
                        ? 'border-red-200 bg-red-50'
                        : isActive
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-1 items-center">
                      <Checkbox
                        id={`module-${module.key}`}
                        checked={isActive}
                        onChange={() => handleCheckboxChange(module.key)}
                        color="primary"
                      />
                      <div className="ml-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{module.name}</span>
                          {isExpired && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                              <Warning sx={{ fontSize: 14 }} /> Expirado
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {module.description || 'Módulo disponível para assinatura'}
                        </p>
                        {module.duration && (
                          <p className="text-xs text-gray-400">Duração: {module.duration} dias</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        <MonetizationOn sx={{ fontSize: 14 }} />
                        {module.price} MT
                      </span>
                      {isActive && <CheckCircle className="text-emerald-500" fontSize="small" />}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </DialogContent>

        <DialogActions className="!justify-between !px-6 !py-4">
          <span className="text-sm text-gray-500">
            Total: {selectedModules.length} módulo(s) selecionado(s)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddModules}
              disabled={selectedModules.length === 0 || saving || modulesList.length === 0}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <CircularProgress size={16} sx={{ color: 'white' }} />}
              {saving ? 'A guardar...' : 'Guardar Alterações'}
            </button>
          </div>
        </DialogActions>
      </Dialog>

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
